-- Tabela para documentos de projetos
CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  size BIGINT,
  content_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- Política: qualquer autenticado pode visualizar documentos
CREATE POLICY "Authenticated can view project documents"
  ON public.project_documents FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política: apenas admins e gestores podem gerenciar
CREATE POLICY "Admins and managers can manage project documents"
  ON public.project_documents FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor_municipal')
  );

CREATE INDEX IF NOT EXISTS idx_project_documents_project ON public.project_documents(project_id);


