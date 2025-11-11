-- ============================================
-- EXTRACTION RAPIDE DU SCHÉMA
-- Copiez cette requête dans l'éditeur SQL de Supabase
-- ============================================

-- Cette requête vous donne une vue d'ensemble en JSON
-- Plus facile à lire et à copier

SELECT 
    table_name AS "Table",
    json_agg(
        json_build_object(
            'colonne', column_name,
            'type', 
                CASE 
                    WHEN character_maximum_length IS NOT NULL 
                    THEN data_type || '(' || character_maximum_length || ')'
                    ELSE data_type
                END,
            'nullable', is_nullable = 'YES',
            'default', column_default
        )
        ORDER BY ordinal_position
    ) AS "Colonnes"
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    )
GROUP BY table_name
ORDER BY table_name;



