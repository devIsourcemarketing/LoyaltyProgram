-- Migration: Make category field optional in rewards table
-- This allows rewards to be created without a category field

ALTER TABLE "rewards" 
ALTER COLUMN "category" DROP NOT NULL;

-- Update existing NULL categories to 'General' for data consistency (optional)
-- Uncomment the line below if you want to set a default value for existing NULL categories
-- UPDATE "rewards" SET "category" = 'General' WHERE "category" IS NULL;
