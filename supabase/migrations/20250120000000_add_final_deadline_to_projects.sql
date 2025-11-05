-- Add final_deadline column to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS final_deadline DATE;

-- Optional: create index for faster filtering by final deadline
CREATE INDEX IF NOT EXISTS projects_final_deadline_idx ON projects(final_deadline);

