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

// Inicializar cliente de Brevo
const apiInstance = new brevo.TransactionalEmailsApi();
if (BREVO_API_KEY) {
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
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
): Promise<void> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      console.log(`Simulated redemption approved email to: ${email}`);
      return;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email, name: `${firstName} ${lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Loyalty Program Platform' };
    sendSmtpEmail.subject = '🎁 Redención Aprobada - Tu Recompensa Está en Camino';
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
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
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
          .reward-box {
            background: white;
            border: 2px solid #8b5cf6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
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
          <h1>🎁 ¡Redención Aprobada!</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${firstName} ${lastName}</strong>,</p>
          
          <p>¡Fantástico! Tu solicitud de redención ha sido aprobada.</p>
          
          <div class="reward-box">
            <h2 style="color: #8b5cf6; margin-top: 0;">🎉 ${redemptionDetails.rewardName}</h2>
            <p style="font-size: 18px; color: #6b7280;">
              <strong>${redemptionDetails.pointsCost} puntos</strong> canjeados
            </p>
          </div>
          
          <p><strong>Estado:</strong> ${redemptionDetails.status === 'approved' ? '✅ Aprobado' : '📦 En proceso'}</p>
          
          ${redemptionDetails.estimatedDeliveryDays ? `
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #374151;">
              <strong>⏱️ Tiempo estimado de entrega:</strong> 
              <span style="color: #8b5cf6; font-weight: bold;">${redemptionDetails.estimatedDeliveryDays} días hábiles</span>
            </p>
          </div>
          ` : ''}
          
          <p>Recibirás más información sobre la entrega de tu recompensa próximamente.</p>
          
          <p style="margin-top: 30px;">
            <a href="${APP_URL}/rewards" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
              Ver Mis Redenciones
            </a>
          </p>
          
          <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            ¡Gracias por ser parte de nuestro programa de lealtad!
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
    console.log('Redemption approved email sent successfully to:', email);
  } catch (error) {
    console.error('Error sending redemption approved email:', error);
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
                <a href="https://www.instagram.com/kaspersky/" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Instagram">
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
- Instagram: https://www.instagram.com/kaspersky/
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
  inviteToken: string;
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
    const registrationLink = `${APP_URL}/register?token=${data.inviteToken}`;
    
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
            
            <a href="${registrationLink}" class="cta-button">Regístrese ahora</a>
            
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
                <a href="https://www.instagram.com/kaspersky/" style="display: inline-block; margin: 0 6px; text-decoration: none;" title="Instagram">
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

Regístrese ahora: ${registrationLink}

Una vez finalizado su registro, le enviaremos un correo confirmando que su inscripción fue aprobada.
Desde ese momento, podrá ingresar a la plataforma y comenzar a sumar goles.

IMPORTANTE:
Para que sus ventas se conviertan en goles dentro de la Kaspersky Cup, es necesario que estén registradas 
previamente en el programa Kudos. Las ventas que no estén validadas en Kudos no podrán sumar goles.

Siga a Kaspersky en nuestras redes sociales:
- Facebook: https://www.facebook.com/Kaspersky
- Twitter: https://twitter.com/kaspersky
- LinkedIn: https://www.linkedin.com/company/kaspersky-lab
- Instagram: https://www.instagram.com/kaspersky/
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

/**
 * Envía un email con magic link para acceso sin contraseña
 */
export async function sendMagicLinkEmail(data: MagicLinkEmailData): Promise<boolean> {
  try {
    if (!BREVO_API_KEY) {
      console.warn('BREVO_API_KEY no configurada. Email no enviado.');
      console.log('Simulated magic link email to:', data.email);
      console.log('Magic link:', `${APP_URL}/login/magic?token=${data.loginToken}`);
      return true; // Simular éxito en desarrollo
    }

    const magicLink = `${APP_URL}/login/magic?token=${data.loginToken}`;
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: data.email, name: `${data.firstName} ${data.lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Loyalty Program Platform' };
    sendSmtpEmail.subject = '🔐 Tu enlace de acceso a LoyaltyPilot';
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
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white !important;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔐 Acceso sin Contraseña</h1>
          </div>
          <div class="content">
            <p>Hola ${data.firstName},</p>
            
            <p>Has solicitado acceder a tu cuenta sin contraseña. Haz clic en el siguiente botón para iniciar sesión:</p>
            
            <div style="text-align: center;">
              <a href="${magicLink}" class="button">Acceder Ahora</a>
            </div>
            
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
              O copia y pega este enlace en tu navegador:<br>
              <a href="${magicLink}">${magicLink}</a>
            </p>
            
            <div class="warning">
              <p style="margin: 0;"><strong>⏰ Importante:</strong></p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>Este enlace expira en <strong>15 minutos</strong></li>
                <li>Solo puede usarse <strong>una vez</strong></li>
                <li>Si no solicitaste este acceso, ignora este email</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>&copy; ${new Date().getFullYear()} Loyalty Program Platform. Todos los derechos reservados.</p>
          </div>
        </body>
        </html>
      `;
    sendSmtpEmail.textContent = `
Hola ${data.firstName},

Has solicitado acceder a tu cuenta sin contraseña.

Para iniciar sesión, visita el siguiente enlace:
${magicLink}

IMPORTANTE:
- Este enlace expira en 15 minutos
- Solo puede usarse una vez
- Si no solicitaste este acceso, ignora este email

Saludos,
Loyalty Program Platform
      `.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Magic link email sent successfully to:', data.email);
    return true;
  } catch (error) {
    console.error('Error sending magic link email:', error);
    return false;
  }
}
