# Waremme Volley - Match Planner

Application web de planification de matchs pour la gestion des bénévoles et de leurs tâches.

## 🚀 Fonctionnalités

- ✅ Gestion des événements par équipe (Ligue A, Nat dame, etc.)
- ✅ Modèles d'événements éditables (match, tournoi, etc.)
- ✅ Gestion des postes et tâches avec délais
- ✅ Codes couleur (rouge/orange/vert) selon l'urgence
- ✅ Validation des tâches depuis mobile
- ✅ Commentaires sur les tâches
- ✅ Authentification simple via magic link
- ✅ Interface optimisée pour mobile (PWA)

## 📋 Prérequis

- Node.js 18+ et npm
- Compte Supabase (gratuit)
- Compte Vercel (gratuit, optionnel pour le déploiement)

## 🛠️ Installation

### 1. Cloner le projet

```bash
git clone <votre-repo>
cd MatchPlanner
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Créez un fichier `.env.local` à la racine du projet `MatchPlanner/` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_ici
```

**Pour obtenir ces valeurs :**
1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings > API**
4. Copiez l'**URL** et la **anon/public key**

### 4. Configuration de la base de données

Votre base de données Supabase doit contenir les tables suivantes (déjà créées selon votre schéma) :

- `teams` - Équipes
- `event_templates` - Modèles d'événements
- `template_posts` - Postes dans les modèles
- `template_tasks` - Tâches dans les modèles
- `events` - Événements
- `event_posts` - Postes dans les événements
- `event_tasks` - Tâches dans les événements
- `task_comments` - Commentaires sur les tâches
- `users_profiles` - Profils utilisateurs
- `team_members` - Membres des équipes (optionnel)

**Vérifiez que les politiques RLS (Row Level Security) sont configurées :**
- Tous les utilisateurs authentifiés peuvent lire/écrire toutes les tables
- Voir `docs/schema-proposed.sql` pour un exemple de configuration

### 5. Configuration de l'authentification Supabase

1. Dans Supabase, allez dans **Authentication > URL Configuration**
2. Ajoutez votre URL de redirection : `http://localhost:3000/set-password`
3. Pour la production, ajoutez également votre URL de production

## 🚀 Lancement

### Mode développement

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

### Build de production

```bash
npm run build
npm start
```

## 📱 Utilisation

### Première connexion

1. Allez sur `/login`
2. Entrez votre adresse email
3. Cliquez sur "Recevoir un lien"
4. Ouvrez votre boîte mail et cliquez sur le lien
5. Vous serez redirigé vers `/set-password` pour définir votre mot de passe
6. Après avoir défini votre mot de passe, vous serez redirigé vers la page d'accueil

### Créer un événement

1. Cliquez sur "+ Nouvel événement"
2. Sélectionnez une équipe
3. (Optionnel) Sélectionnez un modèle pour préremplir les postes et tâches
4. Remplissez les informations de l'événement
5. Ajoutez/modifiez les postes et tâches selon vos besoins
6. Enregistrez l'événement

### Valider une tâche

1. Allez sur la page de détail d'un événement
2. Trouvez la tâche à valider
3. Cliquez sur le bouton "Valider"
4. La tâche sera marquée comme complétée avec votre nom

### Ajouter un commentaire

1. Sur la page de détail d'un événement
2. Cliquez sur "+ Ajouter un commentaire" sous une tâche
3. Écrivez votre commentaire
4. Cliquez sur "Envoyer"

## 🏗️ Structure du projet

```
MatchPlanner/
├── app/                    # Pages Next.js
│   ├── login/             # Page de connexion
│   ├── set-password/      # Page de définition du mot de passe
│   ├── events/            # Pages des événements
│   └── page.tsx           # Page d'accueil
├── components/            # Composants React réutilisables
├── lib/                   # Bibliothèques et utilitaires
│   ├── supabase/         # Requêtes Supabase
│   ├── types/            # Types TypeScript
│   ├── utils/            # Utilitaires (dates, couleurs, etc.)
│   └── hooks/            # Hooks React personnalisés
├── scripts/              # Scripts utilitaires
└── docs/                 # Documentation
```

## 🎨 Personnalisation

### Couleurs

Les couleurs sont définies dans `tailwind.config.ts` :
- `primary` : #e31e24 (rouge Waremme Volley)
- `secondary` : #1a1a1a (texte principal)

### Codes couleur des tâches

- 🟢 **Vert** : Tâche complétée ou échéance > 7 jours
- 🟠 **Orange** : Échéance entre 3 et 7 jours
- 🔴 **Rouge** : Échéance < 3 jours ou en retard

## 🐛 Dépannage

### Erreur de connexion à Supabase

- Vérifiez que les variables d'environnement sont correctement définies dans `.env.local`
- Vérifiez que votre projet Supabase est actif
- Vérifiez que les politiques RLS permettent l'accès aux utilisateurs authentifiés

### Erreur lors de la création d'un événement

- Vérifiez que l'équipe sélectionnée existe
- Vérifiez que le modèle sélectionné existe (si utilisé)
- Vérifiez les logs de la console pour plus de détails

### Les couleurs ne s'affichent pas correctement

- Vérifiez que les dates d'échéance des tâches sont correctement définies
- Vérifiez que la fonction `getTaskStatusColor` fonctionne correctement

## 📚 Documentation supplémentaire

- [Extraction du schéma de la base de données](scripts/README.md)
- [Schéma de base de données proposé](docs/schema-proposed.sql)
- [Instructions d'extraction du schéma](docs/EXTRACTION_SCHEMA.md)

## 🚢 Déploiement

### Déploiement sur Vercel

1. Poussez votre code sur GitHub
2. Allez sur [https://vercel.com](https://vercel.com)
3. Importez votre projet
4. Ajoutez les variables d'environnement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Déployez !

### Configuration de l'authentification pour la production

1. Dans Supabase, allez dans **Authentication > URL Configuration**
2. Ajoutez votre URL de production Vercel : `https://votre-app.vercel.app/set-password`
3. Ajoutez également `https://votre-app.vercel.app` dans les URLs autorisées

## 📝 Licence

Ce projet est privé et réservé à l'usage de Waremme Volley.

## 🤝 Support

Pour toute question ou problème, contactez l'administrateur du projet.



