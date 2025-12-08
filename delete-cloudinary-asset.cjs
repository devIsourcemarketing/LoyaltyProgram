/**
 * Script para eliminar una imagen de Cloudinary usando la API
 * Usa este script cuando necesites eliminar un asset que ya existe pero no se ve en el UI
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary con tus credenciales del .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dk3ow5puw',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('🔧 Cloudinary configurado:');
console.log('   Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || 'dk3ow5puw');
console.log('   API Key:', process.env.CLOUDINARY_API_KEY ? '✓ Configurada' : '✗ NO CONFIGURADA');
console.log('   API Secret:', process.env.CLOUDINARY_API_SECRET ? '✓ Configurada' : '✗ NO CONFIGURADA');
console.log('');

async function deleteCloudinaryAsset(publicId) {
  try {
    console.log(`🗑️  Intentando eliminar asset: ${publicId}\n`);
    
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true // Esto fuerza invalidación del CDN cache
    });
    
    console.log('✅ Resultado:', result);
    
    if (result.result === 'ok') {
      console.log('\n✅ Asset eliminado exitosamente');
      console.log('💡 El cache del CDN puede tardar unos minutos en actualizarse');
    } else if (result.result === 'not found') {
      console.log('\n⚠️  El asset no existe o ya fue eliminado');
    } else {
      console.log('\n❌ Error al eliminar:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function listAssetsInFolder(folderPath) {
  try {
    console.log(`📂 Listando assets en: ${folderPath}\n`);
    
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPath,
      max_results: 100
    });
    
    console.log(`✅ Encontrados ${result.resources.length} assets:\n`);
    
    result.resources.forEach((resource, index) => {
      console.log(`${index + 1}. Public ID: ${resource.public_id}`);
      console.log(`   URL: ${resource.secure_url}`);
      console.log(`   Creado: ${resource.created_at}`);
      console.log('');
    });
    
    return result.resources;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// EJEMPLOS DE USO:

async function main() {
  console.log('🔧 HERRAMIENTAS DE CLOUDINARY\n');
  console.log('='.repeat(80));
  
  // OPCIÓN 1: Listar todos los assets en una carpeta
  console.log('\n📋 OPCIÓN 1: Listar assets en carpeta de registro-passwordless\n');
  try {
    await listAssetsInFolder('loyalty-program/emails/registro-passwordless');
  } catch (error) {
    console.log('⚠️  Error al listar carpeta registro-passwordless');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📋 OPCIÓN 2: Listar assets en carpeta de bienvenida\n');
  try {
    await listAssetsInFolder('loyalty-program/emails/bienvenida');
  } catch (error) {
    console.log('⚠️  Error al listar carpeta bienvenida');
  }
  
  console.log('\n' + '='.repeat(80));
  
  // OPCIÓN 2: Eliminar un asset específico
  // Descomenta esta línea para eliminar el asset que está causando el conflicto
  // await deleteCloudinaryAsset('loyalty-program/emails/registro-passwordless/português/Group 65');
  
  // O elimina el que está en la ubicación incorrecta:
  // await deleteCloudinaryAsset('loyalty-program/emails/bienvenida/Group_65_2x_w5vsys');
}

main().catch(console.error);
