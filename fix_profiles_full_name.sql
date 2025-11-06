-- Script para corrigir a tabela profiles e adicionar a coluna full_name
-- Execute este script no Supabase Dashboard > SQL Editor se a coluna full_name não existir

-- Adicionar coluna full_name se não existir
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Se a coluna name existir e full_name estiver vazia, copiar dados de name para full_name
DO $$
BEGIN
  -- Verificar se a coluna name existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'name'
  ) THEN
    -- Atualizar full_name com name onde full_name está NULL ou vazio
    UPDATE public.profiles 
    SET full_name = name 
    WHERE (full_name IS NULL OR full_name = '') 
    AND name IS NOT NULL 
    AND name != '';
  END IF;
END $$;

-- Criar índice se não existir
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

-- Adicionar coluna phone se não existir
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Criar índice para phone se não existir
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

