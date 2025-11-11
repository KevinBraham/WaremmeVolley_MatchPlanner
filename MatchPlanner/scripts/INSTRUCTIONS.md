# Instructions pour extraire le schéma

## ⚠️ IMPORTANT: Quelle méthode utiliser?

### ✅ Méthode 1: Éditeur SQL de Supabase (RECOMMANDÉ)

**Utilisez les fichiers `.sql` dans l'éditeur SQL de Supabase:**

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor** dans le menu de gauche
4. Cliquez sur **New Query**
5. **Copiez le contenu d'UN des fichiers suivants:**
   - `extract-schema-simple.sql` (⭐ Le plus simple, commencez par celui-ci)
   - `extract-schema.sql` (Version complète avec toutes les informations)
6. **Collez** dans l'éditeur SQL
7. Cliquez sur **Run** ou appuyez sur **Ctrl+Enter**
8. Les résultats s'affichent en bas
9. **Copiez les résultats** et sauvegardez-les dans un fichier

### ❌ NE PAS utiliser les fichiers `.js` dans Supabase

Les fichiers `.js` (JavaScript) sont pour le terminal Node.js, **PAS pour l'éditeur SQL**.

Si vous voulez utiliser les fichiers `.js`:

1. **Ouvrez un terminal** dans votre projet
2. Installez les dépendances si nécessaire:
   ```bash
   npm install dotenv
   ```
3. Créez un fichier `.env.local` avec:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
   ```
4. Exécutez:
   ```bash
   node scripts/extract-schema.js
   ```

## 📋 Fichiers disponibles

| Fichier | Usage | Où l'exécuter |
|---------|-------|---------------|
| `extract-schema-simple.sql` | ⭐ **Le plus simple** - Vue d'ensemble rapide | Éditeur SQL Supabase |
| `extract-schema.sql` | Version complète - Toutes les infos | Éditeur SQL Supabase |
| `extract-schema.js` | Version Node.js - Détection automatique | Terminal Node.js |
| `extract-schema.ts` | Version TypeScript (avancée) | Terminal avec ts-node |

## 🚀 Démarrage rapide

**Pour la plupart des utilisateurs, utilisez cette méthode:**

1. Ouvrez `scripts/extract-schema-simple.sql`
2. Copiez tout le contenu
3. Collez dans l'éditeur SQL de Supabase
4. Exécutez
5. Copiez les résultats

C'est tout! 🎉



