-- ============================================
-- SCRIPT SIMPLE POUR EXTRAIRE LE SCHÉMA
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================

-- Étape 1: Liste de toutes les tables
SELECT 
    'TABLE: ' || table_name AS info
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Étape 2: Structure complète (tables + colonnes)
SELECT 
    t.table_name AS "Table",
    c.column_name AS "Colonne",
    c.data_type AS "Type",
    CASE 
        WHEN c.character_maximum_length IS NOT NULL 
        THEN c.data_type || '(' || c.character_maximum_length || ')'
        ELSE c.data_type
    END AS "Type complet",
    c.is_nullable AS "Nullable",
    c.column_default AS "Valeur par défaut"
FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- Étape 3: Vue simplifiée en JSON (plus lisible)
SELECT 
    table_name AS "Table",
    json_agg(
        json_build_object(
            'colonne', column_name,
            'type', data_type,
            'type_complet', 
                CASE 
                    WHEN character_maximum_length IS NOT NULL 
                    THEN data_type || '(' || character_maximum_length || ')'
                    ELSE data_type
                END,
            'nullable', is_nullable = 'YES',
            'default', column_default,
            'position', ordinal_position
        )
        ORDER BY ordinal_position
    ) AS "Structure"
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



