-- Add is_passwordless column to users table
ALTER TABLE "users" ADD COLUMN "is_passwordless" boolean DEFAULT false NOT NULL;

-- Mark existing users with user_ prefix as passwordless
UPDATE "users" SET "is_passwordless" = true WHERE "username" LIKE 'user_%';
