-- Migration: Restructure Points Configuration
-- Date: 2025-11-29
-- Description: 
--   1. Add newCustomerRate and renewalRate to points_config (deal-type based rates)
--   2. Make softwareRate, hardwareRate, equipmentRate nullable (deprecated)
--   3. Remove global redemptionStartDate and redemptionEndDate from points_config
--   4. Add redemptionStartDate and redemptionEndDate to grand_prize_criteria
--   5. Add redemptionStartDate and redemptionEndDate to monthly_region_prizes

-- Step 1: Add new deal-type based rates to points_config
ALTER TABLE points_config 
  ADD COLUMN IF NOT EXISTS new_customer_rate INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS renewal_rate INTEGER NOT NULL DEFAULT 2000;

-- Step 2: Make old product-type rates nullable (deprecated but kept for backward compatibility)
ALTER TABLE points_config 
  ALTER COLUMN software_rate DROP NOT NULL,
  ALTER COLUMN hardware_rate DROP NOT NULL,
  ALTER COLUMN equipment_rate DROP NOT NULL;

-- Step 3: Remove global redemption period from points_config
ALTER TABLE points_config 
  DROP COLUMN IF EXISTS redemption_start_date,
  DROP COLUMN IF EXISTS redemption_end_date;

-- Step 4: Add redemption period to grand_prize_criteria
ALTER TABLE grand_prize_criteria 
  ADD COLUMN IF NOT EXISTS redemption_start_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS redemption_end_date TIMESTAMP;

-- Step 5: Add redemption period to monthly_region_prizes
ALTER TABLE monthly_region_prizes 
  ADD COLUMN IF NOT EXISTS redemption_start_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS redemption_end_date TIMESTAMP;

-- Optional: Add comments for clarity
COMMENT ON COLUMN points_config.new_customer_rate IS 'USD per point for new customer deals';
COMMENT ON COLUMN points_config.renewal_rate IS 'USD per point for renewal deals';
COMMENT ON COLUMN points_config.software_rate IS 'DEPRECATED: Use new_customer_rate or renewal_rate instead';
COMMENT ON COLUMN points_config.hardware_rate IS 'DEPRECATED: Use new_customer_rate or renewal_rate instead';
COMMENT ON COLUMN points_config.equipment_rate IS 'DEPRECATED: Use new_customer_rate or renewal_rate instead';
COMMENT ON COLUMN grand_prize_criteria.redemption_start_date IS 'When winners can start claiming the prize';
COMMENT ON COLUMN grand_prize_criteria.redemption_end_date IS 'Deadline for winners to claim the prize';
COMMENT ON COLUMN monthly_region_prizes.redemption_start_date IS 'Start of monthly prize redemption window';
COMMENT ON COLUMN monthly_region_prizes.redemption_end_date IS 'End of monthly prize redemption window';
