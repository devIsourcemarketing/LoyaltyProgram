import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function runMigrationFromFile(migrationFile: string) {
  try {
    console.log(`🚀 Ejecutando migración: ${migrationFile}...\n`);
    
    console.log("✅ Agregando columna market_segment...");
    await sql`ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "market_segment" text`;
    
    console.log("✅ Agregando columna partner_category...");
    await sql`ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "partner_category" text`;
    
    console.log("✅ Agregando columna subregion...");
    await sql`ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "subregion" text`;
    
    console.log("✅ Agregando columna prize_description...");
    await sql`ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "prize_description" text`;
    
    console.log("✅ Agregando columna prize_location...");
    await sql`ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "prize_location" text`;
    
    console.log("✅ Agregando columna prize_country...");
    await sql`ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "prize_country" text`;
    
    console.log("✅ Agregando columna prize_date...");
    await sql`ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "prize_date" text`;
    
    console.log("✅ Agregando columna prize_round...");
    await sql`ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "prize_round" text`;
    
    console.log("✅ Agregando columna ranking_position...");
    await sql`ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "ranking_position" integer DEFAULT 1`;
    
    console.log("\n✨ Migración completada exitosamente!");
    console.log("\n📋 Columnas agregadas a grand_prize_criteria:");
    console.log("   - market_segment (ENTERPRISE, SMB, MSSP)");
    console.log("   - partner_category (PLATINUM, GOLD, SILVER, etc.)");
    console.log("   - subregion (COLOMBIA, CENTRO AMERICA, etc.)");
    console.log("   - prize_description (descripción del premio)");
    console.log("   - prize_location (estadio/ubicación)");
    console.log("   - prize_country (USA, CANADA, MEXICO)");
    console.log("   - prize_date (fecha del evento)");
    console.log("   - prize_round (ronda del torneo)");
    console.log("   - ranking_position (posición para ganar)\n");
    
  } catch (error) {
    console.error("❌ Error ejecutando migración:", error);
    process.exit(1);
  }
}

// Get migration file from command line args or use default
const migrationFile = process.argv[2] || "migrations/0019_add_grand_prize_segments.sql";
runMigrationFromFile(migrationFile);
