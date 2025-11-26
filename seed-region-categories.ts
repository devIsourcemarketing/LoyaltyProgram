import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function seedRegionCategories() {
  try {
    console.log("🧹 Limpiando asociaciones anteriores...");
    await sql`DELETE FROM "region_categories"`;
    console.log("✅ Asociaciones anteriores eliminadas");
    
    console.log("\n🌱 Creando asociaciones región-categoría basadas en configuraciones existentes...");
    
    // Basado en las configuraciones reales de region_configs
    const associations = [
      // NOLA - ENTERPRISE, SMB, MSSP (con subcategorías COLOMBIA y CENTRO AMÉRICA)
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
      
      // MEXICO - ENTERPRISE y SMB con niveles PLATINUM, GOLD, SILVER & REGISTERED
      { region: 'MEXICO', category: 'ENTERPRISE', subcategory: 'PLATINUM', level: null },
      { region: 'MEXICO', category: 'ENTERPRISE', subcategory: 'GOLD', level: null },
      { region: 'MEXICO', category: 'SMB', subcategory: 'PLATINUM', level: null },
      { region: 'MEXICO', category: 'SMB', subcategory: 'GOLD', level: null },
      { region: 'MEXICO', category: 'SMB', subcategory: 'SILVER & REGISTERED', level: null },
    ];
    
    for (const assoc of associations) {
      try {
        await sql`
          INSERT INTO "region_categories" ("region", "category", "subcategory", "level")
          VALUES (${assoc.region}, ${assoc.category}, ${assoc.subcategory}, ${assoc.level})
        `;
        const display = `${assoc.region} → ${assoc.category}${assoc.subcategory ? ` (${assoc.subcategory})` : ''}`;
        console.log(`✅ ${display}`);
      } catch (error: any) {
        if (error.code === '23505') { // Duplicate key
          const display = `${assoc.region} → ${assoc.category}${assoc.subcategory ? ` (${assoc.subcategory})` : ''}`;
          console.log(`⚠️  ${display} ya existe`);
        } else {
          console.error(`❌ Error: ${assoc.region} → ${assoc.category}`, error.message);
        }
      }
    }
    
    console.log("\n🎉 Asociaciones región-categoría creadas!");
    console.log("📊 Resumen por región:");
    console.log("   NOLA:");
    console.log("     - ENTERPRISE: COLOMBIA, CENTRO AMÉRICA");
    console.log("     - SMB: COLOMBIA, CENTRO AMÉRICA");
    console.log("     - MSSP");
    console.log("   SOLA:");
    console.log("     - ENTERPRISE");
    console.log("     - SMB");
    console.log("   BRASIL:");
    console.log("     - ENTERPRISE");
    console.log("     - SMB");
    console.log("   MEXICO:");
    console.log("     - ENTERPRISE: PLATINUM, GOLD");
    console.log("     - SMB: PLATINUM, GOLD, SILVER & REGISTERED");
    
  } catch (error) {
    console.error("❌ Error ejecutando seed:", error);
    process.exit(1);
  }
}

seedRegionCategories();
