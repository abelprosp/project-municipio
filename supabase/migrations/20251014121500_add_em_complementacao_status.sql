-- Add new value to project_status enum for "Em Complementação"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'project_status' AND e.enumlabel = 'em_complementacao'
  ) THEN
    ALTER TYPE project_status ADD VALUE 'em_complementacao';
  END IF;
END $$;