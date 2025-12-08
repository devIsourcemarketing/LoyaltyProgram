/**
 * Script para subir la nueva imagen Group_65_2 a Cloudinary
 * y reemplazar la imagen actual en português
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configurar Cloudinary
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

async function uploadImage() {
  try {
    // Ruta de la imagen a subir
    const imagePath = 'C:\\Users\\User\\Downloads\\Group_65_2.png';
    
    console.log('📂 Verificando archivo:', imagePath);
    
    if (!fs.existsSync(imagePath)) {
      console.error('❌ Error: El archivo no existe en:', imagePath);
      console.log('');
      console.log('💡 Por favor verifica que:');
      console.log('   1. El archivo existe en C:\\Users\\User\\Downloads\\');
      console.log('   2. El nombre completo es exactamente: Group_65_2.png');
      console.log('   3. Incluye la extensión .png');
      return;
    }
    
    console.log('✅ Archivo encontrado');
    console.log('📦 Tamaño:', (fs.statSync(imagePath).size / 1024).toFixed(2), 'KB');
    console.log('');
    
    // Primero eliminar la imagen antigua en português
    const publicIdToDelete = 'loyalty-program/emails/registro-passwordless/português/Group 65';
    console.log('🗑️  Eliminando imagen antigua:', publicIdToDelete);
    
    try {
      const deleteResult = await cloudinary.uploader.destroy(publicIdToDelete, {
        resource_type: 'image',
        invalidate: true
      });
      console.log('   Resultado:', deleteResult.result);
    } catch (error) {
      console.log('   ⚠️  No se pudo eliminar (puede que no exista):', error.message);
    }
    
    console.log('');
    console.log('📤 Subiendo nueva imagen...');
    
    // Subir la nueva imagen
    const uploadResult = await cloudinary.uploader.upload(imagePath, {
      folder: 'loyalty-program/emails/registro-passwordless/português',
      public_id: 'Group 65',
      overwrite: true,
      invalidate: true, // Invalida el cache del CDN
      resource_type: 'image'
    });
    
    console.log('');
    console.log('✅ IMAGEN SUBIDA EXITOSAMENTE!');
    console.log('');
    console.log('📋 Detalles:');
    console.log('   Public ID:', uploadResult.public_id);
    console.log('   URL:', uploadResult.secure_url);
    console.log('   Formato:', uploadResult.format);
    console.log('   Tamaño:', uploadResult.width, 'x', uploadResult.height);
    console.log('   Versión:', uploadResult.version);
    console.log('');
    console.log('🔗 URL final:');
    console.log(`   https://res.cloudinary.com/dk3ow5puw/image/upload/v${uploadResult.version}/loyalty-program/emails/registro-passwordless/português/Group%2065.png`);
    console.log('');
    console.log('✅ Ahora actualiza el código en server/email.ts con esta versión:', uploadResult.version);
    
    return uploadResult;
  } catch (error) {
    console.error('❌ Error al subir imagen:', error.message);
    if (error.error) {
      console.error('   Detalles:', error.error);
    }
  }
}

uploadImage();
