import * as brevo from '@getbrevo/brevo';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar Brevo API key
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@loyaltyprogram.com';
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

// Logging mejorado para diagnóstico
console.log('📧 Configuración de Email:');
console.log('   BREVO_API_KEY:', BREVO_API_KEY ? '✓ Configurada' : '✗ NO CONFIGURADA');
console.log('   FROM_EMAIL:', FROM_EMAIL);
console.log('   APP_URL:', APP_URL);

// Inicializar cliente de Brevo
const apiInstance = new brevo.TransactionalEmailsApi();
if (BREVO_API_KEY) {
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
  console.log('✅ Cliente Brevo inicializado correctamente');
} else {
  console.warn('⚠️  BREVO_API_KEY no configurada - los emails no se enviarán');
}

/**
 * Convierte una imagen a Base64 para embeber en emails
 */
function imageToBase64(imagePath: string): string {
  try {
    const fullPath = path.resolve(__dirname, '..', imagePath);
    if (fs.existsSync(fullPath)) {
      const imageBuffer = fs.readFileSync(fullPath);
      const base64Image = imageBuffer.toString('base64');
      const ext = path.extname(imagePath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
      return `data:${mimeType};base64,${base64Image}`;
    }
    console.warn(`⚠️ Image not found: ${fullPath}`);
    return '';
  } catch (error) {
    console.error(`❌ Error converting image to base64: ${imagePath}`, error);
    return '';
  }
}

export interface InviteEmailData {
  email: string;
  firstName: string;
  lastName: string;
  inviteToken: string;
  invitedBy: string;
}

/**
 * Envía un email de invitación a un nuevo usuario
 */
export async function sendInviteEmail(data: InviteEmailData): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️  BREVO_API_KEY no configurada. Email no enviado.');
      console.log('📧 Simulated invite email to:', data.email);
      console.log('🔗 Invite link:', `${APP_URL}/register?token=${data.inviteToken}`);
      return true; // Simular éxito en desarrollo
    }

    const inviteLink = `${APP_URL}/register?token=${data.inviteToken}`;
    
    console.log('📤 Intentando enviar email de invitación...');
    console.log('   Destinatario:', data.email);
    console.log('   Remitente:', FROM_EMAIL);
    console.log('   Nombre destinatario:', `${data.firstName} ${data.lastName}`);
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: data.email, name: `${data.firstName} ${data.lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = '⚽ Bienvenido a Kaspersky Cup - Tu ruta goleadora comienza aquí';
    sendSmtpEmail.htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              background-color: #F5F5F5;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
            }
            
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #FFFFFF;
            }
            
            .header-logo {
              text-align: center;
              padding: 24px 0;
              background-color: #FFFFFF;
            }
            
            .hero-section {
              position: relative;
              text-align: center;
              background: linear-gradient(180deg, rgba(30, 50, 40, 0.85) 0%, rgba(20, 40, 30, 0.90) 100%), 
                          url('https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&q=85&fit=crop&crop=top') center top/cover no-repeat;
              padding: 40px 32px 45px;
              border-radius: 16px;
              margin: 0 16px 24px;
              overflow: hidden;
            }
            
            .hero-badge-container {
              margin: 0 auto 25px;
              text-align: center;
            }
            
            .hero-badge-image {
              width: 100px;
              height: 100px;
              display: inline-block;
              filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
            }
            
            .hero-title {
              color: #FFFFFF;
              font-size: 32px;
              font-weight: 400;
              margin: 0;
              line-height: 1.3;
              text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
            }
            
            .hero-title-highlight {
              color: #29CCB1;
              font-weight: 700;
              display: block;
              font-size: 34px;
              margin-top: 2px;
            }
            
            .content-section {
              padding: 32px 28px;
              background-color: #FFFFFF;
            }
            
            .greeting {
              font-size: 42px;
              font-weight: 700;
              color: #1D1D1B;
              margin: 0 0 6px 0;
              line-height: 1;
              letter-spacing: -0.5px;
            }
            
            .greeting-name {
              color: #29CCB1;
              display: block;
              margin-top: 2px;
            }
            
            .intro-text {
              font-size: 16px;
              color: #1D1D1B;
              margin: 20px 0;
              line-height: 1.6;
            }
            
            .intro-text-highlight {
              font-weight: 700;
              color: #29CCB1;
            }
            
            .cta-container {
              text-align: center;
              margin: 24px 0;
            }
            
            .cta-button {
              display: inline-block;
              background-color: #29CCB1;
              color: #FFFFFF;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              box-shadow: 0 3px 12px rgba(41, 204, 177, 0.35);
              line-height: 1.5;
            }
            
            .player-section {
              margin: 28px 0;
              background: transparent;
              padding: 0;
            }
            
            .player-image-container {
              text-align: center;
              margin-bottom: 18px;
            }
            
            .player-image {
              width: 100%;
              max-width: 340px;
              height: auto;
              border-radius: 12px;
            }
            
            .player-text {
              font-size: 15px;
              color: #1D1D1B;
              line-height: 1.6;
              margin-top: 16px;
            }
            
            .player-text-highlight {
              font-weight: 700;
              color: #29CCB1;
            }
            
            .player-text-bold {
              font-weight: 700;
            }
            
            .conditions-text {
              font-size: 15px;
              color: #1D1D1B;
              margin: 20px 0;
              line-height: 1.6;
            }
            
            .conditions-link {
              color: #29CCB1;
              font-weight: 600;
              text-decoration: none;
            }
            
            .footer-section-image {
              margin: 35px 0;
              text-align: center;
            }
            
            .footer-player-image {
              width: 100%;
              max-width: 100%;
              height: auto;
              border-radius: 12px;
            }
            
            .footer-player-overlay {
              position: relative;
              max-width: 100%;
              margin: 0 16px;
            }
            
            .footer-player-text {
              position: absolute;
              right: 20px;
              top: 50%;
              transform: translateY(-50%);
              text-align: right;
              color: #FFFFFF;
              text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
              max-width: 280px;
            }
            
            .footer-player-title {
              font-size: 28px;
              font-weight: 400;
              line-height: 1.3;
              margin-bottom: 8px;
            }
            
            .footer-player-highlight {
              color: #29CCB1;
              font-weight: 900;
              display: block;
              font-size: 30px;
            }
            
            .link-section {
              margin: 30px 32px;
              padding: 24px;
              background-color: #F8F9FA;
              border-radius: 10px;
            }
            
            .link-text {
              font-size: 14px;
              color: #6B7280;
              margin-bottom: 12px;
            }
            
            .link-url {
              font-size: 13px;
              color: #29CCB1;
              word-break: break-all;
              text-decoration: none;
              font-weight: 600;
            }
            
            .footer-section {
              background-color: #1D1D1B;
              color: #FFFFFF;
              padding: 35px 32px;
              text-align: center;
            }
            
            .footer-logo {
              font-size: 20px;
              color: #29CCB1;
              font-weight: 700;
              margin-bottom: 18px;
              letter-spacing: 0.2px;
            }
            
            .footer-text {
              font-size: 14px;
              color: #FFFFFF;
              opacity: 0.9;
              line-height: 1.7;
            }
            
            .footer-highlight {
              color: #29CCB1;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <!-- Header -->
            <div class="header-logo">
              <span style="font-size: 22px; font-weight: 700; color: #29CCB1; letter-spacing: -0.3px;">kaspersky</span>
            </div>
            
            <!-- Hero Section -->
            <div class="hero-section">
              <div class="hero-badge-container">
                <img src="${APP_URL}/email-assets/email-hero-badge/badge-logo.png" alt="Kaspersky Cup Badge" class="hero-badge-image" />
              </div>
              <h1 class="hero-title">
                Aquí comienza
                <span class="hero-title-highlight">tu ruta goleadora</span>
              </h1>
            </div>
            
            <!-- Content -->
            <div class="content-section">
              <h2 class="greeting">
                HOLA
                <span class="greeting-name">(${data.firstName.toUpperCase()})</span>
              </h2>
              
              <p class="intro-text">
                Desde hoy, ya eres uno de los jugadores de <span class="intro-text-highlight">Kaspersky Cup</span>, 
                el programa donde tus ventas se transforman en goles y te hacen <span class="intro-text-highlight">ganar premios increíbles.</span>
              </p>
              
              <div class="cta-container">
                <a href="${inviteLink}" class="cta-button">Quiero mis mejores cierres, más goles siempre<br/>para cuando se actualicen cada mes.</a>
              </div>
              
              <!-- Player Section -->
              <div class="player-section">
                <div class="player-image-container">
                  <img src="${APP_URL}/email-assets/email-images/player-celebration.png" 
                       alt="Jugador" 
                       class="player-image" />
                </div>
                <p class="player-text">
                  El equipo de <span class="player-text-highlight">Kaspersky Cup</span> inspirará tus negocios y, al 
                  ser el máximo goleador podrás llevarte el gran premio con una <span class="player-text-bold">entrada para ver 
                  un partido del mundial con todo pago.</span>
                </p>
              </div>
              
              <p class="conditions-text">
                Ingresa ahora a <a href="https://kasperskycup.com" class="conditions-link">kasperskycup.com</a> 
                como las condiciones del programa y haste la narración!
              </p>
            </div>
            
            <!-- Footer Image with Text Overlay -->
            <div class="footer-section-image">
              <div class="footer-player-overlay">
                <img src="${APP_URL}/email-assets/email-images/player-action.png" 
                     alt="Futbol" 
                     class="footer-player-image" />
                <div class="footer-player-text">
                  <div class="footer-player-title">
                    La emoción del<br>
                    fútbol, la pasión<br>
                    por las ventas
                  </div>
                  <span class="footer-player-highlight">solo en<br>Kaspersky Cup.</span>
                </div>
              </div>
            </div>
            
            <!-- Link Section -->
            <div class="link-section">
              <p class="link-text">O copia y pega este enlace en tu navegador:</p>
              <a href="${inviteLink}" class="link-url">${inviteLink}</a>
            </div>
            
            <!-- Footer -->
            <div class="footer-section">
              <div class="footer-logo">kaspersky</div>
              <p class="footer-text">
                La emoción del fútbol, la pasión por las ventas.<br>
                <span class="footer-highlight">Solo en Kaspersky Cup.</span>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    sendSmtpEmail.textContent = `
Hola ${data.firstName} ${data.lastName},

Has sido invitado por ${data.invitedBy} a unirte a Kaspersky Cup.

Desde hoy, ya eres uno de los jugadores de Kaspersky Cup, el programa donde tus ventas se transforman en goles y te hacen ganar premios increíbles.

Para completar tu registro y empezar a marcar goles, visita el siguiente enlace:
${inviteLink}

El equipo de Kaspersky Cup inspirará tus negocios y, al ser el máximo goleador podrás llevarte el gran premio con una entrada para ver un partido del mundial con todo incluido.

Este enlace de invitación es único y personal.

