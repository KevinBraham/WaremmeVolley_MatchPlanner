/**
 * Script simple pour extraire le schéma Supabase
 * Usage: node scripts/extract-schema.js
 * 
 * Nécessite les variables d'environnement:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY (ou SUPABASE_SERVICE_ROLE_KEY pour plus de détails)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  console.error('\n💡 Astuce: Créez un fichier .env.local avec vos clés Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('🔍 Recherche des tables dans la base de données...\n');
  
  try {
    // Essayer de récupérer les tables via une requête SQL
    // Note: Cette méthode nécessite que RLS permette la lecture
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `
    });

    if (error) {
      console.log('⚠️  Impossible d\'exécuter une requête SQL directe.');
      console.log('📝 Méthode recommandée: Utilisez le script SQL dans Supabase\n');
      console.log('   1. Allez sur https://app.supabase.com');
      console.log('   2. SQL Editor > New Query');
      console.log('   3. Copiez le contenu de scripts/extract-schema.sql');
      console.log('   4. Exécutez la requête\n');
      
      // Essayer de détecter les tables en testant des noms communs
      console.log('🔎 Tentative de détection des tables courantes...\n');
      const commonTables = [
        'teams', 'equipes', 'events', 'evenements',
        'event_templates', 'modeles_evenements',
        'posts', 'postes', 'tasks', 'taches',
        'users', 'utilisateurs', 'comments', 'commentaires'
      ];
      
      for (const tableName of commonTables) {
        const { error: testError } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);
        
        if (!testError) {
          console.log(`   ✓ Table trouvée: ${tableName}`);
          
          // Essayer de récupérer la structure
          const { data: sample } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (sample && sample.length > 0) {
            console.log(`   Colonnes: ${Object.keys(sample[0]).join(', ')}`);
          }
        }
      }
      
      return;
    }

    if (data && data.length > 0) {
      console.log(`✅ ${data.length} table(s) trouvée(s):\n`);
      data.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    } else {
      console.log('❌ Aucune table trouvée dans le schéma public');
    }

  } catch (err) {
    console.error('❌ Erreur:', err.message);
    console.log('\n📝 Utilisez plutôt le script SQL dans Supabase (voir instructions ci-dessus)');
  }
}

// Exécuter
listTables();



