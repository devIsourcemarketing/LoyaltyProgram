-- Tabla para registrar todos los intentos de envío de emails
CREATE TABLE IF NOT EXISTS "email_logs" (
  "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  "email_type" TEXT NOT NULL, -- 'magic-link', 'invite', 'welcome', 'approval', etc.
  "recipient_email" TEXT NOT NULL,
  "recipient_name" TEXT,
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'retrying'
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "last_error" TEXT,
  "brevo_message_id" TEXT, -- ID del mensaje de Brevo si se envió
  "sent_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- Índices para mejorar consultas
CREATE INDEX IF NOT EXISTS "idx_email_logs_status" ON "email_logs" ("status");
CREATE INDEX IF NOT EXISTS "idx_email_logs_recipient" ON "email_logs" ("recipient_email");
CREATE INDEX IF NOT EXISTS "idx_email_logs_created_at" ON "email_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_email_logs_type" ON "email_logs" ("email_type");
