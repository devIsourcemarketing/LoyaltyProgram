/**
 * Script de prueba dinámico para enviar emails de diferentes tipos
 * 
 * Uso:
 * npm run test:email -- --type=expectativa --email=tu@email.com
 * npm run test:email -- --type=expectativa --email=tu@email.com --firstName=Juan --lastName=Pérez
 * 
 * Parámetros:
 * --type: Tipo de email (expectativa, bienvenida, etc.)
 * --email: Email del destinatario
 * --firstName: Nombre (opcional, default: "Usuario")
 * --lastName: Apellido (opcional, default: "Prueba")
 */

import { sendExpectationEmail } from './server/email';

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
      
      // Aquí puedes agregar más tipos de email
      // case 'bienvenida':
      //   result = await sendWelcomeEmail({ email, firstName, lastName });
      //   break;
      
      default:
        console.error(`❌ Tipo de email desconocido: ${emailType}`);
        console.log('\n📋 Tipos disponibles:');
        console.log('   - expectativa');
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