Saludos,
Kaspersky Cup
      `.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Invite email sent successfully to:', data.email);
    return true;
  } catch (error: any) {
    console.error('❌ Error sending invite email:', error);
    
    // Log más detalles del error
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.body) {
      console.error('   Error body:', JSON.stringify(error.body, null, 2));
    }
    
    console.error('   Error message:', error.message);
    
    return false;
  }
}

/**
 * Envía un email de bienvenida después del registro
 */
export async function sendWelcomeEmail(email: string, firstName: string, lastName: string): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      return true;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: email, name: `${firstName} ${lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = '⚽ Registro Completado - Kaspersky Cup';
    sendSmtpEmail.htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Arial:wght@400;700;900&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              background-color: #F5F5F5;
              margin: 0;
              padding: 0;
            }
            
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #FFFFFF;
            }
            
            .header-logo {
              text-align: center;
              padding: 20px 0 0 0;
              background-color: #FFFFFF;
            }
            
            .hero-section {
              position: relative;
              text-align: center;
              background: linear-gradient(180deg, #1D1D1B 0%, #2D2D2B 100%);
              padding: 40px 32px;
            }
            
            .hero-badge {
              display: inline-block;
              background-color: #29CCB1;
              border-radius: 50%;
              width: 120px;
              height: 120px;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 20px rgba(41, 204, 177, 0.3);
            }
            
            .hero-badge-inner {
              color: #FFFFFF;
              font-size: 48px;
            }
            
            .hero-title {
              color: #FFFFFF;
              font-size: 40px;
              font-weight: 900;
              margin-bottom: 10px;
              line-height: 1.2;
            }
            
            .hero-title-highlight {
              color: #29CCB1;
              font-weight: 900;
              display: block;
            }
            
            .content-section {
              padding: 40px 32px;
              background-color: #FFFFFF;
            }
            
            .greeting {
              font-size: 45px;
              font-weight: 900;
              color: #1D1D1B;
              margin-bottom: 10px;
            }
            
            .greeting-name {
              color: #29CCB1;
            }
            
            .intro-text {
              font-size: 18px;
              color: #1D1D1B;
              margin-bottom: 20px;
              line-height: 1.6;
            }
            
            .intro-text-highlight {
              font-weight: 900;
              color: #29CCB1;
            }
            
            .status-box {
              background-color: #9DFFEF;
              border-left: 4px solid #29CCB1;
              padding: 20px;
              margin: 30px 0;
              border-radius: 4px;
            }
            
            .status-box-title {
              font-size: 20px;
              font-weight: 900;
              color: #1D1D1B;
              margin-bottom: 10px;
            }
            
            .status-box-text {
              font-size: 16px;
              color: #1D1D1B;
            }
            
            .footer-section {
              background-color: #1D1D1B;
              color: #FFFFFF;
              padding: 30px 32px;
              text-align: center;
            }
            
            .footer-logo {
              font-size: 16px;
              color: #29CCB1;
              font-weight: 700;
              margin-bottom: 15px;
            }
            
            .footer-text {
              font-size: 14px;
              color: #FFFFFF;
              opacity: 0.8;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header-logo">
              <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="0" y="28" font-family="Arial" font-size="20" font-weight="700" fill="#29CCB1">kaspersky</text>
              </svg>
            </div>
            
            <div class="hero-section">
              <div class="hero-badge">
                <div class="hero-badge-inner">✓</div>
              </div>
              <h1 class="hero-title">
                REGISTRO
                <span class="hero-title-highlight">COMPLETADO</span>
              </h1>
            </div>
            
            <div class="content-section">
              <h2 class="greeting">
                ¡GRACIAS
                <span class="greeting-name">${firstName.toUpperCase()}!</span>
              </h2>
              
              <p class="intro-text">
                Tu registro en <span class="intro-text-highlight">Kaspersky Cup</span> ha sido completado exitosamente.
              </p>
              
              <div class="status-box">
                <div class="status-box-title">🔍 Cuenta en Revisión</div>
                <div class="status-box-text">
                  Tu cuenta está ahora en revisión por nuestro equipo. Una vez aprobada, 
                  recibirás un correo de confirmación y podrás empezar a marcar goles.
                </div>
              </div>
              
              <p class="intro-text">
                Normalmente este proceso toma <span class="intro-text-highlight">menos de 24 horas</span>.
              </p>
              
              <p class="intro-text">
                Una vez aprobada tu cuenta, podrás:
              </p>
              
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 8px 0; padding-left: 30px; position: relative; font-size: 18px; color: #1D1D1B;">
                  <span style="position: absolute; left: 0; color: #29CCB1;">⚽</span>
                  Registrar tus deals y acumular goles
                </li>
                <li style="padding: 8px 0; padding-left: 30px; position: relative; font-size: 18px; color: #1D1D1B;">
                  <span style="position: absolute; left: 0; color: #29CCB1;">🎁</span>
                  Canjear recompensas exclusivas
                </li>
                <li style="padding: 8px 0; padding-left: 30px; position: relative; font-size: 18px; color: #1D1D1B;">
                  <span style="position: absolute; left: 0; color: #29CCB1;">🏆</span>
                  Competir por el gran premio mundial
                </li>
              </ul>
            </div>
            
            <div class="footer-section">
              <div class="footer-logo">kaspersky</div>
              <p class="footer-text">
                La emoción del fútbol, la pasión por las ventas.<br>
                <strong>Solo en Kaspersky Cup.</strong>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Welcome email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

/**
 * Envía un email de cuenta activada y lista para usar
 */
export async function sendApprovalEmail(email: string, firstName: string, lastName: string): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      return true;
    }

    const loginLink = `${APP_URL}/login`;

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: email, name: `${firstName} ${lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = '🎉 ¡Cuenta Activada! - Empieza a Marcar Goles';
    sendSmtpEmail.htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Arial:wght@400;700;900&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              background-color: #F5F5F5;
              margin: 0;
              padding: 0;
            }
            
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #FFFFFF;
            }
            
            .header-logo {
              text-align: center;
              padding: 20px 0 0 0;
              background-color: #FFFFFF;
            }
            
            .hero-section {
              position: relative;
              text-align: center;
              background: linear-gradient(180deg, #1D1D1B 0%, #2D2D2B 100%);
              padding: 40px 32px;
            }
            
            .hero-badge {
              display: inline-block;
              background-color: #29CCB1;
              border-radius: 50%;
              width: 120px;
              height: 120px;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 20px rgba(41, 204, 177, 0.3);
              animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            
            .hero-badge-inner {
              color: #FFFFFF;
              font-size: 60px;
            }
            
            .hero-title {
              color: #FFFFFF;
              font-size: 40px;
              font-weight: 900;
              margin-bottom: 10px;
              line-height: 1.2;
            }
            
            .hero-title-highlight {
              color: #29CCB1;
              font-weight: 900;
              display: block;
            }
            
            .content-section {
              padding: 40px 32px;
              background-color: #FFFFFF;
            }
            
            .greeting {
              font-size: 45px;
              font-weight: 900;
              color: #1D1D1B;
              margin-bottom: 10px;
            }
            
            .greeting-name {
              color: #29CCB1;
            }
            
            .intro-text {
              font-size: 18px;
              color: #1D1D1B;
              margin-bottom: 20px;
              line-height: 1.6;
            }
            
            .intro-text-highlight {
              font-weight: 900;
              color: #29CCB1;
            }
            
            .cta-button {
              display: inline-block;
              background-color: #29CCB1;
              color: #FFFFFF;
              padding: 16px 40px;
              text-decoration: none;
              border-radius: 8px;
              font-size: 18px;
              font-weight: 700;
              margin: 30px 0;
              transition: background-color 0.3s ease;
            }
            
            .cta-button:hover {
              background-color: #00A88E;
            }
            
            .success-box {
              background: linear-gradient(135deg, #29CCB1 0%, #00A88E 100%);
              color: #FFFFFF;
              padding: 30px;
              margin: 30px 0;
              border-radius: 12px;
              text-align: center;
            }
            
            .success-box-title {
              font-size: 24px;
              font-weight: 900;
              margin-bottom: 10px;
            }
            
            .success-box-text {
              font-size: 16px;
            }
            
            .features-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin: 30px 0;
            }
            
            .feature-card {
              background-color: #F5F5F5;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
            }
            
            .feature-icon {
              font-size: 40px;
              margin-bottom: 10px;
            }
            
            .feature-title {
              font-size: 16px;
              font-weight: 700;
              color: #1D1D1B;
              margin-bottom: 5px;
            }
            
            .feature-text {
              font-size: 14px;
              color: #6F6F6F;
            }
            
            .footer-section {
              background-color: #1D1D1B;
              color: #FFFFFF;
              padding: 30px 32px;
              text-align: center;
            }
            
            .footer-logo {
              font-size: 16px;
              color: #29CCB1;
              font-weight: 700;
              margin-bottom: 15px;
            }
            
            .footer-text {
              font-size: 14px;
              color: #FFFFFF;
              opacity: 0.8;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header-logo">
              <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="0" y="28" font-family="Arial" font-size="20" font-weight="700" fill="#29CCB1">kaspersky</text>
              </svg>
            </div>
            
            <div class="hero-section">
              <div class="hero-badge">
                <div class="hero-badge-inner">🏆</div>
              </div>
              <h1 class="hero-title">
                ¡ES OFICIAL!
                <span class="hero-title-highlight">ERES JUGADOR</span>
              </h1>
            </div>
            
            <div class="content-section">
              <h2 class="greeting">
                ¡FELICIDADES
                <span class="greeting-name">${firstName.toUpperCase()}!</span>
              </h2>
              
              <p class="intro-text">
                Tu cuenta de <span class="intro-text-highlight">Kaspersky Cup</span> ha sido aprobada. 
                ¡Ya puedes empezar a marcar goles y ganar premios increíbles!
              </p>
              
              <div class="success-box">
                <div class="success-box-title">✨ ¡Estás listo para jugar!</div>
                <div class="success-box-text">
                  Inicia sesión ahora y comienza tu camino hacia el mundial
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="${loginLink}" class="cta-button">Iniciar Sesión Ahora</a>
              </div>
              
              <p class="intro-text" style="margin-top: 30px;">
                <span class="intro-text-highlight">¿Qué puedes hacer ahora?</span>
              </p>
              
              <div class="features-grid">
                <div class="feature-card">
                  <div class="feature-icon">⚽</div>
                  <div class="feature-title">Registra Deals</div>
                  <div class="feature-text">Convierte ventas en goles</div>
                </div>
                <div class="feature-card">
                  <div class="feature-icon">🎁</div>
                  <div class="feature-title">Gana Premios</div>
                  <div class="feature-text">Canjea recompensas</div>
                </div>
                <div class="feature-card">
                  <div class="feature-icon">📊</div>
                  <div class="feature-title">Ve tu Progreso</div>
                  <div class="feature-text">Sigue tus estadísticas</div>
                </div>
                <div class="feature-card">
                  <div class="feature-icon">🏆</div>
                  <div class="feature-title">Compite</div>
                  <div class="feature-text">Por el gran premio</div>
                </div>
              </div>
              
              <p class="intro-text">
                Recuerda: cada deal que cierres te acerca más al <span class="intro-text-highlight">viaje al mundial con todo incluido</span>. 
                ¡No pierdas tiempo y empieza a marcar goles!
              </p>
            </div>
            
            <div class="footer-section">
              <div class="footer-logo">kaspersky</div>
              <p class="footer-text">
                La emoción del fútbol, la pasión por las ventas.<br>
                <strong>Solo en Kaspersky Cup.</strong>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Approval email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Error sending approval email:', error);
    return false;
  }
}

/**
 * Envía email al usuario cuando su deal ha sido aprobado
 */
export async function sendDealApprovedEmail(
  email: string, 
  firstName: string, 
  lastName: string,
  dealDetails: {
    productName: string;
    dealValue: string;
    pointsEarned: number;
  }
): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      console.log(`Simulated deal approved email to: ${email}`);
      return true;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email, name: `${firstName} ${lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Loyalty Program Platform' };
    sendSmtpEmail.subject = '🎉 Deal Aprobado - Puntos Ganados';
    sendSmtpEmail.htmlContent = `
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
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
          .deal-details {
            background: white;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .points-badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
          }
          .footer {
            background: #f3f4f6;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            border-radius: 0 0 10px 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 ¡Deal Aprobado!</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${firstName} ${lastName}</strong>,</p>
          
          <p>¡Excelentes noticias! Tu deal ha sido aprobado y has ganado puntos.</p>
          
          <div class="deal-details">
            <h3 style="margin-top: 0; color: #10b981;">📊 Detalles del Deal</h3>
            <p><strong>Producto:</strong> ${dealDetails.productName}</p>
            <p><strong>Valor del Deal:</strong> $${dealDetails.dealValue}</p>
            <div style="text-align: center; margin: 20px 0;">
              <div class="points-badge">
                +${dealDetails.pointsEarned} puntos
              </div>
            </div>
          </div>
          
          <p>Estos puntos ya están disponibles en tu cuenta y puedes usarlos para canjear recompensas increíbles.</p>
          
          <p style="margin-top: 30px;">
            <a href="${APP_URL}" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
              Ver Mi Dashboard
            </a>
          </p>
          
          <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            ¡Sigue así! Cada deal aprobado te acerca más a tus recompensas favoritas.
          </p>
        </div>
        <div class="footer">
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          <p>&copy; ${new Date().getFullYear()} Loyalty Program Platform. Todos los derechos reservados.</p>
        </div>
      </body>
      </html>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Deal approved email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Error sending deal approved email:', error);
    return false;
  }
}

/**
 * Envía email al usuario cuando su redención de puntos ha sido aprobada
 */
export async function sendRedemptionApprovedEmail(
  email: string,
  firstName: string,
  lastName: string,
  redemptionDetails: {
    rewardName: string;
    pointsCost: number;
    status: string;
    estimatedDeliveryDays?: number;
  }
): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      console.log(`Simulated redemption approved email to: ${email}`);
      return true;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { name: 'Kaspersky Cup', email: FROM_EMAIL };
    sendSmtpEmail.to = [{ email: email, name: `${firstName} ${lastName}` }];
    sendSmtpEmail.subject = 'Kaspersky Cup - ¡Premio Aprobado!';

    const userName = firstName.toUpperCase();

    // URLs de las imágenes en Cloudinary
    const heroImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764347920/loyalty-program/emails/aprobacion-premio/Group%2064.png';
    const heroImage2xUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764347922/loyalty-program/emails/aprobacion-premio/Group%2064%402x.png';
    const logoKasperskyUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764336795/loyalty-program/emails/common/Kaspersky%20Logo.png';

    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>¡Premio Aprobado! - Kaspersky Cup</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            overflow: hidden;
          }
          
          /* Header con logo Kaspersky */
          .header-logo {
            text-align: center;
            padding: 30px 20px 20px;
            background-color: #ffffff;
          }
          
          .header-logo img {
            width: 120px;
            height: auto;
          }
          
          /* Imagen Hero con fondo negro */
          .hero-section {
            text-align: center;
            background-color: #1D1D1B;
            padding: 0;
            position: relative;
          }
          
          .hero-image {
            width: 100%;
            height: auto;
            display: block;
          }
          
          /* Contenido principal */
          .content-section {
            padding: 40px 40px 30px;
            background-color: #ffffff;
            text-align: center;
          }
          
          .greeting {
            font-size: 32px;
            font-weight: 700;
            color: #1D1D1B;
            margin-bottom: 5px;
            line-height: 1.2;
          }
          
          .user-name {
            font-size: 32px;
            font-weight: 700;
            color: #29CCB1;
            margin-bottom: 25px;
            line-height: 1.2;
          }
          
          .message-text {
            font-size: 16px;
            color: #4A4A4A;
            line-height: 1.8;
            margin-bottom: 30px;
          }
          
          .highlight-text {
            color: #29CCB1;
            font-weight: 700;
          }
          
          /* Tabla de información */
          .info-table {
            width: 100%;
            margin: 30px 0;
            border-collapse: separate;
            border-spacing: 0;
            overflow: hidden;
          }
          
          .info-table tr td {
            padding: 15px 20px;
            font-size: 14px;
            border-bottom: 1px solid #E5E7EB;
          }
          
          .info-table tr:last-child td {
            border-bottom: none;
          }
          
          .info-table td:first-child {
            background-color: #29CCB1;
            color: #ffffff;
            font-weight: 600;
            text-align: left;
            width: 45%;
          }
          
          .info-table td:last-child {
            background-color: #ffffff;
            color: #1D1D1B;
            text-align: left;
            border: 1px solid #E5E7EB;
            border-left: none;
            font-weight: 500;
          }
          
          .status-box {
            background-color: #F8F8F8;
            border-radius: 8px;
            padding: 25px;
            margin: 30px 0;
            text-align: left;
          }
          
          .status-box p {
            font-size: 15px;
            color: #4A4A4A;
            line-height: 1.8;
            margin: 0;
          }
          
          .cta-button {
            display: inline-block;
            background-color: #29CCB1;
            color: #ffffff;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            margin: 25px 0 20px;
          }
          
          .footer-text {
            font-size: 15px;
            color: #4A4A4A;
            line-height: 1.6;
            margin-top: 20px;
          }
          
          .footer-highlight {
            color: #29CCB1;
            font-weight: 700;
          }
          
          /* Footer Section */
          .footer-section {
            padding: 30px 40px 40px;
            background-color: #ffffff;
            text-align: center;
          }
          
          .social-title {
            font-size: 14px;
            color: #666666;
            margin-bottom: 15px;
            font-weight: 600;
          }
          
          .social-links {
            margin-bottom: 25px;
          }
          
          .social-links a {
            display: inline-block;
            margin: 0 6px;
            text-decoration: none;
            background-color: #1D1D1B;
            padding: 8px;
            border-radius: 4px;
          }
          
          .social-links img {
            width: 16px;
            height: 16px;
            display: block;
          }
          
          .footer-logo {
            margin-top: 25px;
          }
          
          .footer-logo img {
            width: 80px;
            height: auto;
          }
          
          /* Responsive */
          @media only screen and (max-width: 600px) {
            .content-section,
            .footer-section {
              padding-left: 20px;
              padding-right: 20px;
            }
            
            .greeting,
            .user-name {
              font-size: 26px;
            }
            
            .message-text {
              font-size: 14px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Header Logo -->
          <div class="header-logo">
            <img src="${logoKasperskyUrl}" 
                 alt="Kaspersky" />
          </div>
          
          <!-- Hero Image -->
          <div class="hero-section">
            <img src="${heroImageUrl}" 
                 srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x"
                 alt="¡Así se hace! Su premio ya va en camino" 
                 class="hero-image" />
          </div>
          
          <!-- Content Section -->
          <div class="content-section">
            <div class="greeting">HOLA</div>
            <div class="user-name">(${userName})</div>
            
            <p class="message-text">
              ¡Fantástico!
            </p>
            
            <p class="message-text">
              Su premio ha sido aprobado y está en proceso de entrega.
            </p>
            
            <!-- Info Table -->
            <table class="info-table">
              <tr>
                <td>Nombre del premio</td>
                <td>${redemptionDetails.rewardName}</td>
              </tr>
              <tr>
                <td>Goles canjeados</td>
                <td>${redemptionDetails.pointsCost} Goles</td>
              </tr>
              <tr>
                <td>Tiempo estimado<br>de entrega</td>
                <td>${redemptionDetails.estimatedDeliveryDays || 3} Días</td>
              </tr>
            </table>
            
            <!-- Status Box -->
            <div class="status-box">
              <p>
                El equipo de <span class="highlight-text">Kaspersky Cup</span> se pondrá en contacto con 
                usted para validar los datos de envío y asegurarse de que 
                su premio llegue sin inconvenientes.
              </p>
            </div>
            
            <p class="message-text">
              También puede revisar el estado de su premio<br>
              haciendo clic aquí:
            </p>
            
            <!-- CTA Button -->
            <a href="${APP_URL}/rewards" class="cta-button">Mis redenciones</a>
            
            <!-- Footer Text -->
            <p class="footer-text">
              <span class="footer-highlight">¡Gracias por jugar en Kaspersky Cup!</span>
            </p>
          </div>
          
          <!-- Footer Section -->
          <div class="footer-section">
            <!-- Texto Siga a Kaspersky -->
            <div class="social-title">Siga a Kaspersky :</div>
            
            <!-- Redes Sociales -->
            <div class="social-links">
              <a href="https://www.facebook.com/Kaspersky" title="Facebook" style="display: inline-block; margin: 0 6px; text-decoration: none; background-color: #1D1D1B; padding: 8px; border-radius: 4px;">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338210/loyalty-program/emails/common/social-icons/Group%2023.png" alt="Facebook" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://twitter.com/kaspersky" title="Twitter" style="display: inline-block; margin: 0 6px; text-decoration: none; background-color: #1D1D1B; padding: 8px; border-radius: 4px;">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338220/loyalty-program/emails/common/social-icons/Subtraction%201.png" alt="Twitter" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://www.linkedin.com/company/kaspersky-lab" title="LinkedIn" style="display: inline-block; margin: 0 6px; text-decoration: none; background-color: #1D1D1B; padding: 8px; border-radius: 4px;">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338212/loyalty-program/emails/common/social-icons/Group%2025.png" alt="LinkedIn" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://www.instagram.com/kasperskylab/" title="Instagram" style="display: inline-block; margin: 0 6px; text-decoration: none; background-color: #1D1D1B; padding: 8px; border-radius: 4px;">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338213/loyalty-program/emails/common/social-icons/Group%2027.png" alt="Instagram" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://www.youtube.com/user/Kaspersky" title="YouTube" style="display: inline-block; margin: 0 6px; text-decoration: none; background-color: #1D1D1B; padding: 8px; border-radius: 4px;">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338215/loyalty-program/emails/common/social-icons/Group%2028.png" alt="YouTube" style="width: 16px; height: 16px;" />
              </a>
            </div>
            
            <!-- Logo Kaspersky al final -->
            <div class="footer-logo">
              <img src="${logoKasperskyUrl}" alt="Kaspersky" />
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    sendSmtpEmail.textContent = `
Kaspersky Cup - ¡Premio Aprobado!

HOLA (${userName})

¡Fantástico!

Su premio ha sido aprobado y está en proceso de entrega.

Nombre del premio: ${redemptionDetails.rewardName}
Goles canjeados: ${redemptionDetails.pointsCost} Goles
Tiempo estimado de entrega: ${redemptionDetails.estimatedDeliveryDays || 3} Días

El equipo de Kaspersky Cup se pondrá en contacto con usted para validar los datos de envío y asegurarse de que su premio llegue sin inconvenientes.

También puede revisar el estado de su premio haciendo clic aquí:
${APP_URL}/rewards

¡Gracias por jugar en Kaspersky Cup!

Siga a Kaspersky en nuestras redes sociales:
- Facebook: https://www.facebook.com/Kaspersky
- Twitter: https://twitter.com/kaspersky
- LinkedIn: https://www.linkedin.com/company/kaspersky-lab
- Instagram: https://www.instagram.com/kasperskylab/
- YouTube: https://www.youtube.com/user/Kaspersky

Saludos,
Kaspersky Cup
    `.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Redemption approved email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Error sending redemption approved email:', error);
    return false;
  }
}

/**
 * Envía email al admin cuando un usuario solicita redención de puntos
 */
export async function sendRedemptionRequestToAdmin(
  adminEmail: string,
  userDetails: {
    firstName: string;
    lastName: string;
    email: string;
  },
  redemptionDetails: {
    rewardName: string;
    pointsCost: number;
    redemptionId: string;
  }
): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      console.log(`Simulated redemption request email to admin: ${adminEmail}`);
      return true;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: adminEmail, name: 'Admin' }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Loyalty Program Platform' };
    sendSmtpEmail.subject = '🔔 Nueva Solicitud de Redención de Puntos';
    sendSmtpEmail.htmlContent = `
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
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
          .info-box {
            background: white;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 15px 0;
          }
          .footer {
            background: #f3f4f6;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            border-radius: 0 0 10px 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔔 Nueva Solicitud de Redención</h1>
        </div>
        <div class="content">
          <p>Hola Admin,</p>
          
          <p>Un usuario ha solicitado redimir puntos. Por favor, revisa y procesa esta solicitud.</p>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #f59e0b;">👤 Usuario</h3>
            <p><strong>Nombre:</strong> ${userDetails.firstName} ${userDetails.lastName}</p>
            <p><strong>Email:</strong> ${userDetails.email}</p>
          </div>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #f59e0b;">🎁 Detalles de Redención</h3>
            <p><strong>Recompensa:</strong> ${redemptionDetails.rewardName}</p>
            <p><strong>Puntos:</strong> ${redemptionDetails.pointsCost}</p>
            <p><strong>ID Redención:</strong> ${redemptionDetails.redemptionId}</p>
          </div>
          
          <p style="margin-top: 30px;">
            <a href="${APP_URL}/admin" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
              Ir al Panel Admin
            </a>
          </p>
        </div>
        <div class="footer">
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          <p>&copy; ${new Date().getFullYear()} Loyalty Program Platform. Todos los derechos reservados.</p>
        </div>
      </body>
      </html>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Redemption request email sent successfully to admin:', adminEmail);
    return true;
  } catch (error) {
    console.error('Error sending redemption request email to admin:', error);
    return false;
  }
}

/**
 * Envía email al admin cuando un usuario crea un ticket de soporte
 */
export async function sendSupportTicketToAdmin(
  adminEmail: string,
  userDetails: {
    firstName: string;
    lastName: string;
    email: string;
  },
  ticketDetails: {
    subject: string;
    message: string;
    ticketId: string;
  }
): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      console.log(`Simulated support ticket email to admin: ${adminEmail}`);
      return true;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: adminEmail, name: 'Admin' }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Loyalty Program Platform' };
    sendSmtpEmail.subject = '🎫 Nuevo Ticket de Soporte';
    sendSmtpEmail.htmlContent = `
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
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
          .info-box {
            background: white;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 15px 0;
          }
          .ticket-message {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .footer {
            background: #f3f4f6;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            border-radius: 0 0 10px 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎫 Nuevo Ticket de Soporte</h1>
        </div>
        <div class="content">
          <p>Hola Admin,</p>
          
          <p>Un usuario ha creado un nuevo ticket de soporte que requiere tu atención.</p>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #ef4444;">👤 Usuario</h3>
            <p><strong>Nombre:</strong> ${userDetails.firstName} ${userDetails.lastName}</p>
            <p><strong>Email:</strong> ${userDetails.email}</p>
          </div>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #ef4444;">🎫 Detalles del Ticket</h3>
            <p><strong>ID Ticket:</strong> ${ticketDetails.ticketId}</p>
            <p><strong>Asunto:</strong> ${ticketDetails.subject}</p>
          </div>
          
          <div class="ticket-message">
            <h4 style="margin-top: 0;">💬 Mensaje:</h4>
            <p>${ticketDetails.message}</p>
          </div>
          
          <p style="margin-top: 30px;">
            <a href="${APP_URL}/admin" style="display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
              Ir a Tickets de Soporte
            </a>
          </p>
        </div>
        <div class="footer">
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          <p>&copy; ${new Date().getFullYear()} Loyalty Program Platform. Todos los derechos reservados.</p>
        </div>
      </body>
      </html>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Support ticket email sent successfully to admin:', adminEmail);
    return true;
  } catch (error) {
    console.error('Error sending support ticket email to admin:', error);
    return false;
  }
}

export interface MagicLinkEmailData {
  email: string;
  firstName: string;
  lastName: string;
  loginToken: string;
}

export interface ExpectationEmailData {
  email: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Envía un email de expectativa para generar interés en el programa
 * Este email se envía antes del lanzamiento o como campaña promocional
 */
export async function sendExpectationEmail(data: ExpectationEmailData): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️  BREVO_API_KEY no configurada. Email no enviado.');
      console.log('📧 Simulated expectation email to:', data.email);
      return true; // Simular éxito en desarrollo
    }

    console.log('📤 Intentando enviar email de expectativa...');
    console.log('   Destinatario:', data.email);
    console.log('   Remitente:', FROM_EMAIL);
    
    // Imágenes alojadas en Cloudinary (Europa)
    const heroImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764337224/loyalty-program/emails/expectativa/hero.png';
    const heroImage2xUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764337226/loyalty-program/emails/expectativa/hero-2x.png';
    const footerImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764337229/loyalty-program/emails/expectativa/footer.png';
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ 
      email: data.email, 
      name: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : undefined 
    }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = '⚽ Ventas que se celebran como goles - Kaspersky Cup 2025';
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            background-color: #FFFFFF;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #FFFFFF;
          }
          
          .header-section {
            text-align: left;
            padding: 32px 40px 24px 40px;
            background-color: #FFFFFF;
          }
          
          .header-title {
            font-size: 22px;
            color: #1D1D1B;
            margin: 0 0 4px 0;
            font-weight: 400;
            line-height: 1.3;
          }
          
          .header-subtitle {
            font-size: 20px;
            color: #1D1D1B;
            margin: 0;
            font-weight: 300;
            line-height: 1.3;
          }
          
          .logo-section {
            text-align: center;
            padding: 12px 0;
            background-color: #FFFFFF;
          }
          
          .hero-image-section {
            position: relative;
            text-align: center;
            background-color: #FFFFFF;
            padding: 0;
            margin: 0;
            overflow: hidden;
          }
          
          .hero-image {
            width: 100%;
            max-width: 600px;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          
          .footer-section {
            background-color: #1D1D1B;
            color: #FFFFFF;
            padding: 48px 40px;
            text-align: center;
          }
          
          .footer-cup-badge {
            margin: 0 auto 28px;
            text-align: center;
          }
          
          .footer-cup-image {
            width: 250px;
            height: auto;
            display: inline-block;
          }
          
          .footer-title {
            font-size: 28px;
            font-weight: 400;
            color: #FFFFFF;
            margin: 0 0 8px 0;
            line-height: 1.3;
          }
          
          .footer-highlight {
            color: #29CCB1;
            font-weight: 700;
            display: block;
            font-size: 30px;
            margin-bottom: 20px;
          }
          
          .footer-cta {
            font-size: 18px;
            color: #FFFFFF;
            margin: 24px 0 32px 0;
            font-weight: 400;
            line-height: 1.4;
          }
          
          .social-section {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
          }
          
          .social-title {
            font-size: 14px;
            color: #FFFFFF;
            margin-bottom: 16px;
            font-weight: 400;
          }
          
          .social-links {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
          }
          
          .social-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.1);
            color: #FFFFFF;
            text-decoration: none;
            transition: background-color 0.3s ease;
          }
          
          .social-link:hover {
            background-color: rgba(41, 204, 177, 0.3);
          }
          
          @media only screen and (max-width: 600px) {
            .header-section {
              padding: 24px 24px 16px 24px;
            }
            
            .header-title {
              font-size: 20px;
            }
            
            .header-subtitle {
              font-size: 18px;
            }
            
            .footer-section {
              padding: 36px 24px;
            }
            
            .footer-title {
              font-size: 24px;
            }
            
            .footer-highlight {
              font-size: 26px;
            }
            
            .footer-cta {
              font-size: 16px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Imagen Hero -->
          <div class="hero-image-section">
            <img src="${heroImageUrl}" 
                 srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x"
                 alt="Ventas que se celebran como goles" 
                 class="hero-image" 
                 style="width: 100%; max-width: 600px; height: auto; display: block;" />
          </div>
          
          <!-- Footer Section -->
          <div class="footer-section">
            
            <!-- Badge Kaspersky Cup -->
            <div class="footer-cup-badge">
              <img src="${footerImageUrl}" 
                   alt="Kaspersky Cup" 
                   class="footer-cup-image" 
                   style="width: 250px; height: auto; display: inline-block;" />
            </div>
            
            <!-- Título Footer -->
            <div class="footer-title">
              Desde el 2025,
              <span class="footer-highlight">deja todo en la cancha</span>
            </div>
            
            <!-- CTA -->
            <p class="footer-cta">
              Descúbrelo muy pronto
            </p>
            
            <!-- Redes Sociales -->
            <div class="social-section">
              <div class="social-title">Siga a Kaspersky :</div>
              <div class="social-links">
                <a href="https://www.facebook.com/Kaspersky" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Facebook">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338210/loyalty-program/emails/common/social-icons/Group%2023.png" alt="Facebook" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://twitter.com/kaspersky" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Twitter">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338220/loyalty-program/emails/common/social-icons/Subtraction%201.png" alt="Twitter" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://www.linkedin.com/company/kaspersky-lab" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="LinkedIn">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338212/loyalty-program/emails/common/social-icons/Group%2025.png" alt="LinkedIn" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://www.instagram.com/kasperskylab/" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Instagram">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338213/loyalty-program/emails/common/social-icons/Group%2027.png" alt="Instagram" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://www.youtube.com/user/Kaspersky" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="YouTube">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338215/loyalty-program/emails/common/social-icons/Group%2028.png" alt="YouTube" style="width: 16px; height: 16px;" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    sendSmtpEmail.textContent = `
