# 📦 Installation de Node.js sur Windows

## ⚠️ Problème

Vous voyez l'erreur :
```
npm : Le terme «npm» n'est pas reconnu...
```

Cela signifie que **Node.js n'est pas installé** sur votre ordinateur.

## ✅ Solution : Installer Node.js

### Étape 1 : Télécharger Node.js

1. **Allez sur le site officiel de Node.js** :
   - https://nodejs.org/
   - Ou cherchez "Node.js download" sur Google

2. **Téléchargez la version LTS** (Long Term Support)
   - Cliquez sur le bouton vert **"LTS"** (pas "Current")
   - La version actuelle LTS est généralement la 20.x ou 18.x
   - Le fichier téléchargé s'appelle quelque chose comme : `node-v20.11.0-x64.msi`

### Étape 2 : Installer Node.js

1. **Double-cliquez sur le fichier téléchargé** (`node-v20.11.0-x64.msi`)

2. **Suivez l'installation** :
   - Cliquez sur "Next" plusieurs fois
   - **Cochez la case "Automatically install the necessary tools"** si elle apparaît
   - Cliquez sur "Install"
   - Entrez le mot de passe administrateur si demandé
   - Attendez la fin de l'installation

3. **Cliquez sur "Finish"**

### Étape 3 : Redémarrer le terminal

1. **Fermez complètement** votre terminal PowerShell/CMD
2. **Fermez Visual Studio** (si vous l'utilisez)
3. **Rouvrez Visual Studio** (ou votre terminal)
4. **Rouvrez un nouveau terminal**

### Étape 4 : Vérifier l'installation

Dans le terminal, tapez :

```powershell
node --version
```

Vous devriez voir quelque chose comme : `v20.11.0`

Puis tapez :

```powershell
npm --version
```

Vous devriez voir quelque chose comme : `10.2.4`

**Si ça fonctionne, Node.js est installé ! ✅**

## 🚀 Maintenant, vous pouvez continuer

Une fois Node.js installé, retournez dans le dossier `MatchPlanner` et tapez :

```bash
npm install
```

## 📝 Alternative : Utiliser Visual Studio Code

**Recommandation :** Utilisez **Visual Studio Code** (gratuit) au lieu de Visual Studio pour ce projet :

1. **Téléchargez Visual Studio Code** :
   - https://code.visualstudio.com/
   - C'est différent de Visual Studio (plus léger, meilleur pour web)

2. **Installez-le**

3. **Ouvrez le dossier `MatchPlanner` dans VS Code**

4. **Ouvrez le terminal** : `Ctrl + '`

5. **Tapez les commandes** : `npm install`

## ❓ Problèmes courants

### "Le terminal ne reconnaît toujours pas npm après l'installation"

**Solution :**
1. **Fermez complètement** tous les terminaux et Visual Studio
2. **Redémarrez votre ordinateur** (parfois nécessaire)
3. **Rouvrez le terminal** et réessayez

### "Je ne trouve pas le fichier téléchargé"

**Solution :**
- Regardez dans votre dossier "Téléchargements"
- Ou allez dans votre navigateur : `Ctrl + J` pour voir les téléchargements

### "L'installation demande des permissions administrateur"

**Solution :**
- C'est normal ! Cliquez sur "Oui" ou entrez votre mot de passe administrateur

## 🎯 Résumé

1. ✅ Téléchargez Node.js depuis https://nodejs.org/ (version LTS)
2. ✅ Installez-le (double-clic sur le fichier .msi)
3. ✅ Redémarrez votre terminal
4. ✅ Vérifiez avec `node --version` et `npm --version`
5. ✅ Retournez dans `MatchPlanner` et tapez `npm install`

## 💡 Astuce

Si vous êtes pressé, vous pouvez aussi utiliser **nvm-windows** (Node Version Manager) :
- https://github.com/coreybutler/nvm-windows
- Mais l'installation directe de Node.js est plus simple pour débuter



