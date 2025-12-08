import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function runMigration() {
  try {
    console.log("🚀 Ejecutando migración: Make category optional...");
    
    // Make category field optional in rewards table
    await sql`
      ALTER TABLE "rewards" 
      ALTER COLUMN "category" DROP NOT NULL
    `;
    console.log("✅ Campo 'category' en tabla 'rewards' ahora es opcional");
    
    console.log("\n✨ Migración completada exitosamente!");
    console.log("\n📋 Cambios aplicados:");
    console.log("   - Campo 'category' en tabla 'rewards' ahora es opcional (NULL permitido)");
    console.log("   - Los premios existentes mantienen sus categorías");
    console.log("   - Los nuevos premios pueden crearse sin categoría\n");
    
  } catch (error) {
    console.error("❌ Error ejecutando migración:", error);
    process.exit(1);
  }
}

runMigration();
