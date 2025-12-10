-- Migración: Agregar campos de segmentación y detalles de premios a grand_prize_criteria
-- Esto permite rankings separados por región + market segment + partner category + subregión

-- Agregar nuevas columnas a grand_prize_criteria
ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "market_segment" text;
ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "partner_category" text;
ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "subregion" text;

-- Agregar columnas para detalles del premio (independiente del idioma)
ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "prize_description" text;
ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "prize_location" text;
ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "prize_country" text;
ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "prize_date" text;
ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "prize_round" text;
ALTER TABLE "grand_prize_criteria" ADD COLUMN IF NOT EXISTS "ranking_position" integer DEFAULT 1;

-- Agregar comentarios para documentación
COMMENT ON COLUMN "grand_prize_criteria"."market_segment" IS 'Market segment: ENTERPRISE, SMB, MSSP - NULL means applies to all';
COMMENT ON COLUMN "grand_prize_criteria"."partner_category" IS 'Partner category: PLATINUM, GOLD, SILVER, REGISTERED - NULL means applies to all';
COMMENT ON COLUMN "grand_prize_criteria"."subregion" IS 'Subregion: COLOMBIA, CENTRO AMERICA, etc. - NULL means applies to all';
COMMENT ON COLUMN "grand_prize_criteria"."prize_description" IS 'Description of the specific prize (language-independent)';
COMMENT ON COLUMN "grand_prize_criteria"."prize_location" IS 'Example: New York New Jersey Stadium, BC Place Vancouver';
COMMENT ON COLUMN "grand_prize_criteria"."prize_country" IS 'Country of the prize: USA, CANADA, MEXICO';
COMMENT ON COLUMN "grand_prize_criteria"."prize_date" IS 'Event date: June 30, July 2, etc.';
COMMENT ON COLUMN "grand_prize_criteria"."prize_round" IS 'Tournament round: 32, 16, Final, etc.';
COMMENT ON COLUMN "grand_prize_criteria"."ranking_position" IS 'Required ranking position to win (1 = first place, 2 = second, etc.)';
