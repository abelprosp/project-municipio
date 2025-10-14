-- Add program_id column to projects referencing programs table
alter table projects
  add column if not exists program_id uuid references programs(id) on delete set null;

-- Optional: create index for faster filtering by program
create index if not exists projects_program_id_idx on projects(program_id);