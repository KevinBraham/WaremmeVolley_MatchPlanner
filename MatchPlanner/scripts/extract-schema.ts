/**
 * Script pour extraire le schéma de la base de données Supabase
 * Usage: npx tsx scripts/extract-schema.ts > schema.sql
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Nécessite la service role key

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables d\'environnement manquantes:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  console.error('\nPour obtenir la service role key:');
  console.error('1. Allez sur https://app.supabase.com');
  console.error('2. Sélectionnez votre projet');
  console.error('3. Allez dans Settings > API');
  console.error('4. Copiez la "service_role" key (secret)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function extractSchema() {
  console.log('-- Schéma de la base de données Supabase');
  console.log('-- Généré le', new Date().toISOString());
  console.log('--\n');

  try {
    // Récupérer toutes les tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      // Essayer une approche alternative via une fonction SQL
      console.log('-- Approche alternative: utilisation de pg_tables\n');
      
      const { data: pgTables, error: pgError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          ORDER BY tablename;
        `
      });

      if (pgError) {
        // Dernière approche: utiliser une requête SQL directe
        const query = `
          SELECT 
            t.table_name,
            json_agg(
              json_build_object(
                'column_name', c.column_name,
                'data_type', c.data_type,
                'is_nullable', c.is_nullable,
                'column_default', c.column_default,
                'character_maximum_length', c.character_maximum_length
              )
              ORDER BY c.ordinal_position
            ) as columns
          FROM information_schema.tables t
          LEFT JOIN information_schema.columns c 
            ON t.table_name = c.table_name 
            AND t.table_schema = c.table_schema
          WHERE t.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
          GROUP BY t.table_name
          ORDER BY t.table_name;
        `;

        // Exécuter via une fonction SQL si disponible
        const { data, error } = await supabase.rpc('get_schema', {});

        if (error) {
          console.error('Erreur lors de l\'extraction:', error.message);
          console.log('\n-- Méthode manuelle recommandée:');
          console.log('1. Allez sur https://app.supabase.com');
          console.log('2. Sélectionnez votre projet');
          console.log('3. Allez dans SQL Editor');
          console.log('4. Exécutez cette requête:');
          console.log(query);
          return;
        }

        if (data) {
          generateSchemaFromData(data);
          return;
        }
      }
    }

    if (tables && tables.length > 0) {
      // Pour chaque table, récupérer les colonnes
      for (const table of tables) {
        await extractTableSchema(table.table_name);
      }
    } else {
      console.log('-- Aucune table trouvée dans le schéma public');
      console.log('-- Ou vous devez utiliser la méthode manuelle ci-dessous\n');
      console.log('-- Méthode manuelle:');
      console.log('1. Allez sur https://app.supabase.com');
      console.log('2. Sélectionnez votre projet');
      console.log('3. Allez dans Database > Tables');
      console.log('4. Pour chaque table, cliquez sur "View" puis "Copy table definition"');
    }
  } catch (error: any) {
    console.error('Erreur:', error.message);
    console.log('\n-- Méthode manuelle recommandée (voir instructions ci-dessus)');
  }
}

async function extractTableSchema(tableName: string) {
  try {
    // Récupérer les colonnes de la table
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');

    if (error) {
      console.log(`-- Erreur pour la table ${tableName}:`, error.message);
      return;
    }

    if (!columns || columns.length === 0) {
      return;
    }

    console.log(`\n-- Table: ${tableName}`);
    console.log(`CREATE TABLE IF NOT EXISTS ${tableName} (`);
    
    const columnDefs: string[] = [];
    for (const col of columns) {
      let def = `  ${col.column_name} ${col.data_type}`;
      
      if (col.character_maximum_length) {
        def += `(${col.character_maximum_length})`;
      }
      
      if (col.is_nullable === 'NO') {
        def += ' NOT NULL';
      }
      
      if (col.column_default) {
        def += ` DEFAULT ${col.column_default}`;
      }
      
      columnDefs.push(def);
    }
    
    console.log(columnDefs.join(',\n'));
    console.log(');\n');

    // Récupérer les clés primaires
    let pk: any = null;
    try {
      const { data } = await supabase.rpc('get_primary_keys', { table_name: tableName });
      pk = data ?? null;
    } catch {
      pk = null;
    }
    
    // Récupérer les contraintes de clés étrangères
    let fk: any = null;
    try {
      const { data } = await supabase.rpc('get_foreign_keys', { table_name: tableName });
      fk = data ?? null;
    } catch {
      fk = null;
    }

  } catch (error: any) {
    console.log(`-- Impossible d'extraire le schéma de ${tableName}:`, error.message);
  }
}

function generateSchemaFromData(data: any) {
  // Si on reçoit des données structurées, les formater
  console.log('-- Données extraites:');
  console.log(JSON.stringify(data, null, 2));
}

// Exécuter le script
extractSchema().catch(console.error);