Kaspersky Cup - Email de Expectativa

Ventas que se celebran como goles

Desde el 2025, deja todo en la cancha

Descúbrelo muy pronto

Siga a Kaspersky en nuestras redes sociales:
- Facebook: https://www.facebook.com/Kaspersky
- Twitter: https://twitter.com/kaspersky
- LinkedIn: https://www.linkedin.com/company/kaspersky-lab
- Instagram: https://www.instagram.com/kasperskylab/
- YouTube: https://www.youtube.com/user/Kaspersky

Saludos,
Kaspersky Cup
    `.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Expectation email sent successfully to:', data.email);
    return true;
  } catch (error: any) {
    console.error('❌ Error sending expectation email:', error);
    
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.body) {
      console.error('   Error body:', JSON.stringify(error.body, null, 2));
    }
    
    console.error('   Error message:', error.message);
    
    return false;
  }
}

export interface RegistroExitosoEmailData {
  email: string;
  firstName?: string;
  lastName?: string;
  inviteToken?: string; // Para invitaciones (completar registro)
  loginToken?: string; // Para passwordless (acceso directo con magic link)
}

/**
 * Envía un email de invitación para completar el registro
 * Este email se envía cuando un admin invita a un nuevo usuario al programa
 */
export async function sendRegistroExitosoEmail(data: RegistroExitosoEmailData): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️  BREVO_API_KEY no configurada. Email no enviado.');
      console.log('📧 Simulated registro exitoso email to:', data.email);
      console.log('🔗 Registration link:', `${APP_URL}/register?token=${data.inviteToken}`);
      return true;
    }

    console.log('📤 Intentando enviar email de registro exitoso...');
    console.log('   Destinatario:', data.email);
    console.log('   Remitente:', FROM_EMAIL);
    
    // Imágenes alojadas en Cloudinary (Europa)
    const heroImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764342186/loyalty-program/emails/registro-exitoso/Group%2065.png';
    const heroImage2xUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764342187/loyalty-program/emails/registro-exitoso/Group%2065%402x.png';
    const footerImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764337229/loyalty-program/emails/expectativa/footer.png';
    const userName = data.firstName || 'Usuario';
    
    // Determinar el link correcto según el tipo de token
    const actionLink = data.inviteToken 
      ? `${APP_URL}/register?token=${data.inviteToken}` // Invitación: completar registro
      : data.loginToken 
        ? `${APP_URL}/auth/verify-magic-link/${data.loginToken}` // Passwordless: magic link
        : `${APP_URL}/login`; // Fallback
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ 
      email: data.email, 
      name: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : undefined 
    }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = '⚽ ¡Bienvenido a Kaspersky Cup! - Complete su registro';
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            background-color: #FFFFFF;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #FFFFFF;
          }
          
          .hero-image-section {
            position: relative;
            text-align: center;
            background-color: #FFFFFF;
            padding: 0;
            margin: 0;
            overflow: hidden;
          }
          
          .hero-image {
            width: 100%;
            max-width: 600px;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          
          .content-section {
            background-color: #FFFFFF;
            padding: 40px;
            text-align: center;
          }
          
          .greeting {
            font-size: 32px;
            font-weight: 700;
            color: #1D1D1B;
            margin-bottom: 8px;
          }
          
          .name {
            font-size: 32px;
            font-weight: 700;
            color: #29CCB1;
            margin-bottom: 32px;
          }
          
          .message {
            font-size: 16px;
            color: #1D1D1B;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          
          .highlight-text {
            color: #29CCB1;
            font-weight: 600;
          }
          
          .cta-button {
            display: inline-block;
            background-color: #29CCB1;
            color: #FFFFFF;
            text-decoration: none;
            padding: 14px 40px;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 600;
            margin: 24px 0;
          }
          
          .info-box {
            background-color: #F5F5F5;
            border: 1px solid #E0E0E0;
            border-radius: 4px;
            padding: 24px;
            margin: 32px 0;
            text-align: left;
          }
          
          .info-title {
            font-size: 18px;
            font-weight: 700;
            color: #1D1D1B;
            margin-bottom: 16px;
          }
          
          .info-text {
            font-size: 14px;
            color: #1D1D1B;
            line-height: 1.6;
          }
          
          .footer-section {
            background-color: #1D1D1B;
            color: #FFFFFF;
            padding: 48px 40px;
            text-align: center;
          }
          
          .footer-cup-badge {
            margin: 0 auto 28px;
            text-align: center;
          }
          
          .footer-cup-image {
            width: 250px;
            height: auto;
            display: inline-block;
          }
          
          .social-section {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
          }
          
          .social-title {
            font-size: 14px;
            color: #FFFFFF;
            margin-bottom: 16px;
            font-weight: 400;
          }
          
          @media only screen and (max-width: 600px) {
            .content-section {
              padding: 24px;
            }
            
            .greeting, .name {
              font-size: 24px;
            }
            
            .message {
              font-size: 14px;
            }
            
            .footer-section {
              padding: 36px 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Imagen Hero -->
          <div class="hero-image-section">
            <img src="${heroImageUrl}" 
                 srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x"
                 alt="Es momento de convertirse en el goleador de la temporada" 
                 class="hero-image" 
                 style="width: 100%; max-width: 600px; height: auto; display: block;" />
          </div>
          
          <!-- Contenido -->
          <div class="content-section">
            <div class="greeting">HOLA</div>
            <div class="name">(${userName})</div>
            
            <p class="message">
              Lo estamos esperando con la camiseta lista para <span class="highlight-text">Kaspersky Cup</span>.
            </p>
            
            <p class="message">
              Complete su registro e ingrese al programa donde sus ventas se transforman en goles.
            </p>
            
            <a href="${actionLink}" class="cta-button">Regístrese ahora</a>
            
            <div class="info-box">
              <div class="info-text">
                Una vez finalizado su registro, <strong>le enviaremos un correo confirmando que su inscripción fue aprobada</strong>. 
                Desde ese momento, podrá ingresar a la plataforma y comenzar a sumar goles.
              </div>
            </div>
            
            <div class="info-box" style="background-color: #1D1D1B; color: #FFFFFF; border-color: #1D1D1B;">
              <div class="info-title" style="color: #FFFFFF;">IMPORTANTE:</div>
              <div class="info-text" style="color: #FFFFFF;">
                Para que sus ventas se conviertan en goles dentro de la <span class="highlight-text">Kaspersky Cup</span>, 
                es necesario que estén registradas previamente en el programa <strong>Kudos</strong>. 
                Las ventas que no estén validadas en Kudos no podrán sumar goles.
              </div>
            </div>
          </div>
          
          <!-- Footer Section -->
          <div class="footer-section">
            <!-- Badge Kaspersky Cup -->
            <div class="footer-cup-badge">
              <img src="${footerImageUrl}" 
                   alt="Kaspersky Cup" 
                   class="footer-cup-image" 
                   style="width: 250px; height: auto; display: inline-block;" />
            </div>
            
            <!-- Redes Sociales -->
            <div class="social-section">
              <div class="social-title">Siga a Kaspersky :</div>
              <div class="social-links">
                <a href="https://www.facebook.com/Kaspersky" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Facebook">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338210/loyalty-program/emails/common/social-icons/Group%2023.png" alt="Facebook" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://twitter.com/kaspersky" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Twitter">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338220/loyalty-program/emails/common/social-icons/Subtraction%201.png" alt="Twitter" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://www.linkedin.com/company/kaspersky-lab" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="LinkedIn">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338212/loyalty-program/emails/common/social-icons/Group%2025.png" alt="LinkedIn" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://www.instagram.com/kasperskylab/" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Instagram">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338213/loyalty-program/emails/common/social-icons/Group%2027.png" alt="Instagram" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://www.youtube.com/user/Kaspersky" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="YouTube">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338215/loyalty-program/emails/common/social-icons/Group%2028.png" alt="YouTube" style="width: 16px; height: 16px;" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    sendSmtpEmail.textContent = `
