-- Migration: Add 'top_goals' to criteria_type enum
-- This allows Grand Prize to support "Highest Goals Accumulated" ranking type

-- Add the new value to the enum
ALTER TYPE criteria_type ADD VALUE IF NOT EXISTS 'top_goals';
