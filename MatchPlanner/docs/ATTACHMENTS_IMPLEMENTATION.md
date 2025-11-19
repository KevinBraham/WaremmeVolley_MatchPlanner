# Implémentation des pièces jointes avec Google Drive

## Résumé

Cette implémentation permet d'ajouter des pièces jointes aux tâches et aux commentaires, en utilisant Google Drive comme stockage externe pour éviter de surcharger la base de données.

## Fichiers créés/modifiés

### Nouveaux fichiers

1. **Migration SQL**
   - `scripts/migrations/20250115_add_attachments.sql` - Crée la table `attachments` dans Supabase

2. **Client Google Drive**
   - `lib/google-drive/client.ts` - Client pour interagir avec l'API Google Drive

3. **API Routes**
   - `app/api/attachments/upload/route.ts` - Endpoint pour uploader des fichiers
   - `app/api/attachments/[id]/route.ts` - Endpoint pour supprimer des fichiers
   - `app/api/google-drive/auth/route.ts` - Endpoint pour obtenir l'URL d'autorisation
   - `app/api/google-drive/callback/route.ts` - Endpoint pour échanger le code contre un refresh token

4. **Composants**
   - `components/AttachmentManager.tsx` - Composant React pour gérer les pièces jointes

5. **Documentation**
   - `docs/GOOGLE_DRIVE_SETUP.md` - Guide de configuration Google Drive

### Fichiers modifiés

1. **Types TypeScript**
   - `lib/types/database.ts` - Ajout des types `Attachment`, `AttachmentInsert`, `AttachmentUpdate`

2. **Requêtes Supabase**
   - `lib/supabase/queries.ts` - Ajout des fonctions :
     - `getAttachmentsByTask(taskId)`
     - `getAttachmentsByComment(commentId)`
     - `getAttachment(id)`
     - `createAttachment(attachment)`
     - `deleteAttachment(id)`
   - Modification de `getEventWithDetails()` pour charger les attachments avec les tâches et commentaires

3. **Interface utilisateur**
   - `app/events/[id]/page.tsx` - Intégration du composant `AttachmentManager` pour afficher et gérer les pièces jointes

4. **Dépendances**
   - `package.json` - Ajout de `googleapis`

## Architecture

### Flux d'upload

1. L'utilisateur sélectionne un fichier dans `AttachmentManager`
2. Le fichier est envoyé à `/api/attachments/upload` avec le token d'authentification
3. L'API route :
   - Vérifie l'authentification
   - Upload le fichier vers Google Drive via `lib/google-drive/client.ts`
   - Crée un enregistrement dans la table `attachments` avec les métadonnées
   - Retourne l'attachment créé
4. Le composant recharge la liste des attachments

### Flux de suppression

1. L'utilisateur clique sur le bouton de suppression
2. Une requête DELETE est envoyée à `/api/attachments/[id]`
3. L'API route :
   - Supprime le fichier de Google Drive
   - Supprime l'enregistrement de la base de données
4. Le composant recharge la liste des attachments

### Structure de la table `attachments`

```sql
- id: UUID (PK)
- task_id: UUID (FK vers event_tasks, nullable)
- comment_id: UUID (FK vers task_comments, nullable)
- file_name: VARCHAR(255)
- file_size: BIGINT
- mime_type: VARCHAR(100)
- google_drive_file_id: VARCHAR(255) UNIQUE
- google_drive_web_view_link: TEXT
- google_drive_download_link: TEXT
- uploaded_by: UUID (FK vers auth.users)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Contrainte** : Une pièce jointe doit être liée soit à une tâche, soit à un commentaire (pas les deux).

## Configuration requise

Voir `docs/GOOGLE_DRIVE_SETUP.md` pour les détails complets.

Variables d'environnement nécessaires :
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_DRIVE_FOLDER_ID` (optionnel)
- `SUPABASE_SERVICE_ROLE_KEY`

## Fonctionnalités

✅ Upload de fichiers vers Google Drive
✅ Affichage des pièces jointes avec icônes selon le type
✅ Téléchargement/visualisation des fichiers
✅ Suppression des fichiers (Google Drive + DB)
✅ Support pour les tâches et les commentaires
✅ Limite de taille configurable (50MB par défaut)
✅ Gestion des erreurs et feedback utilisateur

## Prochaines étapes possibles

- [ ] Ajouter la possibilité d'uploader plusieurs fichiers à la fois
- [ ] Ajouter un aperçu des images directement dans l'interface
- [ ] Ajouter une barre de progression pour les uploads
- [ ] Implémenter la compression automatique des images
- [ ] Ajouter des permissions plus granulaires (qui peut voir/supprimer)
- [ ] Ajouter un système de versioning pour les fichiers

## Notes importantes

- Les fichiers sont stockés sur Google Drive et accessibles en lecture seule pour tous (via lien partagé)
- La suppression d'une pièce jointe supprime également le fichier de Google Drive
- Les métadonnées sont stockées dans Supabase pour des requêtes rapides
- Le refresh token doit être gardé secret et ne jamais être commité dans Git


