-- Migration: Rename subregion to region_subcategory in grand_prize_criteria
-- Purpose: Maintain consistency with users table naming convention

-- Rename the column
ALTER TABLE grand_prize_criteria 
RENAME COLUMN subregion TO region_subcategory;

-- Update the comment to reflect the new name
COMMENT ON COLUMN grand_prize_criteria.region_subcategory IS 'Subregion filter: COLOMBIA, CENTRO AMERICA, etc. NULL = applies to all subregions';
