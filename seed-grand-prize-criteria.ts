import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

/**
 * Script para poblar los 14 premios del Gran Premio según la tabla Excel
 * Cada premio está segmentado por:
 * - Region (NOLA, SOLA, BRASIL, MEXICO)
 * - Market Segment (ENTERPRISE, SMB, MSSP)
 * - Partner Category (PLATINUM, GOLD, SILVER, REGISTERED) - solo para MEXICO
 * - Subregión (COLOMBIA, CENTRO AMERICA) - solo para NOLA
 */

const GRAND_PRIZE_DATA = [
  // NOLA - ENTERPRISE
  {
    name: "NOLA ENTERPRISE COLOMBIA - Mayor Goleador",
    region: "NOLA",
    marketSegment: "ENTERPRISE",
    partnerCategory: null,
    regionSubcategory: "COLOMBIA",
    rankingPosition: 1,
    prizeDescription: "Mayor Goleador - All-inclusive trip to World Cup",
    prizeLocation: "New York New Jersey Stadium",
    prizeCountry: "USA",
    prizeDate: "June 30",
    prizeRound: "32",
    criteriaType: "top_goals" as const,
  },
  {
    name: "NOLA ENTERPRISE CENTRO AMERICA - Mayor Goleador",
    region: "NOLA",
    marketSegment: "ENTERPRISE",
    partnerCategory: null,
    regionSubcategory: "CENTRO AMERICA",
    rankingPosition: 1,
    prizeDescription: "Mayor Goleador - All-inclusive trip to World Cup",
    prizeLocation: "New York New Jersey Stadium",
    prizeCountry: "USA",
    prizeDate: "July 1",
    prizeRound: "32",
    criteriaType: "top_goals" as const,
  },
  
  // NOLA - SMB
  {
    name: "NOLA SMB COLOMBIA - Mayor Goleador",
    region: "NOLA",
    marketSegment: "SMB",
    partnerCategory: null,
    regionSubcategory: "COLOMBIA",
    rankingPosition: 1,
    prizeDescription: "Mayor Goleador - All-inclusive trip to World Cup",
    prizeLocation: "New York New Jersey Stadium",
    prizeCountry: "USA",
    prizeDate: "June 30",
    prizeRound: "32",
    criteriaType: "top_goals" as const,
  },
  {
    name: "NOLA SMB CENTRO AMERICA - Mayor Goleador",
    region: "NOLA",
    marketSegment: "SMB",
    partnerCategory: null,
    regionSubcategory: "CENTRO AMERICA",
    rankingPosition: 1,
    prizeDescription: "Mayor Goleador - All-inclusive trip to World Cup",
    prizeLocation: "New York New Jersey Stadium",
    prizeCountry: "USA",
    prizeDate: "July 1",
    prizeRound: "32",
    criteriaType: "top_goals" as const,
  },
  
  // NOLA - MSSP
  {
    name: "NOLA MSSP COLOMBIA & CENTRO AMÉRICA - Mayor Goleador",
    region: "NOLA",
    marketSegment: "MSSP",
    partnerCategory: null,
    regionSubcategory: "COLOMBIA & CENTRO AMÉRICA",
    rankingPosition: 1,
    prizeDescription: "Mayor Goleador - All-inclusive trip to World Cup",
    prizeLocation: "New York New Jersey Stadium",
    prizeCountry: "USA",
    prizeDate: "July 2",
    prizeRound: "32",
    criteriaType: "top_goals" as const,
  },
  
  // SOLA - ENTERPRISE
  {
    name: "SOLA ENTERPRISE - Mayor Goleador",
    region: "SOLA",
    marketSegment: "ENTERPRISE",
    partnerCategory: null,
    regionSubcategory: null,
    rankingPosition: 1,
    prizeDescription: "Mayor Goleador - All-inclusive trip to World Cup",
    prizeLocation: "New York New Jersey Stadium",
    prizeCountry: "USA",
    prizeDate: "June 30",
    prizeRound: "32",
    criteriaType: "top_goals" as const,
  },
  
  // SOLA - SMB
  {
    name: "SOLA SMB - Mayor Goleador",
    region: "SOLA",
    marketSegment: "SMB",
    partnerCategory: null,
    regionSubcategory: null,
    rankingPosition: 1,
    prizeDescription: "Mayor Goleador - All-inclusive trip to World Cup",
    prizeLocation: "New York New Jersey Stadium",
    prizeCountry: "USA",
    prizeDate: "June 30",
    prizeRound: "32",
    criteriaType: "top_goals" as const,
  },
  
  // BRASIL - ENTERPRISE
  {
    name: "BRASIL ENTERPRISE - Mayor Goleador",
    region: "BRASIL",
    marketSegment: "ENTERPRISE",
    partnerCategory: null,
    regionSubcategory: null,
    rankingPosition: 1,
    prizeDescription: "Mayor Goleador - All-inclusive trip to World Cup",
    prizeLocation: "BC Place Vancouver",
    prizeCountry: "CANADA",
    prizeDate: "July 2",
    prizeRound: "32",
    criteriaType: "top_goals" as const,
  },
  
  // BRASIL - SMB
  {
    name: "BRASIL SMB - Mayor Goleador",
    region: "BRASIL",
    marketSegment: "SMB",
    partnerCategory: null,
    regionSubcategory: null,
    rankingPosition: 1,
    prizeDescription: "Mayor Goleador - All-inclusive trip to World Cup",
    prizeLocation: "BC Place Vancouver",
    prizeCountry: "CANADA",
    prizeDate: "July 2",
    prizeRound: "32",
    criteriaType: "top_goals" as const,
  },
  
  // MEXICO - ENTERPRISE
  {
    name: "MEXICO ENTERPRISE PLATINUM - Mayor Goleador (1st Place)",
    region: "MEXICO",
    marketSegment: "ENTERPRISE",
    partnerCategory: "PLATINUM",
    regionSubcategory: null,
    rankingPosition: 1,
    prizeDescription: "Mayor Goleador - All-inclusive trip to World Cup",
    prizeLocation: "Monterrey Stadium",
    prizeCountry: "MEXICO",
    prizeDate: "June 23",
    prizeRound: "32",
    criteriaType: "top_goals" as const,
  },
  {
    name: "MEXICO ENTERPRISE GOLD - Mayor Goleador (2nd Place)",
    region: "MEXICO",
    marketSegment: "ENTERPRISE",
    partnerCategory: "GOLD",
    regionSubcategory: null,
    rankingPosition: 2,
    prizeDescription: "Mayor Goleador - All-inclusive trip to World Cup",
    prizeLocation: "BC Place Vancouver",
    prizeCountry: "CANADA",
    prizeDate: "July 2",
    prizeRound: "32",
    criteriaType: "top_goals" as const,
  },
  
  // MEXICO - SMB
  {
    name: "MEXICO SMB PLATINUM - Mayor Goleador (1st Place)",
    region: "MEXICO",
    marketSegment: "SMB",
    partnerCategory: "PLATINUM",
    regionSubcategory: null,
    rankingPosition: 1,
    prizeDescription: "Mayor Goleador - All-inclusive trip to World Cup",
    prizeLocation: "Monterrey Stadium",
    prizeCountry: "MEXICO",
    prizeDate: "June 23",
    prizeRound: "32",
    criteriaType: "top_goals" as const,
  },
  {
    name: "MEXICO SMB GOLD - Mayor Goleador (2nd Place)",
    region: "MEXICO",
    marketSegment: "SMB",
    partnerCategory: "GOLD",
    regionSubcategory: null,
    rankingPosition: 2,
    prizeDescription: "Mayor Goleador - All-inclusive trip to World Cup",
    prizeLocation: "Mexico City Stadium",
    prizeCountry: "MEXICO",
    prizeDate: "June 30",
    prizeRound: "32",
    criteriaType: "top_goals" as const,
  },
  {
    name: "MEXICO SMB SILVER & REGISTERED - Mayor Goleador (2nd Place)",
    region: "MEXICO",
    marketSegment: "SMB",
    partnerCategory: "SILVER & REGISTERED",
    regionSubcategory: null,
    rankingPosition: 2,
    prizeDescription: "Mayor Goleador - All-inclusive trip to World Cup",
    prizeLocation: "Mexico City Stadium",
    prizeCountry: "MEXICO",
    prizeDate: "June 30",
    prizeRound: "32",
    criteriaType: "top_goals" as const,
  },
];

