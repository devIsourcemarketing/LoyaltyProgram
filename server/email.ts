// email.ts (versión unificada)

// -------------------- Imports y setup base --------------------
import * as brevo from '@getbrevo/brevo';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@loyaltyprogram.com';
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

console.log('📧 Configuración de Email:');
console.log('   BREVO_API_KEY:', BREVO_API_KEY ? '✓ Configurada' : '✗ NO CONFIGURADA');
console.log('   FROM_EMAIL:', FROM_EMAIL);
console.log('   APP_URL:', APP_URL);

let apiInstance: brevo.TransactionalEmailsApi;
if (BREVO_API_KEY) {
  apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
  console.log('✅ Cliente Brevo inicializado');
} else {
  console.warn('⚠️  BREVO_API_KEY no configurada - se simulará el envío de emails');
  apiInstance = new brevo.TransactionalEmailsApi();
}

// -------------------- Tipos base --------------------
export type EmailLanguage = 'es' | 'pt' | 'en';

// -------------------- Cloudinary helper --------------------
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dk3ow5puw/image/upload';

export function getEmailImageURLs(emailType: string, lang: EmailLanguage = 'es') {
  // Carpetas por idioma en Cloudinary
  const langFolder = lang === 'pt' ? 'português' : 'español';
  const basePath = `${CLOUDINARY_BASE}/loyalty-program/emails/${emailType}/${langFolder}`;

  return {
    basePath,
    getImage: (filename: string, retina: boolean = false) => {
      let name = filename;
      const lastDot = filename.lastIndexOf('.');
      if (lastDot > 0) {
        name = filename.substring(0, lastDot);
      }
      const encodedName = name.replace(/ /g, '%20');
      let url = `${basePath}/${encodedName}`;

      // Excepción para registro-passwordless PT (versionado distinto en Cloudinary)
      if (emailType === 'registro-passwordless' && lang === 'pt') {
        if (name.includes('Group 65')) {
          const version = 'v1765212377';
          url = url.replace('/loyalty-program/', `/${version}/loyalty-program/`);
        } else if (name.includes('Logo - Kaspersky Cup')) {
          const version = retina ? 'v1764782736' : 'v1764782734';
          url = url.replace('/loyalty-program/', `/${version}/loyalty-program/`);
        }
      }

      return `${url}.png`;
    },
    common: {
      logoKaspersky: `${CLOUDINARY_BASE}/loyalty-program/emails/common/Kaspersky%20Logo.png`,
      badge: `${CLOUDINARY_BASE}/loyalty-program/emails/common/Kaspersky%20Cup%20-%20badge%20250.png`,
      socialIcons: {
        facebook: `${CLOUDINARY_BASE}/loyalty-program/emails/common/social-icons/Group%2023.png`,
        twitter: `${CLOUDINARY_BASE}/loyalty-program/emails/common/social-icons/Subtraction%201.png`,
        linkedin: `${CLOUDINARY_BASE}/loyalty-program/emails/common/social-icons/Group%2025.png`,
        instagram: `${CLOUDINARY_BASE}/loyalty-program/emails/common/social-icons/Group%2027.png`,
        youtube: `${CLOUDINARY_BASE}/loyalty-program/emails/common/social-icons/Group%2028.png`,
      }
    }
  };
}

// (opcional: se queda por si lo usas en otros mails locales)
function imageToBase64(imagePath: string): string {
  try {
    const fullPath = path.resolve(__dirname, '..', imagePath);
    if (fs.existsSync(fullPath)) {
      const imageBuffer = fs.readFileSync(fullPath);
      const base64Image = imageBuffer.toString('base64');
      const ext = path.extname(imagePath).toLowerCase();
      const mimeType =
        ext === '.png'
          ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : 'image/png';
      return `data:${mimeType};base64,${base64Image}`;
    }
    console.warn(`⚠️ Image not found: ${fullPath}`);
    return '';
  } catch (error) {
    console.error(`❌ Error converting image to base64: ${imagePath}`, error);
    return '';
  }
}

