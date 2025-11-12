-- Ajoute une colonne de rôle pour différencier les administrateurs des agents
-- À exécuter dans Supabase (SQL editor) ou via psql.

ALTER TABLE users_profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agent'::text CHECK (role IN ('agent', 'admin'));

UPDATE users_profiles
SET role = 'agent'
WHERE role IS NULL;

