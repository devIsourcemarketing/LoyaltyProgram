/**
 * Script dinámico para subir imágenes de emails a Cloudinary (servidores en Europa)
 * 
 * Uso:
 * npm run upload:email-images -- --folder=expectativa --path=client/public/email-assets/email-expectativa
 * npm run upload:email-images -- --folder=bienvenida --path=client/public/email-assets/email-bienvenida
 * npm run upload:email-images -- --folder=common/social-icons --path=client/public/email-assets/social-icons
 * 
 * Parámetros:
 * --folder: Carpeta en Cloudinary (ej: expectativa, bienvenida, common/social-icons)
 * --path: Ruta local de las imágenes
 * --prefix: Prefijo opcional para los publicIds
 */

import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para obtener argumentos de línea de comandos
function getArg(name: string, defaultValue?: string): string {
  const arg = process.argv.find(arg => arg.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue || '';
}

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  // Usar servidores de Europa
  secure: true,
});

async function uploadEmailImages() {
  // Obtener parámetros
  const folderArg = getArg('folder', 'expectativa');
  const pathArg = getArg('path', 'client/public/email-assets/email-expectativa');
  const prefix = getArg('prefix', '');

  console.log('📤 Subiendo imágenes a Cloudinary (Europa)...\n');

  // Verificar configuración
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Error: Configuración de Cloudinary no encontrada');
    console.log('\n📋 Pasos para configurar:');
    console.log('1. Crea una cuenta gratuita en: https://cloudinary.com/users/register/free');
    console.log('2. Ve a Dashboard > Settings');
    console.log('3. Copia tus credenciales y agrégalas a .env:');
    console.log('   CLOUDINARY_CLOUD_NAME=tu_cloud_name');
    console.log('   CLOUDINARY_API_KEY=tu_api_key');
    console.log('   CLOUDINARY_API_SECRET=tu_api_secret');
    console.log('\n💡 Cloudinary ofrece:');
    console.log('   ✅ 25 GB de almacenamiento gratis');
    console.log('   ✅ Servidores en Europa');
    console.log('   ✅ CDN global');
    console.log('   ✅ URLs permanentes');
    process.exit(1);
  }

  const localPath = path.resolve(__dirname, pathArg);
  const cloudinaryFolder = `loyalty-program/emails/${folderArg}`;

  if (!fs.existsSync(localPath)) {
    console.error(`❌ Error: No se encontró la ruta: ${localPath}`);
    console.log('\n📝 Uso:');
    console.log('   npm run upload:email-images -- --folder=CARPETA --path=RUTA');
    console.log('\n📋 Ejemplos:');
    console.log('   npm run upload:email-images -- --folder=expectativa --path=client/public/email-assets/email-expectativa');
    console.log('   npm run upload:email-images -- --folder=bienvenida --path=client/public/email-assets/email-bienvenida');
    process.exit(1);
  }

  // Obtener todos los archivos de imagen
  const files = fs.readdirSync(localPath);
  const imageFiles = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.svg', '.gif'].includes(ext) && !f.startsWith('.');
  });

  if (imageFiles.length === 0) {
    console.error('❌ Error: No se encontraron imágenes en la carpeta');
    process.exit(1);
  }

  console.log(`📁 Carpeta local: ${pathArg}`);
  console.log(`☁️  Carpeta Cloudinary: ${cloudinaryFolder}`);
  console.log(`📸 Encontradas ${imageFiles.length} imágenes:\n`);
  imageFiles.forEach(f => console.log(`   - ${f}`));
  console.log('');

  const uploadedUrls: { [key: string]: string } = {};
  let successCount = 0;
  let errorCount = 0;

  for (const imageFile of imageFiles) {
    const fullPath = path.join(localPath, imageFile);
    const fileExt = path.extname(imageFile);
    const baseName = path.basename(imageFile, fileExt);
    const publicId = prefix ? `${prefix}-${baseName}` : baseName;
    
    try {
      console.log(`📤 Subiendo: ${imageFile}...`);
      
      const result = await cloudinary.uploader.upload(fullPath, {
        folder: cloudinaryFolder,
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
        // Optimizar para emails
        quality: 'auto:good',
        fetch_format: 'auto',
      });

      uploadedUrls[publicId] = result.secure_url;
      console.log(`   ✅ Subida exitosa!`);
      console.log(`   🔗 URL: ${result.secure_url}`);
      console.log(`   📏 Tamaño: ${Math.round(result.bytes / 1024)} KB\n`);
      successCount++;
      
    } catch (error: any) {
      console.error(`   ❌ Error subiendo ${imageFile}:`, error.message);
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
    console.log('🔗 URLs de las imágenes subidas:');
    console.log('');
    Object.entries(uploadedUrls).forEach(([key, url]) => {
      console.log(`${key}:`);
      console.log(`  ${url}`);
      console.log('');
    });

    // Crear archivo con las URLs para fácil acceso
    const sanitizedFolder = folderArg.replace(/\//g, '-');
    const urlsFile = path.resolve(__dirname, `uploaded-${sanitizedFolder}-urls.json`);
    fs.writeFileSync(urlsFile, JSON.stringify(uploadedUrls, null, 2));
    console.log(`💾 URLs guardadas en: uploaded-${sanitizedFolder}-urls.json`);
    console.log('');
    console.log('🔧 Próximo paso:');
    console.log('   Actualiza server/email.ts con estas URLs');
  }

  if (successCount === 0) {
    console.error('\n❌ No se pudo subir ninguna imagen');
    process.exit(1);
  }
}

// Ejecutar
uploadEmailImages()
  .then(() => {
    console.log('\n✨ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
