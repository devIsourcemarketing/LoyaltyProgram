import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function seedMasterData() {
  try {
    console.log("🌱 Iniciando seed de datos maestros...\n");
    
    // 1. Seed de categorías maestras
    console.log("📦 1. Insertando categorías maestras...");
    const categories = [
      { name: 'ENTERPRISE', description: 'Clientes empresariales de gran escala', type: 'business_type' },
      { name: 'SMB', description: 'Pequeñas y medianas empresas', type: 'business_type' },
      { name: 'MSSP', description: 'Proveedores de servicios de seguridad gestionados', type: 'business_type' },
      { name: 'Diamond', description: 'Nivel premium superior', type: 'tier' },
      { name: 'Gold', description: 'Nivel premium medio', type: 'tier' },
      { name: 'Silver', description: 'Nivel estándar', type: 'tier' },
    ];
    
    for (const cat of categories) {
      try {
        await sql`
          INSERT INTO "categories_master" ("name", "description", "type", "active")
          VALUES (${cat.name}, ${cat.description}, ${cat.type}, true)
          ON CONFLICT ("name") DO NOTHING
        `;
        console.log(`   ✅ ${cat.name}`);
      } catch (error: any) {
        console.log(`   ⚠️  ${cat.name} ya existe`);
      }
    }
    
    // 2. Seed de asociaciones región-categoría
    console.log("\n📍 2. Insertando asociaciones región-categoría...");
    
    // Limpiar asociaciones anteriores
    await sql`DELETE FROM "region_categories"`;
    console.log("   🧹 Asociaciones anteriores eliminadas");
    
    const associations = [
      // NOLA - ENTERPRISE, SMB, MSSP con subcategorías
      { region: 'NOLA', category: 'ENTERPRISE', subcategory: 'COLOMBIA', level: null },
      { region: 'NOLA', category: 'ENTERPRISE', subcategory: 'CENTRO AMÉRICA', level: null },
      { region: 'NOLA', category: 'SMB', subcategory: 'COLOMBIA', level: null },
      { region: 'NOLA', category: 'SMB', subcategory: 'CENTRO AMÉRICA', level: null },
      { region: 'NOLA', category: 'MSSP', subcategory: null, level: null },
      
      // SOLA - Solo ENTERPRISE y SMB
      { region: 'SOLA', category: 'ENTERPRISE', subcategory: null, level: null },
      { region: 'SOLA', category: 'SMB', subcategory: null, level: null },
      
      // BRASIL - Solo ENTERPRISE y SMB
      { region: 'BRASIL', category: 'ENTERPRISE', subcategory: null, level: null },
      { region: 'BRASIL', category: 'SMB', subcategory: null, level: null },
      
      // MEXICO - ENTERPRISE y SMB con niveles
      { region: 'MEXICO', category: 'ENTERPRISE', subcategory: 'PLATINUM', level: null },
      { region: 'MEXICO', category: 'ENTERPRISE', subcategory: 'GOLD', level: null },
      { region: 'MEXICO', category: 'SMB', subcategory: 'PLATINUM', level: null },
      { region: 'MEXICO', category: 'SMB', subcategory: 'GOLD', level: null },
      { region: 'MEXICO', category: 'SMB', subcategory: 'SILVER & REGISTERED', level: null },
    ];
    
    for (const assoc of associations) {
      await sql`
        INSERT INTO "region_categories" ("region", "category", "subcategory", "level")
        VALUES (${assoc.region}, ${assoc.category}, ${assoc.subcategory}, ${assoc.level})
      `;
      const display = `${assoc.region} → ${assoc.category}${assoc.subcategory ? ` (${assoc.subcategory})` : ''}`;
      console.log(`   ✅ ${display}`);
    }
    
    console.log("\n🎉 Seed de datos maestros completado!\n");
    console.log("📊 Resumen:");
    console.log("   ✓ 6 categorías maestras");
    console.log("   ✓ 14 asociaciones región-categoría");
    console.log("\n📋 Distribución por región:");
    console.log("   NOLA: 5 asociaciones (ENTERPRISE x2, SMB x2, MSSP)");
    console.log("   SOLA: 2 asociaciones (ENTERPRISE, SMB)");
    console.log("   BRASIL: 2 asociaciones (ENTERPRISE, SMB)");
    console.log("   MEXICO: 5 asociaciones (ENTERPRISE x2, SMB x3)");
    
  } catch (error) {
    console.error("\n❌ Error ejecutando seed:", error);
    process.exit(1);
  }
}

seedMasterData();
