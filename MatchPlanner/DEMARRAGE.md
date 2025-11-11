# 🚀 Guide de démarrage - Où taper les commandes

## 📍 Dans Visual Studio Code

### Méthode 1 : Terminal intégré (RECOMMANDÉ)

1. **Ouvrez Visual Studio Code** dans le dossier du projet
   - Ouvrez le dossier `MatchPlanner` dans VS Code

2. **Ouvrez un terminal** dans VS Code :
   - **Menu** : `Terminal` → `New Terminal`
   - **Raccourci clavier** : `Ctrl + '` (apostrophe) ou `Ctrl + Shift + '`
   - **Ou** : Clic droit dans l'explorateur de fichiers → `Open in Integrated Terminal`

3. **Le terminal s'ouvre en bas de l'écran**
   - Vous verrez quelque chose comme : `PS C:\Users\AgentK\source\repos\KevinBraham\WaremmeVolley_MatchPlanner\MatchPlanner>`
   - C'est là que vous tapez les commandes !

### Méthode 2 : Terminal Windows séparé

1. **Ouvrez PowerShell ou CMD**
   - Appuyez sur `Windows + R`
   - Tapez `powershell` ou `cmd`
   - Appuyez sur `Entrée`

2. **Naviguez vers le dossier du projet**
   ```powershell
   cd C:\Users\AgentK\source\repos\KevinBraham\WaremmeVolley_MatchPlanner\MatchPlanner
   ```

## ✅ Commandes à taper

Une fois le terminal ouvert dans le bon dossier, tapez ces commandes **une par une** :

### 1. Installer les dépendances

```bash
npm install
```

**Ce que ça fait :** Installe tous les packages nécessaires (Next.js, React, Supabase, etc.)

**Temps d'attente :** 1-2 minutes

### 2. Créer le fichier `.env.local`

**⚠️ IMPORTANT :** Créez ce fichier dans le dossier `MatchPlanner` avec votre éditeur de texte ou VS Code.

**Option A : Dans VS Code**
1. Cliquez sur le bouton "New File" dans l'explorateur
2. Nommez-le `.env.local`
3. Collez ce contenu :
```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_ici
```
4. Remplacez les valeurs par vos vraies clés Supabase

**Option B : Dans le terminal**
```powershell
# Créer le fichier
New-Item -Path .env.local -ItemType File

# Puis ouvrez-le dans VS Code et ajoutez le contenu
```

### 3. Lancer l'application

```bash
npm run dev
```

**Ce que ça fait :** Lance le serveur de développement

**Résultat attendu :** Vous verrez quelque chose comme :
```
▲ Next.js 14.2.5
- Local:        http://localhost:3000
- Ready in 2.3s
```

### 4. Ouvrir l'application

1. Ouvrez votre navigateur (Chrome, Firefox, Edge)
2. Allez sur : `http://localhost:3000`
3. Vous devriez voir la page de connexion !

## 🖼️ À quoi ça ressemble

### Dans VS Code :

```
┌─────────────────────────────────────────┐
│  Fichiers du projet (à gauche)          │
│                                         │
│  MatchPlanner/                          │
│  ├── app/                               │
│  ├── lib/                               │
│  └── ...                                │
│                                         │
├─────────────────────────────────────────┤
│  Terminal (en bas)                      │
│  PS MatchPlanner> npm install           │
│  added 500 packages                     │
│  PS MatchPlanner> _                     │
└─────────────────────────────────────────┘
```

## ❓ Problèmes courants

### "npm n'est pas reconnu"

**Solution :** Installez Node.js
1. Allez sur https://nodejs.org/
2. Téléchargez la version LTS
3. Installez-la
4. Redémarrez VS Code

### "Le terminal ne s'ouvre pas"

**Solution :** 
1. Menu `Terminal` → `New Terminal`
2. Ou utilisez PowerShell/CMD en dehors de VS Code

### "Le dossier n'est pas le bon"

**Solution :** Vérifiez que vous êtes dans le dossier `MatchPlanner`
```powershell
# Voir où vous êtes
pwd

# Aller dans le bon dossier
cd C:\Users\AgentK\source\repos\KevinBraham\WaremmeVolley_MatchPlanner\MatchPlanner
```

### "La commande npm install échoue"

**Solution :**
1. Vérifiez que Node.js est installé : `node --version`
2. Vérifiez que npm est installé : `npm --version`
3. Essayez de supprimer le dossier `node_modules` et recommencez

## 🎯 Résumé rapide

1. **Ouvrez VS Code** dans le dossier `MatchPlanner`
2. **Ouvrez le terminal** : `Ctrl + '`
3. **Tapez** : `npm install`
4. **Créez** le fichier `.env.local` avec vos clés Supabase
5. **Tapez** : `npm run dev`
6. **Ouvrez** : `http://localhost:3000`

C'est tout ! 🎉



