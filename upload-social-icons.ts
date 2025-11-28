/**
 * Script para subir íconos de redes sociales a Cloudinary
 * Estos íconos se usan en todos los emails, no son específicos de una campaña
 * 
 * Uso: npm run upload:social-icons
 */

import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function uploadSocialIcons() {
  console.log('📤 Subiendo íconos de redes sociales a Cloudinary...\n');

  // Verificar configuración
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Error: Configuración de Cloudinary no encontrada');
    process.exit(1);
  }

  // Buscar todos los archivos PNG en la carpeta de íconos sociales
  const socialIconsDir = path.resolve(__dirname, 'client/public/email-assets/social-icons');
  
  if (!fs.existsSync(socialIconsDir)) {
    console.error(`❌ Error: No se encontró la carpeta ${socialIconsDir}`);
    console.log('\n💡 Asegúrate de que los íconos estén en:');
    console.log('   client/public/email-assets/social-icons/');
    process.exit(1);
  }

  const files = fs.readdirSync(socialIconsDir);
  const iconFiles = files.filter(f => 
    (f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.svg')) && !f.startsWith('.')
  );

  if (iconFiles.length === 0) {
    console.error('❌ Error: No se encontraron archivos PNG/SVG en la carpeta de íconos');
    process.exit(1);
  }

  console.log(`📁 Encontrados ${iconFiles.length} íconos:\n`);
  iconFiles.forEach(f => console.log(`   - ${f}`));
  console.log('');

  const uploadedUrls: { [key: string]: string } = {};
  let successCount = 0;
  let errorCount = 0;

  for (const iconFile of iconFiles) {
    const fullPath = path.join(socialIconsDir, iconFile);
    const fileExt = path.extname(iconFile);
    const iconName = path.basename(iconFile, fileExt);
    
    try {
      console.log(`📤 Subiendo: ${iconFile}...`);
      
      const result = await cloudinary.uploader.upload(fullPath, {
        folder: 'loyalty-program/emails/common/social-icons',
        public_id: iconName,
        overwrite: true,
        resource_type: 'image',
        quality: 'auto:good',
        fetch_format: 'auto',
      });

      uploadedUrls[iconName] = result.secure_url;
      console.log(`   ✅ Subida exitosa!`);
      console.log(`   🔗 URL: ${result.secure_url}`);
      console.log(`   📏 Tamaño: ${Math.round(result.bytes / 1024)} KB\n`);
      successCount++;
      
    } catch (error: any) {
      console.error(`   ❌ Error subiendo ${iconFile}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Resumen de carga:');
  console.log('='.repeat(60));
  console.log(`✅ Exitosas: ${successCount}`);
  console.log(`❌ Fallidas: ${errorCount}`);
  console.log('');

  if (successCount > 0) {
    console.log('🔗 URLs de los íconos subidos:');
    console.log('');
    Object.entries(uploadedUrls).forEach(([key, url]) => {
      console.log(`${key}:`);
      console.log(`  ${url}`);
      console.log('');
    });

    // Guardar URLs en archivo
    const urlsFile = path.resolve(__dirname, 'social-icons-urls.json');
    fs.writeFileSync(urlsFile, JSON.stringify(uploadedUrls, null, 2));
    console.log(`💾 URLs guardadas en: social-icons-urls.json`);
    console.log('');
    console.log('🔧 Próximo paso:');
    console.log('   Actualiza server/email.ts con estas URLs en la sección de redes sociales');
  }

  if (successCount === 0) {
    console.error('\n❌ No se pudo subir ningún ícono');
    process.exit(1);
  }
}

// Ejecutar
uploadSocialIcons()
  .then(() => {
    console.log('\n✨ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
