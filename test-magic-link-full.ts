/**
 * Script de prueba completo para magic link
 * Este script simula el flujo completo:
 * 1. Genera un token
 * 2. Lo guarda en la base de datos
 * 3. Envía el email
 * 
 * Uso:
 * npm run test:magic-link -- --email=tu@email.com
 */

import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';
import { sendMagicLinkEmail } from './server/email';
import { nanoid } from 'nanoid';

// Función para obtener argumentos de línea de comandos
function getArg(name: string, defaultValue?: string): string {
  const arg = process.argv.find(arg => arg.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue || '';
}

async function testMagicLinkFull() {
  const email = getArg('email', 'alejandrosoftware.engineering@gmail.com');

  console.log('🧪 Prueba completa de Magic Link\n');
  console.log(`📧 Email: ${email}\n`);

  try {
    // 1. Buscar usuario
    console.log('🔍 Buscando usuario en la base de datos...');
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      console.error(`❌ Usuario no encontrado con email: ${email}`);
      console.log('\n💡 Asegúrate de que el usuario existe en la base de datos.');
      console.log('   Puedes crear uno desde la aplicación o verificar el email.');
      process.exit(1);
    }

    console.log(`✅ Usuario encontrado: ${user.firstName} ${user.lastName}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Aprobado: ${user.isApproved ? 'Sí' : 'No'}`);
    console.log('');

    if (!user.isApproved) {
      console.warn('⚠️  Usuario no aprobado. El magic link funcionará pero el usuario debe estar aprobado para acceder.');
      console.log('');
    }

    // 2. Generar token
    console.log('🔐 Generando token de acceso...');
    const loginToken = nanoid(32);
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 15);

    console.log(`   Token: ${loginToken}`);
    console.log(`   Expira: ${expiryDate.toLocaleString('es-ES')}`);
    console.log('');

    // 3. Guardar token en base de datos
    console.log('💾 Guardando token en la base de datos...');
    await db
      .update(users)
      .set({
        loginToken,
        loginTokenExpiry: expiryDate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    console.log('✅ Token guardado exitosamente');
    console.log('');

    // 4. Enviar email
    console.log('📤 Enviando email con magic link...');
    const emailSent = await sendMagicLinkEmail({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      loginToken,
    });

    if (emailSent) {
      console.log('✅ Email enviado exitosamente!');
      console.log('');
      console.log('📬 Revisa tu bandeja de entrada');
      console.log('');
      console.log('🔗 El enlace es:');
      console.log(`   ${process.env.APP_URL || 'http://localhost:5000'}/login/magic?token=${loginToken}`);
      console.log('');
      console.log('⏰ Este enlace expirará en 15 minutos');
      console.log('🔒 Solo puede usarse una vez');
      console.log('');
      console.log('💡 Tips:');
      console.log('   - Si no ves el email, revisa spam');
      console.log('   - Haz clic en el botón "Acceder ahora" del email');
      console.log('   - También puedes copiar el enlace de arriba y pegarlo en el navegador');
    } else {
      console.error('❌ Error al enviar el email');
      console.log('');
      console.log('🔍 Posibles causas:');
      console.log('   - BREVO_API_KEY no configurado');
      console.log('   - Problemas de conectividad');
      console.log('');
      console.log('🔗 Pero el token fue guardado, puedes usar este enlace:');
      console.log(`   ${process.env.APP_URL || 'http://localhost:5000'}/login/magic?token=${loginToken}`);
    }

  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

// Ejecutar prueba
testMagicLinkFull()
  .then(() => {
    console.log('\n✨ Prueba completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
