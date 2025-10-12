-- Create secure role system to fix RLS violation and prevent privilege escalation
-- Step 1: Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor_municipal', 'visualizador');

-- Step 2: Create user_roles table with proper security
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 4: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
  CASE profiles.role::text
    WHEN 'administrador' THEN 'admin'::app_role
    WHEN 'gestor_municipal' THEN 'gestor_municipal'::app_role
    ELSE 'visualizador'::app_role
  END
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Step 6: Update municipalities policies
DROP POLICY IF EXISTS "Admins can manage municipalities" ON public.municipalities;
DROP POLICY IF EXISTS "Authenticated users can view municipalities" ON public.municipalities;

CREATE POLICY "Admins can manage municipalities"
  ON public.municipalities FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view municipalities"
  ON public.municipalities FOR SELECT
  USING (auth.role() = 'authenticated');

-- Step 7: Update programs policies
DROP POLICY IF EXISTS "Admins can manage programs" ON public.programs;
DROP POLICY IF EXISTS "Authenticated users can view programs" ON public.programs;

CREATE POLICY "Admins can manage programs"
  ON public.programs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view programs"
  ON public.programs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Step 8: Update projects policies
DROP POLICY IF EXISTS "Admins and managers can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;

CREATE POLICY "Admins and managers can manage projects"
  ON public.projects FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor_municipal')
  );

CREATE POLICY "Authenticated users can view projects"
  ON public.projects FOR SELECT
  USING (auth.role() = 'authenticated');

-- Step 9: Add missing policies for movements table (fix audit trail security)
CREATE POLICY "Users can update their own recent movements"
  ON public.movements FOR UPDATE
  USING (
    (created_by = auth.uid() AND created_at > NOW() - INTERVAL '24 hours')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Only admins can delete movements"
  ON public.movements FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Step 10: Remove role column from profiles to prevent privilege escalation
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Step 11: Update profiles RLS to prevent any privilege escalation attempts
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 12: Fix search_path security issues in existing functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'visualizador'::app_role);
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;