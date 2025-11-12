-- Tabela para rendimentos bancários de projetos
CREATE TABLE IF NOT EXISTS public.project_bank_yields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela para devoluções de recursos
CREATE TABLE IF NOT EXISTS public.project_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.project_bank_yields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_returns ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY IF NOT EXISTS "Authenticated can read bank yields"
  ON public.project_bank_yields
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Authenticated can read project returns"
  ON public.project_returns
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Admins and managers manage bank yields"
  ON public.project_bank_yields
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor_municipal')
  );

CREATE POLICY IF NOT EXISTS "Admins and managers manage project returns"
  ON public.project_returns
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor_municipal')
  );

CREATE INDEX IF NOT EXISTS idx_project_bank_yields_project
  ON public.project_bank_yields(project_id);

CREATE INDEX IF NOT EXISTS idx_project_returns_project
  ON public.project_returns(project_id);


