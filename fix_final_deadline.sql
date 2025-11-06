-- Script para adicionar a coluna final_deadline à tabela projects
-- Execute este script no Supabase Dashboard > SQL Editor

-- Adicionar coluna final_deadline se não existir
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS final_deadline DATE;

-- Criar índice para melhor performance em filtros
CREATE INDEX IF NOT EXISTS projects_final_deadline_idx ON projects(final_deadline);

-- Verificar se a coluna foi criada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'final_deadline';