// -------------------- Textos multi-idioma --------------------
const emailTexts = {
  common: {
    greeting: {
      es: 'HOLA',
      pt: 'OLÁ',
      en: 'HELLO'
    },
    followKaspersky: {
      es: 'Siga a Kaspersky :',
      pt: 'Siga a Kaspersky :',
      en: 'Follow Kaspersky :'
    },
    kasperskyCup: {
      es: 'Kaspersky Cup',
      pt: 'Kaspersky Cup',
      en: 'Kaspersky Cup'
    }
  },
  magicLink: {
    subject: {
      es: 'Tu enlace único de acceso - Kaspersky Cup',
      pt: 'Seu link único de acesso - Kaspersky Cup',
      en: 'Your unique access link - Kaspersky Cup'
    },
    clickButton: {
      es: 'Haga clic en el siguiente botón para iniciar sesión en el programa Kaspersky Cup:',
      pt: 'Clique no botão abaixo para fazer login no programa Kaspersky Cup:',
      en: 'Click the button below to log in to the Kaspersky Cup program:'
    },
    accessNow: {
      es: 'Acceder ahora',
      pt: 'Acessar agora',
      en: 'Access now'
    },
    cannotAccess: {
      es: 'Si no puede acceder desde el botón, copie y pegue este enlace',
      pt: 'Se não conseguir acessar pelo botão, copie e cole este link',
      en: 'If you cannot access from the button, copy and paste this link'
    },
    inBrowser: {
      es: 'en su navegador:',
      pt: 'no seu navegador:',
      en: 'in your browser:'
    },
    important: {
      es: 'IMPORTANTE:',
      pt: 'IMPORTANTE:',
      en: 'IMPORTANT:'
    },
    linkExpires: {
      es: 'Este enlace expira en 15 minutos.',
      pt: 'Este link expira em 15 minutos.',
      en: 'This link expires in 15 minutes.'
    },
    useOnce: {
      es: 'Solo puede usarse una vez.',
      pt: 'Só pode ser usado uma vez.',
      en: 'Can only be used once.'
    },
    didNotRequest: {
      es: 'Si no solicitó este acceso, ignore este correo. Este es un mensaje automático, por favor, no responda a este mensaje.',
      pt: 'Se você não solicitou este acesso, ignore este e-mail. Esta é uma mensagem automática, por favor, não responda a esta mensagem.',
      en: 'If you did not request this access, ignore this email. This is an automated message, please do not reply to this message.'
    }
  },
  bienvenida: {
    subject: {
      es: '¡Bienvenido a Kaspersky Cup! - Aquí comienza su ruta goleadora',
      pt: 'Bem-vindo à Kaspersky Cup! - Aqui começa sua rota de gols',
      en: 'Welcome to Kaspersky Cup! - Your scoring route begins here'
    },
    welcome: {
      es: 'Bienvenido(a) a <span class="highlight-text">Kaspersky Cup</span>, una campaña de incentivos con muchos premios pensada para nuestros socios.',
      pt: 'Bem-vindo(a) à <span class="highlight-text">Kaspersky Cup</span>, uma campanha de incentivos com muitos prêmios pensada para nossos parceiros.',
      en: 'Welcome to <span class="highlight-text">Kaspersky Cup</span>, an incentive campaign with many prizes designed for our partners.'
    },
    salesTransform: {
      es: 'Cada venta de productos Kaspersky se transforma en goles que pueden valer premios increíbles. Cuanto más venda, más gana, con recompensas exclusivas que se actualizan cada mes.',
      pt: 'Cada venda de produtos Kaspersky se transforma em gols que podem valer prêmios incríveis. Quanto mais você vende, mais ganha, com recompensas exclusivas que são atualizadas a cada mês.',
      en: 'Each sale of Kaspersky products turns into goals that can be worth incredible prizes. The more you sell, the more you earn, with exclusive rewards that are updated every month.'
    },
    worldCupExperience: {
      es: 'Conviértase en el goleador de <span class="highlight-text">Kaspersky Cup</span> y participe por una experiencia completa para asistir a un partido de la Copa Mundial con todos los gastos pagos.',
      pt: 'Torne-se o artilheiro da <span class="highlight-text">Kaspersky Cup</span> e participe de uma experiência completa para assistir a uma partida da Copa do Mundo com todas as despesas pagas.',
      en: 'Become the top scorer of <span class="highlight-text">Kaspersky Cup</span> and participate for a complete experience to attend a World Cup match with all expenses paid.'
    },
    accessAccount: {
      es: 'Ingrese a <span class="highlight-text">kasperskycup.com</span>, conozca los términos y condiciones del programa y consulte su puntaje.',
      pt: 'Acesse <span class="highlight-text">kasperskycup.com</span>, conheça os termos e condições do programa e consulte sua pontuação.',
      en: 'Visit <span class="highlight-text">kasperskycup.com</span>, learn about the program terms and conditions and check your score.'
    },
    accessButton: {
      es: 'Acceder a mi cuenta',
      pt: 'Acessar minha conta',
      en: 'Access my account'
    }
  },
  expectativa: {
    subject: {
      es: '⚽ Prepárate para Kaspersky Cup - ¡Grandes premios te esperan!',
      pt: '⚽ Prepare-se para a Kaspersky Cup - Grandes prêmios te esperam!',
      en: '⚽ Get ready for Kaspersky Cup - Great prizes await you!'
    }
  },
  registroExitoso: {
    subject: {
      es: '⚽ ¡Registro exitoso! - Completa tu perfil en Kaspersky Cup',
      pt: '⚽ Registro bem-sucedido! - Complete seu perfil na Kaspersky Cup',
      en: '⚽ Registration successful! - Complete your profile at Kaspersky Cup'
    }
  },
  registroPasswordless: {
    subject: {
      es: '⚽ ¡Registro exitoso! ¡Fue convocado a jugar en Kaspersky Cup! 🏆',
      pt: '⚽ Registro bem-sucedido! Você foi convocado para jogar na Kaspersky Cup! 🏆',
      en: '⚽ Registration successful! You\'ve been called up to play in Kaspersky Cup! 🏆'
    },
    welcome: {
      es: '¡Le damos la bienvenida a',
      pt: 'Damos as boas-vindas a',
      en: 'We welcome you to'
    },
    convened: {
      es: 'Fuiste convocado a jugar',
      pt: 'Você foi convocado para jogar',
      en: 'You have been called up to play'
    }
  },
  golesRegistrados: {
    subject: {
      es: '¡Golazo! Su marcador sigue creciendo - Kaspersky Cup',
      pt: 'Golaço! Seu placar continua crescendo - Kaspersky Cup',
      en: 'Goal! Your score keeps growing - Kaspersky Cup'
    },
    greatNews: {
      es: '¡Excelentes noticias!',
      pt: 'Excelentes notícias!',
      en: 'Excellent news!'
    },
    salesRegistered: {
      es: 'Nuevas ventas fueron registradas a su nombre y ha acumulado más goles en <span class="highlight-text">Kaspersky Cup</span>.',
      pt: 'Novas vendas foram registradas em seu nome e você acumulou mais gols na <span class="highlight-text">Kaspersky Cup</span>.',
      en: 'New sales have been registered in your name and you have accumulated more goals in <span class="highlight-text">Kaspersky Cup</span>.'
    },
    product: {
      es: 'Producto',
      pt: 'Produto',
      en: 'Product'
    },
    dealValue: {
      es: 'Valor del Deal',
      pt: 'Valor do Negócio',
      en: 'Deal Value'
    },
    goalsAdded: {
      es: 'Goles sumados',
      pt: 'Gols adicionados',
      en: 'Goals added'
    },
    redeemReward: {
      es: 'Sus goles ya están disponibles en su cuenta y puede usarlos para <span class="highlight-text">canjear el premio imperdible del mes</span>.',
      pt: 'Seus gols já estão disponíveis em sua conta e você pode usá-los para <span class="highlight-text">resgatar o prêmio imperdível do mês</span>.',
      en: 'Your goals are now available in your account and you can use them to <span class="highlight-text">redeem this month\'s unmissable prize</span>.'
    },
    viewScore: {
      es: 'Ver mi marcador',
      pt: 'Ver meu placar',
      en: 'View my score'
    },
    keepGoing: {
      es: '¡Sigue así!',
      pt: 'Continue assim!',
      en: 'Keep it up!'
    },
    worldCup2026: {
      es: 'Cada nuevo gol te acerca a vivir en vivo la <span class="highlight-text">Copa Mundial de Fútbol 2026</span>.',
      pt: 'Cada novo gol te aproxima de viver ao vivo a <span class="highlight-text">Copa do Mundo de Futebol 2026</span>.',
      en: 'Each new goal brings you closer to experiencing the <span class="highlight-text">2026 FIFA World Cup</span> live.'
    }
  },
  pendienteAprobacion: {
    subject: {
      es: 'Kaspersky Cup - Solicitud de Canje en Proceso',
      pt: 'Kaspersky Cup - Solicitação de Resgate em Processo',
      en: 'Kaspersky Cup - Redemption Request in Process'
    },
    redeemMessage: {
      es: 'Sus goles le permitieron <span class="highlight-text">redimir su premio</span> en <span class="highlight-text">Kaspersky Cup.</span>',
      pt: 'Seus gols permitiram <span class="highlight-text">resgatar seu prêmio</span> na <span class="highlight-text">Kaspersky Cup.</span>',
      en: 'Your goals allowed you to <span class="highlight-text">redeem your prize</span> at <span class="highlight-text">Kaspersky Cup.</span>'
    },
    processing: {
      es: 'Nuestro equipo organizador está procesando su solicitud. Muy pronto recibirá la confirmación del envío por correo electrónico o a través de la plataforma.',
      pt: 'Nossa equipe organizadora está processando sua solicitação. Em breve você receberá a confirmação do envio por e-mail ou através da plataforma.',
      en: 'Our organizing team is processing your request. You will soon receive shipping confirmation by email or through the platform.'
    },
    checkStatus: {
      es: 'Revisar el estado de mi premio',
      pt: 'Verificar o status do meu prêmio',
      en: 'Check my prize status'
    },
    soonInTouch: {
      es: 'Pronto estaremos en contacto con usted.',
      pt: 'Em breve estaremos em contato com você.',
      en: 'We will be in touch with you soon.'
    },
    seeYouNextMatch: {
      es: '¡Nos vemos en el próximo partido!',
      pt: 'Vejo você na próxima partida!',
      en: 'See you at the next match!'
    }
  },
  ganadorPremioMayor: {
    subject: {
      es: '🏆 ¡FELICIDADES! Ganaste el Gran Premio - Kaspersky Cup',
      pt: '🏆 PARABÉNS! Você ganhou o Grande Prêmio - Kaspersky Cup',
      en: '🏆 CONGRATULATIONS! You won the Grand Prize - Kaspersky Cup'
    },
    youWon: {
      es: '¡GANASTE!',
      pt: 'VOCÊ GANHOU!',
      en: 'YOU WON!'
    },
    worldCupTrip: {
      es: 'Viaje a la Copa Mundial',
      pt: 'Viagem para a Copa do Mundo',
      en: 'World Cup Trip'
    },
    tripDetails: {
      es: 'Detalles de tu viaje',
      pt: 'Detalhes da sua viagem',
      en: 'Your trip details'
    }
  },
  ticketResponse: {
    subject: {
      es: 'Respuesta a su ticket de soporte - Kaspersky Cup',
      pt: 'Resposta ao seu ticket de suporte - Kaspersky Cup',
      en: 'Response to your support ticket - Kaspersky Cup'
    },
    responseReceived: {
      es: 'Hemos respondido a su ticket de soporte',
      pt: 'Respondemos ao seu ticket de suporte',
      en: 'We have responded to your support ticket'
    },
    ticketSubject: {
      es: 'Asunto del ticket:',
      pt: 'Assunto do ticket:',
      en: 'Ticket subject:'
    },
    adminResponse: {
      es: 'Respuesta del equipo:',
      pt: 'Resposta da equipe:',
      en: 'Team response:'
    },
    viewTicket: {
      es: 'Ver mi ticket',
      pt: 'Ver meu ticket',
      en: 'View my ticket'
    },
    viewAllTickets: {
      es: 'Ver todos mis tickets',
      pt: 'Ver todos os meus tickets',
      en: 'View all my tickets'
    },
    thankYou: {
      es: 'Gracias por contactarnos.',
      pt: 'Obrigado por nos contatar.',
      en: 'Thank you for contacting us.'
    },
    hereToHelp: {
      es: 'Estamos aquí para ayudarte con <span class="highlight-text">Kaspersky Cup</span>.',
      pt: 'Estamos aqui para ajudá-lo com a <span class="highlight-text">Kaspersky Cup</span>.',
      en: 'We are here to help you with <span class="highlight-text">Kaspersky Cup</span>.'
    }
  }
};

