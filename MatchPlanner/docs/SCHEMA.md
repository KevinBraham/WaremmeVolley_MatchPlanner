# Schéma de la base de données

## Extraction du schéma existant

Pour extraire le schéma de votre base de données Supabase existante:

### Méthode 1: Via l'éditeur SQL de Supabase (Recommandé)

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Créez une nouvelle requête
5. Copiez le contenu de `scripts/extract-schema.sql`
6. Exécutez la requête
7. Copiez les résultats et sauvegardez-les

### Méthode 2: Via un script Node.js

1. Assurez-vous d'avoir un fichier `.env.local` avec:
   ```
   NEXT_PUBLIC_SUPABASE_URL=votre_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
   ```

2. Exécutez:
   ```bash
   node scripts/extract-schema.js
   ```

## Schéma proposé

Un schéma complet est disponible dans `docs/schema-proposed.sql`. Ce schéma inclut:

### Tables principales

1. **teams** - Équipes (Ligue A, Nat dame, etc.)
2. **event_templates** - Modèles d'événements (match, tournoi, etc.)
3. **template_positions** - Postes dans les modèles (entrée, marketing, etc.)
4. **template_tasks** - Tâches dans les postes des modèles
5. **events** - Événements réels
6. **event_positions** - Postes dans les événements
7. **event_tasks** - Tâches dans les événements
8. **task_comments** - Commentaires sur les tâches

### Fonctionnalités

- **Gestion des délais**: Calcul automatique des couleurs (rouge/orange/vert) basé sur les dates d'échéance
- **Statut des tâches**: pending, in_progress, completed
- **Validation des tâches**: Suivi de qui a validé et quand
- **Commentaires**: Possibilité d'ajouter des commentaires sur les tâches
- **Row Level Security**: Tous les utilisateurs authentifiés ont accès complet (pas de gestion de droits)

### Utilisation

Pour créer ce schéma dans votre base Supabase:

1. Allez dans **SQL Editor**
2. Copiez le contenu de `docs/schema-proposed.sql`
3. Exécutez la requête
4. Vérifiez que les tables ont été créées dans **Database > Tables**

## Comparaison avec le schéma existant

Si vous avez déjà créé des tables, comparez le schéma proposé avec votre schéma existant et ajustez selon vos besoins.