async function seedGrandPrizeCriteria() {
  console.log("🏆 Poblando criterios de Gran Premio...\n");

  try {
    // Insert all grand prize criteria
    for (const prize of GRAND_PRIZE_DATA) {
      await sql`
        INSERT INTO "grand_prize_criteria" (
          name, region, market_segment, partner_category, regionSubcategory,
          ranking_position, prize_description, prize_location, prize_country,
          prize_date, prize_round, criteria_type, is_active,
          start_date, end_date, redemption_start_date, redemption_end_date,
          created_at, updated_at
        ) VALUES (
          ${prize.name},
          ${prize.region},
          ${prize.marketSegment},
          ${prize.partnerCategory},
          ${prize.regionSubcategory},
          ${prize.rankingPosition},
          ${prize.prizeDescription},
          ${prize.prizeLocation},
          ${prize.prizeCountry},
          ${prize.prizeDate},
          ${prize.prizeRound},
          ${prize.criteriaType},
          true,
          '2025-12-01'::timestamp,
          '2026-04-30'::timestamp,
          '2026-05-01'::timestamp,
          '2026-06-30'::timestamp,
          now(),
          now()
        )
      `;

      console.log(`✅ Creado: ${prize.name}`);
      console.log(`   📍 ${prize.prizeLocation} (${prize.prizeCountry}) - ${prize.prizeDate}`);
      console.log(`   🎯 Ranking Position: ${prize.rankingPosition}`);
      console.log();
    }

    console.log(`\n🎉 ¡Completado! Se crearon ${GRAND_PRIZE_DATA.length} criterios de Gran Premio.`);
  } catch (error) {
    console.error("❌ Error al poblar Grand Prize Criteria:", error);
    throw error;
  }
}

// Ejecutar el script
seedGrandPrizeCriteria()
  .then(() => {
    console.log("\n✨ Script completado exitosamente");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Error:", error);
    process.exit(1);
  });