// -------------------- Interfaces de datos --------------------
export interface InviteEmailData {
  email: string;
  firstName: string;
  lastName: string;
  inviteToken: string;
  invitedBy: string;
  language?: EmailLanguage; 
}

export interface MagicLinkEmailData {
  email: string;
  firstName: string;
  lastName: string;
  loginToken: string;
  language?: EmailLanguage;
}

export interface ExpectationEmailData {
  email: string;
  firstName?: string;
  lastName?: string;
  language?: EmailLanguage;
}

export interface RegistroExitosoEmailData {
  email: string;
  firstName?: string;
  lastName?: string;
  inviteToken?: string;
  loginToken?: string;
  language?: EmailLanguage;
}

export interface RegistroPasswordlessEmailData {
  email: string;
  firstName?: string;
  lastName?: string;
  loginToken: string;
  language?: EmailLanguage;
}

export interface BienvenidaEmailData {
  email: string;
  firstName?: string;
  lastName?: string;
  loginToken?: string;
  language?: EmailLanguage;
}

export interface GolesRegistradosEmailData {
  email: string;
  firstName: string;
  lastName: string;
  producto: string;
  valorDeal: number;
  golesSumados: number;
  totalGoles: number;
  language?: EmailLanguage;
}

export interface PendienteAprobacionEmailData {
  email: string;
  firstName: string;
  lastName: string;
  nombrePremio: string;
  golesCanje: number;
  language?: EmailLanguage;
}

export interface GanadorPremioMayorEmailData {
  email: string;
  firstName: string;
  lastName: string;
  periodo: string;
  fechaPartido: string;
  hora: string;
  lugar: string;
  language?: EmailLanguage;
}

export interface TicketResponseEmailData {
  email: string;
  firstName: string;
  lastName: string;
  ticketSubject: string;
  adminResponse: string;
  ticketId: string;
  language?: EmailLanguage;
}

// -------------------- 1. Email de invitación --------------------
export async function sendInviteEmail(data: InviteEmailData): Promise<boolean> {
  try {
    const inviteLink = `${APP_URL}/register?token=${data.inviteToken}`;
    if (!BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY no configurada. Simulando sendInviteEmail.');
      console.log('   To: ', data.email);
      console.log('   Link: ', inviteLink);
      return true;
    }

    const images = getEmailImageURLs('magic-link', 'es');

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: data.email, name: `${data.firstName} ${data.lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = '⚽ Bienvenido a Kaspersky Cup - Tu ruta goleadora comienza aquí';

    sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Kaspersky Cup - Invitación</title>
<style>
  body { margin:0; padding:0; font-family: Arial, sans-serif; background:#F5F5F5; }
  .container{max-width:600px;margin:0 auto;background:#FFFFFF;}
  .header{padding:24px;text-align:center;}
  .hero{margin:0 16px 24px 16px;border-radius:16px;overflow:hidden;
        background:linear-gradient(180deg,rgba(30,50,40,0.85),rgba(20,40,30,0.9));padding:40px 24px;}
  .hero-badge img{width:100px;height:auto;display:block;margin:0 auto 16px;}
  .hero-title{color:#fff;font-size:28px;line-height:1.3;margin:0;}
  .hero-title span{color:#29CCB1;font-weight:bold;display:block;font-size:30px;}
  .content{padding:24px 24px 32px 24px;}
  .greeting{font-size:32px;font-weight:700;margin:0 0 8px 0;color:#1D1D1B;}
  .greeting span{color:#29CCB1;}
  p{font-size:15px;color:#1D1D1B;line-height:1.6;}
  .btn{display:inline-block;margin:24px 0;background:#29CCB1;color:#fff;
       padding:14px 24px;border-radius:6px;font-size:14px;font-weight:600;
       text-decoration:none;text-align:center;}
  .footer{background:#1D1D1B;color:#fff;text-align:center;padding:24px;}
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span style="font-size:22px;font-weight:700;color:#29CCB1;">kaspersky</span>
    </div>
    <div class="hero">
      <div class="hero-badge">
        <img src="${APP_URL}/email-assets/email-hero-badge/badge-logo.png" alt="Kaspersky Cup" />
      </div>
      <h1 class="hero-title">
        Aquí comienza
        <span>tu ruta goleadora</span>
      </h1>
    </div>
    <div class="content">
      <h2 class="greeting">
        HOLA <span>${data.firstName.toUpperCase()}</span>
      </h2>
      <p>
        Desde hoy, ya eres uno de los jugadores de <strong>Kaspersky Cup</strong>, 
        el programa donde tus ventas se transforman en goles y te hacen ganar premios increíbles.
      </p>
      <a class="btn" href="${inviteLink}">
        Completar mi registro y empezar a jugar
      </a>
      <p style="font-size:12px;color:#6B7280;margin-top:12px;">
        Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
        <span style="color:#29CCB1;word-wrap:break-word;">${inviteLink}</span>
      </p>
    </div>
    <div class="footer">
      <img src="${images.common.logoKaspersky}" alt="Kaspersky" style="max-width:120px;height:auto;margin-bottom:8px;" />
      <p style="font-size:13px;line-height:1.5;">
        La emoción del fútbol, la pasión por las ventas.<br />
        <strong>Solo en Kaspersky Cup.</strong>
      </p>
    </div>
  </div>
</body>
</html>`;

    sendSmtpEmail.textContent = `
Hola ${data.firstName} ${data.lastName},

Has sido invitado por ${data.invitedBy} a unirte a Kaspersky Cup.

Para completar tu registro, usa este enlace:
${inviteLink}

Saludos,
Kaspersky Cup
`.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Invite email enviado a', data.email);
    return true;
  } catch (error) {
    console.error('❌ Error sendInviteEmail:', error);
    return false;
  }
}

