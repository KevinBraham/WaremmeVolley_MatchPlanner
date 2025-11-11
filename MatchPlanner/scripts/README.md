# Scripts utilitaires

## 🎯 Extraction du schéma de la base de données

### ⚠️ IMPORTANT: Utilisez les fichiers `.sql` dans Supabase

Les fichiers `.sql` sont à exécuter dans l'**éditeur SQL de Supabase**, PAS dans un terminal.

Les fichiers `.js` sont pour le terminal Node.js (optionnel, plus complexe).

### ✅ Méthode recommandée (la plus simple)

1. **Allez sur Supabase Dashboard**
   - https://app.supabase.com
   - Sélectionnez votre projet

2. **Ouvrez l'éditeur SQL**
   - Cliquez sur **SQL Editor** dans le menu de gauche
   - Cliquez sur **New Query**

3. **Copiez et exécutez le script**
   - Ouvrez le fichier `extract-schema-simple.sql` ⭐ (commencez par celui-ci)
   - OU `extract-schema.sql` (version complète)
   - Copiez tout son contenu
   - Collez dans l'éditeur SQL
   - Cliquez sur **Run** ou **Ctrl+Enter**

4. **Récupérez les résultats**
   - Les résultats s'affichent en bas
   - Vous pouvez les exporter ou les copier
   - Sauvegardez-les dans un fichier texte

### 📁 Fichiers disponibles

- **`extract-schema-simple.sql`** ⭐ - Le plus simple, vue d'ensemble rapide
- **`extract-schema.sql`** - Version complète avec toutes les informations détaillées
- **`extract-schema.js`** - Version Node.js (pour terminal, optionnel)
- **`INSTRUCTIONS.md`** - Instructions détaillées

### 📋 Ce que vous obtiendrez

- ✅ Liste de toutes les tables
- ✅ Structure complète de chaque table (colonnes, types, contraintes)
- ✅ Clés primaires
- ✅ Clés étrangères (relations entre tables)
- ✅ Index
- ✅ Politiques RLS (Row Level Security)
- ✅ Commandes CREATE TABLE générées automatiquement

### 🚀 Démarrage rapide

1. Ouvrez `extract-schema-simple.sql`
2. Copiez le contenu
3. Collez dans l'éditeur SQL de Supabase
4. Exécutez
5. Copiez les résultats

C'est tout! 🎉

