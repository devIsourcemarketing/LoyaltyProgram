/**
 * Script para renombrar/mover imágenes en Cloudinary agregando carpetas de idioma
 * Esto actualiza los Public IDs para incluir español/português en la ruta
 */

import https from 'https';

// Configuración de Cloudinary
const CLOUD_NAME = 'dk3ow5puw';
const API_KEY = '399687439867946';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || 'TU_API_SECRET_AQUI';

// Tipos de email a procesar
const emailTypes = [
  'magic-link',
  'bienvenida',
  'goles-registrados',
  'pendiente-aprobacion',
  'aprobacion-premio',
  'expectativa',
  'registro-exitoso',
  'registro-passwordless',
  'ganador-premio-mayor'
];

// Función para hacer request a Cloudinary API
function cloudinaryRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
    
    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUD_NAME}${path}`,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Listar imágenes en una carpeta
async function listImages(prefix) {
  const response = await cloudinaryRequest(
    `/resources/image?type=upload&prefix=${encodeURIComponent(prefix)}&max_results=500`
  );
  
  if (response.resources) {
    return response.resources;
  } else {
    console.error('❌ Error listando:', response);
    return [];
  }
}

// Copiar una imagen con nuevo Public ID usando la Upload API
async function copyImageToNewPath(sourcePublicId, targetPublicId) {
  console.log(`   📋 Copiando: ${sourcePublicId}`);
  console.log(`      → ${targetPublicId}`);
  
  // Construir la URL del recurso original
  const sourceUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${sourcePublicId}`;
  
  // Usar la Upload API para crear una copia con nuevo Public ID
  const timestamp = Math.round(Date.now() / 1000);
  const crypto = await import('crypto');
  const signature = crypto.createHash('sha1')
    .update(`public_id=${targetPublicId}&timestamp=${timestamp}${API_SECRET}`)
    .digest('hex');
  
  return new Promise((resolve, reject) => {
    const formData = `public_id=${encodeURIComponent(targetPublicId)}&timestamp=${timestamp}&api_key=${API_KEY}&signature=${signature}&file=${encodeURIComponent(sourceUrl)}`;
    
    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUD_NAME}/image/upload`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(formData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.public_id) {
            console.log(`      ✅ Copiado exitosamente\n`);
            resolve(true);
          } else {
            console.error(`      ❌ Error:`, response.error?.message || response);
            resolve(false);
          }
        } catch (e) {
          console.error(`      ❌ Error parseando respuesta:`, e.message);
          resolve(false);
        }
      });
    });
    
    req.on('error', (e) => {
      console.error(`      ❌ Error de red:`, e.message);
      resolve(false);
    });
    
    req.write(formData);
    req.end();
  });
}

// Proceso principal
async function main() {
  console.log('🚀 Reorganizando imágenes en Cloudinary por idioma\n');
  
  if (API_SECRET === 'TU_API_SECRET_AQUI') {
    console.error('❌ ERROR: Debes configurar CLOUDINARY_API_SECRET');
    process.exit(1);
  }

  console.log('📋 Proceso:');
  console.log('   1. Listar imágenes actuales en loyalty-program/emails/{tipo}/');
  console.log('   2. Mover a loyalty-program/emails/{tipo}/español/');
  console.log('   3. Duplicar a loyalty-program/emails/{tipo}/português/\n');

  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalErrors = 0;

  for (const emailType of emailTypes) {
    const prefix = `loyalty-program/emails/${emailType}`;
    console.log(`\n📂 Procesando: ${emailType}`);
    
    const images = await listImages(prefix);
    
    // Filtrar solo imágenes que NO estén ya en español/português
    const imagesToMove = images.filter(img => 
      !img.public_id.includes('/español/') && 
      !img.public_id.includes('/português/') &&
      img.public_id.split('/').length === 4 // Solo archivos directos en la carpeta tipo
    );
    
    if (imagesToMove.length === 0) {
      console.log(`   ℹ️  No hay imágenes para mover (ya están organizadas o no existen)`);
      continue;
    }

    console.log(`   📸 Encontradas ${imagesToMove.length} imágenes para mover:\n`);

    for (const img of imagesToMove) {
      const publicId = img.public_id;
      const parts = publicId.split('/');
      const fileName = parts[parts.length - 1]; // Ej: "Group 61" o "Group 61@2x"
      
      totalProcessed++;
      
      // Copiar a carpeta español
      const newPublicIdEs = `loyalty-program/emails/${emailType}/español/${fileName}`;
      const successEs = await copyImageToNewPath(publicId, newPublicIdEs);
      
      if (successEs) {
        totalSuccess++;
      } else {
        totalErrors++;
      }
      
      // Pequeña pausa entre español y português
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Copiar a carpeta português
      const newPublicIdPt = `loyalty-program/emails/${emailType}/português/${fileName}`;
      const successPt = await copyImageToNewPath(publicId, newPublicIdPt);
      
      if (successPt) {
        totalSuccess++;
      } else {
        totalErrors++;
      }
      
      // Pausa entre imágenes para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Proceso completado');
  console.log(`   Total procesadas: ${totalProcessed}`);
  console.log(`   Exitosas: ${totalSuccess}`);
  console.log(`   Errores: ${totalErrors}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