// -------------------- 2. Magic link --------------------
export async function sendMagicLinkEmail(data: MagicLinkEmailData): Promise<boolean> {
  const lang = data.language || 'es';

  try {
    const magicLink = `${APP_URL}/login/magic?token=${data.loginToken}`;

    if (!BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY no configurada. Simulando sendMagicLinkEmail.');
      console.log('   To: ', data.email);
      console.log('   Link: ', magicLink);
      return true;
    }

    const images = getEmailImageURLs('magic-link', lang);
    const heroImageUrl = images.getImage('Group 61.png');
    const heroImage2xUrl = images.getImage('Group 61.png', true);
    const userName = data.firstName || emailTexts.common.greeting[lang];

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: data.email, name: `${data.firstName} ${data.lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = `⚽ ${emailTexts.magicLink.subject[lang]}`;

    sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${emailTexts.magicLink.subject[lang]}</title>
<style>
  body{margin:0;padding:0;font-family:Arial,sans-serif;background:#FFFFFF;}
  .container{max-width:600px;margin:0 auto;background:#FFFFFF;}
  .hero img{width:100%;max-width:600px;height:auto;display:block;}
  .content{padding:24px 24px 32px 24px;}
  .title{font-size:22px;font-weight:700;color:#1D1D1B;margin-bottom:4px;}
  .name{font-size:22px;font-weight:700;color:#29CCB1;margin-bottom:16px;}
  p{font-size:14px;color:#1D1D1B;line-height:1.6;}
  .btn{display:inline-block;margin:20px 0;background:#29CCB1;color:#fff;
       padding:12px 32px;border-radius:4px;font-size:14px;font-weight:600;text-decoration:none;}
  .small{font-size:12px;color:#6B7280;}
  .warn{background:#1D1D1B;color:#fff;border-radius:4px;padding:16px;margin-top:20px;font-size:12px;}
</style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <img src="${heroImageUrl}" srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x" alt="Kaspersky Cup" />
    </div>
    <div class="content">
      <div class="title">${emailTexts.common.greeting[lang]}</div>
      <div class="name">(${userName.toUpperCase()})</div>
      <p>${emailTexts.magicLink.clickButton[lang]}</p>
      <a class="btn" href="${magicLink}">${emailTexts.magicLink.accessNow[lang]}</a>
      <p class="small">
        ${emailTexts.magicLink.cannotAccess[lang]} ${emailTexts.magicLink.inBrowser[lang]}<br />
        <span style="color:#29CCB1;word-wrap:break-word;">${magicLink}</span>
      </p>
      <div class="warn">
        <strong>${emailTexts.magicLink.important[lang]}</strong><br />
        • ${emailTexts.magicLink.linkExpires[lang]}<br />
        • ${emailTexts.magicLink.useOnce[lang]}
      </div>
      <p class="small" style="margin-top:16px;">
        ${emailTexts.magicLink.didNotRequest[lang]}
      </p>
    </div>
  </div>
</body>
</html>`;

    sendSmtpEmail.textContent = `
${emailTexts.common.greeting[lang]} ${userName.toUpperCase()},

${emailTexts.magicLink.clickButton[lang]}

${emailTexts.magicLink.accessNow[lang]}: ${magicLink}

${emailTexts.magicLink.cannotAccess[lang]} ${emailTexts.magicLink.inBrowser[lang]}
${magicLink}

${emailTexts.magicLink.important[lang]}
- ${emailTexts.magicLink.linkExpires[lang]}
- ${emailTexts.magicLink.useOnce[lang]}

${emailTexts.magicLink.didNotRequest[lang]}
`.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Magic link email enviado a', data.email);
    return true;
  } catch (error) {
    console.error('❌ Error sendMagicLinkEmail:', error);
    return false;
  }
}

// -------------------- 3. Email de Expectativa --------------------
export async function sendExpectationEmail(data: ExpectationEmailData): Promise<boolean> {
  const lang = data.language || 'es';

  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY no configurada. Simulando sendExpectationEmail.');
      console.log('   To: ', data.email);
      return true;
    }

    const images = getEmailImageURLs('expectativa', lang);
    const heroImageUrl = images.getImage('hero.png');
    const heroImage2xUrl = images.getImage('hero.png', true);
    const badgeUrl = images.common.badge;

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{
      email: data.email,
      name: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : undefined
    }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = emailTexts.expectativa.subject[lang];

    sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${emailTexts.expectativa.subject[lang]}</title>
