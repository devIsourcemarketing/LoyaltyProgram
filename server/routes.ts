import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { insertUserSchema, updateUserSchema, insertDealSchema, insertRewardSchema, insertSupportTicketSchema, updateSupportTicketSchema, updatePointsConfigSchema } from "@shared/schema";
import { z } from "zod";
import * as XLSX from 'xlsx';
import { NotificationHelpers } from "./notifications";
import { nanoid } from "nanoid";
import { cloudinary } from "./cloudinary";
import { 
  sendInviteEmail, 
  sendApprovalEmail, 
  sendGolesRegistradosEmail, 
  sendRedemptionApprovedEmail,
  sendRedemptionRequestToAdmin,
  sendSupportTicketToAdmin,
  sendMagicLinkEmail,
  sendExpectationEmail,
  sendRegistroExitosoEmail,
  sendRegistroPasswordlessEmail,
  sendBienvenidaEmail,
  sendPendienteAprobacionEmail,
  sendGanadorPremioMayorEmail
} from "./email.js";
import { 
  sendEmailWithRetry,
  getEmailStats,
  getFailedEmails,
  retryFailedEmail,
  BREVO_API_KEY,
  FROM_EMAIL,
  APP_URL
} from "./emailService.js";
import { detectPreferredLanguage } from "./geolocation.js";

// Extend session data interface
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

/**
 * Helper para obtener la región del admin autenticado
 * - Super-admin: retorna undefined (ve todas las regiones)
 * - Regional-admin: retorna su región (NOLA, SOLA, BRASIL, MEXICO)
 * - User/Admin regular: retorna undefined
 */
async function getAdminRegion(userId: string): Promise<string | undefined> {
  const user = await storage.getUser(userId);
  if (!user) return undefined;
  
  // Solo regional-admin tiene filtro de región
  if (user.role === "regional-admin" && user.region) {
    return user.region; // Retorna directamente la región: "NOLA", "SOLA", etc.
  }
  
  // Super-admin y otros roles ven todo
  return undefined;
}

/**
 * Helper para verificar si el usuario es super-admin
 */
async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  return user?.role === "super-admin";
}

/**
 * Helper para verificar si el usuario es regional-admin
 */
async function isRegionalAdmin(userId: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  return user?.role === "regional-admin";
}

/**
 * Helper para verificar si el usuario tiene permisos de administrador
 * Incluye: admin, regional-admin, super-admin
 */
