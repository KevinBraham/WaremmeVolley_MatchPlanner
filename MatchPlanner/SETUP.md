# Guide de configuration rapide

## ✅ Ce qui a été créé

### Structure de base
- ✅ Types TypeScript pour toutes les tables de la base de données
- ✅ Fonctions de requêtes Supabase (CRUD complet)
- ✅ Hooks React personnalisés (`useAuth`)
- ✅ Utilitaires (dates, couleurs de statut)
- ✅ Composants réutilisables (StatusBadge, EventCard, Header)
- ✅ Pages principales :
  - Page d'accueil avec liste des événements
  - Page de connexion
  - Page de définition du mot de passe
  - Page de détail d'événement (avec validation des tâches, commentaires)

### Fonctionnalités implémentées
- ✅ Authentification via magic link
- ✅ Gestion des profils utilisateurs
- ✅ Affichage des événements avec codes couleur
- ✅ Validation des tâches
- ✅ Commentaires sur les tâches
- ✅ Calcul automatique des couleurs (rouge/orange/vert)
- ✅ Interface responsive

## 🚀 Démarrage rapide

### 1. Installer les dépendances

```bash
cd MatchPlanner
npm install
```

### 2. Configurer les variables d'environnement

Créez un fichier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_ici
```

### 3. Lancer l'application

```bash
npm run dev
```

L'application sera accessible sur http://localhost:3000

## 📋 Pages à créer (optionnel)

Les pages suivantes ne sont pas encore créées mais peuvent être ajoutées facilement :

1. **Page de création d'événement** (`/events/new`)
   - Formulaire pour créer un nouvel événement
   - Sélection d'équipe
   - Sélection de modèle (optionnel)
   - Ajout de postes et tâches

2. **Page de gestion des modèles** (`/templates`)
   - Liste des modèles
   - Création/édition de modèles
   - Gestion des postes et tâches dans les modèles

3. **Page de gestion des équipes** (`/teams`)
   - Liste des équipes
   - Création/édition d'équipes

4. **Page d'édition d'événement** (`/events/[id]/edit`)
   - Modification d'un événement existant
   - Ajout/suppression de postes et tâches

## 🔧 Configuration Supabase

### Vérifier les politiques RLS

Assurez-vous que les politiques Row Level Security sont configurées pour permettre aux utilisateurs authentifiés d'accéder aux données :

```sql
-- Exemple de politique pour la table events
CREATE POLICY "Authenticated users can manage events" ON events
  FOR ALL USING (auth.role() = 'authenticated');
```

Répétez pour toutes les tables :
- `teams`
- `event_templates`
- `template_posts`
- `template_tasks`
- `events`
- `event_posts`
- `event_tasks`
- `task_comments`
- `users_profiles`

### Configuration de l'authentification

1. Dans Supabase, allez dans **Authentication > URL Configuration**
2. Ajoutez les URLs de redirection :
   - `http://localhost:3000/set-password` (développement)
   - `https://votre-domaine.com/set-password` (production)

## 📱 Test de l'application

### Test de connexion

1. Allez sur http://localhost:3000/login
2. Entrez votre adresse email
3. Cliquez sur "Recevoir un lien"
4. Vérifiez votre boîte mail
5. Cliquez sur le lien dans l'email
6. Vous serez redirigé vers `/set-password`
7. Définissez votre mot de passe
8. Vous serez redirigé vers la page d'accueil

### Test de création d'événement

Pour tester la création d'événements, vous pouvez :
1. Utiliser l'interface Supabase directement
2. Créer les pages de création (voir section "Pages à créer")
3. Utiliser les fonctions de requêtes directement dans la console du navigateur

## 🐛 Problèmes courants

### Erreur "Cannot find module"

```bash
npm install
```

### Erreur de connexion à Supabase

- Vérifiez que `.env.local` contient les bonnes valeurs
- Vérifiez que votre projet Supabase est actif
- Vérifiez les politiques RLS

### Les événements ne s'affichent pas

- Vérifiez que vous avez créé des événements dans Supabase
- Vérifiez que les politiques RLS permettent l'accès
- Vérifiez la console du navigateur pour les erreurs

## 📚 Documentation

- [README principal](README.md)
- [Extraction du schéma](scripts/README.md)
- [Schéma de base de données](docs/schema-proposed.sql)

## 🎯 Prochaines étapes

1. ✅ Configurer les variables d'environnement
2. ✅ Tester la connexion
3. ⏳ Créer des événements de test dans Supabase
4. ⏳ Tester l'affichage des événements
5. ⏳ Tester la validation des tâches
6. ⏳ Créer les pages manquantes (création d'événement, modèles, équipes)
7. ⏳ Déployer sur Vercel



