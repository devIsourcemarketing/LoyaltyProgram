import { cloudinary } from './server/cloudinary';
import * as fs from 'fs';
import * as path from 'path';

async function uploadRegistroPasswordlessImages() {
  try {
    console.log('🚀 Starting upload of registro passwordless email images...');
    
    const downloadsPath = 'C:\\Users\\User\\Downloads\\Mail 09';
    
    // Buscar la imagen principal (puede ser Group 65.png o similar)
    const files = fs.readdirSync(downloadsPath);
    console.log('📁 Files found:', files);
    
    const imageFile = files.find(f => 
      f.toLowerCase().endsWith('.png') || 
      f.toLowerCase().endsWith('.jpg') || 
      f.toLowerCase().endsWith('.jpeg')
    );
    
    if (!imageFile) {
      console.error('❌ No image file found in Mail 09 folder');
      return;
    }
    
    const imagePath = path.join(downloadsPath, imageFile);
    console.log(`📤 Uploading ${imageFile}...`);
    
    // Subir imagen principal
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: 'loyalty-program/emails/registro-passwordless',
      public_id: 'main-banner',
      overwrite: true,
      resource_type: 'image',
      transformation: [
        { quality: 'auto:best' },
        { fetch_format: 'auto' }
      ]
    });
    
    console.log('✅ Main banner uploaded successfully!');
    console.log('   URL (1x):', result.secure_url);
    
    // Generar URL para 2x (retina)
    const url2x = result.secure_url.replace('/upload/', '/upload/dpr_2.0,q_auto:best/');
    console.log('   URL (2x):', url2x);
    
    console.log('\n📋 URLs to use in email.ts:');
    console.log(`const heroImageUrl = '${result.secure_url}';`);
    console.log(`const heroImage2xUrl = '${url2x}';`);
    
    // Guardar URLs en un archivo JSON
    const urls = {
      heroImageUrl: result.secure_url,
      heroImage2xUrl: url2x,
      uploadedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      'uploaded-registro-passwordless-urls.json',
      JSON.stringify(urls, null, 2)
    );
    
    console.log('\n✅ URLs saved to uploaded-registro-passwordless-urls.json');
    
  } catch (error) {
    console.error('❌ Error uploading images:', error);
    throw error;
  }
}

uploadRegistroPasswordlessImages();
