import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function runMigration() {
  try {
    console.log("🚀 Ejecutando migración...");
    
    // Crear tabla categories_master
    await sql`
      CREATE TABLE IF NOT EXISTS "categories_master" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "type" text,
        "active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "categories_master_name_unique" UNIQUE("name")
      )
    `;
    console.log("✅ Tabla categories_master creada");
    
    // Crear tabla region_categories
    await sql`
      CREATE TABLE IF NOT EXISTS "region_categories" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "region" text NOT NULL,
        "category" text NOT NULL,
        "subcategory" text,
        "level" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    console.log("✅ Tabla region_categories creada");
    
    // Insertar categorías iniciales
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
        console.log(`✅ Categoría ${cat.name} insertada`);
      } catch (error) {
        console.log(`⚠️  Categoría ${cat.name} ya existe`);
      }
    }
    
    console.log("\n🎉 Migración completada exitosamente!");
    console.log("📋 Tablas creadas:");
    console.log("   - categories_master");
    console.log("   - region_categories");
    console.log("📝 Categorías disponibles:");
    console.log("   - ENTERPRISE, SMB, MSSP (business_type)");
    console.log("   - Diamond, Gold, Silver (tier)");
    
  } catch (error) {
    console.error("❌ Error ejecutando migración:", error);
    process.exit(1);
  }
}

runMigration();