<style>
body{margin:0;padding:0;font-family:Arial,sans-serif;background:#FFFFFF;}
.container{max-width:600px;margin:0 auto;background:#FFFFFF;}
.hero img{width:100%;max-width:600px;height:auto;display:block;}
.footer{background:#1D1D1B;color:#fff;text-align:center;padding:32px 24px;}
.footer img{width:250px;height:auto;margin-bottom:16px;}
p{margin:0;font-size:16px;}
span.hl{color:#29CCB1;font-weight:700;}
.small{margin-top:16px;font-size:13px;}
</style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <img src="${heroImageUrl}" srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x"
           alt="Ventas que se celebran como goles" />
    </div>
    <div class="footer">
      <img src="${badgeUrl}" alt="Kaspersky Cup" />
      <p>Desde el 2025,<br /><span class="hl">deja todo en la cancha</span></p>
      <p class="small">Descúbrelo muy pronto</p>
    </div>
  </div>
</body>
</html>`;

    sendSmtpEmail.textContent = `
${emailTexts.expectativa.subject[lang]}

Desde el 2025, deja todo en la cancha.
Descúbrelo muy pronto.

${emailTexts.common.followKaspersky[lang]}
${emailTexts.common.kasperskyCup[lang]}
`.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Expectation email enviado a', data.email);
    return true;
  } catch (error) {
    console.error('❌ Error sendExpectationEmail:', error);
    return false;
  }
}

// -------------------- 4. Registro exitoso --------------------
export async function sendRegistroExitosoEmail(data: RegistroExitosoEmailData): Promise<boolean> {
  const lang = data.language || 'es';

  try {
    const images = getEmailImageURLs('registro-exitoso', lang);
    const heroImageUrl = images.getImage('Group 65.png');
    const heroImage2xUrl = images.getImage('Group 65.png', true);
    const badgeUrl = images.common.badge;
    const userName = data.firstName || 'Usuario';

    const actionLink = data.inviteToken
      ? `${APP_URL}/register?token=${data.inviteToken}`
      : data.loginToken
      ? `${APP_URL}/auth/verify-magic-link/${data.loginToken}`
      : `${APP_URL}/login`;

    if (!BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY no configurada. Simulando sendRegistroExitosoEmail.');
      console.log('   To: ', data.email);
      console.log('   Link: ', actionLink);
      return true;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{
      email: data.email,
      name: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : undefined
    }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = emailTexts.registroExitoso.subject[lang];

    sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${emailTexts.registroExitoso.subject[lang]}</title>
<style>
body{margin:0;padding:0;font-family:Arial,sans-serif;background:#FFFFFF;}
.container{max-width:600px;margin:0 auto;background:#FFFFFF;}
.hero img{width:100%;max-width:600px;height:auto;display:block;}
.content{padding:32px 24px;text-align:center;}
h1{font-size:28px;margin:0 0 4px 0;color:#1D1D1B;}
h2{font-size:24px;margin:0 0 24px 0;color:#29CCB1;}
p{font-size:14px;color:#111827;line-height:1.6;}
.btn{display:inline-block;margin:20px 0;background:#29CCB1;color:#fff;padding:12px 32px;
     border-radius:4px;font-size:14px;font-weight:600;text-decoration:none;}
.box{margin-top:24px;background:#1D1D1B;color:#fff;padding:18px;border-radius:4px;font-size:13px;text-align:left;}
.footer{background:#1D1D1B;color:#fff;text-align:center;padding:32px 24px;}
.footer img{width:250px;height:auto;margin-bottom:16px;}
</style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <img src="${heroImageUrl}" srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x"
           alt="Registro exitoso" />
    </div>
    <div class="content">
      <h1>${emailTexts.common.greeting[lang]}</h1>
      <h2>(${userName})</h2>
      <p>
        Lo estamos esperando con la camiseta lista para <strong>Kaspersky Cup</strong>.
        Complete su registro e ingrese al programa donde sus ventas se transforman en goles.
      </p>
      <a class="btn" href="${actionLink}">Completar mi registro</a>
      <div class="box">
        <strong>IMPORTANTE:</strong><br />
        Para que sus ventas se conviertan en goles dentro de la Kaspersky Cup, deben estar
        registradas previamente en el programa <strong>Kudos</strong>. Las ventas que no estén
        validadas en Kudos no podrán sumar goles.
      </div>
    </div>
    <div class="footer">
      <img src="${badgeUrl}" alt="Kaspersky Cup" />
      <p style="font-size:13px;margin-top:8px;">
        ${emailTexts.common.followKaspersky[lang]}
      </p>
    </div>
  </div>
</body>
</html>`;

    sendSmtpEmail.textContent = `
Kaspersky Cup - Registro exitoso

HOLA ${userName}

Complete su registro para empezar a sumar goles:
${actionLink}

IMPORTANTE:
Para que sus ventas se conviertan en goles dentro de la Kaspersky Cup, es necesario que estén registradas
previamente en el programa Kudos. Las ventas que no estén validadas en Kudos no podrán sumar goles.
`.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Registro exitoso email enviado a', data.email);
    return true;
  } catch (error) {
    console.error('❌ Error sendRegistroExitosoEmail:', error);
    return false;
  }
}

// -------------------- 5. Registro passwordless --------------------
export async function sendRegistroPasswordlessEmail(data: RegistroPasswordlessEmailData): Promise<boolean> {
  const lang = data.language || 'es';

  try {
    const images = getEmailImageURLs('registro-passwordless', lang);
    const heroImageUrl = images.getImage('Group 65.png');
    const heroImage2xUrl = images.getImage('Group 65.png', true);
    const logoUrl = images.getImage('Logo - Kaspersky Cup.png');
    const logo2xUrl = images.getImage('Logo - Kaspersky Cup.png', true);
    const userName = data.firstName || 'Usuario';
    const magicLink = `${APP_URL}/auth/verify-magic-link/${data.loginToken}`;

    if (!BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY no configurada. Simulando sendRegistroPasswordlessEmail.');
      console.log('   To: ', data.email);
      console.log('   Link: ', magicLink);
      return true;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{
      email: data.email,
      name: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : undefined
    }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = emailTexts.registroPasswordless.subject[lang];

    sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${emailTexts.registroPasswordless.subject[lang]}</title>
<style>
body{margin:0;padding:0;font-family:Arial,sans-serif;background:#FFFFFF;}
.container{max-width:600px;margin:0 auto;background:#FFFFFF;}
.hero img{width:100%;max-width:600px;height:auto;display:block;}
.content{padding:32px 24px;text-align:center;}
h1{font-size:24px;margin:0 0 4px 0;}
h2{font-size:22px;margin:0 0 20px 0;color:#29CCB1;}
p{font-size:14px;color:#111827;line-height:1.6;}
.logo img{max-width:220px;height:auto;margin:24px 0;}
.box{margin-top:24px;background:#1D1D1B;color:#fff;padding:20px;border-radius:4px;font-size:13px;text-align:left;}
.footer{background:#1D1D1B;color:#fff;text-align:center;padding:24px;}
.footer img{max-width:120px;height:auto;margin-bottom:8px;}
</style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <img src="${heroImageUrl}" srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x" alt="Kaspersky Cup" />
    </div>
    <div class="content">
      <h1>${emailTexts.common.greeting[lang]}</h1>
      <h2>(${userName.toUpperCase()})</h2>
      <p>${emailTexts.registroPasswordless.convened[lang]}</p>
      <div class="logo">
        <img src="${logoUrl}" srcset="${logoUrl} 1x, ${logo2xUrl} 2x" alt="Kaspersky Cup" />
      </div>
      <p>
        ${emailTexts.registroPasswordless.welcome[lang]} <strong>Kaspersky Cup</strong>,
        el programa donde sus ventas se transforman en goles y le permiten ganar premios mes a mes.
      </p>
      <p style="margin-top:16px;">
        Para ingresar a la plataforma, use este enlace de acceso:
        <br /><br />
        <a href="${magicLink}" style="color:#29CCB1;font-weight:600;word-wrap:break-word;">${magicLink}</a>
      </p>
      <div class="box">
        <strong>RECUERDE:</strong><br /><br />
        Para que sus ventas sumen goles dentro de <span style="color:#29CCB1;">Kaspersky Cup</span>, deben estar registradas
        previamente en <strong>KUDOS</strong>. Solo las ventas correctamente validadas se convertirán en goles dentro del programa.
      </div>
      <p style="margin-top:18px;font-weight:600;">
        ¡Esperamos que usted sea el jugador estrella en <span style="color:#29CCB1;">Kaspersky Cup</span>!
      </p>
    </div>
    <div class="footer">
      <img src="${images.common.logoKaspersky}" alt="Kaspersky" />
    </div>
  </div>
</body>
</html>`;

    sendSmtpEmail.textContent = `
${emailTexts.registroPasswordless.welcome[lang]} ${userName}

${emailTexts.registroPasswordless.convened[lang]} en Kaspersky Cup.

Accede con este enlace:
${magicLink}

RECUERDE:
Para que sus ventas sumen goles dentro de Kaspersky Cup, deben estar registradas previamente en KUDOS.
Solo las ventas correctamente validadas se convertirán en goles dentro del programa.
`.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Registro passwordless email enviado a', data.email);
    return true;
  } catch (error) {
    console.error('❌ Error sendRegistroPasswordlessEmail:', error);
    return false;
  }
}

// -------------------- 6. Bienvenida general al programa --------------------
export async function sendBienvenidaEmail(data: BienvenidaEmailData): Promise<boolean> {
  const lang = data.language || 'es';

  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY no configurada. Simulando sendBienvenidaEmail.');
      console.log('   To: ', data.email);
      return true;
    }

    const images = getEmailImageURLs('bienvenida', lang);
    const heroImageUrl = images.getImage('Group 59.png');
    const heroImage2xUrl = images.getImage('Group 59.png', true);
    const envImageUrl = images.getImage('Group 60.png');
    const envImage2xUrl = images.getImage('Group 60.png', true);
    const playerImageUrl = images.getImage('u8721598234_A_photorealistic_image_of_a_male_soccer_player_hold_51c9badc-b990-4ca5-a9ff-bb764d1a6e4c.png');
    const playerImage2xUrl = images.getImage('u8721598234_A_photorealistic_image_of_a_male_soccer_player_hold_51c9badc-b990-4ca5-a9ff-bb764d1a6e4c.png', true);
    const badgeUrl = images.common.badge;
    const userName = data.firstName || emailTexts.common.greeting[lang];
    const loginUrl = data.loginToken ? `${APP_URL}/login/magic?token=${data.loginToken}` : `${APP_URL}/login`;

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{
      email: data.email,
      name: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : undefined
    }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = `⚽ ${emailTexts.bienvenida.subject[lang]}`;

    sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${emailTexts.bienvenida.subject[lang]}</title>
<style>
body{margin:0;padding:0;font-family:Arial,sans-serif;background:#FFFFFF;}
.container{max-width:600px;margin:0 auto;background:#FFFFFF;}
.hero img, .section-img{width:100%;max-width:600px;height:auto;display:block;}
.content{padding:32px 24px;text-align:center;}
h1{font-size:28px;margin:0 0 4px 0;color:#1D1D1B;}
h2{font-size:24px;margin:0 0 24px 0;color:#29CCB1;}
p{font-size:14px;color:#111827;line-height:1.6;}
.hl{color:#29CCB1;font-weight:600;}
.box{margin:24px 0;background:#29CCB1;color:#fff;padding:18px;border-radius:4px;font-size:14px;text-align:left;}
.btn{display:inline-block;margin:24px 0;background:#29CCB1;color:#fff;padding:14px 40px;
     border-radius:4px;font-size:15px;font-weight:600;text-decoration:none;}
.footer{background:#1D1D1B;color:#fff;text-align:center;padding:32px 24px;}
.footer img{width:250px;height:auto;margin-bottom:16px;}
</style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <img src="${heroImageUrl}" srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x" alt="Bienvenido a Kaspersky Cup" />
    </div>
    <div class="content">
      <h1>${emailTexts.common.greeting[lang]}</h1>
      <h2>(${userName})</h2>
      <p>${emailTexts.bienvenida.welcome[lang]}</p>
      <div class="box">
        ${emailTexts.bienvenida.salesTransform[lang]}
      </div>
      <img class="section-img" src="${playerImageUrl}" srcset="${playerImageUrl} 1x, ${playerImage2xUrl} 2x"
           alt="Jugador celebrando" />
      <p style="margin-top:24px;">
        ${emailTexts.bienvenida.worldCupExperience[lang]}
      </p>
      <p style="margin-top:16px;">
        ${emailTexts.bienvenida.accessAccount[lang]}
      </p>
      <a class="btn" href="${loginUrl}">
        ${emailTexts.bienvenida.accessButton[lang]}
      </a>
      <img class="section-img" src="${envImageUrl}" srcset="${envImageUrl} 1x, ${envImage2xUrl} 2x"
           alt="Ambiente Kaspersky Cup" />
    </div>
    <div class="footer">
      <img src="${badgeUrl}" alt="Kaspersky Cup" />
      <p style="font-size:13px;margin-top:8px;">
        ${emailTexts.common.followKaspersky[lang]}
      </p>
    </div>
  </div>
</body>
</html>`;

    sendSmtpEmail.textContent = `
Kaspersky Cup - Bienvenido al programa

${emailTexts.bienvenida.welcome[lang].replace(/<[^>]+>/g, '')}

${loginUrl}
`.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Bienvenida email enviado a', data.email);
    return true;
  } catch (error) {
    console.error('❌ Error sendBienvenidaEmail:', error);
    return false;
  }
}

// -------------------- 7. Goles registrados --------------------
export async function sendGolesRegistradosEmail(data: GolesRegistradosEmailData): Promise<boolean> {
  const lang = data.language || 'es';

  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY no configurada. Simulando sendGolesRegistradosEmail.');
      console.log('   To: ', data.email);
      console.log('   Goles sumados:', data.golesSumados);
      console.log('   Total goles:', data.totalGoles);
      return true;
    }

    const images = getEmailImageURLs('goles-registrados', lang);
    const heroImageUrl = images.getImage('Group 62.png');
    const heroImage2xUrl = images.getImage('Group 62.png', true);
    const badgeUrl = images.common.badge;
    const userName = data.firstName || emailTexts.common.greeting[lang];

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: data.email, name: `${data.firstName} ${data.lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = `⚽ ${emailTexts.golesRegistrados.subject[lang]}`;

    sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${emailTexts.golesRegistrados.subject[lang]}</title>
<style>
body{margin:0;padding:0;font-family:Arial,sans-serif;background:#FFFFFF;}
.container{max-width:600px;margin:0 auto;background:#FFFFFF;}
.hero img{width:100%;max-width:600px;height:auto;display:block;}
.content{padding:32px 24px;text-align:center;}
h1{font-size:28px;margin:0 0 4px 0;color:#1D1D1B;}
h2{font-size:24px;margin:0 0 24px 0;color:#29CCB1;}
p{font-size:14px;color:#111827;line-height:1.6;}
table{width:100%;border-collapse:collapse;margin-top:20px;}
th,td{font-size:13px;padding:10px;border-bottom:1px solid #E5E7EB;text-align:left;}
th{background:#29CCB1;color:#fff;}
td:last-child{text-align:right;}
.btn{display:inline-block;margin:24px 0;background:#29CCB1;color:#fff;padding:12px 32px;
     border-radius:4px;font-size:14px;font-weight:600;text-decoration:none;}
.box{margin-top:16px;background:#F3F4F6;padding:16px;border-radius:4px;font-size:13px;text-align:left;}
.footer{background:#1D1D1B;color:#fff;text-align:center;padding:32px 24px;}
.footer img{width:250px;height:auto;margin-bottom:16px;}
</style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <img src="${heroImageUrl}" srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x"
           alt="Golazo, tu marcador sigue creciendo" />
    </div>
    <div class="content">
      <h1>${emailTexts.common.greeting[lang]}</h1>
      <h2>(${userName})</h2>
      <p>
        <strong>${emailTexts.golesRegistrados.greatNews[lang]}</strong><br />
        ${emailTexts.golesRegistrados.salesRegistered[lang]}
      </p>
      <table>
        <tr>
          <th>${emailTexts.golesRegistrados.product[lang]}</th>
          <th>${emailTexts.golesRegistrados.dealValue[lang]}</th>
          <th>${emailTexts.golesRegistrados.goalsAdded[lang]}</th>
        </tr>
        <tr>
          <td>${data.producto}</td>
          <td>${data.valorDeal} Goles</td>
          <td>${data.golesSumados} Goles</td>
        </tr>
      </table>
      <p style="margin-top:16px;">
        ${emailTexts.golesRegistrados.redeemReward[lang]}
      </p>
      <a class="btn" href="${APP_URL}">
        ${emailTexts.golesRegistrados.viewScore[lang]}
      </a>
      <div class="box">
        <strong>${emailTexts.golesRegistrados.keepGoing[lang]}</strong><br />
        ${emailTexts.golesRegistrados.worldCup2026[lang]}
      </div>
    </div>
    <div class="footer">
      <img src="${badgeUrl}" alt="Kaspersky Cup" />
    </div>
  </div>
</body>
</html>`;

    sendSmtpEmail.textContent = `
Kaspersky Cup - Goles registrados

${emailTexts.golesRegistrados.greatNews[lang]}
${emailTexts.golesRegistrados.salesRegistered[lang].replace(/<[^>]+>/g, '')}

Producto: ${data.producto}
Valor del Deal: ${data.valorDeal} Goles
Goles sumados: ${data.golesSumados} Goles
Total de goles: ${data.totalGoles} Goles

${APP_URL}
`.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Goles registrados email enviado a', data.email);
    return true;
  } catch (error) {
    console.error('❌ Error sendGolesRegistradosEmail:', error);
    return false;
  }
}

// -------------------- 8. Pendiente Aprobación Redención --------------------
export async function sendPendienteAprobacionEmail(data: PendienteAprobacionEmailData): Promise<boolean> {
  const lang = data.language || 'es';

  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY no configurada. Simulando sendPendienteAprobacionEmail.');
      console.log('   To: ', data.email);
      return true;
    }

    const images = getEmailImageURLs('pendiente-aprobacion', lang);
    const heroImageUrl = images.getImage('Group 63.png');
    const heroImage2xUrl = images.getImage('Group 63.png', true);
    const ballImageUrl = images.getImage('ball.jpg');
    const logoKasperskyUrl = images.common.logoKaspersky;
    const userName = data.firstName.toUpperCase();

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: data.email, name: `${data.firstName} ${data.lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = emailTexts.pendienteAprobacion.subject[lang];

    sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<title>${emailTexts.pendienteAprobacion.subject[lang]}</title>
<style>
body{margin:0;padding:0;font-family:Arial,sans-serif;background:#F5F5F5;}
.container{max-width:600px;margin:0 auto;background:#FFFFFF;}
.header{text-align:center;padding:24px 16px;}
.header img{width:120px;height:auto;}
.hero img{width:100%;max-width:600px;height:auto;display:block;}
.content{padding:32px 24px;text-align:center;}
h1{font-size:28px;margin:0 0 4px 0;color:#1D1D1B;}
h2{font-size:24px;margin:0 0 24px 0;color:#29CCB1;}
p{font-size:14px;color:#111827;line-height:1.6;}
.ball img{width:180px;height:auto;margin-bottom:8px;}
.ball-label{font-size:13px;font-weight:600;color:#111827;}
.box{margin:24px 0;background:#F3F4F6;padding:18px;border-radius:4px;font-size:13px;text-align:left;}
.btn{display:inline-block;margin:16px 0;background:#29CCB1;color:#fff;padding:12px 28px;
     border-radius:4px;font-size:14px;font-weight:600;text-decoration:none;}
.footer{padding:24px 16px;text-align:center;font-size:13px;color:#6B7280;}
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoKasperskyUrl}" alt="Kaspersky" />
    </div>
    <div class="hero">
      <img src="${heroImageUrl}" srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x"
           alt="Solicitud de canje en proceso" />
    </div>
    <div class="content">
      <h1>${emailTexts.common.greeting[lang]}</h1>
      <h2>(${userName})</h2>
      <p>
        ${emailTexts.pendienteAprobacion.redeemMessage[lang]}
      </p>
      <div class="ball" style="margin:24px 0;">
        <img src="${ballImageUrl}" alt="${data.nombrePremio}" />
        <div class="ball-label">
          ${data.nombrePremio} - ${data.golesCanje} Goles
        </div>
      </div>
      <div class="box">
        ${emailTexts.pendienteAprobacion.processing[lang]}
      </div>
      <a class="btn" href="${APP_URL}/rewards">${emailTexts.pendienteAprobacion.checkStatus[lang]}</a>
      <p style="margin-top:16px;">
        ${emailTexts.pendienteAprobacion.soonInTouch[lang]}<br />
        <strong>${emailTexts.pendienteAprobacion.seeYouNextMatch[lang]}</strong>
      </p>
    </div>
    <div class="footer">
      ${emailTexts.common.followKaspersky[lang]}
    </div>
  </div>
</body>
</html>`;

    sendSmtpEmail.textContent = `
${emailTexts.pendienteAprobacion.subject[lang]}

HOLA (${userName})

${emailTexts.pendienteAprobacion.redeemMessage[lang].replace(/<[^>]+>/g, '')}
Premio: ${data.nombrePremio}
Goles canjeados: ${data.golesCanje}

${emailTexts.pendienteAprobacion.processing[lang]}

${APP_URL}/rewards
`.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Pendiente aprobación email enviado a', data.email);
    return true;
  } catch (error) {
    console.error('❌ Error sendPendienteAprobacionEmail:', error);
    return false;
  }
}

// -------------------- 9. Ganador Premio Mayor --------------------
export async function sendGanadorPremioMayorEmail(data: GanadorPremioMayorEmailData): Promise<boolean> {
  const lang = data.language || 'es';

  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY no configurada. Simulando sendGanadorPremioMayorEmail.');
      console.log('   To: ', data.email);
      console.log('   Periodo: ', data.periodo);
      return true;
    }

    const images = getEmailImageURLs('ganador-premio-mayor', lang);
    const heroImageUrl = images.getImage('Group 66.jpg');
    const heroImage2xUrl = images.getImage('Group 66.jpg', true);
    const maletasImageUrl = images.getImage('Mail 07 - 02.png');
    const maletasImage2xUrl = images.getImage('Mail 07 - 02.png', true);
    const estadioImageUrl = images.getImage('Group 67.jpg');
    const estadioImage2xUrl = images.getImage('Group 67.jpg', true);
    const logoKasperskyUrl = images.common.logoKaspersky;
    const userName = data.firstName || 'Jugador';

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: data.email, name: `${data.firstName} ${data.lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup' };
    sendSmtpEmail.subject = emailTexts.ganadorPremioMayor.subject[lang];

    sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<title>${emailTexts.ganadorPremioMayor.subject[lang]}</title>
<style>
body{margin:0;padding:0;font-family:Arial,sans-serif;background:#FFFFFF;}
.container{max-width:600px;margin:0 auto;background:#FFFFFF;}
.header{text-align:center;padding:24px 16px;}
.header img{width:120px;height:auto;}
.hero img,.section-img{width:100%;max-width:600px;height:auto;display:block;}
.content{padding:32px 24px;text-align:center;}
h1{font-size:32px;margin:0 0 8px 0;color:#29CCB1;font-weight:900;}
h2{font-size:24px;margin:0 0 16px 0;color:#111827;}
p{font-size:14px;color:#111827;line-height:1.6;}
.box{margin:24px 0;background:#F3F4F6;padding:18px;border-radius:4px;font-size:13px;text-align:left;}
.row{margin-bottom:6px;}
.label{font-weight:600;}
.footer{background:#1D1D1B;color:#fff;text-align:center;padding:24px 16px;font-size:13px;}
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoKasperskyUrl}" alt="Kaspersky" />
    </div>
    <div class="hero">
      <img src="${heroImageUrl}" srcset="${heroImageUrl} 1x, ${heroImage2xUrl} 2x"
           alt="Ganador del Gran Premio" />
    </div>
    <div class="content">
      <h1>${emailTexts.ganadorPremioMayor.youWon[lang]}</h1>
      <h2>${userName.toUpperCase()}</h2>
      <p>
        Has sido el máximo goleador del periodo <strong>${data.periodo}</strong> de
        <span style="color:#29CCB1;font-weight:600;">Kaspersky Cup</span>.
      </p>
      <p style="margin-top:12px;">
        Te ganaste el <strong>${emailTexts.ganadorPremioMayor.worldCupTrip[lang]}</strong>:
        una experiencia completa para asistir a un partido de la Copa Mundial con todos los gastos pagos.
      </p>
      <img class="section-img" src="${maletasImageUrl}" srcset="${maletasImageUrl} 1x, ${maletasImage2xUrl} 2x"
           alt="Preparando el viaje" style="margin-top:20px;" />
      <div class="box">
        <div class="row">
          <span class="label">${emailTexts.ganadorPremioMayor.worldCupTrip[lang]}:</span>
          <span> ${data.lugar}</span>
        </div>
        <div class="row">
          <span class="label">Fecha del partido:</span>
          <span> ${data.fechaPartido}</span>
        </div>
        <div class="row">
          <span class="label">Hora:</span>
          <span> ${data.hora}</span>
        </div>
        <div class="row">
          <span class="label">Periodo ganado:</span>
          <span> ${data.periodo}</span>
        </div>
      </div>
      <p>
        En los próximos días nuestro equipo se pondrá en contacto contigo para coordinar vuelos, hotel,
        traslados y todos los detalles de tu experiencia mundialista.
      </p>
      <img class="section-img" src="${estadioImageUrl}" srcset="${estadioImageUrl} 1x, ${estadioImage2xUrl} 2x"
           alt="Estadio de la Copa Mundial" style="margin-top:24px;" />
    </div>
    <div class="footer">
      ${emailTexts.common.followKaspersky[lang]}<br />
      ${emailTexts.common.kasperskyCup[lang]}
    </div>
  </div>
</body>
</html>`;

    sendSmtpEmail.textContent = `
${emailTexts.ganadorPremioMayor.subject[lang]}

${emailTexts.ganadorPremioMayor.youWon[lang]} ${userName.toUpperCase()}.

Periodo: ${data.periodo}
Partido: ${data.fechaPartido} - ${data.hora}
Lugar: ${data.lugar}

Nuestro equipo se pondrá en contacto contigo para coordinar todos los detalles de tu viaje.
`.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Ganador Premio Mayor email enviado a', data.email);
    return true;
  } catch (error) {
    console.error('❌ Error sendGanadorPremioMayorEmail:', error);
    return false;
  }
}

// -------------------- 10. Respuesta a ticket de soporte --------------------
export async function sendTicketResponseEmail(data: TicketResponseEmailData): Promise<boolean> {
  const lang = data.language || 'es';

  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY no configurada. Simulando sendTicketResponseEmail.');
      console.log('   To: ', data.email);
      return true;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: data.email, name: `${data.firstName} ${data.lastName}` }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup - Soporte' };
    sendSmtpEmail.subject = emailTexts.ticketResponse.subject[lang];

    sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${emailTexts.ticketResponse.subject[lang]}</title>
<style>
body{margin:0;padding:0;font-family:Arial,sans-serif;background:#FFFFFF;}
.container{max-width:600px;margin:0 auto;background:#FFFFFF;}
.content{padding:24px 24px 32px 24px;}
h1{font-size:22px;margin:0 0 4px 0;color:#1D1D1B;}
h2{font-size:18px;margin:0 0 16px 0;color:#29CCB1;}
p{font-size:14px;color:#111827;line-height:1.6;}
.box{margin-top:16px;background:#F3F4F6;padding:16px;border-radius:4px;font-size:13px;}
.btn{display:inline-block;margin:16px 0;background:#29CCB1;color:#fff;padding:10px 24px;
     border-radius:4px;font-size:13px;font-weight:600;text-decoration:none;}
.footer{font-size:12px;color:#6B7280;padding:0 24px 24px 24px;}
</style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h1>${emailTexts.common.greeting[lang]}</h1>
      <h2>(${data.firstName.toUpperCase()})</h2>
      <p>${emailTexts.ticketResponse.responseReceived[lang]}</p>
      <p><strong>${emailTexts.ticketResponse.ticketSubject[lang]}</strong><br />${data.ticketSubject}</p>
      <div class="box">
        <strong>${emailTexts.ticketResponse.adminResponse[lang]}</strong><br /><br />
        ${data.adminResponse}
      </div>
      <a class="btn" href="${APP_URL}/support/tickets/${data.ticketId}">
        ${emailTexts.ticketResponse.viewTicket[lang]}
      </a>
      <p class="footer">
        ${emailTexts.ticketResponse.thankYou[lang]}<br />
        ${emailTexts.ticketResponse.hereToHelp[lang].replace(/<[^>]+>/g, '')}
      </p>
    </div>
  </div>
</body>
</html>`;

    sendSmtpEmail.textContent = `
${emailTexts.ticketResponse.responseReceived[lang]}

${emailTexts.ticketResponse.ticketSubject[lang]} ${data.ticketSubject}

${emailTexts.ticketResponse.adminResponse[lang]}
${data.adminResponse}

${APP_URL}/support/tickets/${data.ticketId}
`.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Ticket response email enviado a', data.email);
    return true;
  } catch (error) {
    console.error('❌ Error sendTicketResponseEmail:', error);
    return false;
  }
}

// -------------------- 11. Wrapper para redención aprobada --------------------
// Esto es SOLO para satisfacer el import { sendRedemptionApprovedEmail } en routes.ts.
// De momento reutiliza el mismo template de "pendiente de aprobación".
export async function sendRedemptionApprovedEmail(data: any): Promise<boolean> {
  try {
    console.log('ℹ️ Enviando email de redención APROBADA (usa mismo template que pendiente por ahora)');
    return await sendPendienteAprobacionEmail(data as PendienteAprobacionEmailData);
  } catch (error) {
    console.error('❌ Error sendRedemptionApprovedEmail:', error);
    return false;
  }
}
// -------------------- 12. Notificación a admin: solicitud de canje --------------------
export async function sendRedemptionRequestToAdmin(data: any): Promise<boolean> {
  const adminEmail =
    process.env.REDEMPTION_ADMIN_EMAIL ||
    process.env.FROM_EMAIL ||
    'noreply@loyaltyprogram.com';

  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY no configurada. Simulando sendRedemptionRequestToAdmin.');
      console.log('   Admin:', adminEmail);
      console.log('   Payload:', JSON.stringify(data, null, 2));
      return true;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: adminEmail }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup - Sistema' };
    sendSmtpEmail.subject = 'Nueva solicitud de canje - Kaspersky Cup';

    sendSmtpEmail.textContent = `
Se ha generado una nueva solicitud de canje.

Datos de la solicitud (JSON):
${JSON.stringify(data, null, 2)}
`.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Redemption request email enviado a admin', adminEmail);
    return true;
  } catch (error) {
    console.error('❌ Error sendRedemptionRequestToAdmin:', error);
    return false;
  }
}
// -------------------- 13. Notificación a admin: nuevo ticket de soporte --------------------
export async function sendSupportTicketToAdmin(data: any): Promise<boolean> {
  const adminEmail =
    process.env.SUPPORT_ADMIN_EMAIL ||
    process.env.REDEMPTION_ADMIN_EMAIL ||
    process.env.FROM_EMAIL ||
    'noreply@loyaltyprogram.com';

  const lang: EmailLanguage = (data.language as EmailLanguage) || 'es';

  try {
    if (!BREVO_API_KEY) {
      console.warn('⚠️ BREVO_API_KEY no configurada. Simulando sendSupportTicketToAdmin.');
      console.log('   Admin:', adminEmail);
      console.log('   Payload:', JSON.stringify(data, null, 2));
      return true;
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: adminEmail }];
    sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Kaspersky Cup - Soporte (Sistema)' };
    sendSmtpEmail.subject = 'Nuevo ticket de soporte - Kaspersky Cup';

    const userName = [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Usuario';

    const plainText = `
Se ha creado un nuevo ticket de soporte en Kaspersky Cup.

Usuario: ${userName}
Email: ${data.email || 'N/D'}

Asunto del ticket:
${data.ticketSubject || 'N/D'}

Mensaje:
${data.message || data.description || 'N/D'}

ID del ticket: ${data.ticketId || 'N/D'}

Payload completo (JSON):
${JSON.stringify(data, null, 2)}
`.trim();

    sendSmtpEmail.textContent = plainText;
    sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Nuevo ticket de soporte - Kaspersky Cup</title>
<style>
body{margin:0;padding:16px;font-family:Arial,sans-serif;background:#FFFFFF;color:#111827;font-size:14px;}
h1{font-size:18px;margin-bottom:12px;color:#111827;}
p{margin:4px 0;line-height:1.5;}
pre{background:#F3F4F6;padding:12px;border-radius:4px;font-size:12px;white-space:pre-wrap;word-break:break-word;}
.label{font-weight:600;}
</style>
</head>
<body>
  <h1>Nuevo ticket de soporte - Kaspersky Cup</h1>
  <p><span class="label">Usuario:</span> ${userName}</p>
  <p><span class="label">Email:</span> ${data.email || 'N/D'}</p>
  <p><span class="label">Asunto del ticket:</span><br/>${data.ticketSubject || 'N/D'}</p>
  <p><span class="label">Mensaje:</span><br/>${(data.message || data.description || 'N/D')}</p>
  <p><span class="label">ID del ticket:</span> ${data.ticketId || 'N/D'}</p>
  <p class="label" style="margin-top:12px;">Payload completo (JSON):</p>
  <pre>${JSON.stringify(data, null, 2)}</pre>
</body>
</html>`.trim();

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Support ticket email enviado a admin', adminEmail);
    return true;
  } catch (error) {
    console.error('❌ Error sendSupportTicketToAdmin:', error);
    return false;
  }
}
