-- Adiciona campos de CNPJ e Endereço à tabela municipalities
ALTER TABLE public.municipalities
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Garante unicidade de CNPJ quando informado (permite múltiplos NULLs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'municipalities_cnpj_unique'
  ) THEN
    ALTER TABLE public.municipalities
      ADD CONSTRAINT municipalities_cnpj_unique UNIQUE (cnpj);
  END IF;
END $$;


