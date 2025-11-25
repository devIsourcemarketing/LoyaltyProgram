CREATE TABLE "categories_master" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_master_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "prize_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"prize_rule" text NOT NULL,
	"size" text,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "region_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"level" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "grand_prize_criteria" ALTER COLUMN "region" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invited_by" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invited_from_region" "region";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_region_unique" UNIQUE("email","region");