function isAdminRole(role: string | undefined): boolean {
  return role === "admin" || role === "regional-admin" || role === "super-admin";
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      let user = await storage.getUserByUsername(username);
      
      // If not found by username, try by email (for flexibility)
      if (!user) {
        user = await storage.getUserByEmail(username);
      }
      
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account inactive" });
      }

      if (!user.isApproved) {
        return res.status(401).json({ message: "Account pending approval. Please wait for administrator approval." });
      }

      // Store user in session
      if (req.session) {
        req.session.userId = user.id;
        req.session.userRole = user.role;
      }

      res.json({ 
        id: user.id, 
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        country: user.country
      });
    } catch (error) {
      console.error("Login error:", error);
      console.error("Request body:", req.body);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        isApproved: false, // New users need approval
      });

      // Enviar notificaciones a los admins correspondientes
      if (user.region) {
        const userName = `${user.firstName} ${user.lastName}`;
        
        // 1. Notificar al super admin
        const superAdmins = await storage.getAllUsers();
        const superAdminList = superAdmins.filter(u => u.role === 'super-admin');
        
        for (const admin of superAdminList) {
          await NotificationHelpers.newUserRegistered(
            admin.id,
            userName,
            user.region
          );
        }

        // 2. Notificar al regional admin de la región del usuario
        const regionalAdmins = superAdmins.filter(u => 
          u.role === 'regional-admin' && 
          u.adminRegionId && 
          u.region === user.region
        );
        
        for (const regionalAdmin of regionalAdmins) {
          await NotificationHelpers.newUserRegistered(
            regionalAdmin.id,
            userName,
            user.region
          );
        }
      }

      res.status(201).json({ 
        id: user.id, 
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        message: "Registration successful. Please wait for administrator approval before you can log in."
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Could not log out" });
        }
        res.json({ message: "Logged out" });
      });
    } else {
      res.json({ message: "Logged out" });
    }
  });

  // Register without password (passwordless flow)
  // Check if email belongs to an admin user
  app.post("/api/auth/check-user-role", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ 
          isAdmin: false,
          hasPassword: false,
          message: "Email is required" 
        });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.json({ 
          isAdmin: false,
          hasPassword: false,
          userExists: false 
        });
      }

      // Verificar si es admin, regional-admin o super-admin
      const isAdmin = user.role === "admin" || user.role === "regional-admin" || user.role === "super-admin";
      
      // Requiere contraseña si:
      // 1. Es admin (cualquier tipo de admin)
      // 2. Es usuario regular que NO es passwordless (creado por invitación/manual)
      const requiresPassword = isAdmin || (user.isPasswordless === false && user.role === "user");
      
      res.json({ 
        isAdmin,
        hasPassword: user.isPasswordless === false,
        userExists: true,
        role: user.role,
        isPasswordless: user.isPasswordless || false,
        requiresPassword
      });
    } catch (error) {
      console.error("Check user role error:", error);
      res.status(500).json({ 
        isAdmin: false,
        hasPassword: false,
        message: "Error checking user role" 
      });
    }
  });

  // Passwordless registration endpoint
  app.post("/api/auth/register-passwordless", async (req, res) => {
    try {
      const { 
        email, 
        firstName, 
        lastName, 
        companyName,
        partnerCategory,
        marketSegment,
        country, 
        region, 
        category, 
        subcategory,
        address,
        city,
        zipCode,
        contactNumber,
        language
      } = req.body;
      
      if (!email || !firstName || !lastName || !country || !region || !category) {
        return res.status(400).json({ 
          message: "Email, nombre, apellido, país, región y categoría son requeridos" 
        });
      }

      // Verificar si el usuario ya existe
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          message: "Ya existe una cuenta con este email." 
        });
      }

      // Crear usuario sin contraseña (se genera una temporal)
      const tempPassword = await bcrypt.hash(nanoid(32), 10);
      
      // Detectar idioma: primero del cliente, luego por IP
      const userLanguage = language || await detectPreferredLanguage(req);
      
      const user = await storage.createUser({
        username: `user_${nanoid(8)}`, // Username temporal
        email,
        password: tempPassword,
        firstName,
        lastName,
        companyName: companyName || null,
        partnerCategory: partnerCategory || null,
        marketSegment: marketSegment || null,
        country,
        address: address || null,
        city: city || null,
        zipCode: zipCode || null,
        contactNumber: contactNumber || null,
        region: region as "NOLA" | "SOLA" | "BRASIL" | "MEXICO",
        regionCategory: category as "ENTERPRISE" | "SMB" | "MSSP",
        regionSubcategory: subcategory || null,
        role: "user",
        isActive: true,
        isApproved: false, // REQUIERE APROBACIÓN de administrador
        isPasswordless: true, // Usuario passwordless
        preferredLanguage: userLanguage, // Guardar idioma preferido
      });

      // Generar magic link para primer acceso
      const loginToken = nanoid(32);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // Expira en 7 días para primer acceso

      await storage.updateUser(user.id, {
        loginToken,
        loginTokenExpiry: expiryDate,
      });

      // Enviar email de REGISTRO PASSWORDLESS (con diseño específico)
      await sendRegistroPasswordlessEmail({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        loginToken, // Magic link para acceso
        language: userLanguage, // Idioma del usuario
      });

      // Enviar notificaciones a los admins correspondientes
      if (user.region) {
        const userName = `${user.firstName} ${user.lastName}`;
        
        // 1. Notificar al super admin
        const allUsers = await storage.getAllUsers();
        const superAdmins = allUsers.filter(u => u.role === 'super-admin');
        
        for (const admin of superAdmins) {
          await NotificationHelpers.newUserRegistered(
            admin.id,
            userName,
            user.region
          );
        }

        // 2. Notificar al regional admin de la región del usuario
        const regionalAdmins = allUsers.filter(u => 
          u.role === 'regional-admin' && 
          u.adminRegionId && 
          u.region === user.region
        );
        
        for (const regionalAdmin of regionalAdmins) {
          await NotificationHelpers.newUserRegistered(
            regionalAdmin.id,
            userName,
            user.region
          );
        }
      }

      res.status(201).json({ 
        message: "Registro exitoso. Te hemos enviado un email de bienvenida. Tu cuenta será activada una vez aprobada por un administrador.",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      });
    } catch (error) {
      console.error("Register passwordless error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Request magic link for passwordless login
  app.post("/api/auth/request-magic-link", async (req, res) => {
    try {
      const { email, language } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Usuario no existe - debe registrarse primero
        return res.status(404).json({ 
          userExists: false,
          message: "No existe una cuenta con este email. Por favor, regístrate primero." 
        });
      }

      // Verificar si es admin - los admins deben usar contraseña
      const isAdmin = user.role === "admin" || user.role === "regional-admin" || user.role === "super-admin";
      if (isAdmin) {
        return res.status(403).json({ 
          userExists: true,
          isAdmin: true,
          requiresPassword: true,
          message: "Las cuentas de administrador deben usar contraseña para iniciar sesión." 
        });
      }

      // Si el usuario NO es passwordless (campo explícito en DB), debe usar contraseña
      if (user.isPasswordless === false && user.role === "user") {
        return res.status(403).json({ 
          userExists: true,
          requiresPassword: true,
          message: "Tu cuenta tiene contraseña configurada. Por favor, inicia sesión con tu contraseña." 
        });
      }

      // Verificar que el usuario esté aprobado
      if (!user.isApproved) {
        return res.status(403).json({ 
          userExists: true,
          needsApproval: true,
          message: "Tu cuenta está pendiente de aprobación. Recibirás un email cuando sea aprobada." 
        });
      }

      // Generar token de login (expira en 15 minutos)
      const loginToken = nanoid(32);
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + 15);

      // Guardar token en la base de datos
      await storage.updateUser(user.id, {
        loginToken,
        loginTokenExpiry: expiryDate,
      });

      // Usar idioma del cliente si viene, si no, detectar por IP
      const userLanguage = language || await detectPreferredLanguage(req);
      
      console.log('🌍 [Magic Link Request] Language from client:', language);
      console.log('🌍 [Magic Link Request] Final language:', userLanguage);

      // Enviar email con magic link usando el nuevo servicio con reintentos
      const emailResult = await sendMagicLinkEmail({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        loginToken,
        language: userLanguage,
      });

      if (!emailResult) {
        console.error("⚠️ Magic link email failed to send, but token was created");
      }

      res.json({ 
        userExists: true,
        message: "Te hemos enviado un enlace de acceso a tu correo electrónico.",
        emailSent: emailResult
      });
    } catch (error) {
      console.error("Request magic link error:", error);
      res.status(500).json({ message: "Failed to send magic link" });
    }
  });

  // Verify and login with magic link
  app.get("/api/auth/verify-magic-link/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      // Buscar usuario por loginToken
      const user = await storage.getUserByLoginToken(token);
      
      if (!user) {
        return res.status(404).json({ 
          valid: false,
          message: "Enlace inválido o expirado" 
        });
      }

      // Verificar que el token no haya expirado
      if (!user.loginTokenExpiry || new Date() > new Date(user.loginTokenExpiry)) {
        return res.status(400).json({ 
          valid: false,
          message: "Este enlace ha expirado. Solicita uno nuevo." 
        });
      }

      // VALIDAR SI EL USUARIO ESTÁ APROBADO
      if (!user.isApproved) {
        // Limpiar el token para que no se pueda reutilizar
        await storage.updateUser(user.id, {
          loginToken: null,
          loginTokenExpiry: null,
        });

        return res.status(403).json({ 
          valid: false,
          pendingApproval: true,
          message: "Tu cuenta está pendiente de aprobación. Un administrador debe aprobarla antes de que puedas acceder." 
        });
      }

      // Crear sesión automáticamente
      req.session.userId = user.id;
      req.session.userRole = user.role;

      // Limpiar el token (un solo uso)
      await storage.updateUser(user.id, {
        loginToken: null,
        loginTokenExpiry: null,
      });

      res.json({ 
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        }
      });
    } catch (error) {
      console.error("Verify magic link error:", error);
      res.status(500).json({ 
        valid: false,
        message: "Error al verificar el enlace" 
      });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Si es regional-admin, obtener info de su región
    let regionInfo = null;
    if (user.role === "regional-admin" && user.adminRegionId) {
      const regions = await storage.getAllRegionConfigs();
      regionInfo = regions.find(r => r.id === user.adminRegionId);
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      country: user.country,
      region: user.region, // Agregar el campo region del usuario
      regionCategory: user.regionCategory,
      regionSubcategory: user.regionSubcategory,
      adminRegionId: user.adminRegionId,
      regionInfo: regionInfo ? {
        id: regionInfo.id,
        name: regionInfo.name,
        region: regionInfo.region,
        category: regionInfo.category,
        subcategory: regionInfo.subcategory
      } : null
    });
  });

  // Update user profile (self-service)
  app.patch("/api/user/profile", async (req, res) => {
    console.log("🔵 PATCH /api/user/profile called");
    console.log("📦 Body:", req.body);
    console.log("👤 Session userId:", req.session?.userId);
    
    const userId = req.session?.userId;
    if (!userId) {
      console.log("❌ Not authenticated");
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { firstName, lastName, email, country, currentPassword, newPassword } = req.body;
      
      // Validar que al menos un campo esté presente
      if (!firstName && !lastName && !email && !country && !newPassword) {
        return res.status(400).json({ 
          message: "At least one field must be provided to update" 
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Preparar datos para actualizar
      const updates: any = {};

      if (firstName) updates.firstName = firstName;
      if (lastName) updates.lastName = lastName;
      if (country) updates.country = country;

      // Validar y actualizar email si cambió
      if (email && email !== user.email) {
        // Verificar que el nuevo email no esté en uso
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ 
            message: "Email already in use by another account" 
          });
        }
        updates.email = email;
      }

      // Cambio de contraseña
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ 
            message: "Current password is required to change password" 
          });
        }

        // Verificar contraseña actual
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ 
            message: "Current password is incorrect" 
          });
        }

        // Validar longitud de nueva contraseña
        if (newPassword.length < 6) {
          return res.status(400).json({ 
            message: "New password must be at least 6 characters" 
          });
        }

        updates.password = await bcrypt.hash(newPassword, 10);
      }

      // Actualizar timestamp
      updates.updatedAt = new Date();

      // Actualizar usuario
      const updatedUser = await storage.updateUser(userId, updates);

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update profile" });
      }

      res.json({ 
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          country: updatedUser.country
        }
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // User routes
  app.get("/api/users/stats", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user stats" });
    }
  });

  app.get("/api/users/leaderboard", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const topUsers = await storage.getTopUsersByPoints(limit);
      res.json(topUsers);
    } catch (error) {
      console.error("Failed to get leaderboard:", error);
      res.status(500).json({ message: "Failed to get leaderboard" });
    }
  });

  // Deal routes
  app.post("/api/deals", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { region, ...dealBody } = req.body;
      
      // Validar si ya existe un deal con el mismo número de licencia
      if (dealBody.licenseAgreementNumber) {
        const existingDeal = await storage.getDealByLicenseNumber(dealBody.licenseAgreementNumber);
        if (existingDeal) {
          return res.status(409).json({ 
            code: 'DUPLICATE_LICENSE_NUMBER',
            message: 'A deal with this license agreement number already exists',
            licenseNumber: dealBody.licenseAgreementNumber,
            existingDeal: {
              id: existingDeal.id,
              licenseAgreementNumber: existingDeal.licenseAgreementNumber,
              productType: existingDeal.productType,
              productName: existingDeal.productName,
              dealValue: existingDeal.dealValue,
              status: existingDeal.status,
              createdAt: existingDeal.createdAt
            }
          });
        }
      }
      
      // Convert region name to regionId
      let regionId = null;
      if (region) {
        // Get the first active region config for this region name
        const regionConfigs = await storage.getAllRegionConfigs();
        const matchingConfig = regionConfigs.find(config => 
          config.region === region && config.isActive
        );
        
        if (matchingConfig) {
          regionId = matchingConfig.id;
          console.log(`✅ Deal creation: Converting region "${region}" to regionId "${regionId}"`);
        } else {
          console.warn(`⚠️ Deal creation: No active region config found for "${region}"`);
        }
      }

      const dealData = insertDealSchema.parse({ 
        ...dealBody, 
        userId,
        regionId // Use the converted regionId instead of region name
      });
      
      const deal = await storage.createDeal(dealData);
      console.log(`🎯 Deal created successfully:`, { 
        dealId: deal.id, 
        regionName: region, 
        regionId: deal.regionId,
        productName: deal.productName 
      });
      
      res.status(201).json(deal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Deal creation error:", error);
      res.status(500).json({ message: "Failed to create deal" });
    }
  });

  app.get("/api/deals", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const deals = await storage.getUserDeals(userId);
      res.json(deals);
    } catch (error) {
      res.status(500).json({ message: "Failed to get deals" });
    }
  });

  app.get("/api/deals/recent", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const deals = await storage.getRecentDeals(userId, limit);
      res.json(deals);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recent deals" });
    }
  });

  app.post("/api/deals/:id/approve", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const deal = await storage.approveDeal(req.params.id, userId!);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      // Obtener información del usuario para enviar email
      const dealUser = await storage.getUser(deal.userId);
      if (dealUser && deal.pointsEarned && deal.pointsEarned > 0) {
        // Obtener total de goles del usuario después de aprobar
        const updatedUser = await storage.getUser(deal.userId);
        const totalGoles = updatedUser?.points || 0;
        
        // Detectar idioma preferido del usuario
        const userLanguage = await detectPreferredLanguage(req);
        
        await sendGolesRegistradosEmail({
          email: dealUser.email,
          firstName: dealUser.firstName,
          lastName: dealUser.lastName,
          producto: deal.productName,
          valorDeal: parseInt(deal.dealValue) || 0,
          golesSumados: deal.pointsEarned,
          totalGoles: totalGoles,
          language: userLanguage,
        });
      }
      
      res.json(deal);
    } catch (error) {
      console.error("Error approving deal:", error);
      res.status(500).json({ message: "Failed to approve deal" });
    }
  });

  app.post("/api/deals/:id/reject", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const deal = await storage.rejectDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      res.json(deal);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject deal" });
    }
  });

  app.patch("/api/admin/deals/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { updateDealSchema } = await import("@shared/schema");
      const updates = updateDealSchema.parse(req.body);
      const deal = await storage.updateDeal(req.params.id, updates);
      
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      res.json(deal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update deal" });
    }
  });

  // Delete deal endpoint (with audit log)
  app.delete("/api/admin/deals/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole) || !userId) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('user-agent');
      
      const deletedDeal = await storage.deleteDeal(
        req.params.id,
        user,
        ipAddress,
        userAgent
      );
      
      if (!deletedDeal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      res.json({ message: "Deal deleted successfully", deal: deletedDeal });
    } catch (error) {
      console.error("Error deleting deal:", error);
      res.status(500).json({ message: "Failed to delete deal" });
    }
  });

  // Get audit logs endpoint
  app.get("/api/admin/audit-logs", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { entityType, entityId, performedByUserId, limit, offset } = req.query;
      
      const logs = await storage.getAuditLogs({
        entityType: entityType as string | undefined,
        entityId: entityId as string | undefined,
        performedByUserId: performedByUserId as string | undefined,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      });
      
      res.json(logs);
    } catch (error) {
      console.error("Error getting audit logs:", error);
      res.status(500).json({ message: "Failed to get audit logs" });
    }
  });


  // Reward routes
  app.get("/api/rewards", async (req, res) => {
    try {
      const userId = req.session?.userId;
      let regionName: string | undefined;
      
      // Si hay usuario autenticado, obtener su región para filtrar rewards
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          // Admin y Super-admin ven todos los rewards (sin filtro)
          if (user.role === "admin" || user.role === "super-admin") {
            regionName = undefined;
          } else {
            // Usuarios regulares y regional-admins: filtrar por región
            regionName = user.region || user.country || undefined;
          }
        }
      }
      
      const rewards = await storage.getRewards(regionName);
      
      // Prevent caching to ensure fresh data after mutations
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ message: "Failed to get rewards" });
    }
  });

  // Admin reward creation endpoint
  app.post("/api/admin/rewards", async (req, res) => {
    console.log("POST /api/admin/rewards - Session:", req.session);
    console.log("POST /api/admin/rewards - Body:", req.body);
    
    const userRole = req.session?.userRole;
    console.log("User role:", userRole);
    
    if (!isAdminRole(userRole)) {
      console.log("Access denied - not admin");
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const rewardData = insertRewardSchema.parse(req.body);
      console.log("Parsed reward data:", rewardData);
      
      const newReward = await storage.createReward(rewardData);
      console.log("Created reward:", newReward);
      
      res.status(201).json(newReward);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("Validation error:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Create reward error:", error);
      res.status(500).json({ message: "Failed to create reward" });
    }
  });

  // Admin reward update endpoint
  app.patch("/api/admin/rewards/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedReward = await storage.updateReward(id, updates);
      if (!updatedReward) {
        return res.status(404).json({ message: "Reward not found" });
      }
      
      res.json(updatedReward);
    } catch (error) {
      console.error("Update reward error:", error);
      res.status(500).json({ message: "Failed to update reward" });
    }
  });

  // Admin reward delete endpoint
  app.delete("/api/admin/rewards/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      
      const deletedReward = await storage.deleteReward(id);
      if (!deletedReward) {
        return res.status(404).json({ message: "Reward not found" });
      }
      
      res.json({ message: "Reward deleted successfully", reward: deletedReward });
    } catch (error) {
      console.error("Delete reward error:", error);
      res.status(500).json({ message: "Failed to delete reward" });
    }
  });

  // Admin get all rewards endpoint
  app.get("/api/admin/rewards", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const rewards = await storage.getRewards();
      res.json(rewards);
    } catch (error) {
      console.error("Get admin rewards error:", error);
      res.status(500).json({ message: "Failed to get rewards" });
    }
  });

  // Admin endpoints for reward approval - MUST BE BEFORE /:id route
  app.get("/api/admin/rewards/pending", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const regionName = await getAdminRegion(userId);
      const pendingRedemptions = await storage.getPendingRewardRedemptions(regionName);
      res.json(pendingRedemptions);
    } catch (error) {
      console.error("Get pending redemptions error:", error);
      res.status(500).json({ message: "Failed to get pending redemptions" });
    }
  });

  // Admin endpoint to get all reward redemptions - MUST BE BEFORE /:id route
  app.get("/api/admin/rewards/redemptions", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const allRedemptions = await storage.getAllRewardRedemptions();
      res.json(allRedemptions);
    } catch (error) {
      console.error("Get all redemptions error:", error);
      res.status(500).json({ message: "Failed to get all redemptions" });
    }
  });

  // Admin get single reward endpoint - MUST BE AFTER specific routes
  app.get("/api/admin/rewards/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const reward = await storage.getReward(id);
      if (!reward) {
        return res.status(404).json({ message: "Reward not found" });
      }
      res.json(reward);
    } catch (error) {
      console.error("Get admin reward error:", error);
      res.status(500).json({ message: "Failed to get reward" });
    }
  });

  app.post("/api/rewards/:id/redeem", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userReward = await storage.redeemReward(userId, req.params.id);
      
      // Obtener información del usuario y recompensa para notificar al admin y al usuario
      const user = await storage.getUser(userId);
      const reward = await storage.getReward(req.params.id);
      
      if (user && reward) {
        // Detectar idioma preferido del usuario
        const userLanguage = await detectPreferredLanguage(req);
        
        // Enviar email al usuario confirmando que su solicitud está pendiente
        await sendPendienteAprobacionEmail({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          nombrePremio: reward.name,
          golesCanje: reward.pointsCost,
          language: userLanguage,
        });
        
        // Obtener email del primer admin para enviar notificación
        const allUsers = await storage.getAllUsers();
        const admins = allUsers.filter(u => u.role === 'admin');
        if (admins && admins.length > 0) {
          await sendRedemptionRequestToAdmin(
            admins[0].email,
            {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email
            },
            {
              rewardName: reward.name,
              pointsCost: reward.pointsCost,
              redemptionId: userReward.id
            }
          );
        }
      }
      
      res.json(userReward);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to redeem reward" });
      }
    }
  });

  app.get("/api/user-rewards", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userRewards = await storage.getUserRewardsWithDetails(userId);
      res.json(userRewards);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user rewards" });
    }
  });


  app.post("/api/admin/rewards/:redemptionId/approve", async (req, res) => {
    const userRole = req.session?.userRole;
    const adminId = req.session?.userId;
    
    if (!isAdminRole(userRole) || !adminId) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { redemptionId } = req.params;
      const updatedRedemption = await storage.approveRewardRedemption(redemptionId, adminId);
      
      if (!updatedRedemption) {
        return res.status(404).json({ message: "Redemption not found" });
      }
      
      // Obtener información del usuario y recompensa para enviar email
      const user = await storage.getUser(updatedRedemption.userId);
      const reward = await storage.getReward(updatedRedemption.rewardId);
      
      if (user && reward) {
        const userLanguage = await detectPreferredLanguage(req, user);
        await sendRedemptionApprovedEmail(
          user.email,
          user.firstName,
          user.lastName,
          {
            rewardName: reward.name,
            pointsCost: reward.pointsCost,
            status: updatedRedemption.status,
            estimatedDeliveryDays: reward.estimatedDeliveryDays || undefined,
            language: userLanguage
          }
        );
      }
      
      res.json(updatedRedemption);
    } catch (error) {
      console.error("Approve redemption error:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to approve redemption" });
      }
    }
  });

  app.post("/api/admin/rewards/:redemptionId/reject", async (req, res) => {
    const userRole = req.session?.userRole;
    const adminId = req.session?.userId;
    
    if (!isAdminRole(userRole) || !adminId) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { redemptionId } = req.params;
      const { reason } = req.body;
      
      const updatedRedemption = await storage.rejectRewardRedemption(redemptionId, adminId, reason);
      
      if (!updatedRedemption) {
        return res.status(404).json({ message: "Redemption not found" });
      }
      
      res.json(updatedRedemption);
    } catch (error) {
      console.error("Reject redemption error:", error);
      res.status(500).json({ message: "Failed to reject redemption" });
    }
  });


  // Admin endpoint to update reward shipment status
  app.put("/api/admin/rewards/:redemptionId/shipment", async (req, res) => {
    const userRole = req.session?.userRole;
    const adminId = req.session?.userId;
    
    if (!isAdminRole(userRole) || !adminId) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { redemptionId } = req.params;
      const { shipmentStatus } = req.body;

      // Validate shipment status
      if (!["pending", "shipped", "delivered"].includes(shipmentStatus)) {
        return res.status(400).json({ message: "Invalid shipment status" });
      }

      const updatedRedemption = await storage.updateRewardShipmentStatus(redemptionId, shipmentStatus, adminId);
      
      if (updatedRedemption) {
        res.json({ 
          message: `Reward shipment status updated to ${shipmentStatus}`,
          shipmentStatus: updatedRedemption.shipmentStatus
        });
      } else {
        res.status(404).json({ message: "Redemption not found" });
      }
    } catch (error) {
      console.error("Update shipment status error:", error);
      res.status(500).json({ message: "Failed to update shipment status" });
    }
  });

  // Points routes
  app.get("/api/points/history", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const history = await storage.getUserPointsHistory(userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to get points history" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (userRole !== "admin" && userRole !== "regional-admin" && userRole !== "super-admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const regionName = await getAdminRegion(userId);
      const users = await storage.getAllUsers(regionName);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Admin create user endpoint
  app.post("/api/admin/users", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUserByUsername = await storage.getUserByUsername(userData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      res.status(201).json({ 
        id: user.id, 
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        country: user.country,
        isActive: user.isActive,
        createdAt: user.createdAt
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Admin user creation error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/admin/users/:userId/role", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }

      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(userId, role as "user" | "admin");
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Update user information endpoint
  app.patch("/api/admin/users/:userId", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { userId } = req.params;
      const updateData = updateUserSchema.parse(req.body);

      // Check if username or email already exists (excluding current user)
      if (updateData.username) {
        const existingUserByUsername = await storage.getUserByUsername(updateData.username);
        if (existingUserByUsername && existingUserByUsername.id !== userId) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }

      if (updateData.email) {
        const existingUserByEmail = await storage.getUserByEmail(updateData.email);
        if (existingUserByEmail && existingUserByEmail.id !== userId) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user endpoint
  app.delete("/api/admin/users/:userId", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { userId } = req.params;
      const currentUserId = req.session?.userId;

      // Prevent admin from deleting themselves
      if (userId === currentUserId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const deletedUser = await storage.deleteUser(userId);
      if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully", userId });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // User Invitation Endpoints
  // Invite single user
  app.post("/api/admin/users/invite", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { 
        email, 
        firstName, 
        lastName,
        companyName,
        partnerCategory,
        marketSegment,
        country,
        address,
        city,
        zipCode,
        contactNumber
      } = req.body;
      
      if (!email || !firstName || !lastName) {
        return res.status(400).json({ 
          message: "Email, first name, and last name are required" 
        });
      }

      // Get admin info to determine region context
      const adminUser = await storage.getUser(userId!);
      
      // Check if user already exists in the same region (for regional admins)
      // or globally (for super admins who can invite to any region)
      let existingUser;
      
      if (adminUser?.role === 'regional-admin' && adminUser.region) {
        // Regional admin: only check within their region
        existingUser = await storage.getUserByEmailAndRegion(email, adminUser.region);
        
        if (existingUser) {
          return res.status(400).json({ 
            message: `Ya existe un usuario con este email en la región ${adminUser.region}. Un mismo email puede existir en diferentes regiones, pero no puede duplicarse dentro de la misma región.` 
          });
        }
      } else {
        // Super admin or other admin: check globally to avoid confusion
        existingUser = await storage.getUserByEmail(email);
        
        if (existingUser) {
          return res.status(400).json({ 
            message: "Ya existe un usuario con este email en el sistema. Si necesitas invitar al usuario a una región específica, contacta al administrador regional correspondiente." 
          });
        }
      }

      // Generate invite token
      const inviteToken = nanoid(32);

      // Create a temporary username (will be set during registration)
      const tempUsername = `user_${nanoid(8)}`;
      
      const adminName = adminUser 
        ? `${adminUser.firstName} ${adminUser.lastName}` 
        : "Administrator";

      // Create user with pending status, invitation tracking and company fields
      const hashedPassword = await bcrypt.hash(nanoid(16), 10); // temporary password
      
      const newUser = await storage.createUser({
        username: tempUsername,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        companyName: companyName || null,
        partnerCategory: partnerCategory || null,
        marketSegment: marketSegment || null,
        country: country || null,
        address: address || null,
        city: city || null,
        zipCode: zipCode || null,
        contactNumber: contactNumber || null,
        role: "user",
        isActive: true,
        isApproved: false,
        inviteToken,
        invitedBy: userId, // Track who sent the invitation
        invitedFromRegion: adminUser?.region || null, // Track from which region the invitation was sent
      });

      // Detectar idioma basado en el país del usuario invitado
      let userLanguage: 'es' | 'pt' | 'en' = 'es';
      if (country) {
        const countryLower = country.toLowerCase();
        if (countryLower.includes('brasil') || countryLower.includes('brazil')) {
          userLanguage = 'pt';
        } else if (countryLower.includes('estados unidos') || countryLower.includes('united states') || countryLower.includes('canada')) {
          userLanguage = 'en';
        }
      }
      
      // Guardar idioma preferido en el usuario
      await storage.updateUser(newUser.id, {
        preferredLanguage: userLanguage
      });
      
      // Send Registro Exitoso email (Kaspersky Cup welcome/invite email)
      const emailSent = await sendRegistroExitosoEmail({
        email,
        firstName,
        lastName,
        inviteToken,
        language: userLanguage
      });

      if (!emailSent) {
        console.warn("Failed to send registro exitoso email, but user was created");
      }

      res.status(201).json({ 
        message: "Invitation sent successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          inviteToken: newUser.inviteToken,
        }
      });
    } catch (error) {
      console.error("Invite user error:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  // Invite multiple users via CSV
  app.post("/api/admin/users/invite-bulk", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { users } = req.body;
      
      if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ 
          message: "Users array is required and must not be empty" 
        });
      }

      // Get admin info for emails
      const adminUser = await storage.getUser(userId!);
      const adminName = adminUser 
        ? `${adminUser.firstName} ${adminUser.lastName}` 
        : "Administrator";

      const results = {
        success: [] as any[],
        failed: [] as any[],
      };

      for (const userData of users) {
        try {
          const { 
            email, 
            firstName, 
            lastName,
            companyName,
            partnerCategory,
            marketSegment,
            country,
            address,
            city,
            zipCode,
            contactNumber
          } = userData;
          
          if (!email || !firstName || !lastName) {
            results.failed.push({
              email: email || 'unknown',
              reason: 'Missing required fields',
            });
            continue;
          }

          // Check if user already exists in the appropriate scope
          let existingUser;
          
          if (adminUser?.role === 'regional-admin' && adminUser.region) {
            // Regional admin: only check within their region
            existingUser = await storage.getUserByEmailAndRegion(email, adminUser.region);
            
            if (existingUser) {
              results.failed.push({
                email,
                reason: `Usuario ya existe en la región ${adminUser.region}`,
              });
              continue;
            }
          } else {
            // Super admin or other admin: check globally
            existingUser = await storage.getUserByEmail(email);
            
            if (existingUser) {
              results.failed.push({
                email,
                reason: 'Usuario ya existe en el sistema',
              });
              continue;
            }
          }

          // Generate invite token
          const inviteToken = nanoid(32);
          const tempUsername = `user_${nanoid(8)}`;
          const hashedPassword = await bcrypt.hash(nanoid(16), 10);
          
          // Create user with company fields
          const newUser = await storage.createUser({
            username: tempUsername,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            companyName: companyName || null,
            partnerCategory: partnerCategory || null,
            marketSegment: marketSegment || null,
            country: country || null,
            address: address || null,
            city: city || null,
            zipCode: zipCode || null,
            contactNumber: contactNumber || null,
            role: "user",
            isActive: true,
            isApproved: false,
            inviteToken,
            invitedBy: userId, // Track who sent the invitation
            invitedFromRegion: adminUser?.region || null, // Track from which region the invitation was sent
          });

          // Detectar idioma basado en el país del usuario invitado
          let userLanguage: 'es' | 'pt' | 'en' = 'es';
          if (country) {
            const countryLower = country.toLowerCase();
            if (countryLower.includes('brasil') || countryLower.includes('brazil')) {
              userLanguage = 'pt';
            } else if (countryLower.includes('estados unidos') || countryLower.includes('united states') || countryLower.includes('canada')) {
              userLanguage = 'en';
            }
          }
          
          // Guardar idioma preferido en el usuario
          await storage.updateUser(newUser.id, {
            preferredLanguage: userLanguage
          });
          
          // Send Registro Exitoso email (Kaspersky Cup welcome/invite email)
          const emailSent = await sendRegistroExitosoEmail({
            email,
            firstName,
            lastName,
            inviteToken,
            language: userLanguage
          });

          results.success.push({
            email,
            firstName,
            lastName,
            emailSent,
          });
        } catch (error) {
          results.failed.push({
            email: userData.email || 'unknown',
            reason: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      res.json({
        message: `Processed ${users.length} invitations`,
        summary: {
          total: users.length,
          successful: results.success.length,
          failed: results.failed.length,
        },
        results,
      });
    } catch (error) {
      console.error("Bulk invite error:", error);
      res.status(500).json({ message: "Failed to process bulk invitations" });
    }
  });

  // Complete registration with invite token
  app.post("/api/auth/register-with-token", async (req, res) => {
    try {
      const { inviteToken, username, password, country, region, category, subcategory } = req.body;
      
      if (!inviteToken || !username || !country || !region || !category) {
        return res.status(400).json({ 
          message: "Invite token, username, country, region, and category are required" 
        });
      }

      // Find user by invite token
      const user = await storage.getUserByInviteToken(inviteToken);
      
      if (!user) {
        return res.status(404).json({ 
          message: "Invalid or expired invitation" 
        });
      }

      if (user.isApproved) {
        return res.status(400).json({ 
          message: "This invitation has already been used" 
        });
      }

      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ 
          message: "Username already exists" 
        });
      }

      // Determine region assignment based on who sent the invitation
      let finalRegion: "NOLA" | "SOLA" | "BRASIL" | "MEXICO";
      let finalCategory: "ENTERPRISE" | "SMB" | "MSSP";
      let finalSubcategory: string | null = subcategory || null;

      // If invited by a regional admin, auto-assign their region
      if (user.invitedFromRegion && user.invitedBy) {
        const invitingAdmin = await storage.getUser(user.invitedBy);
        
        if (invitingAdmin && invitingAdmin.role === 'regional-admin') {
          // Regional admin invitation - lock to their region
          finalRegion = user.invitedFromRegion;
          finalCategory = category as "ENTERPRISE" | "SMB" | "MSSP";
          
          console.log(`User invited by regional admin - auto-assigning region: ${finalRegion}`);
        } else {
          // Super admin or other admin - use user's choice
          finalRegion = region as "NOLA" | "SOLA" | "BRASIL" | "MEXICO";
          finalCategory = category as "ENTERPRISE" | "SMB" | "MSSP";
        }
      } else {
        // Direct registration or no invitation tracking - use user's choice
        finalRegion = region as "NOLA" | "SOLA" | "BRASIL" | "MEXICO";
        finalCategory = category as "ENTERPRISE" | "SMB" | "MSSP";
      }

      // Update user - password is optional (if not provided, user will use magic link)
      const updateData: any = {
        username,
        country,
        region: finalRegion,
        regionCategory: finalCategory,
        regionSubcategory: finalSubcategory,
        isApproved: false, // REQUIERE aprobación de administrador
        inviteToken: null, // Clear the token after use
      };

      // Si se proporciona contraseña, actualizar con hash
      if (password && password.trim() !== "") {
        updateData.password = await bcrypt.hash(password, 10);
        updateData.isPasswordless = false;
      } else {
        // Sin contraseña - marcar como passwordless para usar magic link
        updateData.isPasswordless = true;
      }
      
      const updatedUser = await storage.updateUser(user.id, updateData);

      // NO enviar email de bienvenida aún - se enviará cuando sea aprobado
      // await sendBienvenidaEmail(...)

      res.status(200).json({ 
        message: "Registro completado. Tu cuenta está pendiente de aprobación por un administrador.",
        regionAutoAssigned: user.invitedFromRegion && user.invitedBy ? true : false,
        assignedRegion: finalRegion,
        needsApproval: true,
        user: {
          id: updatedUser!.id,
          username: updatedUser!.username,
          email: updatedUser!.email,
          firstName: updatedUser!.firstName,
          lastName: updatedUser!.lastName,
          region: updatedUser!.region,
          category: updatedUser!.regionCategory,
          subcategory: updatedUser!.regionSubcategory,
        }
      });
    } catch (error) {
      console.error("Register with token error:", error);
      res.status(500).json({ message: "Failed to complete registration" });
    }
  });

  // Verify invite token (for checking if valid before showing form)
  app.get("/api/auth/verify-invite/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const user = await storage.getUserByInviteToken(token);
      
      if (!user) {
        return res.status(404).json({ 
          valid: false,
          message: "Invalid or expired invitation" 
        });
      }

      if (user.isApproved) {
        return res.status(400).json({ 
          valid: false,
          message: "This invitation has already been used" 
        });
      }

      res.json({ 
        valid: true,
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          country: user.country,
        },
        invitation: {
          isRegionalInvite: !!user.invitedFromRegion,
          region: user.invitedFromRegion,
          invitedBy: user.invitedBy,
        }
      });
    } catch (error) {
      console.error("Verify invite token error:", error);
      res.status(500).json({ 
        valid: false,
        message: "Failed to verify invitation" 
      });
    }
  });

  // Passwordless login with invite token (one-time use)
  app.get("/api/auth/passwordless-login/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      console.log("🔐 Passwordless login attempt with token:", token);

      // Find user by invite token
      const user = await storage.getUserByInviteToken(token);
      
      if (!user) {
        console.log("❌ Invalid token");
        return res.status(404).json({ 
          success: false,
          message: "Invalid or expired invitation link" 
        });
      }

      // Check if already used (already approved means token was used)
      if (user.isApproved && !user.inviteToken) {
        console.log("❌ Token already used");
        return res.status(400).json({ 
          success: false,
          message: "This invitation link has already been used" 
        });
      }

      // Generate automatic username if not exists
      let username = user.username;
      if (!username || username.startsWith('user_')) {
        // Generate username from email
        const emailPrefix = user.email.split('@')[0];
        const randomSuffix = nanoid(4);
        username = `${emailPrefix}_${randomSuffix}`;
        
        // Ensure username is unique
        let existingUser = await storage.getUserByUsername(username);
        while (existingUser) {
          username = `${emailPrefix}_${nanoid(6)}`;
          existingUser = await storage.getUserByUsername(username);
        }
      }

      // Generate automatic password (user won't see it)
      const autoPassword = nanoid(32); // Strong random password
      const hashedPassword = await bcrypt.hash(autoPassword, 10);

      // Update user: set username, password, and clear invite token
      // NO auto-aprobar - requiere aprobación de administrador
      const updatedUser = await storage.updateUser(user.id, {
        username,
        password: hashedPassword,
        isApproved: false, // REQUIERE aprobación de administrador
        inviteToken: null, // Clear token (one-time use)
      });

      if (!updatedUser) {
        console.log("❌ Failed to update user");
        return res.status(500).json({ 
          success: false,
          message: "Failed to activate account" 
        });
      }

      // NO crear sesión automáticamente - el usuario debe esperar aprobación
      // NO enviar email de bienvenida aún

      console.log("✅ User registration completed, pending approval for:", updatedUser.email);

      res.json({ 
        success: true,
        needsApproval: true,
        message: "Cuenta creada exitosamente. Está pendiente de aprobación por un administrador.",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          country: updatedUser.country,
        }
      });
    } catch (error) {
      console.error("❌ Passwordless login error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to process login" 
      });
    }
  });

  app.get("/api/admin/deals", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (userRole !== "admin" && userRole !== "regional-admin" && userRole !== "super-admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const regionName = await getAdminRegion(userId);
      
      const result = await storage.getAllDeals(page, limit, regionName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to get all deals" });
    }
  });

  app.get("/api/admin/deals/pending", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (userRole !== "admin" && userRole !== "regional-admin" && userRole !== "super-admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const regionName = await getAdminRegion(userId);
      const deals = await storage.getPendingDeals(regionName);
      res.json(deals);
    } catch (error) {
      res.status(500).json({ message: "Failed to get pending deals" });
    }
  });

  app.get("/api/admin/reports", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const regionName = await getAdminRegion(userId);
      
      const filters = {
        country: req.query.country === "all" ? undefined : req.query.country as string,
        partnerLevel: req.query.partnerLevel === "all" ? undefined : req.query.partnerLevel as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        regionName, // Filtro de región para regional-admin
      };

      const data = await storage.getReportsData(filters);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to get reports data" });
    }
  });

  app.get("/api/admin/top-scorers", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      let regionName: string;
      
      // If super-admin and region is specified in query, use it
      if (userRole === 'super-admin' && req.query.region && req.query.region !== 'all') {
        regionName = req.query.region as string;
      } else {
        // Otherwise, get the admin's region (returns 'all' for super-admin)
        regionName = await getAdminRegion(userId);
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const topScorers = await storage.getTopScorers(regionName, limit);
      res.json(topScorers);
    } catch (error) {
      console.error("Error getting top scorers:", error);
      res.status(500).json({ message: "Failed to get top scorers" });
    }
  });

  app.get("/api/admin/reports/user-ranking", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const data = await storage.getUserRankingReport(filters);
      res.json(data);
    } catch (error) {
      console.error("Error getting user ranking report:", error);
      res.status(500).json({ message: "Failed to get user ranking report" });
    }
  });

  app.get("/api/admin/reports/user-ranking/export", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      // Using statically imported XLSX
      
      // Get admin's region (only for regional-admins)
      const regionName = userId ? await getAdminRegion(userId) : undefined;
      
      // If super-admin and region query param provided, use that
      const queryRegion = req.query.region as string | undefined;
      const effectiveRegion = userRole === "super-admin" && queryRegion ? queryRegion : regionName;
      
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        regionName: effectiveRegion,
      };

      const data = await storage.getUserRankingReport(filters);
      
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Prepare data for Excel
      const excelData = data.map((user, index) => ({
        'Ranking': index + 1,
        'Username': user.username,
        'Name': `${user.firstName} ${user.lastName}`.trim(),
        'Email': user.email,
        'Country': user.country,
        'Total Points': user.totalPoints,
        'Total Deals': user.totalDeals,
        'Total Sales ($)': user.totalSales.toFixed(2)
      }));
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-size columns
      const columnWidths = [
        { wch: 10 }, // Ranking
        { wch: 15 }, // Username
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 15 }, // Country
        { wch: 15 }, // Total Points
        { wch: 15 }, // Total Deals
        { wch: 20 }  // Total Sales
      ];
      worksheet['!cols'] = columnWidths;
      
      // Add worksheet to workbook
      const sheetName = `User Ranking ${new Date().toISOString().split('T')[0]}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx',
        compression: true 
      });
      
      // Set response headers for file download
      const filename = `user-ranking-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', excelBuffer.length);
      
      // Send the file
      res.send(excelBuffer);
      
    } catch (error) {
      console.error("Error generating Excel report:", error);
      res.status(500).json({ message: "Failed to generate Excel report" });
    }
  });

  app.get("/api/admin/reports/reward-redemptions", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const data = await storage.getRewardRedemptionsReport(filters);
      res.json(data);
    } catch (error) {
      console.error("Error getting reward redemptions report:", error);
      res.status(500).json({ message: "Failed to get reward redemptions report" });
    }
  });

  app.get("/api/admin/reports/reward-redemptions/export", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      // Get admin's region (only for regional-admins)
      const regionName = userId ? await getAdminRegion(userId) : undefined;
      
      // If super-admin and region query param provided, use that
      const queryRegion = req.query.region as string | undefined;
      const effectiveRegion = userRole === "super-admin" && queryRegion ? queryRegion : regionName;
      
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        regionName: effectiveRegion,
      };

      const data = await storage.getRewardRedemptionsReport(filters);
      
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Prepare data for Excel
      const excelData = data.map((redemption, index) => ({
        'No.': index + 1,
        'Username': redemption.userName || 'N/A',
        'Name': `${redemption.userFirstName || ''} ${redemption.userLastName || ''}`.trim() || 'N/A',
        'Email': redemption.userEmail || 'N/A',
        'Reward': redemption.rewardName || 'N/A',
        'Points Cost': redemption.pointsCost || 0,
        'Status': redemption.status || 'N/A',
        'Redeemed Date': redemption.redeemedAt ? new Date(redemption.redeemedAt).toLocaleDateString() : 'N/A',
        'Approved Date': redemption.approvedAt ? new Date(redemption.approvedAt).toLocaleDateString() : 'N/A'
      }));
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-size columns
      const columnWidths = [
        { wch: 8 },  // No.
        { wch: 15 }, // Username
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 30 }, // Reward
        { wch: 12 }, // Points Cost
        { wch: 12 }, // Status
        { wch: 15 }, // Redeemed Date
        { wch: 15 }  // Approved Date
      ];
      worksheet['!cols'] = columnWidths;
      
      // Add worksheet to workbook
      const sheetName = `Reward Redemptions ${new Date().toISOString().split('T')[0]}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx',
        compression: true 
      });
      
      // Set response headers for file download
      const filename = `reward-redemptions-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', excelBuffer.length);
      
      // Send the file
      res.send(excelBuffer);
      
    } catch (error) {
      console.error("Error generating reward redemptions Excel report:", error);
      res.status(500).json({ message: "Failed to generate reward redemptions Excel report" });
    }
  });

  // CSV upload routes
  app.post("/api/admin/csv/upload-url", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      // Generate a unique upload ID
      const uploadId = `csv-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Get the base URL from environment or request
      const protocol = req.protocol || 'https';
      const host = req.get('host') || 'kasperskycup.com';
      const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
      
      const uploadURL = `${baseUrl}/api/admin/csv/upload/${uploadId}`;
      console.log(`📋 Generated upload URL: ${uploadURL}`);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Receive CSV upload
  app.put("/api/admin/csv/upload/:uploadId", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      let csvContent = '';
      
      req.on('data', (chunk) => {
        csvContent += chunk.toString();
      });

      req.on('end', () => {
        // Store in memory temporarily
        if (!global.csvUploads) {
          global.csvUploads = {};
        }
        global.csvUploads[req.params.uploadId] = csvContent;
        
        console.log(`📤 CSV uploaded: ${req.params.uploadId}, size: ${csvContent.length} bytes`);
        console.log(`📋 First 200 chars: ${csvContent.substring(0, 200)}`);
        
        res.json({ 
          message: "CSV uploaded successfully",
          path: req.params.uploadId
        });
      });

      req.on('error', (error) => {
        console.error("Error reading CSV upload:", error);
        res.status(500).json({ message: "Failed to read CSV upload" });
      });
    } catch (error) {
      console.error("Error uploading CSV:", error);
      res.status(500).json({ message: "Failed to upload CSV" });
    }
  });

  // Users CSV upload URL endpoint
  app.post("/api/admin/csv/users/upload-url", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      // Generate a unique upload ID
      const uploadId = `users-csv-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Get the base URL from environment or request
      const protocol = req.protocol || 'https';
      const host = req.get('host') || 'kasperskycup.com';
      const baseUrl = process.env.APP_URL || `${protocol}://${host}`;
      
      const uploadURL = `${baseUrl}/api/admin/csv/users/upload/${uploadId}`;
      console.log(`📋 Generated users upload URL: ${uploadURL}`);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting users CSV upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Receive users CSV upload
  app.put("/api/admin/csv/users/upload/:uploadId", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      let csvContent = '';
      
      req.on('data', (chunk) => {
        csvContent += chunk.toString();
      });

      req.on('end', () => {
        // Store in memory temporarily
        if (!global.csvUploads) {
          global.csvUploads = {};
        }
        global.csvUploads[req.params.uploadId] = csvContent;
        
        res.json({ 
          message: "Users CSV uploaded successfully",
          path: req.params.uploadId
        });
      });
    } catch (error) {
      console.error("Error uploading users CSV:", error);
      res.status(500).json({ message: "Failed to upload CSV" });
    }
  });

  // Calculate points based on product type and deal value
  function calculatePointsForDeal(productType: string, dealValue: number): number {
    const value = Number(dealValue);
    if (isNaN(value) || value <= 0) return 0;

    switch (productType) {
      case "software":
        return Math.floor(value / 1000); // 1 point per $1000
      case "hardware":
        return Math.floor(value / 5000); // 1 point per $5000
      case "equipment":
        return Math.floor(value / 10000); // 1 point per $10000
      default:
        return 0;
    }
  }

  app.post("/api/admin/csv/process", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { csvPath } = req.body;
      console.log(`🔄 Processing CSV request. csvPath:`, csvPath);
      console.log(`📊 Request body:`, req.body);
      console.log(`📂 Available uploads:`, Object.keys(global.csvUploads || {}));
      
      if (!csvPath) {
        return res.status(400).json({ message: "CSV path is required" });
      }

      // Extract upload ID from URL (csvPath might be full URL or just the ID)
      let uploadId = csvPath;
      if (csvPath.includes('/')) {
        // Extract ID from URL like "http://localhost:5000/api/admin/csv/upload/csv-123456-abc"
        const parts = csvPath.split('/');
        uploadId = parts[parts.length - 1];
      }
      
      console.log(`🔑 Extracted upload ID: ${uploadId}`);

      // Get CSV content from memory
      const csvContent = global.csvUploads?.[uploadId];
      if (!csvContent) {
        console.error(`❌ CSV not found in memory with ID: ${uploadId}`);
        return res.status(404).json({ message: "CSV file not found. Please upload again." });
      }
      
      console.log(`✅ Found CSV in memory, length: ${csvContent.length} bytes`);
      console.log(`📄 First 200 chars:`, csvContent.substring(0, 200));
      
      // Helper function to parse CSV line respecting quotes
      function parseCSVLine(line: string): string[] {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      }
      
      // Parse CSV content
      const lines = csvContent.trim().split('\n');
      console.log(`📝 Total lines: ${lines.length}`);
      
      if (lines.length < 2) {
        return res.status(400).json({ message: "CSV file must have at least a header and one data row" });
      }

      const header = parseCSVLine(lines[0].toLowerCase());
      console.log(`📋 Header columns:`, header);
      
      // Check which format is being used
      const isEnglishFormat = header.includes('user id') && header.includes('type of deal');
      const isSpanishFormat = header.includes('usuario') && header.includes('tipo');
      
      console.log(`🌍 Format check: English=${isEnglishFormat}, Spanish=${isSpanishFormat}`);
      
      if (!isEnglishFormat && !isSpanishFormat) {
        return res.status(400).json({ 
          message: `CSV must have either English format (USER ID, TYPE OF DEAL, DEAL ID, AMOUNT USD, DATE) or Spanish format (usuario, valor, status, tipo). Found: ${header.join(', ')}` 
        });
      }

      let userIdIndex: number, typeIndex: number, dealIdIndex: number, amountIndex: number, dateIndex: number, statusIndex: number;
      
      if (isEnglishFormat) {
        // English format: USER ID, TYPE OF DEAL, DEAL ID, AMOUNT USD, DATE
        userIdIndex = header.indexOf('user id');
        typeIndex = header.indexOf('type of deal');
        dealIdIndex = header.indexOf('deal id');
        amountIndex = header.indexOf('amount usd');
        dateIndex = header.indexOf('date');
        statusIndex = -1; // Not used in English format
      } else {
        // Spanish format: usuario, valor, status, tipo, acuerdo (optional)
        userIdIndex = header.indexOf('usuario');
        amountIndex = header.indexOf('valor');
        statusIndex = header.indexOf('status');
        typeIndex = header.indexOf('tipo');
        dealIdIndex = header.indexOf('acuerdo'); // Optional
        dateIndex = -1; // Not used in Spanish format
      }

      const dealsToInsert = [];
      const errors = [];

      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        console.log(`📝 Row ${i + 1} parsed:`, row);
        
        if (row.length < header.length - 1) { // Allow optional columns
          errors.push(`Row ${i + 1}: Column count mismatch`);
          continue;
        }

        let userIdentifier: string, typeOfDeal: string, dealId: string, amountStr: string, dateStr: string, status: string;
        
        if (isEnglishFormat) {
          // English format processing
          userIdentifier = row[userIdIndex]; // Email
          typeOfDeal = row[typeIndex]?.toUpperCase() || '';
          dealId = row[dealIdIndex] || '';
          amountStr = row[amountIndex]?.replace(/[$,]/g, '') || '0'; // Remove $ and commas
          dateStr = row[dateIndex] || '';
          status = 'approved'; // Auto-approve English format imports
          
          console.log(`💰 Row ${i + 1} - Raw amount: "${row[amountIndex]}", Cleaned: "${amountStr}"`);
        } else {
          // Spanish format processing
          userIdentifier = row[userIdIndex]; // Username
          const tipo = row[typeIndex]?.toLowerCase() || '';
          dealId = dealIdIndex >= 0 ? (row[dealIdIndex] || '') : '';
          amountStr = row[amountIndex] || '0';
          dateStr = ''; // Use current date for Spanish format
          status = row[statusIndex]?.toLowerCase() || 'pending';
          
          // Map Spanish tipo to English type
          if (tipo === 'software') typeOfDeal = 'NEW CLIENT';
          else if (tipo === 'hardware') typeOfDeal = 'RENEWAL';
          else if (tipo === 'equipment') typeOfDeal = 'UPSELL';
          else typeOfDeal = tipo.toUpperCase();
        }

        // Validate data
        if (!userIdentifier) {
          errors.push(`Row ${i + 1}: User identifier (email or username) is required`);
          continue;
        }

        if (!amountStr || isNaN(parseFloat(amountStr))) {
          console.log(`❌ Row ${i + 1} - Invalid amount: "${amountStr}", isNaN: ${isNaN(parseFloat(amountStr))}`);
          errors.push(`Row ${i + 1}: Amount must be a valid number`);
          continue;
        }

        if (isEnglishFormat) {
          if (!['NEW CLIENT', 'RENEWAL', 'UPSELL'].includes(typeOfDeal)) {
            errors.push(`Row ${i + 1}: TYPE OF DEAL must be NEW CLIENT, RENEWAL, or UPSELL`);
            continue;
          }
          if (!dealId) {
            errors.push(`Row ${i + 1}: DEAL ID is required`);
            continue;
          }
        } else {
          if (!['pending', 'approved', 'rejected'].includes(status)) {
            errors.push(`Row ${i + 1}: Status must be pending, approved, or rejected`);
            continue;
          }
        }

        // Parse date (only for English format)
        let closeDate: Date;
        if (dateStr) {
          try {
            const dateParts = dateStr.split('/');
            if (dateParts.length === 3) {
              const month = parseInt(dateParts[0]);
              const day = parseInt(dateParts[1]);
              const year = parseInt(dateParts[2]);
              
              // If day > 12, it must be DD/MM/YYYY format
              if (day > 12) {
                closeDate = new Date(year, parseInt(dateParts[1]) - 1, month);
              } else {
                closeDate = new Date(year, month - 1, day);
              }
            } else {
              closeDate = new Date(dateStr);
            }
            
            if (isNaN(closeDate.getTime())) {
              errors.push(`Row ${i + 1}: Invalid date format. Use MM/DD/YYYY or DD/MM/YYYY`);
              continue;
            }
          } catch (error) {
            errors.push(`Row ${i + 1}: Invalid date format`);
            continue;
          }
        } else {
          closeDate = new Date(); // Use current date if not provided
        }

        // Find user by email or username
        let user;
        if (isEnglishFormat || userIdentifier.includes('@')) {
          user = await storage.getUserByEmail(userIdentifier);
        } else {
          user = await storage.getUserByUsername(userIdentifier);
        }
        
        if (!user) {
          errors.push(`Row ${i + 1}: User '${userIdentifier}' not found`);
          continue;
        }

        // Map type to product type
        let productType: "software" | "hardware" | "equipment";
        if (typeOfDeal === "NEW CLIENT" || typeOfDeal === 'SOFTWARE') {
          productType = "software";
        } else if (typeOfDeal === "RENEWAL" || typeOfDeal === 'HARDWARE') {
          productType = "hardware";
        } else {
          productType = "equipment";
        }

        const dealStatus = status as "pending" | "approved" | "rejected";
        const pointsEarned = dealStatus === "approved" ? calculatePointsForDeal(productType, parseFloat(amountStr)) : 0;

        dealsToInsert.push({
          userId: user.id,
          productType: productType,
          productName: dealId ? `${typeOfDeal} - Deal #${dealId}` : `${typeOfDeal} Deal`,
          dealValue: amountStr,
          quantity: 1,
          closeDate: closeDate,
          clientInfo: `Imported from CSV on ${new Date().toISOString()}. Type: ${typeOfDeal}`,
          licenseAgreementNumber: dealId || undefined,
          status: dealStatus,
          pointsEarned: pointsEarned,
        });
      }

      if (errors.length > 0 && dealsToInsert.length === 0) {
        return res.status(400).json({ 
          message: "No valid deals to import", 
          errors: errors.slice(0, 10) // Limit error messages
        });
      }

      // Insert deals
      const insertedDeals = [];
      for (const dealData of dealsToInsert) {
        try {
          const deal = await storage.createDeal(dealData);
          insertedDeals.push(deal);
          
          // Add points history for approved deals
          if (dealData.status === "approved" && dealData.pointsEarned > 0) {
            await storage.addPointsHistory({
              userId: dealData.userId,
              dealId: deal.id,
              points: dealData.pointsEarned,
              description: `Points earned from bulk imported deal: ${dealData.productName}`,
            });
            
            // Calculate and register goals for approved deals
            const dealUser = await storage.getUser(dealData.userId);
            if (dealUser && dealUser.region && dealUser.regionCategory) {
              // Get region configuration to calculate goals
              const regionConfigs = await storage.getAllRegionConfigs();
              const regionConfig = regionConfigs.find(config => 
                config.region === dealUser.region &&
                config.category === dealUser.regionCategory &&
                (dealUser.regionSubcategory ? config.subcategory === dealUser.regionSubcategory : !config.subcategory)
              );
              
              if (regionConfig) {
                // Calculate goals based on deal type
                const dealValue = parseFloat(dealData.dealValue);
                const dealTypeValue = dealData.productType === "software" ? "new_customer" : "renewal";
                const goalRate = dealTypeValue === "new_customer" 
                  ? regionConfig.newCustomerGoalRate 
                  : regionConfig.renewalGoalRate;
                const goalsEarned = dealValue / goalRate;
                
                // Use deal's closeDate for month/year tracking
                const transactionDate = new Date(dealData.closeDate);
                
                // Import db and goalsHistory
                const { db } = await import("./db");
                const { goalsHistory } = await import("@shared/schema");
                
                // Register goals in history
                await db.insert(goalsHistory).values({
                  userId: dealData.userId,
                  dealId: deal.id,
                  goals: goalsEarned.toFixed(2),
                  month: transactionDate.getMonth() + 1,
                  year: transactionDate.getFullYear(),
                  regionConfigId: regionConfig.id,
                  description: `${goalsEarned.toFixed(2)} goals from imported ${dealTypeValue} deal: ${dealData.productName}`,
                });
                
                console.log(`📊 Goals registered for imported deal: ${goalsEarned.toFixed(2)} goals for ${transactionDate.getMonth() + 1}/${transactionDate.getFullYear()}`);
              }
              
              // Send email to user
              const updatedUser = await storage.getUser(dealData.userId);
              const totalGoles = updatedUser?.points || 0;
              
              // Detect preferred language
              const userLanguage = await detectPreferredLanguage(req);
              
              await sendGolesRegistradosEmail({
                email: dealUser.email,
                firstName: dealUser.firstName,
                lastName: dealUser.lastName,
                producto: dealData.productName,
                valorDeal: parseInt(dealData.dealValue) || 0,
                golesSumados: dealData.pointsEarned,
                totalGoles: totalGoles,
                language: userLanguage,
              });
            }
          }
        } catch (error) {
          console.error("Error inserting deal:", error);
          errors.push(`Failed to insert deal for user ${dealData.userId}`);
        }
      }

      res.json({
        message: `Successfully imported ${insertedDeals.length} deals`,
        imported: insertedDeals.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined
      });

    } catch (error) {
      console.error("Error processing CSV:", error);
      res.status(500).json({ message: "Failed to process CSV file" });
    }
  });

  // Users CSV processing endpoint
  app.post("/api/admin/csv/users/process", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { csvPath } = req.body;
      if (!csvPath) {
        return res.status(400).json({ message: "CSV path is required" });
      }

      // Get admin info for invitation tracking
      const adminUser = await storage.getUser(userId!);

      // Extract upload ID from URL (csvPath might be full URL or just the ID)
      let uploadId = csvPath;
      if (csvPath.includes('/')) {
        // Extract ID from URL like "http://localhost:5000/api/admin/csv/users/upload/users-csv-123456-abc"
        const parts = csvPath.split('/');
        uploadId = parts[parts.length - 1];
      }

      // Get CSV content from memory
      const csvContent = global.csvUploads?.[uploadId];
      if (!csvContent) {
        console.error(`❌ Users CSV not found in memory with ID: ${uploadId}`);
        return res.status(404).json({ message: "CSV file not found. Please upload again." });
      }
      
      // Parse CSV content
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        return res.status(400).json({ message: "CSV file must have at least a header and one data row" });
      }

      const header = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      // Detectar formato del CSV - puede ser formato completo o formato de invitación
      const isInvitationFormat = header.includes('user id') || header.includes('company name');
      const isFullUserFormat = header.includes('first name') && header.includes('password');
      
      if (!isInvitationFormat && !isFullUserFormat) {
        return res.status(400).json({ 
          message: `CSV must be either invitation format (USER ID, COMPANY NAME, etc.) or full user format (first name, last name, username, email, password, country, role, partner level)` 
        });
      }

      // Si es formato de invitación, procesarlo como invitaciones
      if (isInvitationFormat) {
        console.log("📧 Detected invitation format CSV, processing as bulk invitations");
        
        const users = [];
        const errors = [];
        
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(cell => cell.trim());
          if (row.length === 0 || row.every(cell => !cell)) continue;
          
          const rowData: any = {};
          header.forEach((col, idx) => {
            rowData[col] = row[idx] || '';
          });
          
          const email = rowData['user id'] || rowData['email'] || '';
          
          if (!email) {
            errors.push(`Row ${i + 1}: Email/User ID is required`);
            continue;
          }
          
          // Generar firstName/lastName del email si no existen
          let firstName = rowData['first name'] || '';
          let lastName = rowData['last name'] || '';
          
          if (!firstName && !lastName && email) {
            const emailName = email.split('@')[0];
            firstName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
            lastName = "User";
          }
          
          users.push({
            email,
            firstName,
            lastName,
            companyName: rowData['company name'] || '',
            partnerCategory: rowData['partner category'] || '',
            marketSegment: rowData['market segment'] || '',
            country: rowData['kl region'] || rowData['country'] || '',
            address: rowData['address'] || '',
            city: rowData['city'] || '',
            zipCode: rowData['zip code'] || '',
            contactNumber: rowData['contact number'] || '',
          });
        }
        
        if (errors.length > 0) {
          return res.status(400).json({ 
            message: "CSV validation errors",
            errors 
          });
        }
        
        // Procesar como invitaciones bulk
        const results = {
          success: [] as any[],
          failed: [] as any[],
        };

        for (const userData of users) {
          try {
            const { email, firstName, lastName } = userData;
            
            // Check if user already exists
            let existingUser;
            
            if (adminUser?.role === 'regional-admin' && adminUser.region) {
              existingUser = await storage.getUserByEmailAndRegion(email, adminUser.region);
              
              if (existingUser) {
                results.failed.push({
                  email,
                  reason: `Usuario ya existe en la región ${adminUser.region}`,
                });
                continue;
              }
            } else {
              existingUser = await storage.getUserByEmail(email);
              
              if (existingUser) {
                results.failed.push({
                  email,
                  reason: 'Usuario ya existe en el sistema',
                });
                continue;
              }
            }

            // Generate invite token
            const inviteToken = nanoid(32);
            const tempUsername = `user_${nanoid(8)}`;
            const hashedPassword = await bcrypt.hash(nanoid(16), 10);
            
            // Create user with company fields
            const newUser = await storage.createUser({
              username: tempUsername,
              email,
              password: hashedPassword,
              firstName,
              lastName,
              companyName: userData.companyName || null,
              partnerCategory: userData.partnerCategory || null,
              marketSegment: userData.marketSegment || null,
              country: userData.country || null,
              address: userData.address || null,
              city: userData.city || null,
              zipCode: userData.zipCode || null,
              contactNumber: userData.contactNumber || null,
              role: "user",
              isActive: true,
              isApproved: false,
              inviteToken,
              invitedBy: userId,
              invitedFromRegion: adminUser?.region || null,
            });

            const userLanguage = await detectPreferredLanguage(req);
            // Send invitation email
            const emailSent = await sendRegistroExitosoEmail({
              email,
              firstName,
              lastName,
              inviteToken,
              language: userLanguage
            });

            results.success.push({
              email,
              firstName,
              lastName,
              emailSent,
            });
          } catch (error) {
            results.failed.push({
              email: userData.email || 'unknown',
              reason: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        
        return res.json({
          message: `Processed ${users.length} invitations from CSV`,
          inserted: results.success.length,
          errorCount: results.failed.length,
          errors: results.failed.map(f => `${f.email}: ${f.reason}`),
          results,
        });
      }
      
      // Formato completo de usuarios (código original)
      const expectedHeaders = ['first name', 'last name', 'username', 'email', 'password', 'country', 'role', 'partner level'];
      
      // Validate headers
      const hasAllHeaders = expectedHeaders.every(h => header.includes(h));
      if (!hasAllHeaders) {
        return res.status(400).json({ 
          message: `CSV must have columns: ${expectedHeaders.join(', ')}. Found: ${header.join(', ')}` 
        });
      }

      const firstNameIndex = header.indexOf('first name');
      const lastNameIndex = header.indexOf('last name');
      const usernameIndex = header.indexOf('username');
      const emailIndex = header.indexOf('email');
      const passwordIndex = header.indexOf('password');
      const countryIndex = header.indexOf('country');
      const roleIndex = header.indexOf('role');
      const partnerLevelIndex = header.indexOf('partner level');

      const usersToInsert = [];
      const errors = [];

      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        
        if (row.length !== header.length) {
          errors.push(`Row ${i + 1}: Column count mismatch`);
          continue;
        }

        const firstName = row[firstNameIndex];
        const lastName = row[lastNameIndex];
        const username = row[usernameIndex];
        const email = row[emailIndex];
        const password = row[passwordIndex];
        const country = row[countryIndex];
        const role = row[roleIndex].toLowerCase();
        const partnerLevel = row[partnerLevelIndex].toLowerCase();

        // Validate data
        if (!firstName) {
          errors.push(`Row ${i + 1}: First name is required`);
          continue;
        }

        if (!lastName) {
          errors.push(`Row ${i + 1}: Last name is required`);
          continue;
        }

        if (!username || username.length < 3) {
          errors.push(`Row ${i + 1}: Username is required and must be at least 3 characters`);
          continue;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push(`Row ${i + 1}: Valid email is required`);
          continue;
        }

        if (!password || password.length < 6) {
          errors.push(`Row ${i + 1}: Password is required and must be at least 6 characters`);
          continue;
        }

        if (!country) {
          errors.push(`Row ${i + 1}: Country is required`);
          continue;
        }

        if (!['user', 'admin'].includes(role)) {
          errors.push(`Row ${i + 1}: Role must be either 'user' or 'admin'`);
          continue;
        }

        if (!['bronze', 'silver', 'gold', 'platinum'].includes(partnerLevel)) {
          errors.push(`Row ${i + 1}: Partner level must be bronze, silver, gold, or platinum`);
          continue;
        }

        // Check if user already exists
        try {
          const existingUserByUsername = await storage.getUserByUsername(username);
          if (existingUserByUsername) {
            errors.push(`Row ${i + 1}: Username '${username}' already exists`);
            continue;
          }

          const existingUserByEmail = await storage.getUserByEmail(email);
          if (existingUserByEmail) {
            errors.push(`Row ${i + 1}: Email '${email}' already exists`);
            continue;
          }
        } catch (error) {
          errors.push(`Row ${i + 1}: Error checking existing user`);
          continue;
        }

        usersToInsert.push({
          firstName,
          lastName,
          username,
          email,
          password,
          country,
          role: role as "user" | "admin",
          partnerLevel: partnerLevel as "bronze" | "silver" | "gold" | "platinum",
          isActive: true,
        });
      }

      // Insert users in batch
      let createdCount = 0;
      for (const userData of usersToInsert) {
        try {
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          await storage.createUser({
            ...userData,
            password: hashedPassword,
          });
          createdCount++;
        } catch (error) {
          console.error("Error creating user:", error);
          errors.push(`Failed to create user ${userData.username}`);
        }
      }

      res.json({
        message: `Successfully created ${createdCount} users`,
        createdCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10), // Return first 10 errors only
      });

    } catch (error) {
      console.error("Users CSV processing error:", error);
      res.status(500).json({ message: "Failed to process CSV file" });
    }
  });

  // Get pending users for approval
  app.get("/api/admin/users/pending", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (userRole !== "admin" && userRole !== "regional-admin" && userRole !== "super-admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const regionName = await getAdminRegion(userId);
      const pendingUsers = await storage.getPendingUsers(regionName);
      res.json(pendingUsers);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Failed to fetch pending users" });
    }
  });

  // Get rejected/unapproved users
  app.get("/api/admin/users/rejected", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (userRole !== "admin" && userRole !== "regional-admin" && userRole !== "super-admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const regionName = await getAdminRegion(userId);
      const rejectedUsers = await storage.getRejectedUsers(regionName);
      res.json(rejectedUsers);
    } catch (error) {
      console.error("Error fetching rejected users:", error);
      res.status(500).json({ message: "Failed to fetch rejected users" });
    }
  });

    // Approve user registration
  app.put("/api/admin/users/:userId/approve", async (req, res) => {
    const userRole = req.session?.userRole;
    const adminUserId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { userId } = req.params;
      const { language } = req.body; // Get language from admin panel selector
      const approvedUser = await storage.approveUser(userId, adminUserId!);
      
      if (!approvedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Use language from admin panel selector, or default to Spanish
      const emailLanguage: 'es' | 'pt' | 'en' = 
        (language === 'es' || language === 'pt' || language === 'en') ? language : 'es';

      // Send welcome email with admin-selected language
      await sendBienvenidaEmail({
        email: approvedUser.email,
        firstName: approvedUser.firstName,
        lastName: approvedUser.lastName,
        language: emailLanguage,
      });

      res.json({ 
        message: "User approved successfully", 
        user: {
          id: approvedUser.id,
          username: approvedUser.username,
          email: approvedUser.email,
          firstName: approvedUser.firstName,
          lastName: approvedUser.lastName,
          isApproved: approvedUser.isApproved
        }
      });
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Failed to approve user" });
    }
  });

  app.put("/api/admin/users/:userId/reject", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { userId } = req.params;
      const rejectedUser = await storage.rejectUser(userId);
      
      if (!rejectedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        message: "User rejected successfully", 
        user: {
          id: rejectedUser.id,
          username: rejectedUser.username,
          email: rejectedUser.email,
          firstName: rejectedUser.firstName,
          lastName: rejectedUser.lastName,
          isActive: rejectedUser.isActive
        }
      });
    } catch (error) {
      console.error("Error rejecting user:", error);
      res.status(500).json({ message: "Failed to reject user" });
    }
  });

  // Recalculate all deals points endpoint
  app.post("/api/admin/recalculate-points", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const result = await storage.recalculateAllDealsPoints();
      
      res.json({
        message: `Successfully recalculated points for ${result.updated} deals`,
        updated: result.updated,
        errors: result.errors.length > 0 ? result.errors.slice(0, 10) : undefined
      });
    } catch (error) {
      console.error("Error recalculating points:", error);
      res.status(500).json({ message: "Failed to recalculate points" });
    }
  });

  // Deals per user report endpoint
  app.get("/api/admin/reports/deals-per-user", async (req, res) => {
    const userRole = req.session?.userRole;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const data = await storage.getDealsPerUserReport(filters);
      res.json(data);
    } catch (error) {
      console.error("Error getting deals per user report:", error);
      res.status(500).json({ message: "Failed to get deals per user report" });
    }
  });

  app.get("/api/admin/reports/deals-per-user/export", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      // Get admin's region (only for regional-admins)
      const regionName = userId ? await getAdminRegion(userId) : undefined;
      
      // If super-admin and region query param provided, use that
      const queryRegion = req.query.region as string | undefined;
      const effectiveRegion = userRole === "super-admin" && queryRegion ? queryRegion : regionName;
      
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        regionName: effectiveRegion,
      };

      const data = await storage.getDealsPerUserReport(filters);
      
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Prepare data for Excel
      const excelData = data.map((user, index) => ({
        'Ranking': index + 1,
        'Username': user.username,
        'Name': `${user.firstName} ${user.lastName}`.trim(),
        'Email': user.email,
        'Country': user.country,
        'Total Deals': user.totalDeals,
        'Total Sales ($)': user.totalSales.toFixed(2),
        'Average Deal Size ($)': user.averageDealSize.toFixed(2)
      }));
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-size columns
      const columnWidths = [
        { wch: 10 }, // Ranking
        { wch: 15 }, // Username
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 15 }, // Country
        { wch: 15 }, // Total Deals
        { wch: 20 }, // Total Sales
        { wch: 20 }  // Average Deal Size
      ];
      worksheet['!cols'] = columnWidths;
      
      // Add worksheet to workbook
      const sheetName = `Deals Per User ${new Date().toISOString().split('T')[0]}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Set response headers for file download
      const filename = `deals-per-user-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', excelBuffer.length.toString());
      
      // Send the Excel file
      res.send(excelBuffer);
      
    } catch (error) {
      console.error("Error exporting deals per user report:", error);
      res.status(500).json({ message: "Failed to export deals per user report" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { id } = req.params;
      const notification = await storage.markNotificationAsRead(id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // Verify notification belongs to user
      if (notification.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(notification);
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Support Ticket routes
  app.post("/api/support-tickets", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const ticketData = insertSupportTicketSchema.parse({
        ...req.body,
        userId,
      });
      
      const ticket = await storage.createSupportTicket(ticketData);
      
      // Obtener información del usuario para enviar email al admin
      const user = await storage.getUser(userId);
      if (user) {
        // Obtener email del primer admin para enviar notificación
        const allUsers = await storage.getAllUsers();
        const admins = allUsers.filter(u => u.role === 'admin');
        if (admins && admins.length > 0) {
          await sendSupportTicketToAdmin(
            admins[0].email,
            {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email
            },
            {
              subject: ticket.subject,
              message: ticket.message,
              ticketId: ticket.id
            }
          );
        }
      }
      
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Create support ticket error:", error);
      res.status(500).json({ message: "Failed to create support ticket" });
    }
  });

  app.get("/api/support-tickets", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const tickets = await storage.getUserSupportTickets(userId);
      res.json(tickets);
    } catch (error) {
      console.error("Get user support tickets error:", error);
      res.status(500).json({ message: "Failed to get support tickets" });
    }
  });

  app.get("/api/support-tickets/:id", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { id } = req.params;
      const ticket = await storage.getSupportTicket(id);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      if (ticket.userId !== userId && req.session?.userRole !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(ticket);
    } catch (error) {
      console.error("Get support ticket error:", error);
      res.status(500).json({ message: "Failed to get support ticket" });
    }
  });

  app.get("/api/admin/support-tickets", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (userRole !== "admin" && userRole !== "regional-admin" && userRole !== "super-admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const regionName = await getAdminRegion(userId);
      const tickets = await storage.getAllSupportTickets(regionName);
      res.json(tickets);
    } catch (error) {
      console.error("Get all support tickets error:", error);
      res.status(500).json({ message: "Failed to get support tickets" });
    }
  });

  app.patch("/api/admin/support-tickets/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const updates = updateSupportTicketSchema.parse(req.body);
      
      if (updates.adminResponse && !updates.respondedBy) {
        updates.respondedBy = userId;
        updates.respondedAt = new Date();
      }
      
      const ticket = await storage.updateSupportTicket(id, updates);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Enviar notificación en tiempo real cuando el admin responde
      if (updates.adminResponse) {
        await NotificationHelpers.supportTicketResponse(
          ticket.userId,
          ticket.subject
        );
      }

      res.json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Update support ticket error:", error);
      res.status(500).json({ message: "Failed to update support ticket" });
    }
  });

  // Points Configuration routes
  // Public route for users to view redemption period
  app.get("/api/points-config", async (req, res) => {
    try {
      const config = await storage.getPointsConfig();
      
      if (!config) {
        const defaultConfig = {
          redemptionStartDate: null,
          redemptionEndDate: null,
          grandPrizeThreshold: 50000,
        };
        return res.json(defaultConfig);
      }
      
      // Return only public-facing info
      res.json({
        redemptionStartDate: config.redemptionStartDate,
        redemptionEndDate: config.redemptionEndDate,
        grandPrizeThreshold: config.grandPrizeThreshold,
      });
    } catch (error) {
      console.error("Get points config error:", error);
      res.status(500).json({ message: "Failed to get points configuration" });
    }
  });

  app.get("/api/admin/points-config", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      // Obtener región del query parameter
      const region = req.query.region as string;
      
      if (!region) {
        return res.status(400).json({ message: "Region parameter is required" });
      }

      // Validar región válida
      const validRegions = ["NOLA", "SOLA", "BRASIL", "MEXICO"];
      if (!validRegions.includes(region)) {
        return res.status(400).json({ message: "Invalid region" });
      }

      // Buscar configuración específica para la región
      const config = await storage.getPointsConfigByRegion(region);
      
      if (!config) {
        // Si no existe configuración para esta región, crear una por defecto
        const defaultConfig = {
          id: "",
          region,
          softwareRate: 1000,
          hardwareRate: 5000,
          equipmentRate: 10000,
          grandPrizeThreshold: 50000,
          defaultNewCustomerGoalRate: 1000,
          defaultRenewalGoalRate: 2000,
          redemptionStartDate: null,
          redemptionEndDate: null,
          updatedAt: new Date(),
          updatedBy: null
        };
        return res.json(defaultConfig);
      }
      
      res.json(config);
    } catch (error) {
      console.error("Get points config error:", error);
      res.status(500).json({ message: "Failed to get points configuration" });
    }
  });

  app.patch("/api/admin/points-config", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const updates = updatePointsConfigSchema.parse(req.body);
      
      // Validar que la región esté incluida en la actualización
      if (!updates.region) {
        return res.status(400).json({ message: "Region is required" });
      }

      // Validar región válida
      const validRegions = ["NOLA", "SOLA", "BRASIL", "MEXICO"];
      if (!validRegions.includes(updates.region)) {
        return res.status(400).json({ message: "Invalid region" });
      }

      const config = await storage.updatePointsConfigByRegion(updates, userId);
      
      if (!config) {
        return res.status(500).json({ message: "Failed to update points configuration" });
      }

      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Update points config error:", error);
      res.status(500).json({ message: "Failed to update points configuration" });
    }
  });

  // Regions configuration routes
  app.get("/api/admin/regions", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const regionName = await getAdminRegion(userId);
      const regions = await storage.getAllRegionConfigs(regionName);
      res.json(regions);
    } catch (error) {
      console.error("Get regions error:", error);
      res.status(500).json({ message: "Failed to get regions" });
    }
  });

  // Region statistics endpoint
  app.get("/api/admin/region-stats", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const regionName = await getAdminRegion(userId);
      console.log("🔍 Debug region-stats:", { userId, userRole, regionName, regionNameType: typeof regionName });
      
      // Get data with proper regional filtering
      const users = await storage.getAllUsers(regionName);
      const dealsResult = await storage.getAllDeals(1, 1000, regionName); // Add regional filter to deals too
      const deals = dealsResult.deals;
      const regionConfigs = await storage.getAllRegionConfigs(regionName);
      
      console.log("📊 Raw data:", { 
        totalUsers: users.length, 
        totalDeals: deals.length, 
        totalConfigs: regionConfigs.length,
        regionFilter: regionName
      });
      
      // For regional admin: users are already filtered, just count them
      if (regionName) {
        console.log("🎯 Using regional admin logic for region:", regionName);
        
        // Regional admin - users are already filtered by their region
        const activeUsers = users.filter(user => user.isActive && user.isApproved);
        
        // Filter deals for this region (get regionId from configs)
        const regionConfigIds = regionConfigs.map(config => config.id);
        const regionDeals = deals.filter((deal: any) => regionConfigIds.includes(deal.regionId));
        
        console.log(`🔍 Deals debugging:`, {
          totalDealsInSystem: deals.length,
          regionConfigIds,
          dealsWithRegionId: deals.map(deal => ({ id: deal.id, regionId: deal.regionId, title: deal.productName })),
          regionDeals: regionDeals.length,
          filteredDeals: regionDeals.map(deal => ({ id: deal.id, regionId: deal.regionId, title: deal.productName }))
        });
        
        console.log(`📍 Regional admin stats for ${regionName}:`, {
          totalUsers: users.length,
          activeUsers: activeUsers.length,
          regionDeals: regionDeals.length,
          regionConfigIds,
          regionConfigsDetails: regionConfigs.map(c => ({ id: c.id, goalTarget: c.monthlyGoalTarget }))
        });
        
        // Calculate total goals properly - avoid duplicating the same goal
        // For regional admin, we might have multiple configs but want the total unique goal
        const goalSet = new Set(regionConfigs.map(config => config.monthlyGoalTarget || 0));
        const uniqueGoals = Array.from(goalSet);
        const totalGoals = uniqueGoals.reduce((sum, goal) => sum + goal, 0);
        
        console.log(`🎯 Goals calculation:`, {
          allGoals: regionConfigs.map(c => c.monthlyGoalTarget),
          uniqueGoals,
          totalGoals
        });
        
        const regionStats = [{
          region: regionName,
          total_users: users.length,
          active_users: activeUsers.length,
          total_deals: regionDeals.length,
          total_goals: totalGoals
        }];
        
        console.log("📈 Final regionStats (regional admin):", regionStats);
        res.json(regionStats);
        return;
      }
      
      console.log("🌍 Using super admin logic - grouping by all regions");
      
      // For super admin: group by all regions
      const regionStats = regionConfigs.reduce((acc: any[], config) => {
        const regionUsers = users.filter(user => user.region === config.region);
        const activeUsers = regionUsers.filter(user => user.isActive && user.isApproved);
        const regionDeals = deals.filter((deal: any) => deal.regionId === config.id);
        
        const existingStat = acc.find(stat => stat.region === config.region);
        if (existingStat) {
          existingStat.total_users += regionUsers.length;
          existingStat.active_users += activeUsers.length;
          existingStat.total_deals += regionDeals.length;
        } else {
          acc.push({
            region: config.region,
            total_users: regionUsers.length,
            active_users: activeUsers.length,
            total_deals: regionDeals.length,
            total_goals: config.monthlyGoalTarget || 0
          });
        }
        
        return acc;
      }, []);

      console.log("📈 Final regionStats:", regionStats);
      res.json(regionStats);
    } catch (error) {
      console.error("Get region stats error:", error);
      res.status(500).json({ message: "Failed to get region stats" });
    }
  });

  app.post("/api/admin/regions", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const regionConfig = req.body;
      console.log("Received region config:", regionConfig);
      console.log("RewardId value:", regionConfig.rewardId, "Type:", typeof regionConfig.rewardId);
      
      // Validar que no exista ya una región con la misma combinación
      const existingRegions = await storage.getAllRegionConfigs();
      const subcategoryToCheck = regionConfig.subcategory || null;
      
      const duplicate = existingRegions.find(r => 
        r.region === regionConfig.region && 
        r.category === regionConfig.category && 
        (r.subcategory || null) === subcategoryToCheck
      );
      
      if (duplicate) {
        return res.status(409).json({ 
          message: `Ya existe una configuración para ${regionConfig.region} - ${regionConfig.category}${subcategoryToCheck ? ' - ' + subcategoryToCheck : ''}`
        });
      }
      
      const newRegion = await storage.createRegionConfig(regionConfig);
      res.json(newRegion);
    } catch (error) {
      console.error("Create region error:", error);
      
      // Manejar error de constraint único de la base de datos
      if ((error as any).code === '23505') { // PostgreSQL unique violation
        return res.status(409).json({ 
          message: "Ya existe una configuración regional con estos parámetros" 
        });
      }
      
      res.status(500).json({ message: "Failed to create region" });
    }
  });

  app.post("/api/admin/regions/seed", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      await storage.seedRegions();
      res.json({ message: "Regions seeded successfully" });
    } catch (error) {
      console.error("Seed regions error:", error);
      res.status(500).json({ message: "Failed to seed regions" });
    }
  });

  app.patch("/api/admin/regions/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const updates = req.body;
      console.log("Update region request:", { id, updates });
      
      const region = await storage.updateRegionConfig(id, updates);
      
      if (!region) {
        return res.status(404).json({ message: "Region not found" });
      }
      
      res.json(region);
    } catch (error) {
      console.error("Update region error:", error);
      res.status(500).json({ message: "Failed to update region" });
    }
  });

  app.delete("/api/admin/regions/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      console.log("Delete region request:", { id });
      
      const region = await storage.deleteRegionConfig(id);
      
      if (!region) {
        return res.status(404).json({ message: "Region not found" });
      }
      
      res.json({ message: "Region deleted successfully", region });
    } catch (error) {
      console.error("Delete region error:", error);
      res.status(500).json({ message: "Failed to delete region" });
    }
  });

  // ========== CAMPAIGN ROUTES ==========
  
  // Get all campaigns
  app.get("/api/admin/campaigns", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      // For regional admins, automatically filter by their region
      const adminRegion = await getAdminRegion(userId);
      const region = adminRegion || (req.query.region as string);
      
      const campaigns = await storage.getCampaigns(region as any);
      res.json(campaigns);
    } catch (error) {
      console.error("Get campaigns error:", error);
      res.status(500).json({ message: "Failed to get campaigns" });
    }
  });

  // Create campaign
  app.post("/api/admin/campaigns", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const campaignData = req.body;
      
      // Asegurar que se incluya la región
      if (!campaignData.region) {
        return res.status(400).json({ message: "Region is required" });
      }
      
      // Convert date strings to Date objects
      const processedData = {
        ...campaignData,
        startDate: new Date(campaignData.startDate),
        endDate: new Date(campaignData.endDate),
        multiplier: campaignData.multiplier.toString(), // Ensure it's a string for decimal type
      };
      
      const campaign = await storage.createCampaign(processedData);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Create campaign error:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  // Update campaign (toggle active status or other fields)
  app.patch("/api/admin/campaigns/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const updates = req.body;
      
      const campaign = await storage.updateCampaign(id, updates);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error("Update campaign error:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  // Delete campaign
  app.delete("/api/admin/campaigns/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      
      const campaign = await storage.deleteCampaign(id);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.json({ message: "Campaign deleted successfully", campaign });
    } catch (error) {
      console.error("Delete campaign error:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Get all region configurations
  app.get("/api/admin/region-configs", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const configs = await storage.getRegionConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Get region configs error:", error);
      res.status(500).json({ message: "Failed to get region configurations" });
    }
  });

  // Public endpoint: Get region hierarchy structure for registration forms
  app.get("/api/region-hierarchy", async (req, res) => {
    try {
      const configs = await storage.getRegionConfigs();
      
      // Construir jerarquía: Región → Categorías → Subcategorías
      const hierarchy: Record<string, {
        categories: Record<string, string[]>
      }> = {};

      for (const config of configs) {
        if (!config.isActive) continue;

        // Inicializar región si no existe
        if (!hierarchy[config.region]) {
          hierarchy[config.region] = { categories: {} };
        }

        // Inicializar categoría si no existe
        if (!hierarchy[config.region].categories[config.category]) {
          hierarchy[config.region].categories[config.category] = [];
        }

        // Agregar subcategoría si existe y no está duplicada
        if (config.subcategory && !hierarchy[config.region].categories[config.category].includes(config.subcategory)) {
          hierarchy[config.region].categories[config.category].push(config.subcategory);
        }
      }

      res.json(hierarchy);
    } catch (error) {
      console.error("Get region hierarchy error:", error);
      res.status(500).json({ message: "Failed to get region hierarchy" });
    }
  });

  // Create region configuration
  app.post("/api/admin/region-configs", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const configData = req.body;
      const config = await storage.createRegionConfig(configData);
      res.status(201).json(config);
    } catch (error) {
      console.error("Create region config error:", error);
      
      // Handle unique constraint violation
      if ((error as any).code === '23505') {
        return res.status(409).json({ 
          message: "A configuration already exists for this region, category, and subcategory combination" 
        });
      }
      
      res.status(500).json({ message: "Failed to create region configuration" });
    }
  });

  // Update region configuration
  app.patch("/api/admin/region-configs/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const updates = req.body;
      
      const config = await storage.updateRegionConfig(id, updates);
      
      if (!config) {
        return res.status(404).json({ message: "Region configuration not found" });
      }
      
      res.json(config);
    } catch (error) {
      console.error("Update region config error:", error);
      res.status(500).json({ message: "Failed to update region configuration" });
    }
  });

  // Grand Prize routes
  app.get("/api/admin/grand-prize/criteria", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { region } = req.query;
      const criteria = await storage.getActiveGrandPrizeCriteria(region as string);
      res.json(criteria || {});
    } catch (error) {
      console.error("Get grand prize criteria error:", error);
      res.status(500).json({ message: "Failed to get grand prize criteria" });
    }
  });

  app.get("/api/admin/grand-prize/criteria/all", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { region } = req.query;
      const allCriteria = await storage.getAllGrandPrizeCriteria(region as string);
      res.json(allCriteria);
    } catch (error) {
      console.error("Get all grand prize criteria error:", error);
      res.status(500).json({ message: "Failed to get all grand prize criteria" });
    }
  });

  app.post("/api/admin/grand-prize/criteria", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const criteria = await storage.createGrandPrizeCriteria(req.body);
      res.json(criteria);
    } catch (error) {
      console.error("Create grand prize criteria error:", error);
      res.status(500).json({ message: "Failed to create grand prize criteria" });
    }
  });

  app.patch("/api/admin/grand-prize/criteria/:id", async (req, res) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const criteria = await storage.updateGrandPrizeCriteria(id, req.body);
      res.json(criteria);
    } catch (error) {
      console.error("Update grand prize criteria error:", error);
      res.status(500).json({ message: "Failed to update grand prize criteria" });
    }
  });

  app.delete("/api/admin/grand-prize/criteria/:id", async (req, res) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      await storage.deleteGrandPrizeCriteria(id);
      res.json({ message: "Criteria deleted successfully" });
    } catch (error) {
      console.error("Delete grand prize criteria error:", error);
      res.status(500).json({ message: "Failed to delete grand prize criteria" });
    }
  });

  app.get("/api/admin/grand-prize/ranking/:criteriaId", async (req, res) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { criteriaId } = req.params;
      const ranking = await storage.getGrandPrizeRanking(criteriaId);
      res.json(ranking);
    } catch (error) {
      console.error("Get grand prize ranking error:", error);
      res.status(500).json({ message: "Failed to get grand prize ranking" });
    }
  });

  app.post("/api/admin/grand-prize/announce-winner", async (req, res) => {
    if (!req.session.userId || req.session.userRole !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { userId, periodo, fechaPartido, hora, lugar } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Obtener información del usuario ganador
      const winner = await storage.getUser(userId);
      if (!winner) {
        return res.status(404).json({ message: "User not found" });
      }

      // Enviar email al ganador
      const userLanguage = await detectPreferredLanguage(req, winner);
      await sendGanadorPremioMayorEmail({
        email: winner.email,
        firstName: winner.firstName,
        lastName: winner.lastName,
        periodo: periodo || 'Competencia Kaspersky Cup',
        fechaPartido: fechaPartido || 'Por confirmar',
        hora: hora || 'Por confirmar',
        lugar: lugar || 'Por confirmar',
        language: userLanguage
      });

      res.json({ 
        message: "Winner announcement email sent successfully",
        winner: {
          id: winner.id,
          email: winner.email,
          firstName: winner.firstName,
          lastName: winner.lastName
        }
      });
    } catch (error) {
      console.error("Announce grand prize winner error:", error);
      res.status(500).json({ message: "Failed to announce winner" });
    }
  });

  // Monthly Prizes routes
  app.get("/api/admin/monthly-prizes", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { month, year, region } = req.query;
      
      // For regional admins, automatically filter by their region
      const adminRegion = await getAdminRegion(userId);
      const filterRegion = adminRegion || (region as string);
      
      const prizes = await storage.getMonthlyPrizes(
        month ? parseInt(month as string) : undefined,
        year ? parseInt(year as string) : undefined,
        filterRegion
      );
      res.json(prizes);
    } catch (error) {
      console.error("Get monthly prizes error:", error);
      res.status(500).json({ message: "Failed to get monthly prizes" });
    }
  });

  app.post("/api/admin/monthly-prizes", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const prize = await storage.createMonthlyPrize(req.body);
      res.json(prize);
    } catch (error) {
      console.error("Create monthly prize error:", error);
      res.status(500).json({ message: "Failed to create monthly prize" });
    }
  });

  app.patch("/api/admin/monthly-prizes/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const prize = await storage.updateMonthlyPrize(id, req.body);
      res.json(prize);
    } catch (error) {
      console.error("Update monthly prize error:", error);
      res.status(500).json({ message: "Failed to update monthly prize" });
    }
  });

  app.delete("/api/admin/monthly-prizes/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      await storage.deleteMonthlyPrize(id);
      res.json({ message: "Prize deleted successfully" });
    } catch (error) {
      console.error("Delete monthly prize error:", error);
      res.status(500).json({ message: "Failed to delete monthly prize" });
    }
  });

  // ========================================
  // Master Data Management Routes
  // ========================================

  // Categories Master (Maestro Global de Categorías)
  app.get("/api/admin/categories-master", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const categories = await storage.getCategoriesMaster();
      res.json(categories);
    } catch (error) {
      console.error("Get categories master error:", error);
      res.status(500).json({ message: "Failed to get categories master" });
    }
  });

  app.post("/api/admin/categories-master", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const category = await storage.createCategoryMaster(req.body);
      res.json(category);
    } catch (error) {
      console.error("Create category master error:", error);
      res.status(500).json({ message: "Failed to create category master" });
    }
  });

  app.patch("/api/admin/categories-master/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const category = await storage.updateCategoryMaster(id, req.body);
      res.json(category);
    } catch (error) {
      console.error("Update category master error:", error);
      res.status(500).json({ message: "Failed to update category master" });
    }
  });

  app.delete("/api/admin/categories-master/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      await storage.deleteCategoryMaster(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete category master error:", error);
      res.status(500).json({ message: "Failed to delete category master" });
    }
  });

  // Region Categories
  app.get("/api/admin/region-categories", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const categories = await storage.getRegionCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get region categories error:", error);
      res.status(500).json({ message: "Failed to get region categories" });
    }
  });

  app.post("/api/admin/region-categories", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const category = await storage.createRegionCategory(req.body);
      res.json(category);
    } catch (error) {
      console.error("Create region category error:", error);
      res.status(500).json({ message: "Failed to create region category" });
    }
  });

  app.patch("/api/admin/region-categories/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const category = await storage.updateRegionCategory(id, req.body);
      res.json(category);
    } catch (error) {
      console.error("Update region category error:", error);
      res.status(500).json({ message: "Failed to update region category" });
    }
  });

  app.delete("/api/admin/region-categories/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      await storage.deleteRegionCategory(id);
      res.json({ message: "Region category deleted successfully" });
    } catch (error) {
      console.error("Delete region category error:", error);
      res.status(500).json({ message: "Failed to delete region category" });
    }
  });

  // Prize Templates
  app.get("/api/admin/prize-templates", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const templates = await storage.getPrizeTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Get prize templates error:", error);
      res.status(500).json({ message: "Failed to get prize templates" });
    }
  });

  app.post("/api/admin/prize-templates", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const template = await storage.createPrizeTemplate(req.body);
      res.json(template);
    } catch (error) {
      console.error("Create prize template error:", error);
      res.status(500).json({ message: "Failed to create prize template" });
    }
  });

  app.patch("/api/admin/prize-templates/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const template = await storage.updatePrizeTemplate(id, req.body);
      res.json(template);
    } catch (error) {
      console.error("Update prize template error:", error);
      res.status(500).json({ message: "Failed to update prize template" });
    }
  });

  app.delete("/api/admin/prize-templates/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      await storage.deletePrizeTemplate(id);
      res.json({ message: "Prize template deleted successfully" });
    } catch (error) {
      console.error("Delete prize template error:", error);
      res.status(500).json({ message: "Failed to delete prize template" });
    }
  });

  // Product Types
  app.get("/api/admin/product-types", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const productTypes = await storage.getProductTypes();
      res.json(productTypes);
    } catch (error) {
      console.error("Get product types error:", error);
      res.status(500).json({ message: "Failed to get product types" });
    }
  });

  app.post("/api/admin/product-types", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const productType = await storage.createProductType(req.body);
      res.json(productType);
    } catch (error) {
      console.error("Create product type error:", error);
      res.status(500).json({ message: "Failed to create product type" });
    }
  });

  app.patch("/api/admin/product-types/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      const productType = await storage.updateProductType(id, req.body);
      res.json(productType);
    } catch (error) {
      console.error("Update product type error:", error);
      res.status(500).json({ message: "Failed to update product type" });
    }
  });

  app.delete("/api/admin/product-types/:id", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { id } = req.params;
      await storage.deleteProductType(id);
      res.json({ message: "Product type deleted successfully" });
    } catch (error) {
      console.error("Delete product type error:", error);
      res.status(500).json({ message: "Failed to delete product type" });
    }
  });

  /**
   * Endpoint para enviar el email de expectativa
   * Este email se utiliza para campañas promocionales o pre-lanzamiento
   * Solo accesible para admins
   */
  app.post("/api/admin/send-expectation-email", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { email, firstName, lastName } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const userLanguage = await detectPreferredLanguage(req);
      const emailSent = await sendExpectationEmail({
        email,
        firstName,
        lastName,
        language: userLanguage
      });

      if (emailSent) {
        res.json({ 
          success: true, 
          message: "Expectation email sent successfully" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to send expectation email" 
        });
      }
    } catch (error) {
      console.error("Send expectation email error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send expectation email" 
      });
    }
  });

  /**
   * Endpoint para enviar el email de expectativa a múltiples destinatarios
   * Útil para campañas masivas
   */
  app.post("/api/admin/send-expectation-email-batch", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { recipients } = req.body;
      
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ message: "Recipients array is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const results = {
        total: recipients.length,
        sent: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const recipient of recipients) {
        try {
          if (!recipient.email || !emailRegex.test(recipient.email)) {
            results.failed++;
            results.errors.push(`Invalid email: ${recipient.email || 'missing'}`);
            continue;
          }

          const userLanguage = await detectPreferredLanguage(req);
          const emailSent = await sendExpectationEmail({
            email: recipient.email,
            firstName: recipient.firstName,
            lastName: recipient.lastName,
            language: userLanguage
          });

          if (emailSent) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push(`Failed to send to: ${recipient.email}`);
          }

          // Pequeña pausa para no saturar el servicio de email
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          results.failed++;
          results.errors.push(`Error sending to ${recipient.email}: ${error}`);
        }
      }

      res.json({ 
        success: true, 
        message: "Batch email sending completed",
        results
      });
    } catch (error) {
      console.error("Send batch expectation email error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send batch expectation emails" 
      });
    }
  });

  /**
   * Endpoint para enviar el email de registro exitoso a un usuario
   * Se llama después de que un usuario completa su registro
   */
  app.post("/api/admin/send-registro-exitoso-email", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { email, firstName, lastName } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const userLanguage = await detectPreferredLanguage(req);
      const emailSent = await sendRegistroExitosoEmail({
        email,
        firstName,
        lastName,
        language: userLanguage
      });

      if (emailSent) {
        res.json({ 
          success: true, 
          message: "Registro exitoso email sent successfully" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to send registro exitoso email" 
        });
      }
    } catch (error) {
      console.error("Send registro exitoso email error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send registro exitoso email" 
      });
    }
  });

  /**
   * Endpoint para enviar el email de registro exitoso a múltiples usuarios
   * Útil para campañas masivas
   */
  app.post("/api/admin/send-registro-exitoso-email-batch", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { recipients } = req.body;
      
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ message: "Recipients array is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const results = {
        total: recipients.length,
        sent: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const recipient of recipients) {
        try {
          if (!recipient.email || !emailRegex.test(recipient.email)) {
            results.failed++;
            results.errors.push(`Invalid email: ${recipient.email || 'missing'}`);
            continue;
          }

          const userLanguage = await detectPreferredLanguage(req);
          const emailSent = await sendRegistroExitosoEmail({
            email: recipient.email,
            firstName: recipient.firstName,
            lastName: recipient.lastName,
            language: userLanguage
          });

          if (emailSent) {
            results.sent++;
          } else {
            results.failed++;
            results.errors.push(`Failed to send to: ${recipient.email}`);
          }

          // Pequeña pausa para no saturar el servicio de email
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          results.failed++;
          results.errors.push(`Error sending to ${recipient.email}: ${error}`);
        }
      }

      res.json({ 
        success: true, 
        message: "Batch registro exitoso email sending completed",
        results
      });
    } catch (error) {
      console.error("Send batch registro exitoso email error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send batch registro exitoso emails" 
      });
    }
  });

  // Upload image to Cloudinary
  app.post("/api/upload/image", async (req, res) => {
    try {
      const { image, folder = 'rewards' } = req.body;
      
      if (!image) {
        return res.status(400).json({ message: "Image data is required" });
      }

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(image, {
        folder: `loyalty-pilot/${folder}`,
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      });

      res.json({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
      });
    } catch (error) {
      console.error("Upload image error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload image",
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // EMAIL DIAGNOSTICS & MONITORING ENDPOINTS (Admin only)
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /api/admin/emails/stats
   * Obtener estadísticas de emails (últimas 24h por defecto)
   */
  app.get("/api/admin/emails/stats", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const stats = await getEmailStats(hours);
      
      res.json({
        success: true,
        timeframe: `${hours} hours`,
        stats,
        config: {
          brevoConfigured: !!BREVO_API_KEY,
          fromEmail: FROM_EMAIL,
          appUrl: APP_URL,
        }
      });
    } catch (error) {
      console.error("Get email stats error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get email stats" 
      });
    }
  });

  /**
   * GET /api/admin/emails/failed
   * Obtener emails que fallaron recientemente
   */
  app.get("/api/admin/emails/failed", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const failedEmails = await getFailedEmails(limit);
      
      res.json({
        success: true,
        count: failedEmails.length,
        emails: failedEmails,
      });
    } catch (error) {
      console.error("Get failed emails error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to get failed emails" 
      });
    }
  });

  /**
   * POST /api/admin/emails/retry/:logId
   * Reintentar envío de un email fallido
   */
  app.post("/api/admin/emails/retry/:logId", async (req, res) => {
    const userRole = req.session?.userRole;
    
    if (!isAdminRole(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { logId } = req.params;
      const success = await retryFailedEmail(logId);
      
      if (success) {
        res.json({
          success: true,
          message: "Email retry queued successfully",
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Email log not found or already sent",
        });
      }
    } catch (error) {
      console.error("Retry email error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to retry email" 
      });
    }
  });

  /**
   * GET /api/detect-language
   * Endpoint para detectar el idioma preferido del usuario basado en su IP
   */
  app.get("/api/detect-language", async (req, res) => {
    try {
      console.log(`🌍 [API] /api/detect-language called from IP: ${req.socket.remoteAddress}`);
      const language = await detectPreferredLanguage(req);
      console.log(`🌍 [API] Returning language: ${language}`);
      res.json({ language });
    } catch (error) {
      console.error("🌍 [API] Error detecting language:", error);
      // Siempre retornar español por defecto en caso de error
      res.json({ language: 'es' });
    }
  });

  /**
   * POST /api/admin/emails/test
   * Endpoint de prueba para verificar que los emails funcionan
   */
  app.post("/api/admin/emails/test", async (req, res) => {
    const userRole = req.session?.userRole;
    const userId = req.session?.userId;
    
    if (!isAdminRole(userRole) || !userId) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { testEmail } = req.body;
      
      // Si no se proporciona email, usar el del admin
      let recipientEmail = testEmail;
      let recipientName = "Admin";
      
      if (!recipientEmail) {
        const admin = await storage.getUser(userId);
        if (!admin) {
          return res.status(404).json({ message: "Admin user not found" });
        }
        recipientEmail = admin.email;
        recipientName = `${admin.firstName} ${admin.lastName}`;
      }

      console.log(`📧 Enviando email de prueba a: ${recipientEmail}`);

      // Enviar email de prueba usando el nuevo servicio con reintentos
      const result = await sendEmailWithRetry({
        to: [{ email: recipientEmail, name: recipientName }],
        subject: '🧪 Email de Prueba - Kaspersky Cup',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px; 
              }
              .header { 
                background: linear-gradient(135deg, #29CCB1 0%, #1D9B85 100%); 
                color: white; 
                padding: 30px; 
                text-align: center; 
                border-radius: 10px 10px 0 0; 
              }
              .content { 
                background: #f9fafb; 
                padding: 30px; 
                border: 1px solid #e5e7eb; 
              }
              .status { 
                background: #d1fae5; 
                border-left: 4px solid #10b981; 
                padding: 15px; 
                margin: 15px 0; 
              }
              .info { 
                background: white; 
                padding: 15px; 
                margin: 15px 0; 
                border-radius: 5px; 
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>✅ Email de Prueba Exitoso</h1>
            </div>
            <div class="content">
              <div class="status">
                <strong>🎉 ¡Sistema de Emails Funcionando!</strong>
                <p>Este es un email de prueba del sistema Kaspersky Cup.</p>
              </div>
              <div class="info">
                <p><strong>Destinatario:</strong> ${recipientEmail}</p>
                <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
                <p><strong>Servidor:</strong> Brevo API</p>
              </div>
              <p>Si recibes este email, significa que:</p>
              <ul>
                <li>✅ Brevo API está correctamente configurado</li>
                <li>✅ El servicio de correos está funcionando</li>
                <li>✅ Los reintentos automáticos están activos</li>
                <li>✅ El logging de emails está operativo</li>
              </ul>
              <p><em>Este es un email automático de prueba del sistema.</em></p>
            </div>
          </body>
          </html>
        `,
        textContent: `Email de Prueba - Kaspersky Cup

✅ ¡Sistema de Emails Funcionando!

Destinatario: ${recipientEmail}
Fecha: ${new Date().toLocaleString('es-ES')}

Si recibes este email, significa que el sistema está funcionando correctamente.`,
        emailType: 'test',
        maxRetries: 3,
      });

      if (result.success) {
        res.json({
          success: true,
          message: `Email de prueba enviado exitosamente a ${recipientEmail}`,
          details: {
            recipient: recipientEmail,
            attempts: result.attempts,
            messageId: result.messageId,
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Failed to send test email after ${result.attempts} attempts`,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send test email" 
      });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
