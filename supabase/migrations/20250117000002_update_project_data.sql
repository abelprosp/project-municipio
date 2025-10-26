-- Migração para atualizar os dados após adicionar o novo valor ao enum
-- Execute esta migração APÓS executar 20250117000001_update_project_status.sql

-- Atualizar os dados existentes que têm status 'enviado'
UPDATE public.projects 
SET status = 'em_elaboracao'::project_status 
WHERE status = 'enviado'::project_status;

-- Atualizar a tabela movements também
UPDATE public.movements 
SET stage = 'em_elaboracao'::project_status 
WHERE stage = 'enviado'::project_status;

-- Nota: Não é possível remover valores de um enum diretamente no PostgreSQL
-- O valor 'enviado' permanecerá no enum mas não será usado
-- Se necessário, podemos criar um novo enum e migrar os dados, mas isso é mais complexo
-- Para este caso, vamos deixar o valor 'enviado' no enum mas não utilizá-lo