Kaspersky Cup - ¡Bienvenido!

HOLA ${userName}

Lo estamos esperando con la camiseta lista para Kaspersky Cup.

Complete su registro e ingrese al programa donde sus ventas se transforman en goles.

Regístrese ahora: ${actionLink}

Una vez finalizado su registro, le enviaremos un correo confirmando que su inscripción fue aprobada.
Desde ese momento, podrá ingresar a la plataforma y comenzar a sumar goles.

IMPORTANTE:
Para que sus ventas se conviertan en goles dentro de la Kaspersky Cup, es necesario que estén registradas 
previamente en el programa Kudos. Las ventas que no estén validadas en Kudos no podrán sumar goles.

Siga a Kaspersky en nuestras redes sociales:
- Facebook: https://www.facebook.com/Kaspersky
- Twitter: https://twitter.com/kaspersky
- LinkedIn: https://www.linkedin.com/company/kaspersky-lab
- Instagram: https://www.instagram.com/kasperskylab/
- YouTube: https://www.youtube.com/user/Kaspersky

Saludos,
Kaspersky Cup
    `.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Registro exitoso email sent successfully to:', data.email);
    return true;
  } catch (error: any) {
    console.error('❌ Error sending registro exitoso email:', error);
    
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.body) {
      console.error('   Error body:', JSON.stringify(error.body, null, 2));
    }
    
    console.error('   Error message:', error.message);
    
    return false;
  }
}

export interface RegistroPasswordlessEmailData {
  email: string;
  firstName?: string;
  lastName?: string;
  loginToken: string; // Magic link token
}

/**
 * Envía el email de registro exitoso para usuarios passwordless
 * Asunto: !Registro exitoso! ¡Fue convocado a jugar en Kasperksy Cup! 🏆
 */
export async function sendRegistroPasswordlessEmail(data: RegistroPasswordlessEmailData): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️  BREVO_API_KEY no configurada. Email no enviado.');
      console.log('📧 Simulated registro passwordless email to:', data.email);
      console.log('🔗 Magic link:', `${APP_URL}/auth/verify-magic-link/${data.loginToken}`);
      return true;
    }

    console.log('📤 Intentando enviar email de registro passwordless...');
    console.log('   Destinatario:', data.email);
    console.log('   Remitente:', FROM_EMAIL);
    
    // Imágenes alojadas en Cloudinary (Europa)
    const leftImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764594519/loyalty-program/emails/registro-passwordless/Group%2065.png';
    const leftImage2xUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764594521/loyalty-program/emails/registro-passwordless/Group%2065%402x.png';
    const logoUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764594525/loyalty-program/emails/registro-passwordless/Logo%20-%20Kaspersky%20Cup.png';
    const logo2xUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764594526/loyalty-program/emails/registro-passwordless/Logo%20-%20Kaspersky%20Cup%402x.png';
    const footerImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764337229/loyalty-program/emails/expectativa/footer.png';
    const userName = data.firstName || 'Usuario';
    const magicLink = `${APP_URL}/auth/verify-magic-link/${data.loginToken}`;
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ 
      email: data.email, 
      name: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : undefined 
    }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = '!Registro exitoso! ¡Fue convocado a jugar en Kasperksy Cup! 🏆';
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            background-color: #FFFFFF;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #FFFFFF;
          }
          
          .hero-image-section {
            position: relative;
            text-align: center;
            background-color: #FFFFFF;
            padding: 0;
            margin: 0;
            overflow: hidden;
          }
          
          .hero-image {
            width: 536px;
            height: 850px;
            max-width: 100%;
            display: block;
            margin: 0 auto;
            background: transparent no-repeat padding-box;
            opacity: 1;
          }
          
          .content-section {
            background-color: #FFFFFF;
            padding: 40px 68px;
            text-align: center;
          }
          
          .greeting {
            font: normal normal 900 45px/50px Arial;
            letter-spacing: 0.36px;
            text-transform: uppercase;
            color: #1D1D1B;
            opacity: 1;
            margin-bottom: 20px;
          }
          
          .greeting-name {
            color: #29CCB1;
            font-weight: 900;
          }
          
          .welcome-message {
            font: normal normal bold 18px/24px Arial;
            letter-spacing: 0.14px;
            color: #1D1D1B;
            text-align: center;
            opacity: 1;
            margin-bottom: 20px;
          }
          
          .description {
            font: normal normal bold 18px/24px Arial;
            letter-spacing: 0.14px;
            color: #1D1D1B;
            text-align: center;
            opacity: 1;
            margin-bottom: 20px;
          }
          
          .instructions {
            font: normal normal normal 18px/24px Arial;
            letter-spacing: 0.14px;
            color: #1D1D1B;
            text-align: center;
            opacity: 1;
            margin-bottom: 20px;
          }
          
          .instructions a {
            color: #29CCB1;
            text-decoration: none;
            font-weight: bold;
          }
          
          .cta-button {
            display: inline-block;
            padding: 16px 40px;
            background-color: #29CCB1;
            color: #FFFFFF !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 700;
            font-size: 18px;
            margin: 20px 0;
            text-align: center;
            opacity: 1;
          }
          
          .cta-button:hover {
            background-color: #25B89F;
          }
          
          .logo-kaspersky {
            width: 232px;
            height: 333px;
            max-width: 100%;
            display: block;
            margin: 30px auto;
            background: transparent no-repeat padding-box;
            opacity: 1;
          }
          
          .footer-section {
            background-color: #FFFFFF;
            padding: 0;
            text-align: center;
          }
          
          .footer-image {
            width: 100%;
            max-width: 600px;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          
          @media only screen and (max-width: 600px) {
            .content-section {
              padding: 20px;
            }
            
            .greeting, .welcome-message {
              font-size: 16px;
            }
            
            .description, .instructions, .important-text {
              font-size: 14px;
            }
            
            .cta-button {
              padding: 14px 30px;
              font-size: 14px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Hero Image Section -->
          <div class="hero-image-section">
            <img 
              src="${leftImageUrl}" 
              srcset="${leftImageUrl} 1x, ${leftImage2xUrl} 2x"
              alt="Kaspersky Cup - Aplique su mejor táctica" 
              class="hero-image"
              style="width: 536px; height: 850px; max-width: 100%; display: block; margin: 0 auto;"
            />
          </div>
          
          <!-- Content Section -->
          <div class="content-section" style="text-align: center; padding: 40px 68px;">
            <h1 class="greeting" style="font: normal normal 900 45px/50px Arial; letter-spacing: 0.36px; text-transform: uppercase; color: #1D1D1B; margin-bottom: 20px;">
              HOLA <span style="color: #29CCB1;">${userName.toUpperCase()}</span>
            </h1>
            
            <p class="welcome-message" style="font: normal normal bold 18px/24px Arial; letter-spacing: 0.14px; color: #1D1D1B; margin-bottom: 20px;">
              ¡Le damos la bienvenida a
            </p>
            
            <!-- Logo Kaspersky Cup -->
            <div style="margin: 30px 0;">
              <img 
                src="${logoUrl}" 
                srcset="${logoUrl} 1x, ${logo2xUrl} 2x"
                alt="Logo Kaspersky Cup" 
                style="width: 232px; height: 333px; max-width: 100%; display: block; margin: 0 auto;"
              />
            </div>
            
            <p class="description" style="font: normal normal bold 18px/24px Arial; letter-spacing: 0.14px; color: #1D1D1B; margin-bottom: 20px;">
              El programa donde sus ventas se transforman en goles y le permiten ganar premios mes a mes.
            </p>
            
            <p class="instructions" style="font: normal normal normal 18px/24px Arial; letter-spacing: 0.14px; color: #1D1D1B; margin-bottom: 30px;">
              Para ingresar a la plataforma, visite <a href="${magicLink}" style="color: #29CCB1; text-decoration: none; font-weight: bold;">kasperskycup.com</a>, ingrese el correo electrónico con el que se registró y recibirá un enlace de acceso para consultar su marcador y los goles que vaya acumulando.
            </p>
            
            <!-- Magic Link Button -->
            <div style="margin: 30px 0;">
              <a href="${magicLink}" class="cta-button" style="display: inline-block; padding: 16px 40px; background-color: #29CCB1; color: #FFFFFF !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 18px;">
                Ingresar a Kaspersky Cup
              </a>
            </div>
          </div>
          
          <!-- Footer Section -->
          <div class="footer-section">
            <img 
              src="${footerImageUrl}" 
              alt="Kaspersky Cup Footer" 
              class="footer-image"
            />
          </div>
        </div>
      </body>
      </html>
    `.trim();

    sendSmtpEmail.textContent = `
HOLA ${userName.toUpperCase()}

¡Le damos la bienvenida a KASPERSKY CUP!

El programa donde sus ventas se transforman en goles y le permiten ganar premios mes a mes.

Para ingresar a la plataforma, visite kasperskycup.com, ingrese el correo electrónico con el que se registró y recibirá un enlace de acceso para consultar su marcador y los goles que vaya acumulando.

Ingrese aquí: ${magicLink}

Saludos,
Kaspersky Cup
    `.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Registro passwordless email sent successfully to:', data.email);
    return true;
  } catch (error: any) {
    console.error('❌ Error sending registro passwordless email:', error);
    
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.body) {
      console.error('   Error body:', JSON.stringify(error.body, null, 2));
    }
    
    console.error('   Error message:', error.message);
    
    return false;
  }
}

