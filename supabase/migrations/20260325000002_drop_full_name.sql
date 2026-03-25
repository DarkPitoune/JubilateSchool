-- Phase 2: Drop full_name now that all consumers use first_name/last_name
ALTER TABLE profiles DROP COLUMN full_name;
