ALTER TYPE "public"."criteria_type" ADD VALUE 'top_goals';--> statement-breakpoint
ALTER TABLE "points_config" ALTER COLUMN "software_rate" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "points_config" ALTER COLUMN "hardware_rate" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "points_config" ALTER COLUMN "equipment_rate" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "grand_prize_criteria" ADD COLUMN "redemption_start_date" timestamp;--> statement-breakpoint
ALTER TABLE "grand_prize_criteria" ADD COLUMN "redemption_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "monthly_region_prizes" ADD COLUMN "redemption_start_date" timestamp;--> statement-breakpoint
ALTER TABLE "monthly_region_prizes" ADD COLUMN "redemption_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "points_config" ADD COLUMN "new_customer_rate" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "points_config" ADD COLUMN "renewal_rate" integer DEFAULT 2000 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_passwordless" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "points_config" DROP COLUMN "redemption_start_date";--> statement-breakpoint
ALTER TABLE "points_config" DROP COLUMN "redemption_end_date";