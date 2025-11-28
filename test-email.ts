/**
 * Script de prueba dinámico para enviar emails de diferentes tipos
 * 
 * Uso:
 * npm run test:email -- --type=expectativa --email=tu@email.com
 * npm run test:email -- --type=registro-exitoso --email=tu@email.com --firstName=Juan --lastName=Pérez
 * npm run test:email -- --type=bienvenida --email=tu@email.com --firstName=Juan --lastName=Pérez
 * npm run test:email -- --type=magic-link --email=tu@email.com --firstName=Juan --lastName=Pérez
 * npm run test:email -- --type=goles-registrados --email=tu@email.com --firstName=Juan --lastName=Pérez
 * npm run test:email -- --type=pendiente-aprobacion --email=tu@email.com --firstName=Juan --lastName=Pérez
 * npm run test:email -- --type=ganador-premio-mayor --email=tu@email.com --firstName=Juan --lastName=Pérez
 * 
 * Parámetros:
 * --type: Tipo de email (expectativa, registro-exitoso, bienvenida, magic-link, goles-registrados, pendiente-aprobacion, ganador-premio-mayor)
 * --email: Email del destinatario
 * --firstName: Nombre (opcional, default: "Usuario")
 * --lastName: Apellido (opcional, default: "Prueba")
 */

import { sendExpectationEmail, sendRegistroExitosoEmail, sendBienvenidaEmail, sendMagicLinkEmail, sendGolesRegistradosEmail, sendPendienteAprobacionEmail, sendGanadorPremioMayorEmail } from './server/email';

// Función para obtener argumentos de línea de comandos
function getArg(name: string, defaultValue?: string): string {
  const arg = process.argv.find(arg => arg.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue || '';
}

async function testEmail() {
  const emailType = getArg('type', 'expectativa');
  const email = getArg('email', 'alejandrosoftware.engineering@gmail.com');
  const firstName = getArg('firstName', 'Usuario');
  const lastName = getArg('lastName', 'Prueba');

  console.log('🧪 Iniciando prueba de Email...\n');
  console.log('📋 Configuración:');
  console.log(`   Tipo: ${emailType}`);
  console.log(`   Email: ${email}`);
  console.log(`   Nombre: ${firstName} ${lastName}`);
  console.log('');

  try {
    let result = false;

    switch (emailType.toLowerCase()) {
      case 'expectativa':
        console.log('📤 Enviando Email de Expectativa...\n');
        result = await sendExpectationEmail({ email, firstName, lastName });
        break;
      
      case 'registro-exitoso':
        console.log('📤 Enviando Email de Registro Exitoso...\n');
        // Generate a test invite token
        const testToken = 'test_' + Date.now().toString(36);
        result = await sendRegistroExitosoEmail({ 
          email, 
          firstName, 
          lastName,
          inviteToken: testToken
        });
        break;
      
      case 'bienvenida':
        console.log('📤 Enviando Email de Bienvenida...\n');
        result = await sendBienvenidaEmail({ email, firstName, lastName });
        break;
      
      case 'magic-link':
        console.log('📤 Enviando Email de Magic Link...\n');
        // Generate a test login token
        const testLoginToken = 'test_magic_' + Date.now().toString(36);
        result = await sendMagicLinkEmail({ 
          email, 
          firstName, 
          lastName,
          loginToken: testLoginToken
        });
        break;
      
      case 'goles-registrados':
        console.log('📤 Enviando Email de Goles Registrados...\n');
        result = await sendGolesRegistradosEmail({ 
          email, 
          firstName, 
          lastName,
          producto: 'Lorem Ipsum',
          valorDeal: 10,
          golesSumados: 35,
          totalGoles: 135
        });
        break;
      
      case 'ganador-premio-mayor':
        console.log('📤 Enviando Email de Ganador Premio Mayor...\n');
        result = await sendGanadorPremioMayorEmail({ 
          email, 
          firstName, 
          lastName,
          periodo: 'Enero - Marzo 2026',
          fechaPartido: '15 de Junio de 2026',
          hora: '18:00 hrs',
          lugar: 'Estadio Azteca, Ciudad de México'
        });
        break;
      
      case 'pendiente-aprobacion':
        console.log('📤 Enviando Email de Pendiente Aprobación...\n');
        result = await sendPendienteAprobacionEmail({ 
          email, 
          firstName, 
          lastName,
          nombrePremio: 'Balón Oficial Kaspersky Cup',
          golesCanje: 100
        });
        break;
      
      // Aquí puedes agregar más tipos de email
      // case 'otro-tipo':
      //   result = await sendOtroEmail({ email, firstName, lastName });
      //   break;
      
      default:
        console.error(`❌ Tipo de email desconocido: ${emailType}`);
        console.log('\n📋 Tipos disponibles:');
        console.log('   - expectativa');
        console.log('   - registro-exitoso');
        console.log('   - bienvenida');
        console.log('   - magic-link');
        console.log('   - goles-registrados');
        console.log('   - pendiente-aprobacion');
        console.log('   - ganador-premio-mayor');
        process.exit(1);
    }

    if (result) {
      console.log('✅ Email enviado exitosamente!');
      console.log('📬 Revisa tu bandeja de entrada');
      console.log('');
      console.log('💡 Tip: Si no ves el email:');
      console.log('   - Revisa la carpeta de spam');
      console.log('   - Espera unos minutos (puede tardar)');
      console.log('   - Verifica que BREVO_API_KEY esté configurado');
    } else {
      console.error('❌ Error al enviar el email');
      console.log('');
      console.log('🔍 Posibles causas:');
      console.log('   - BREVO_API_KEY no configurado o inválido');
      console.log('   - Email inválido');
      console.log('   - Problemas de conectividad');
    }
  } catch (error) {
    console.error('💥 Error ejecutando prueba:', error);
    process.exit(1);
  }
}

// Ejecutar prueba
testEmail()
  .then(() => {
    console.log('\n✨ Prueba completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
