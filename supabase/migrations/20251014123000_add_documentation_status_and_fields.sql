-- Add new statuses and fields related to documentation
DO $$
BEGIN
  -- Add enum values if they do not exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'project_status' AND e.enumlabel = 'solicitado_documentacao'
  ) THEN
    ALTER TYPE project_status ADD VALUE 'solicitado_documentacao';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'project_status' AND e.enumlabel = 'aguardando_documentacao'
  ) THEN
    ALTER TYPE project_status ADD VALUE 'aguardando_documentacao';
  END IF;
END $$;

-- Add fields to projects table for documentation tracking
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS document_request_date DATE,
  ADD COLUMN IF NOT EXISTS document_deadline_date DATE;