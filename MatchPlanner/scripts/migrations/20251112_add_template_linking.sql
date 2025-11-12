-- Ajoute les colonnes permettant de relier les événements à leur modèle d'origine
-- À exécuter dans Supabase (SQL editor) ou via psql.

ALTER TABLE event_posts
ADD COLUMN IF NOT EXISTS template_post_id UUID REFERENCES template_posts(id) ON DELETE SET NULL;

ALTER TABLE event_tasks
ADD COLUMN IF NOT EXISTS template_task_id UUID REFERENCES template_tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_event_posts_template_post_id ON event_posts(template_post_id);
CREATE INDEX IF NOT EXISTS idx_event_tasks_template_task_id ON event_tasks(template_task_id);

