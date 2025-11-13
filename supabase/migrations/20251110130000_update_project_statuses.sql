DO $$
BEGIN
  ALTER TYPE public.project_status RENAME VALUE 'cancelado' TO 'arquivada';
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.project_status ADD VALUE 'habilitada';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.project_status ADD VALUE 'selecionada';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

