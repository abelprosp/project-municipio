-- Add column to store excluded municipalities per program
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS excluded_municipalities UUID[] DEFAULT ARRAY[]::UUID[];

-- Index to optimize searches by membership
CREATE INDEX IF NOT EXISTS idx_programs_excluded_municipalities
  ON public.programs
  USING GIN (excluded_municipalities);


