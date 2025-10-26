-- Migração para alterar o status 'enviado' para 'em_elaboracao'
-- Esta migração atualiza o enum project_status e os dados existentes

-- Primeiro, vamos adicionar o novo valor ao enum
ALTER TYPE public.project_status ADD VALUE 'em_elaboracao';

-- IMPORTANTE: Execute esta migração primeiro, depois execute a próxima migração
-- (20250117000002_update_project_data.sql) para atualizar os dados
