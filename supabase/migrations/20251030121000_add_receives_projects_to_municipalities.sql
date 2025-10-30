-- Adiciona flag para indicar se o município recebe projetos
ALTER TABLE public.municipalities
  ADD COLUMN IF NOT EXISTS receives_projects BOOLEAN NOT NULL DEFAULT TRUE;

-- Índice para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_municipalities_receives_projects ON public.municipalities(receives_projects);


