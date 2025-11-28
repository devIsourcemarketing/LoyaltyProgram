/**
 * Script de prueba para el registro sin contraseña (passwordless)
 * 
 * Este script simula el flujo completo de registro sin contraseña:
 * 1. Usuario intenta hacer login con email que no existe
 * 2. Sistema le dice que debe registrarse
 * 3. Usuario completa registro sin contraseña
 * 4. Sistema envía email de bienvenida con magic link
 * 5. Usuario hace clic en magic link y accede
 * 
 * Uso:
 *   npm run test:passwordless-register -- --email=test@example.com --firstName=John --lastName=Doe
 */

import minimist from 'minimist';

const args = minimist(process.argv.slice(2));

const email = args.email || 'test@example.com';
const firstName = args.firstName || 'Test';
const lastName = args.lastName || 'User';
const country = args.country || 'Colombia';
const region = args.region || 'SOLA';
const category = args.category || 'ENTERPRISE';
const subcategory = args.subcategory || null;

const API_URL = 'http://localhost:5000';

async function testPasswordlessRegister() {
  console.log('\n🧪 Iniciando prueba de registro sin contraseña...\n');
  console.log('📧 Email:', email);
  console.log('👤 Nombre:', firstName, lastName);
  console.log('🌎 País:', country);
  console.log('📍 Región:', region);
  console.log('🏢 Categoría:', category);
  console.log('📊 Subcategoría:', subcategory || 'N/A');
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // Paso 1: Intentar solicitar magic link (debería fallar si no existe)
    console.log('📝 PASO 1: Intentando solicitar magic link...');
    const magicLinkResponse = await fetch(`${API_URL}/api/auth/request-magic-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const magicLinkData = await magicLinkResponse.json();
    console.log('📬 Respuesta:', magicLinkData);

    if (magicLinkData.userExists === false) {
      console.log('✅ Usuario no existe - procediendo con registro\n');
      
      // Paso 2: Registrar usuario sin contraseña
      console.log('📝 PASO 2: Registrando usuario sin contraseña...');
      const registerResponse = await fetch(`${API_URL}/api/auth/register-passwordless`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          country,
          region,
          category,
          subcategory,
        }),
      });

      const registerData = await registerResponse.json();
      console.log('📬 Respuesta:', registerData);

      if (registerResponse.ok) {
        console.log('✅ Registro exitoso!');
        console.log('📧 Se envió email de bienvenida con magic link');
        console.log('⏳ El usuario debe esperar aprobación de un administrador');
        console.log('\n💡 Nota: Revisa el email para obtener el enlace de acceso');
      } else {
        console.error('❌ Error en el registro:', registerData);
      }
    } else if (magicLinkData.needsApproval) {
      console.log('⏳ Usuario existe pero está pendiente de aprobación');
    } else {
      console.log('✅ Usuario existe y está aprobado - se envió magic link');
    }

    console.log('\n' + '='.repeat(60) + '\n');
    console.log('✅ Prueba completada!\n');
  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error);
    process.exit(1);
  }
}

testPasswordlessRegister();