export interface BienvenidaEmailData {
  email: string;
  firstName?: string;
  lastName?: string;
  loginToken?: string; // Optional magic link token for first access
}

/**
 * Envía un email de bienvenida al programa
 * Este email se envía cuando un usuario completa su registro exitosamente
 */
export async function sendBienvenidaEmail(data: BienvenidaEmailData): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️  BREVO_API_KEY no configurada. Email no enviado.');
      console.log('📧 Simulated bienvenida email to:', data.email);
      return true;
    }

    console.log('📤 Intentando enviar email de bienvenida...');
    console.log('   Destinatario:', data.email);
    console.log('   Remitente:', FROM_EMAIL);
    
    // Imágenes alojadas en Cloudinary (Europa)
    const heroImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764344180/loyalty-program/emails/bienvenida/Group%2059.png';
    const heroImage2xUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764344182/loyalty-program/emails/bienvenida/Group%2059%402x.png';
    const img2Url = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764344188/loyalty-program/emails/bienvenida/u8721598234_A_photorealistic_image_of_a_male_soccer_player_hold_51c9badc-b990-4ca5-a9ff-bb764d1a6e4c.png';
    const img2Url2x = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764344205/loyalty-program/emails/bienvenida/u8721598234_A_photorealistic_image_of_a_male_soccer_player_hold_51c9badc-b990-4ca5-a9ff-bb764d1a6e4c%402x.png';
    const img3Url = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764344185/loyalty-program/emails/bienvenida/Group%2060.png';
    const img3Url2x = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764344186/loyalty-program/emails/bienvenida/Group%2060%402x.png';
    const footerImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764337229/loyalty-program/emails/expectativa/footer.png';
    const userName = data.firstName || 'Usuario';
    
    // Construir URL de acceso si se proporciona loginToken
    const loginUrl = data.loginToken 
      ? `${process.env.APP_URL || 'https://kasperskycup.com'}/login/magic?token=${data.loginToken}`
      : null;
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ 
      email: data.email, 
      name: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : undefined 
    }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = '⚽ ¡Bienvenido a Kaspersky Cup! - Aquí comienza su ruta goleadora';
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            background-color: #FFFFFF;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #FFFFFF;
          }
          
          .hero-image-section {
            position: relative;
            text-align: center;
            background-color: #FFFFFF;
            padding: 0;
            margin: 0;
            overflow: hidden;
          }
          
          .hero-image {
            width: 100%;
            max-width: 600px;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          
          .content-section {
            background-color: #FFFFFF;
            padding: 40px;
            text-align: center;
          }
          
          .greeting {
            font-size: 32px;
            font-weight: 700;
            color: #1D1D1B;
            margin-bottom: 8px;
          }
          
          .name {
            font-size: 32px;
            font-weight: 700;
            color: #29CCB1;
            margin-bottom: 32px;
          }
          
          .message {
            font-size: 16px;
            color: #1D1D1B;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          
          .highlight-text {
            color: #29CCB1;
            font-weight: 600;
          }
          
          .section-image {
            width: 100%;
            max-width: 600px;
            height: auto;
            display: block;
            margin: 32px 0;
          }
          
          .info-box {
            background-color: #29CCB1;
            border-radius: 4px;
            padding: 24px;
            margin: 32px 0;
            text-align: left;
            color: #FFFFFF;
          }
          
          .info-text {
            font-size: 16px;
            color: #FFFFFF;
            line-height: 1.6;
          }
          
          .access-button-container {
            margin: 32px 0;
            text-align: center;
          }
          
          .access-button {
            display: inline-block;
            background-color: #29CCB1;
            color: #FFFFFF !important;
            text-decoration: none;
            padding: 16px 48px;
            border-radius: 4px;
            font-size: 18px;
            font-weight: 600;
            transition: background-color 0.3s ease;
          }
          
          .access-button:hover {
            background-color: #23B39E;
          }
          
          .access-note {
            font-size: 13px;
            color: #666666;
            margin-top: 16px;
            font-style: italic;
          }
          
          .footer-section {
            background-color: #1D1D1B;
            color: #FFFFFF;
            padding: 48px 40px;
            text-align: center;
          }
          
          .footer-cup-badge {
            margin: 0 auto 28px;
            text-align: center;
          }
          
          .footer-cup-image {
            width: 250px;
            height: auto;
            display: inline-block;
          }
          
          .social-section {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
          }
          
          .social-title {
            font-size: 14px;
            color: #FFFFFF;
            margin-bottom: 16px;
            font-weight: 400;
          }
          
          @media only screen and (max-width: 600px) {
            .content-section {
              padding: 24px;
            }
            
            .greeting, .name {
              font-size: 24px;
            }
            
            .message {
              font-size: 14px;
            }
            
            .footer-section {
              padding: 36px 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Imagen Hero -->
          <div class="hero-image-section">
            <img src="${heroImageUrl}" 
                 srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x"
                 alt="Aquí comienza su ruta goleadora" 
                 class="hero-image" 
                 style="width: 100%; max-width: 600px; height: auto; display: block;" />
          </div>
          
          <!-- Contenido -->
          <div class="content-section">
            <div class="greeting">HOLA</div>
            <div class="name">(${userName})</div>
            
            <p class="message">
              Bienvenido(a) a <span class="highlight-text">Kaspersky Cup</span>, una campaña de incentivos con muchos premios pensada para nuestros socios.
            </p>
            
            <div class="info-box">
              <div class="info-text">
                Cada venta de productos Kaspersky se transforma en goles que pueden valer premios increíbles. Cuanto más venda, más gana, con recompensas exclusivas que se actualizan cada mes.
              </div>
            </div>
            
            <!-- Segunda imagen -->
            <img src="${img2Url}" 
                 srcset="${img2Url} 1x, ${img2Url2x} 2x"
                 alt="Conviértase en el goleador de Kaspersky Cup" 
                 class="section-image" />
            
            <p class="message">
              Conviértase en el goleador de <span class="highlight-text">Kaspersky Cup</span> y participe por una experiencia completa para asistir a un partido de la Copa Mundial con todos los gastos pagos.
            </p>
            
            <p class="message">
              Ingrese a <span class="highlight-text">kasperskycup.com</span>, conozca los términos y condiciones del programa y consulte su puntaje.
            </p>
            
            ${loginUrl ? `
            <!-- Botón de Acceso -->
            <div class="access-button-container">
              <a href="${loginUrl}" class="access-button" style="display: inline-block; background-color: #29CCB1; color: #FFFFFF; text-decoration: none; padding: 16px 48px; border-radius: 4px; font-size: 18px; font-weight: 600;">
                Acceder a mi cuenta
              </a>
              <p class="access-note" style="font-size: 13px; color: #666666; margin-top: 16px; font-style: italic;">
                Este enlace de acceso expira en 7 días. Después de su primera visita, podrá solicitar nuevos enlaces de acceso desde la pantalla de inicio de sesión.
              </p>
            </div>
            ` : ''}
            
            <!-- Tercera imagen -->
            <img src="${img3Url}" 
                 srcset="${img3Url} 1x, ${img3Url2x} 2x"
                 alt="En Kaspersky Cup, la emoción del fútbol también se vive en las ventas" 
                 class="section-image" />
          </div>
          
          <!-- Footer Section -->
          <div class="footer-section">
            <!-- Badge Kaspersky Cup -->
            <div class="footer-cup-badge">
              <img src="${footerImageUrl}" 
                   alt="Kaspersky Cup" 
                   class="footer-cup-image" 
                   style="width: 250px; height: auto; display: inline-block;" />
            </div>
            
            <!-- Redes Sociales -->
            <div class="social-section">
              <div class="social-title">Siga a Kaspersky :</div>
              <div class="social-links">
                <a href="https://www.facebook.com/Kaspersky" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Facebook">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338210/loyalty-program/emails/common/social-icons/Group%2023.png" alt="Facebook" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://twitter.com/kaspersky" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Twitter">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338220/loyalty-program/emails/common/social-icons/Subtraction%201.png" alt="Twitter" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://www.linkedin.com/company/kaspersky-lab" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="LinkedIn">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338212/loyalty-program/emails/common/social-icons/Group%2025.png" alt="LinkedIn" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://www.instagram.com/kasperskylab/" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Instagram">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338213/loyalty-program/emails/common/social-icons/Group%2027.png" alt="Instagram" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://www.youtube.com/user/Kaspersky" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="YouTube">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338215/loyalty-program/emails/common/social-icons/Group%2028.png" alt="YouTube" style="width: 16px; height: 16px;" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    sendSmtpEmail.textContent = `
Kaspersky Cup - ¡Bienvenido al Programa!

HOLA ${userName}

Bienvenido(a) a Kaspersky Cup, una campaña de incentivos con muchos premios pensada para nuestros socios.

Cada venta de productos Kaspersky se transforma en goles que pueden valer premios increíbles. Cuanto más venda, más gana, con recompensas exclusivas que se actualizan cada mes.

Conviértase en el goleador de Kaspersky Cup y participe por una experiencia completa para asistir a un partido de la Copa Mundial con todos los gastos pagos.

Ingrese a kasperskycup.com, conozca los términos y condiciones del programa y consulte su puntaje.

En Kaspersky Cup, la emoción del fútbol también se vive en las ventas.

Siga a Kaspersky en nuestras redes sociales:
- Facebook: https://www.facebook.com/Kaspersky
- Twitter: https://twitter.com/kaspersky
- LinkedIn: https://www.linkedin.com/company/kaspersky-lab
- Instagram: https://www.instagram.com/kasperskylab/
- YouTube: https://www.youtube.com/user/Kaspersky

Saludos,
Kaspersky Cup
    `.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Bienvenida email sent successfully to:', data.email);
    return true;
  } catch (error: any) {
    console.error('❌ Error sending bienvenida email:', error);
    
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.body) {
      console.error('   Error body:', JSON.stringify(error.body, null, 2));
    }
    
    console.error('   Error message:', error.message);
    
    return false;
  }
}

/**
 * Envía un email con magic link para acceso sin contraseña
 */
export async function sendMagicLinkEmail(data: MagicLinkEmailData): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️  BREVO_API_KEY no configurada. Email no enviado.');
      console.log('📧 Simulated magic link email to:', data.email);
      console.log('🔗 Magic link:', `${APP_URL}/login/magic?token=${data.loginToken}`);
      return true;
    }

    console.log('📤 Intentando enviar email de magic link...');
    console.log('   Destinatario:', data.email);
    console.log('   Remitente:', FROM_EMAIL);

    const magicLink = `${APP_URL}/login/magic?token=${data.loginToken}`;
    
    // Imágenes alojadas en Cloudinary (Europa)
    const heroImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764344794/loyalty-program/emails/magic-link/Group%2061.png';
    const heroImage2xUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764344796/loyalty-program/emails/magic-link/Group%2061%402x.png';
    const footerImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764337229/loyalty-program/emails/expectativa/footer.png';
    const userName = data.firstName || 'Usuario';
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: data.email, name: `${data.firstName} ${data.lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = '⚽ Tu enlace único de acceso - Kaspersky Cup';
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            background-color: #FFFFFF;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #FFFFFF;
          }
          
          .hero-image-section {
            position: relative;
            text-align: center;
            background-color: #FFFFFF;
            padding: 0;
            margin: 0;
            overflow: hidden;
          }
          
          .hero-image {
            width: 100%;
            max-width: 600px;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          
          .content-section {
            background-color: #FFFFFF;
            padding: 40px;
            text-align: center;
          }
          
          .greeting {
            font-size: 32px;
            font-weight: 700;
            color: #1D1D1B;
            margin-bottom: 8px;
          }
          
          .name {
            font-size: 32px;
            font-weight: 700;
            color: #29CCB1;
            margin-bottom: 32px;
          }
          
          .message {
            font-size: 16px;
            color: #1D1D1B;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          
          .highlight-text {
            color: #29CCB1;
            font-weight: 600;
          }
          
          .cta-button {
            display: inline-block;
            background-color: #29CCB1;
            color: #FFFFFF;
            text-decoration: none;
            padding: 14px 40px;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 600;
            margin: 24px 0;
          }
          
          .link-text {
            font-size: 14px;
            color: #6B7280;
            margin-top: 16px;
          }
          
          .link-url {
            color: #29CCB1;
            word-break: break-all;
          }
          
          .warning-box {
            background-color: #1D1D1B;
            border-radius: 4px;
            padding: 24px;
            margin: 32px 0;
            text-align: left;
            color: #FFFFFF;
          }
          
          .warning-title {
            font-size: 18px;
            font-weight: 700;
            color: #FFFFFF;
            margin-bottom: 16px;
          }
          
          .warning-text {
            font-size: 14px;
            color: #FFFFFF;
            line-height: 1.6;
            margin-bottom: 8px;
          }
          
          .footer-section {
            background-color: #1D1D1B;
            color: #FFFFFF;
            padding: 48px 40px;
            text-align: center;
          }
          
          .footer-cup-badge {
            margin: 0 auto 28px;
            text-align: center;
          }
          
          .footer-cup-image {
            width: 250px;
            height: auto;
            display: inline-block;
          }
          
          .social-section {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
          }
          
          .social-title {
            font-size: 14px;
            color: #FFFFFF;
            margin-bottom: 16px;
            font-weight: 400;
          }
          
          @media only screen and (max-width: 600px) {
            .content-section {
              padding: 24px;
            }
            
            .greeting, .name {
              font-size: 24px;
            }
            
            .message {
              font-size: 14px;
            }
            
            .footer-section {
              padding: 36px 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Imagen Hero -->
          <div class="hero-image-section">
            <img src="${heroImageUrl}" 
                 srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x"
                 alt="La emoción del fútbol, también se vive en las ventas" 
                 class="hero-image" 
                 style="width: 100%; max-width: 600px; height: auto; display: block;" />
          </div>
          
          <!-- Contenido -->
          <div class="content-section">
            <div class="greeting">HOLA</div>
            <div class="name">(${userName})</div>
            
            <p class="message">
              Haga clic en el siguiente botón para iniciar sesión<br>
              en el programa <span class="highlight-text">Kaspersky Cup</span>:
            </p>
            
            <a href="${magicLink}" class="cta-button">Acceder ahora</a>
            
            <p class="link-text">
              Si no puede acceder desde el botón, copie y pegue este enlace<br>
              en su navegador:<br>
              <a href="${magicLink}" class="link-url">${magicLink}</a>
            </p>
            
            <div class="warning-box">
              <div class="warning-title">IMPORTANTE:</div>
              <div class="warning-text">Este enlace expira en <span class="highlight-text">15 minutos</span>.</div>
              <div class="warning-text">Solo puede usarse <span class="highlight-text">una vez</span>.</div>
              <div class="warning-text">Si no solicitó este acceso, <span class="highlight-text">ignore este correo</span>.</div>
              <div class="warning-text">Este es un mensaje automático, por favor,<br><span class="highlight-text">no responda a este mensaje</span>.</div>
            </div>
          </div>
          
          <!-- Footer Section -->
          <div class="footer-section">
            <!-- Badge Kaspersky Cup -->
            <div class="footer-cup-badge">
              <img src="${footerImageUrl}" 
                   alt="Kaspersky Cup" 
                   class="footer-cup-image" 
                   style="width: 250px; height: auto; display: inline-block;" />
            </div>
            
            <!-- Redes Sociales -->
            <div class="social-section">
              <div class="social-title">Siga a Kaspersky :</div>
              <div class="social-links">
                <a href="https://www.facebook.com/Kaspersky" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Facebook">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338210/loyalty-program/emails/common/social-icons/Group%2023.png" alt="Facebook" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://twitter.com/kaspersky" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Twitter">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338220/loyalty-program/emails/common/social-icons/Subtraction%201.png" alt="Twitter" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://www.linkedin.com/company/kaspersky-lab" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="LinkedIn">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338212/loyalty-program/emails/common/social-icons/Group%2025.png" alt="LinkedIn" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://www.instagram.com/kasperskylab/" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Instagram">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338213/loyalty-program/emails/common/social-icons/Group%2027.png" alt="Instagram" style="width: 16px; height: 16px;" />
                </a>
                <a href="https://www.youtube.com/user/Kaspersky" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="YouTube">
                  <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338215/loyalty-program/emails/common/social-icons/Group%2028.png" alt="YouTube" style="width: 16px; height: 16px;" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    sendSmtpEmail.textContent = `
Kaspersky Cup - Tu enlace único de acceso

HOLA ${userName}

Haga clic en el siguiente enlace para iniciar sesión en el programa Kaspersky Cup:

${magicLink}

IMPORTANTE:
- Este enlace expira en 15 minutos.
- Solo puede usarse una vez.
- Si no solicitó este acceso, ignore este correo.
- Este es un mensaje automático, por favor, no responda a este mensaje.

Siga a Kaspersky en nuestras redes sociales:
- Facebook: https://www.facebook.com/Kaspersky
- Twitter: https://twitter.com/kaspersky
- LinkedIn: https://www.linkedin.com/company/kaspersky-lab
- Instagram: https://www.instagram.com/kasperskylab/
- YouTube: https://www.youtube.com/user/Kaspersky

Saludos,
Kaspersky Cup
    `.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Magic link email sent successfully to:', data.email);
    return true;
  } catch (error) {
    console.error('Error sending magic link email:', error);
    return false;
  }
}

export interface GolesRegistradosEmailData {
  email: string;
  firstName: string;
  lastName: string;
  producto: string;
  valorDeal: number;
  golesSumados: number;
  totalGoles: number;
}

/**
 * Envía un email cuando el KL registra goles a nombre del usuario
 */
export async function sendGolesRegistradosEmail(data: GolesRegistradosEmailData): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️  BREVO_API_KEY no configurada. Email no enviado.');
      console.log('📧 Simulated goles registrados email to:', data.email);
      console.log('📊 Goles sumados:', data.golesSumados);
      console.log('⚽ Total goles:', data.totalGoles);
      return true;
    }

    console.log('📤 Intentando enviar email de goles registrados...');
    console.log('   Destinatario:', data.email);
    console.log('   Remitente:', FROM_EMAIL);

    // Imágenes alojadas en Cloudinary (Europa)
    const heroImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764345851/loyalty-program/emails/goles-registrados/Group%2062.png';
    const heroImage2xUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764345853/loyalty-program/emails/goles-registrados/Group%2062%402x.png';
    const footerImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764337229/loyalty-program/emails/expectativa/footer.png';
    const userName = data.firstName || 'Usuario';
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: data.email, name: `${data.firstName} ${data.lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = '⚽ ¡Golazo! Su marcador sigue creciendo - Kaspersky Cup';
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            background-color: #FFFFFF;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #FFFFFF;
          }
          
          .header-logo {
            text-align: center;
            padding: 24px 0;
            background-color: #FFFFFF;
          }
          
          .header-logo img {
            width: 120px;
            height: auto;
          }
          
          .hero-image-section {
            position: relative;
            text-align: center;
            background-color: #FFFFFF;
            padding: 0;
            margin: 0;
            overflow: hidden;
          }
          
          .hero-image {
            width: 100%;
            max-width: 600px;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          
          .content-section {
            background-color: #FFFFFF;
            padding: 40px;
            text-align: center;
          }
          
          .greeting {
            font-size: 32px;
            font-weight: 700;
            color: #1D1D1B;
            margin-bottom: 8px;
          }
          
          .name {
            font-size: 32px;
            font-weight: 700;
            color: #29CCB1;
            margin-bottom: 24px;
          }
          
          .message {
            font-size: 16px;
            color: #1D1D1B;
            line-height: 1.6;
            margin-bottom: 16px;
          }
          
          .highlight-text {
            color: #29CCB1;
            font-weight: 600;
          }
          
          .stats-table {
            width: 100%;
            margin: 24px 0;
            border-collapse: collapse;
          }
          
          .stats-table tr {
            border-bottom: 1px solid #E5E7EB;
          }
          
          .stats-table tr:last-child {
            border-bottom: none;
          }
          
          .stats-header {
            background-color: #29CCB1;
            color: #FFFFFF;
            font-weight: 600;
            padding: 12px 16px;
            text-align: left;
          }
          
          .stats-value {
            background-color: #F9FAFB;
            padding: 12px 16px;
            text-align: right;
            color: #1D1D1B;
          }
          
          .cta-button {
            display: inline-block;
            background-color: #29CCB1;
            color: #FFFFFF;
            text-decoration: none;
            padding: 14px 40px;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 600;
            margin: 24px 0;
          }
          
          .info-box {
            background-color: #F0F9FF;
            border: 1px solid #BAE6FD;
            border-radius: 4px;
            padding: 16px;
            margin: 24px 0;
            text-align: left;
          }
          
          .info-text {
            font-size: 14px;
            color: #1D1D1B;
            line-height: 1.6;
            margin: 0;
          }
          
          .footer-section {
            background-color: #1D1D1B;
            color: #FFFFFF;
            padding: 48px 40px;
            text-align: center;
          }
          
          .footer-cup-badge {
            margin: 0 auto 28px;
            text-align: center;
          }
          
          .footer-cup-image {
            width: 250px;
            height: auto;
            display: inline-block;
          }
          
          .social-section {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
          }
          
          .social-title {
            font-size: 14px;
            color: #FFFFFF;
            margin-bottom: 16px;
            font-weight: 400;
          }
          
          @media only screen and (max-width: 600px) {
            .content-section {
              padding: 24px;
            }
            
            .greeting, .name {
              font-size: 24px;
            }
            
            .message {
              font-size: 14px;
            }
            
            .footer-section {
              padding: 36px 24px;
            }
            
            .stats-header, .stats-value {
              padding: 10px 12px;
              font-size: 14px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Logo Header -->
          <div class="header-logo">
            <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764337229/loyalty-program/emails/expectativa/footer.png" alt="Kaspersky Cup" />
          </div>
          
          <!-- Imagen Hero -->
          <div class="hero-image-section">
            <img src="${heroImageUrl}" 
                 srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x"
                 alt="¡Golazo! Su marcador sigue creciendo" 
                 class="hero-image" 
                 style="width: 100%; max-width: 600px; height: auto; display: block;" />
          </div>
          
          <!-- Contenido -->
          <div class="content-section">
            <div class="greeting">HOLA</div>
            <div class="name">(${userName})</div>
            
            <p class="message">
              <strong>¡Excelentes noticias!</strong><br>
              Nuevas ventas fueron registradas a su nombre y ha<br>
              acumulado más goles en <span class="highlight-text">Kaspersky Cup</span>.
            </p>
            
            <table class="stats-table">
              <tr>
                <td class="stats-header">Producto</td>
                <td class="stats-value">${data.producto}</td>
              </tr>
              <tr>
                <td class="stats-header">Valor del Deal</td>
                <td class="stats-value">${data.valorDeal} Goles</td>
              </tr>
              <tr>
                <td class="stats-header">Goles sumados</td>
                <td class="stats-value">${data.golesSumados} Goles</td>
              </tr>
            </table>
            
            <p class="message">
              Sus goles ya están disponibles en su cuenta y puede<br>
              usarlos para <span class="highlight-text">canjear el premio imperdible del mes</span>.
            </p>
            
            <a href="${APP_URL}" class="cta-button">Ver mi marcador</a>
            
            <div class="info-box">
              <p class="info-text">
                <strong>¡Sigue así!</strong><br>
                Cada nuevo gol te acerca a vivir en vivo la<br>
                <span class="highlight-text">Copa Mundial de Fútbol 2026</span>.
              </p>
            </div>
          </div>
          
          <!-- Footer Section -->
          <div class="footer-section">
            <!-- Texto Siga a Kaspersky -->
            <div class="social-title">Siga a Kaspersky :</div>
            
            <!-- Redes Sociales -->
            <div class="social-links">
              <a href="https://www.facebook.com/Kaspersky" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Facebook">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338210/loyalty-program/emails/common/social-icons/Group%2023.png" alt="Facebook" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://twitter.com/kaspersky" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Twitter">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338220/loyalty-program/emails/common/social-icons/Subtraction%201.png" alt="Twitter" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://www.linkedin.com/company/kaspersky-lab" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="LinkedIn">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338212/loyalty-program/emails/common/social-icons/Group%2025.png" alt="LinkedIn" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://www.instagram.com/kasperskylab/" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Instagram">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338213/loyalty-program/emails/common/social-icons/Group%2027.png" alt="Instagram" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://www.youtube.com/user/Kaspersky" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="YouTube">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338215/loyalty-program/emails/common/social-icons/Group%2028.png" alt="YouTube" style="width: 16px; height: 16px;" />
              </a>
            </div>
            
            <!-- Badge Kaspersky Cup al final -->
            <div class="footer-cup-badge" style="margin-top: 32px;">
              <img src="${footerImageUrl}" 
                   alt="Kaspersky Cup" 
                   class="footer-cup-image" 
                   style="width: 250px; height: auto; display: inline-block;" />
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    sendSmtpEmail.textContent = `
Kaspersky Cup - ¡Golazo! Su marcador sigue creciendo

HOLA ${userName}

¡Excelentes noticias!
Nuevas ventas fueron registradas a su nombre y ha acumulado más goles en Kaspersky Cup.

Producto: ${data.producto}
Valor del Deal: ${data.valorDeal} Goles
Goles sumados: ${data.golesSumados} Goles

Sus goles ya están disponibles en su cuenta y puede usarlos para canjear el premio imperdible del mes.

Ver mi marcador: ${APP_URL}

¡Sigue así!
Cada nuevo gol te acerca a vivir en vivo la Copa Mundial de Fútbol 2026.

Siga a Kaspersky en nuestras redes sociales:
- Facebook: https://www.facebook.com/Kaspersky
- Twitter: https://twitter.com/kaspersky
- LinkedIn: https://www.linkedin.com/company/kaspersky-lab
- Instagram: https://www.instagram.com/kasperskylab/
- YouTube: https://www.youtube.com/user/Kaspersky

Saludos,
Kaspersky Cup
    `.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Goles registrados email sent successfully to:', data.email);
    return true;
  } catch (error) {
    console.error('Error sending goles registrados email:', error);
    return false;
  }
}

export interface GanadorPremioMayorEmailData {
  email: string;
  firstName: string;
  lastName: string;
  periodo: string;
  fechaPartido: string;
  hora: string;
  lugar: string;
}

/**
 * Envía un email cuando se anuncia el ganador del premio mayor (viaje a la Copa Mundial)
 */
export interface PendienteAprobacionEmailData {
  email: string;
  firstName: string;
  lastName: string;
  nombrePremio: string;
  golesCanje: number;
}

/**
 * Email 8: Pendiente Aprobación Redención de Goles (Premio)
 * Se envía cuando un usuario solicita canjear sus goles por un premio
 * y queda pendiente de aprobación por el administrador
 */
export async function sendPendienteAprobacionEmail(data: PendienteAprobacionEmailData): Promise<boolean> {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { name: 'Kaspersky Cup', email: FROM_EMAIL };
    sendSmtpEmail.to = [{ email: data.email, name: `${data.firstName} ${data.lastName}` }];
    sendSmtpEmail.subject = 'Kaspersky Cup - Solicitud de Canje en Proceso';

    const userName = data.firstName.toUpperCase();

    // URLs de las imágenes en Cloudinary
    const heroImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764347282/loyalty-program/emails/pendiente-aprobacion/Group%2063.png';
    const heroImage2xUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764347284/loyalty-program/emails/pendiente-aprobacion/Group%2063%402x.png';
    const ballImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764347280/loyalty-program/emails/pendiente-aprobacion/ball.jpg';
    const badgeImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764336799/loyalty-program/emails/common/Kaspersky%20Cup%20-%20badge%20250.png';
    const logoKasperskyUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764336795/loyalty-program/emails/common/Kaspersky%20Logo.png';

    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Solicitud de Canje en Proceso - Kaspersky Cup</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            overflow: hidden;
          }
          
          /* Header con logo Kaspersky */
          .header-logo {
            text-align: center;
            padding: 30px 20px 20px;
            background-color: #ffffff;
          }
          
          .header-logo img {
            width: 120px;
            height: auto;
          }
          
          /* Imagen Hero con fondo negro */
          .hero-section {
            text-align: center;
            background-color: #1D1D1B;
            padding: 0;
            position: relative;
          }
          
          .hero-image {
            width: 100%;
            height: auto;
            display: block;
          }
          
          /* Contenido principal */
          .content-section {
            padding: 40px 40px 30px;
            background-color: #ffffff;
            text-align: center;
          }
          
          .greeting {
            font-size: 32px;
            font-weight: 700;
            color: #1D1D1B;
            margin-bottom: 5px;
            line-height: 1.2;
          }
          
          .user-name {
            font-size: 32px;
            font-weight: 700;
            color: #29CCB1;
            margin-bottom: 25px;
            line-height: 1.2;
          }
          
          .message-text {
            font-size: 16px;
            color: #4A4A4A;
            line-height: 1.8;
            margin-bottom: 30px;
          }
          
          .highlight-text {
            color: #29CCB1;
            font-weight: 700;
          }
          
          .ball-section {
            text-align: center;
            margin: 30px 0;
          }
          
          .ball-image {
            width: 180px;
            height: auto;
            margin-bottom: 15px;
          }
          
          .ball-label {
            font-size: 14px;
            color: #1D1D1B;
            font-weight: 600;
            margin-top: 10px;
          }
          
          .status-box {
            background-color: #F8F8F8;
            border-radius: 8px;
            padding: 25px;
            margin: 30px 0;
            text-align: left;
          }
          
          .status-box p {
            font-size: 15px;
            color: #4A4A4A;
            line-height: 1.8;
            margin: 0;
          }
          
          .cta-button {
            display: inline-block;
            background-color: #29CCB1;
            color: #ffffff;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            margin: 25px 0 20px;
          }
          
          .footer-text {
            font-size: 15px;
            color: #4A4A4A;
            line-height: 1.6;
            margin-top: 20px;
          }
          
          .footer-highlight {
            color: #29CCB1;
            font-weight: 700;
          }
          
          /* Footer Section */
          .footer-section {
            padding: 30px 40px 40px;
            background-color: #ffffff;
            text-align: center;
          }
          
          .social-title {
            font-size: 14px;
            color: #666666;
            margin-bottom: 15px;
            font-weight: 600;
          }
          
          .social-links {
            margin-bottom: 25px;
          }
          
          .social-links a {
            display: inline-block;
            margin: 0 6px;
            text-decoration: none;
            background-color: #1D1D1B;
            padding: 8px;
            border-radius: 4px;
          }
          
          .social-links img {
            width: 16px;
            height: 16px;
            display: block;
          }
          
          .footer-logo {
            margin-top: 25px;
          }
          
          .footer-logo img {
            width: 80px;
            height: auto;
          }
          
          /* Responsive */
          @media only screen and (max-width: 600px) {
            .content-section,
            .footer-section {
              padding-left: 20px;
              padding-right: 20px;
            }
            
            .greeting,
            .user-name {
              font-size: 26px;
            }
            
            .message-text {
              font-size: 14px;
            }
            
            .ball-image {
              width: 140px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Header Logo -->
          <div class="header-logo">
            <img src="${logoKasperskyUrl}" 
                 alt="Kaspersky" />
          </div>
          
          <!-- Hero Image -->
          <div class="hero-section">
            <img src="${heroImageUrl}" 
                 srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x"
                 alt="¡Felicidades! Ha redimido el premio del mes" 
                 class="hero-image" />
          </div>
          
          <!-- Content Section -->
          <div class="content-section">
            <div class="greeting">HOLA</div>
            <div class="user-name">(${userName})</div>
            
            <p class="message-text">
              Sus goles le permitieron <span class="highlight-text">redimir su premio</span> en<br>
              <span class="highlight-text">Kaspersky Cup.</span>
            </p>
            
            <!-- Balón -->
            <div class="ball-section">
              <img src="${ballImageUrl}" 
                   alt="Balón del Oficial del mundial" 
                   class="ball-image" />
              <div class="ball-label">Balón del Oficial del mundial</div>
            </div>
            
            <!-- Status Box -->
            <div class="status-box">
              <p>
                Nuestro equipo organizador está procesando su solicitud. Muy 
                pronto recibirá la confirmación del envío por correo electrónico 
                o a través de la plataforma.
              </p>
            </div>
            
            <!-- CTA Button -->
            <a href="${APP_URL}/rewards" class="cta-button">Revisar el estado de mi premio</a>
            
            <!-- Footer Text -->
            <p class="footer-text">
              Pronto estaremos en contacto con usted.<br>
              <span class="footer-highlight">¡Nos vemos en el próximo partido!</span>
            </p>
          </div>
          
          <!-- Footer Section -->
          <div class="footer-section">
            <!-- Texto Siga a Kaspersky -->
            <div class="social-title">Siga a Kaspersky :</div>
            
            <!-- Redes Sociales -->
            <div class="social-links">
              <a href="https://www.facebook.com/Kaspersky" title="Facebook" style="display: inline-block; margin: 0 6px; text-decoration: none; background-color: #1D1D1B; padding: 8px; border-radius: 4px;">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338210/loyalty-program/emails/common/social-icons/Group%2023.png" alt="Facebook" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://twitter.com/kaspersky" title="Twitter" style="display: inline-block; margin: 0 6px; text-decoration: none; background-color: #1D1D1B; padding: 8px; border-radius: 4px;">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338220/loyalty-program/emails/common/social-icons/Subtraction%201.png" alt="Twitter" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://www.linkedin.com/company/kaspersky-lab" title="LinkedIn" style="display: inline-block; margin: 0 6px; text-decoration: none; background-color: #1D1D1B; padding: 8px; border-radius: 4px;">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338212/loyalty-program/emails/common/social-icons/Group%2025.png" alt="LinkedIn" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://www.instagram.com/kasperskylab/" title="Instagram" style="display: inline-block; margin: 0 6px; text-decoration: none; background-color: #1D1D1B; padding: 8px; border-radius: 4px;">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338213/loyalty-program/emails/common/social-icons/Group%2027.png" alt="Instagram" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://www.youtube.com/user/Kaspersky" title="YouTube" style="display: inline-block; margin: 0 6px; text-decoration: none; background-color: #1D1D1B; padding: 8px; border-radius: 4px;">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338215/loyalty-program/emails/common/social-icons/Group%2028.png" alt="YouTube" style="width: 16px; height: 16px;" />
              </a>
            </div>
            
            <!-- Logo Kaspersky al final -->
            <div class="footer-logo">
              <img src="${logoKasperskyUrl}" alt="Kaspersky" />
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    sendSmtpEmail.textContent = `
Kaspersky Cup - Solicitud de Canje en Proceso

HOLA (${userName})

Sus goles le permitieron redimir su premio en Kaspersky Cup.

Balón del Oficial del mundial

Nuestro equipo organizador está procesando su solicitud. Muy pronto recibirá la confirmación del envío por correo electrónico o a través de la plataforma.

Pronto estaremos en contacto con usted.
¡Nos vemos en el próximo partido!

Siga a Kaspersky en nuestras redes sociales:
- Facebook: https://www.facebook.com/Kaspersky
- Twitter: https://twitter.com/kaspersky
- LinkedIn: https://www.linkedin.com/company/kaspersky-lab
- Instagram: https://www.instagram.com/kasperskylab/
- YouTube: https://www.youtube.com/user/Kaspersky

Saludos,
Kaspersky Cup
    `.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Pendiente aprobación email sent successfully to:', data.email);
    return true;
  } catch (error) {
    console.error('Error sending pendiente aprobación email:', error);
    return false;
  }
}

export async function sendGanadorPremioMayorEmail(data: GanadorPremioMayorEmailData): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️  BREVO_API_KEY no configurada. Email no enviado.');
      console.log('📧 Simulated ganador premio mayor email to:', data.email);
      console.log('🏆 Ganador del periodo:', data.periodo);
      return true;
    }

    console.log('📤 Intentando enviar email de ganador premio mayor...');
    console.log('   Destinatario:', data.email);
    console.log('   Remitente:', FROM_EMAIL);

    // Imágenes alojadas en Cloudinary (Europa)
    const heroImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764346361/loyalty-program/emails/ganador-premio-mayor/Group%2066.jpg';
    const heroImage2xUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764346362/loyalty-program/emails/ganador-premio-mayor/Group%2066%402x.jpg';
    const maletasImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764346432/loyalty-program/emails/ganador-premio-mayor/Mail%2007%20-%2002.png';
    const maletasImage2xUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764346434/loyalty-program/emails/ganador-premio-mayor/Mail%2007%20-%2002%402x.png';
    const estadioImageUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764346365/loyalty-program/emails/ganador-premio-mayor/Group%2067.jpg';
    const estadioImage2xUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764346369/loyalty-program/emails/ganador-premio-mayor/Group%2067%402x.jpg';
    const logoKasperskyUrl = 'https://res.cloudinary.com/dk3ow5puw/image/upload/v1764346371/loyalty-program/emails/ganador-premio-mayor/Logo%20-%20Kaspersky%20Cup.png';
    
    const userName = data.firstName || 'Usuario';
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: data.email, name: `${data.firstName} ${data.lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = '🏆 ¡Usted fue el máximo goleador de Kaspersky Cup!';
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            background-color: #000000;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #000000;
          }
          
          .header-logo {
            text-align: center;
            padding: 24px 0;
            background-color: #000000;
          }
          
          .header-logo img {
            width: 120px;
            height: auto;
          }
          
          .hero-image-section {
            position: relative;
            text-align: center;
            background-color: #000000;
            padding: 0;
            margin: 0;
            overflow: hidden;
          }
          
          .hero-image {
            width: 100%;
            max-width: 600px;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          
          .content-section {
            background-color: #FFFFFF;
            padding: 40px;
            text-align: center;
          }
          
          .greeting {
            font-size: 32px;
            font-weight: 700;
            color: #1D1D1B;
            margin-bottom: 8px;
          }
          
          .name {
            font-size: 32px;
            font-weight: 700;
            color: #29CCB1;
            margin-bottom: 24px;
          }
          
          .message {
            font-size: 16px;
            color: #1D1D1B;
            line-height: 1.6;
            margin-bottom: 16px;
          }
          
          .highlight-text {
            color: #29CCB1;
            font-weight: 600;
          }
          
          .maletas-section {
            margin: 32px 0;
          }
          
          .maletas-image {
            width: 100%;
            max-width: 400px;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          
          .info-table {
            width: 100%;
            margin: 24px 0;
            border-collapse: collapse;
          }
          
          .info-table tr {
            border-bottom: 1px solid #E5E7EB;
          }
          
          .info-table tr:last-child {
            border-bottom: none;
          }
          
          .info-header {
            background-color: #29CCB1;
            color: #FFFFFF;
            font-weight: 600;
            padding: 12px 16px;
            text-align: left;
            width: 40%;
          }
          
          .info-value {
            background-color: #F9FAFB;
            padding: 12px 16px;
            text-align: left;
            color: #1D1D1B;
          }
          
          .prize-notice {
            background-color: #1D1D1B;
            color: #FFFFFF;
            padding: 20px;
            border-radius: 4px;
            margin: 24px 0;
            font-size: 14px;
            line-height: 1.6;
          }
          
          .estadio-section {
            margin: 32px 0;
            background-color: #000000;
            padding: 40px 20px;
            border-radius: 8px;
          }
          
          .estadio-image {
            width: 100%;
            max-width: 500px;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          
          .thank-you-text {
            color: #FFFFFF;
            font-size: 24px;
            font-weight: 700;
            text-align: center;
            margin-top: 20px;
          }
          
          .thank-you-subtext {
            color: #29CCB1;
            font-size: 20px;
            font-weight: 700;
            text-align: center;
          }
          
          .footer-section {
            background-color: #FFFFFF;
            color: #1D1D1B;
            padding: 48px 40px;
            text-align: center;
          }
          
          .social-title {
            font-size: 14px;
            color: #1D1D1B;
            margin-bottom: 16px;
            font-weight: 400;
          }
          
          .social-links a {
            display: inline-block;
            margin: 0 6px;
            text-decoration: none;
            background-color: #1D1D1B;
            padding: 8px;
            border-radius: 4px;
          }
          
          .footer-logo {
            margin-top: 32px;
          }
          
          .footer-logo img {
            width: 120px;
            height: auto;
            display: inline-block;
          }
          
          @media only screen and (max-width: 600px) {
            .content-section {
              padding: 24px;
            }
            
            .greeting, .name {
              font-size: 24px;
            }
            
            .message {
              font-size: 14px;
            }
            
            .footer-section {
              padding: 36px 24px;
            }
            
            .info-header, .info-value {
              padding: 10px 12px;
              font-size: 14px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Logo Header en fondo negro -->
          <div class="header-logo">
            <img src="${logoKasperskyUrl}" alt="Kaspersky" />
          </div>
          
          <!-- Imagen Hero -->
          <div class="hero-image-section">
            <img src="${heroImageUrl}" 
                 srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x"
                 alt="Prepare sus maletas para vivir un partido de la Copa Mundial de Fútbol" 
                 class="hero-image" 
                 style="width: 100%; max-width: 600px; height: auto; display: block;" />
          </div>
          
          <!-- Contenido -->
          <div class="content-section">
            <div class="greeting">HOLA</div>
            <div class="name">(${userName})</div>
            
            <p class="message">
              <strong>¡Se lo ha ganado!</strong><br>
              Con jugadas increíbles y muchos goles, reconocemos que<br>
              usted fue el <span class="highlight-text">máximo goleador de la competencia</span>.
            </p>
            
            <div class="maletas-section">
              <img src="${maletasImageUrl}" 
                   srcset="${maletasImageUrl} 1x, ${maletasImage2xUrl} 2x"
                   alt="Maletas" 
                   class="maletas-image" />
            </div>
            
            <p class="message">
              Ahora es momento de hacer las maletas y vivir<br>
              esta experiencia única: <span class="highlight-text">asistir a un partido real<br>
              de la Copa Mundial</span>.
            </p>
            
            <table class="info-table">
              <tr>
                <td class="info-header">Periodo</td>
                <td class="info-value">${data.periodo}</td>
              </tr>
              <tr>
                <td class="info-header">Fecha</td>
                <td class="info-value">${data.fechaPartido}</td>
              </tr>
              <tr>
                <td class="info-header">Hora</td>
                <td class="info-value">${data.hora}</td>
              </tr>
              <tr>
                <td class="info-header">Lugar</td>
                <td class="info-value">${data.lugar}</td>
              </tr>
            </table>
            
            <div class="prize-notice">
              <strong>Su premio incluye una experiencia completa</strong><br>
              (vuelo de ida y vuelta, hospedaje y alimentación)
              <br><br>
              Nos pondremos en contacto contigo para hacer<br>
              la entrega oficial de tu ticket.
            </div>
            
            <div class="estadio-section">
              <img src="${estadioImageUrl}" 
                   srcset="${estadioImageUrl} 1x, ${estadioImage2xUrl} 2x"
                   alt="Estadio" 
                   class="estadio-image" />
              <div class="thank-you-text">
                Gracias por su<br>
                esfuerzo, dedicación<br>
                y entrega en
              </div>
              <div class="thank-you-subtext">Kaspersky Cup!</div>
            </div>
          </div>
          
          <!-- Footer Section -->
          <div class="footer-section">
            <!-- Texto Siga a Kaspersky -->
            <div class="social-title">Siga a Kaspersky :</div>
            
            <!-- Redes Sociales -->
            <div class="social-links">
              <a href="https://www.facebook.com/Kaspersky" title="Facebook" style="display: inline-block; margin: 0 6px; text-decoration: none; background-color: #1D1D1B; padding: 8px; border-radius: 4px;">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338210/loyalty-program/emails/common/social-icons/Group%2023.png" alt="Facebook" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://twitter.com/kaspersky" title="Twitter" style="display: inline-block; margin: 0 6px; text-decoration: none; background-color: #1D1D1B; padding: 8px; border-radius: 4px;">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338220/loyalty-program/emails/common/social-icons/Subtraction%201.png" alt="Twitter" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://www.linkedin.com/company/kaspersky-lab" title="LinkedIn" style="display: inline-block; margin: 0 6px; text-decoration: none; background-color: #1D1D1B; padding: 8px; border-radius: 4px;">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338212/loyalty-program/emails/common/social-icons/Group%2025.png" alt="LinkedIn" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://www.instagram.com/kasperskylab/" title="Instagram" style="display: inline-block; margin: 0 6px; text-decoration: none; background-color: #1D1D1B; padding: 8px; border-radius: 4px;">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338213/loyalty-program/emails/common/social-icons/Group%2027.png" alt="Instagram" style="width: 16px; height: 16px;" />
              </a>
              <a href="https://www.youtube.com/user/Kaspersky" title="YouTube" style="display: inline-block; margin: 0 6px; text-decoration: none; background-color: #1D1D1B; padding: 8px; border-radius: 4px;">
                <img src="https://res.cloudinary.com/dk3ow5puw/image/upload/v1764338215/loyalty-program/emails/common/social-icons/Group%2028.png" alt="YouTube" style="width: 16px; height: 16px;" />
              </a>
            </div>
            
            <!-- Logo Kaspersky al final -->
            <div class="footer-logo">
              <img src="${logoKasperskyUrl}" alt="Kaspersky" />
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    sendSmtpEmail.textContent = `
Kaspersky Cup - ¡Usted fue el máximo goleador!

HOLA ${userName}

¡Se lo ha ganado!
Con jugadas increíbles y muchos goles, reconocemos que usted fue el máximo goleador de la competencia.

Ahora es momento de hacer las maletas y vivir esta experiencia única: asistir a un partido real de la Copa Mundial.

Detalles del viaje:
- Periodo: ${data.periodo}
- Fecha: ${data.fechaPartido}
- Hora: ${data.hora}
- Lugar: ${data.lugar}

Su premio incluye una experiencia completa (vuelo de ida y vuelta, hospedaje y alimentación)

Nos pondremos en contacto contigo para hacer la entrega oficial de tu ticket.

Gracias por su esfuerzo, dedicación y entrega en Kaspersky Cup!

Siga a Kaspersky en nuestras redes sociales:
- Facebook: https://www.facebook.com/Kaspersky
- Twitter: https://twitter.com/kaspersky
- LinkedIn: https://www.linkedin.com/company/kaspersky-lab
- Instagram: https://www.instagram.com/kasperskylab/
- YouTube: https://www.youtube.com/user/Kaspersky

Saludos,
Kaspersky Cup
    `.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Ganador premio mayor email sent successfully to:', data.email);
    return true;
  } catch (error) {
    console.error('Error sending ganador premio mayor email:', error);
    return false;
  }
}
