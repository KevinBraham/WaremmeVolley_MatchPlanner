# Configuration Google Drive pour les pièces jointes

Ce guide explique comment configurer Google Drive pour stocker les pièces jointes des tâches et commentaires.

## Prérequis

- Un compte Google avec Google Drive
- Un projet Google Cloud Platform

## Coûts et limites

### Stockage Google Drive

**Compte Google gratuit** :
- ✅ **15 GB de stockage gratuit** (partagé entre Gmail, Drive et Photos)
- ✅ **Gratuit** pour l'utilisation de l'API Google Drive
- ⚠️ Limite de **5 millions de fichiers** maximum

**Compte Google payant (Google One)** :
- 💰 **2 TB** : ~10€/mois
- 💰 **5 TB** : ~25€/mois
- 💰 **10 TB** : ~50€/mois
- ✅ Même limite de 5 millions de fichiers

**Important** :
- L'**API Google Drive est gratuite** (pas de coût pour les appels API)
- Seul le **stockage** peut être payant si vous dépassez 15 GB
- Les fichiers uploadés comptent dans votre quota Google Drive

### Recommandations

Pour un usage modéré (quelques centaines de fichiers par mois), le compte gratuit (15 GB) devrait suffire. Si vous avez déjà un forfait Google payant, il sera utilisé automatiquement.

## Étapes de configuration

### 1. Créer un projet Google Cloud Platform

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Notez l'ID du projet

### 2. Activer l'API Google Drive

1. Dans Google Cloud Console, allez dans **APIs & Services > Library**
2. Recherchez "Google Drive API"
3. Cliquez sur **Enable** pour activer l'API

### 3. Créer des identifiants OAuth 2.0

1. Allez dans **APIs & Services > Credentials**
2. Cliquez sur **Create Credentials > OAuth client ID**
3. Si c'est la première fois, configurez l'écran de consentement OAuth :
   - Choisissez **External** (ou Internal si vous avez un compte Google Workspace)
   - Remplissez les informations requises :
     - **Nom de l'application** : "Waremme Volley Match Planner" (ou un nom de votre choix)
     - **Email de support utilisateur** : votre email
     - **Email du développeur** : votre email
   - Cliquez sur **Save and Continue**
   - **Scopes** : Cliquez sur **Add or Remove Scopes**, sélectionnez `.../auth/drive.file`, puis **Update** et **Save and Continue**
   - **Test users** : **C'EST TRÈS IMPORTANT** - Ajoutez tous les emails qui devront utiliser l'application :
     - Cliquez sur **Add Users**
     - Ajoutez votre email et tous les emails des utilisateurs qui utiliseront l'application
     - Cliquez sur **Add** puis **Save and Continue**
   - Cliquez sur **Back to Dashboard**
4. Retournez dans **Credentials** et cliquez sur **Create Credentials > OAuth client ID**
5. Pour le type d'application, choisissez **Web application**
6. Donnez un nom à votre client (ex: "Match Planner Web Client")
7. Configurez les URI de redirection autorisés :
   - `http://localhost:3000/api/google-drive/callback` (pour le développement)
   - `https://match-planner.vercel.app/api/google-drive/callback` (pour la production)
   - Cliquez sur **+ Add URI** pour chaque URI
8. Cliquez sur **Create**
9. **Important** : Copiez le **Client ID** et le **Client Secret** (vous ne pourrez plus voir le secret après)

### 4. Obtenir le Refresh Token

**Important** : Vous devez d'abord configurer `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans Vercel (voir étape 6) et redéployer l'application.

1. Ouvrez votre navigateur et allez à :
   ```
   https://match-planner.vercel.app/api/google-drive/auth
   ```
   (ou `http://localhost:3000/api/google-drive/auth` pour le développement local)

2. **Si rien ne se passe** ou si vous voyez une erreur :
   - Vérifiez que `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont bien configurés dans Vercel
   - Vérifiez que vous avez redéployé l'application après avoir ajouté les variables
   - Consultez la page d'aide : `https://match-planner.vercel.app/api/google-drive/setup`

3. Si tout est correct, vous serez **automatiquement redirigé** vers Google pour autoriser l'application

4. Acceptez les permissions demandées

5. Vous serez redirigé vers `/api/google-drive/callback` avec un code dans l'URL

6. Le refresh token sera affiché dans la réponse JSON

7. **Copiez ce refresh token** et ajoutez-le dans Vercel comme variable d'environnement `GOOGLE_REFRESH_TOKEN`

8. **Redéployez** l'application sur Vercel pour que le refresh token soit pris en compte

**Note** : Si vous avez reçu le code mais que le callback s'est fait en local, vous pouvez :
- Soit utiliser la page d'échange : `https://match-planner.vercel.app/api/google-drive/exchange` et coller votre code
- Soit refaire le processus complet en utilisant `https://match-planner.vercel.app/api/google-drive/auth` (recommandé)

### 5. Créer un dossier sur Google Drive (optionnel)

