-- Drop the unique constraint first
ALTER TABLE saved_filter DROP CONSTRAINT IF EXISTS "saved_filter_userId_type_isDefault_key";

-- Drop the isDefault column
ALTER TABLE saved_filter DROP COLUMN IF EXISTS "isDefault";
