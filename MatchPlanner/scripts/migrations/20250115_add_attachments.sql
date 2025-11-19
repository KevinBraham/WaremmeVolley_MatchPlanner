-- Migration: Ajout du support des pièces jointes pour les tâches et commentaires
-- Les fichiers sont stockés sur Google Drive, cette table stocke uniquement les métadonnées

-- Créer la fonction update_updated_at_column si elle n'existe pas déjà
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table pour les pièces jointes
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Référence soit à une tâche, soit à un commentaire (un seul des deux doit être défini)
  task_id UUID REFERENCES event_tasks(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  -- Métadonnées du fichier
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL, -- Taille en octets
  mime_type VARCHAR(100) NOT NULL,
  -- Informations Google Drive
  google_drive_file_id VARCHAR(255) NOT NULL UNIQUE, -- ID du fichier sur Google Drive
  google_drive_web_view_link TEXT, -- Lien pour visualiser le fichier
  google_drive_download_link TEXT, -- Lien pour télécharger le fichier
  -- Métadonnées
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Contrainte: une pièce jointe doit être liée soit à une tâche, soit à un commentaire
  CONSTRAINT attachments_task_or_comment_check CHECK (
    (task_id IS NOT NULL AND comment_id IS NULL) OR 
    (task_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_comment_id ON attachments(comment_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_attachments_google_drive_file_id ON attachments(google_drive_file_id);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_attachments_updated_at 
  BEFORE UPDATE ON attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Politique: tous les utilisateurs authentifiés peuvent gérer les pièces jointes
CREATE POLICY "Authenticated users can manage attachments" ON attachments
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