1. Allez sur [Google Drive](https://drive.google.com)
2. Créez un nouveau dossier pour stocker les pièces jointes (par exemple : "WaremmeVolley_PiecesJointes")
3. Cliquez avec le bouton droit sur le dossier > **Partager**
4. Partagez-le avec le compte Google utilisé pour l'authentification
5. Ouvrez le dossier et copiez l'ID depuis l'URL :
   ```
   https://drive.google.com/drive/folders/XXXXXXXXXXXXX
   ```
   L'ID est la partie `XXXXXXXXXXXXX`

### 6. Configurer les variables d'environnement

#### Pour le développement local

Ajoutez ces variables à votre fichier `.env.local` :

```env
# Google Drive Configuration
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-drive/callback
GOOGLE_REFRESH_TOKEN=votre_refresh_token
GOOGLE_DRIVE_FOLDER_ID=id_du_dossier_google_drive

# Supabase Service Role Key (nécessaire pour les API routes)
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
```

#### Pour Vercel (production)

1. Allez sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet `match-planner`
3. Allez dans **Settings → Environment Variables**
4. Ajoutez ces variables (pour **Production**, **Preview**, et **Development** si vous voulez) :

   - `GOOGLE_CLIENT_ID` = votre_client_id
   - `GOOGLE_CLIENT_SECRET` = votre_client_secret
   - `GOOGLE_REDIRECT_URI` = `https://match-planner.vercel.app/api/google-drive/callback`
   - `GOOGLE_REFRESH_TOKEN` = (vous l'obtiendrez à l'étape suivante)
   - `GOOGLE_DRIVE_FOLDER_ID` = (optionnel, ID du dossier Google Drive)
   - `SUPABASE_SERVICE_ROLE_KEY` = votre_service_role_key

5. **Important** : Après avoir ajouté les variables, vous devez **redéployer** votre application sur Vercel pour qu'elles soient prises en compte.

**Note** : La `SUPABASE_SERVICE_ROLE_KEY` est nécessaire pour que les API routes puissent effectuer des opérations serveur. Vous pouvez la trouver dans Supabase Dashboard > Settings > API > service_role key (gardez-la secrète !)

**Pour la production**, utilisez votre domaine Vercel :
```env
GOOGLE_REDIRECT_URI=https://match-planner.vercel.app/api/google-drive/callback
```

### 7. Exécuter la migration de base de données

Exécutez la migration SQL pour créer la table `attachments` :

1. Allez dans Supabase Dashboard > SQL Editor
2. Copiez le contenu de `scripts/migrations/20250115_add_attachments.sql`
3. Exécutez la requête

## Vérification

Une fois la configuration terminée :

1. Redémarrez votre serveur Next.js
2. Allez sur une page d'événement
3. Vous devriez voir un bouton "📎 Ajouter une pièce jointe" sous chaque tâche
4. Testez l'upload d'un fichier

## Dépannage

### Erreur : "L'appli est en cours de test et seuls les testeurs approuvés y ont accès"

**C'est l'erreur que vous rencontrez !** Solution :

1. Allez dans **Google Cloud Console > APIs & Services > OAuth consent screen**
2. Dans la section **Test users**, vérifiez que votre email est bien ajouté
3. Si votre email n'est pas dans la liste :
   - Cliquez sur **Add Users**
   - Ajoutez votre email (celui que vous utilisez pour vous connecter à Google)
   - Cliquez sur **Add**
   - **Important** : Attendez quelques minutes pour que les changements soient pris en compte
4. Réessayez l'authentification

**Note** : Pour que tous les utilisateurs puissent utiliser l'application sans être ajoutés manuellement, vous devrez publier l'application (nécessite une vérification Google pour les applications externes).

### Erreur : "GOOGLE_REFRESH_TOKEN n'est pas configuré"

- Vérifiez que toutes les variables d'environnement sont définies dans `.env.local` (local) ou Vercel (production)
- Redémarrez le serveur après avoir ajouté les variables
- Redéployez l'application sur Vercel après avoir ajouté les variables

### Erreur : "Invalid credentials"

- Vérifiez que le Client ID et Client Secret sont corrects
- Vérifiez que l'API Google Drive est activée dans Google Cloud Console
- Vérifiez que les URI de redirection sont correctement configurées

### Erreur : "Access denied"

- Vérifiez que le refresh token est valide
- Vous devrez peut-être régénérer le refresh token en suivant l'étape 4
- Vérifiez que vous êtes connecté avec un compte Google qui est dans la liste des test users

### Les fichiers ne s'affichent pas

- Vérifiez que la migration SQL a été exécutée
- Vérifiez les logs du serveur pour les erreurs
- Vérifiez que les permissions RLS (Row Level Security) sont correctement configurées

## Sécurité

- **Ne commitez jamais** le fichier `.env.local` dans Git
- Le refresh token donne un accès permanent - gardez-le secret
- Les fichiers uploadés sont accessibles en lecture seule pour tous (via le lien partagé)
- Pour plus de sécurité, vous pouvez configurer des permissions plus restrictives dans Google Drive

## Limitations

- Taille maximale par fichier : 50MB (configurable dans `app/api/attachments/upload/route.ts`)
- Les fichiers sont stockés indéfiniment sur Google Drive
- La suppression d'une pièce jointe supprime également le fichier de Google Drive
- Limite de stockage selon votre forfait Google (15 GB gratuit, puis payant)

## Alternatives si le stockage Google Drive ne suffit pas

Si vous avez besoin de plus de stockage ou préférez une autre solution :

### Option 1 : Supabase Storage (recommandé si vous utilisez déjà Supabase)
- ✅ Intégré directement avec Supabase
- ✅ Facile à configurer
- 💰 Gratuit jusqu'à 1 GB, puis payant (~0.021€/GB/mois)
- ⚠️ Nécessite une modification du code pour utiliser Supabase Storage au lieu de Google Drive

### Option 2 : AWS S3 / Cloudflare R2
- 💰 Très économique pour le stockage
- ⚠️ Nécessite une configuration plus complexe
- ⚠️ Nécessite une modification du code

### Option 3 : Augmenter le forfait Google One
- ✅ Simple : juste payer plus
- ✅ Pas de modification de code nécessaire
- 💰 ~10€/mois pour 2 TB

