/**
 * Script de prueba para enviar el Email de Expectativa
 * 
 * Uso:
 * 1. Asegúrate de tener configurado BREVO_API_KEY en .env
 * 2. Ejecuta: npm run test-email-expectation
 * 
 * El script enviará un email de prueba a la dirección configurada
 */

import { sendExpectationEmail } from './server/email';

async function testExpectationEmail() {
  console.log('🧪 Iniciando prueba del Email de Expectativa...\n');

  // Configura aquí tu email de prueba
  const testEmail = {
    email: 'alejandrosoftware.engineering@gmail.com', // ⚠️ CAMBIA ESTO a tu email real
    firstName: 'Juan',
    lastName: 'Pérez'
  };

  console.log('📧 Enviando email a:', testEmail.email);
  console.log('👤 Nombre:', `${testEmail.firstName} ${testEmail.lastName}`);
  console.log('');

  try {
    const result = await sendExpectationEmail(testEmail);

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
      console.log('');
      console.log('💡 Solución:');
      console.log('   - Revisa los logs del servidor arriba');
      console.log('   - Verifica las variables de entorno');
    }
  } catch (error) {
    console.error('💥 Error ejecutando prueba:', error);
  }
}

// Ejecutar prueba
testExpectationEmail()
  .then(() => {
    console.log('\n✨ Prueba completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
