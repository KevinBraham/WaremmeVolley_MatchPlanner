# 📦 Installation de Node.js avec Chocolatey

## ✅ Bonne nouvelle !

Vous avez déjà **Chocolatey** installé ! C'est parfait, on peut l'utiliser pour installer Node.js rapidement.

## 🚀 Installation de Node.js

### Étape 1 : Fermer et rouvrir le terminal

**Important :** Fermez complètement votre terminal PowerShell et rouvrez-en un nouveau (en tant qu'administrateur).

### Étape 2 : Installer Node.js

Dans le nouveau terminal PowerShell (en tant qu'administrateur), tapez :

```powershell
choco install nodejs-lts -y
```

**Ce que ça fait :**
- Installe Node.js (version LTS - Long Term Support)
- Installe automatiquement npm (gestionnaire de packages)
- Ajoute Node.js au PATH

**Temps d'attente :** 2-5 minutes (téléchargement et installation)

### Étape 3 : Vérifier l'installation

Une fois l'installation terminée, **fermez et rouvrez** votre terminal, puis tapez :

```powershell
node --version
```

Vous devriez voir quelque chose comme : `v20.11.0` ou `v18.19.0`

Puis tapez :

```powershell
npm --version
```

Vous devriez voir quelque chose comme : `10.2.4` ou `9.2.0`

**Si les deux commandes fonctionnent, Node.js est installé ! ✅**

## 🎯 Maintenant, vous pouvez continuer

1. **Naviguez vers le dossier du projet** :
   ```powershell
   cd C:\Users\AgentK\source\repos\KevinBraham\WaremmeVolley_MatchPlanner\MatchPlanner
   ```

2. **Installez les dépendances** :
   ```powershell
   npm install
   ```

3. **Lancez l'application** :
   ```powershell
   npm run dev
   ```

## 🔄 Alternative : Installation manuelle

Si Chocolatey ne fonctionne pas, installez Node.js manuellement :

1. **Allez sur** : https://nodejs.org/
2. **Téléchargez la version LTS** (bouton vert)
3. **Installez** le fichier `.msi`
4. **Redémarrez** votre terminal
5. **Vérifiez** avec `node --version` et `npm --version`

## ❓ Problèmes courants

### "choco n'est pas reconnu"

**Solution :**
1. Fermez complètement PowerShell
2. Rouvrez PowerShell **en tant qu'administrateur** (clic droit → "Exécuter en tant qu'administrateur")
3. Réessayez la commande

### "L'installation échoue"

**Solution :**
- Utilisez l'installation manuelle depuis le site officiel
- Ou vérifiez votre connexion internet

### "node n'est toujours pas reconnu après l'installation"

**Solution :**
1. **Fermez complètement** tous les terminaux
2. **Redémarrez votre ordinateur** (parfois nécessaire)
3. **Rouvrez** un nouveau terminal
4. **Réessayez** `node --version`

## 📝 Résumé

1. ✅ Vous avez Chocolatey (déjà installé)
2. ⏳ Installez Node.js : `choco install nodejs-lts -y`
3. ⏳ Fermez et rouvrez le terminal
4. ⏳ Vérifiez : `node --version` et `npm --version`
5. ⏳ Allez dans le dossier `MatchPlanner`
6. ⏳ Tapez : `npm install`
7. ⏳ Puis : `npm run dev`

## 💡 Note

**Python et Visual Studio Build Tools** que vous avez installés ne sont **pas nécessaires** pour ce projet Next.js. Vous pouvez les laisser (ils ne gênent pas) ou les désinstaller plus tard si vous voulez.

Pour ce projet, vous avez seulement besoin de **Node.js** !


