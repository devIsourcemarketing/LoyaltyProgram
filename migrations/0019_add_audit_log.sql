CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_data" jsonb,
	"performed_by_user_id" uuid NOT NULL,
	"performed_by_username" text NOT NULL,
	"performed_by_email" text NOT NULL,
	"performed_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text
);

CREATE INDEX IF NOT EXISTS "audit_log_entity_type_idx" ON "audit_log" ("entity_type");
CREATE INDEX IF NOT EXISTS "audit_log_entity_id_idx" ON "audit_log" ("entity_id");
CREATE INDEX IF NOT EXISTS "audit_log_performed_by_idx" ON "audit_log" ("performed_by_user_id");
CREATE INDEX IF NOT EXISTS "audit_log_performed_at_idx" ON "audit_log" ("performed_at");
