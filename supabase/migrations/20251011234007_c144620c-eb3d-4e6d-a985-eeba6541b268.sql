-- Create enum for project status
CREATE TYPE project_status AS ENUM (
  'em_criacao',
  'enviado',
  'em_analise',
  'clausula_suspensiva',
  'aprovado',
  'em_execucao',
  'prestacao_contas',
  'concluido',
  'cancelado'
);

-- Create enum for amendment type
CREATE TYPE amendment_type AS ENUM (
  'extra',
  'individual',
  'rp2',
  'outro'
);

-- Create enum for user role
CREATE TYPE user_role AS ENUM (
  'administrador',
  'gestor_municipal',
  'visualizador'
);

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'visualizador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create municipalities table
CREATE TABLE municipalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  manager TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on municipalities
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;

-- Municipalities policies (all authenticated users can view)
CREATE POLICY "Authenticated users can view municipalities"
  ON municipalities FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage municipalities"
  ON municipalities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

-- Create programs table
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  responsible_agency TEXT,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'Aberto',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on programs
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- Programs policies
CREATE POLICY "Authenticated users can view programs"
  ON programs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage programs"
  ON programs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  year INTEGER NOT NULL,
  proposal_number TEXT,
  object TEXT NOT NULL,
  ministry TEXT,
  parliamentarian TEXT,
  amendment_type amendment_type,
  transfer_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  counterpart_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  execution_percentage INTEGER DEFAULT 0 CHECK (execution_percentage >= 0 AND execution_percentage <= 100),
  status project_status NOT NULL DEFAULT 'em_criacao',
  start_date DATE,
  end_date DATE,
  accountability_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Authenticated users can view projects"
  ON projects FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and managers can manage projects"
  ON projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('administrador', 'gestor_municipal')
    )
  );

-- Create movements table
CREATE TABLE movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stage project_status NOT NULL,
  responsible TEXT,
  description TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on movements
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;

-- Movements policies
CREATE POLICY "Authenticated users can view movements"
  ON movements FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create movements"
  ON movements FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'visualizador'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_municipalities_updated_at
  BEFORE UPDATE ON municipalities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_projects_municipality ON projects(municipality_id);
CREATE INDEX idx_projects_program ON projects(program_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_movements_project ON movements(project_id);
CREATE INDEX idx_movements_date ON movements(date DESC);