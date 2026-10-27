-- Adicionar coluna UF na tabela companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS uf TEXT DEFAULT '';
