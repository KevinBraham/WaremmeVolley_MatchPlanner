-- Schéma de base de données proposé pour Waremme Volley Match Planner
-- Basé sur le cahier des charges

-- ============================================
-- TABLES PRINCIPALES
-- ============================================

-- 1. Équipes (Ligue A, Nat dame, etc.)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Modèles d'événements (match, tournoi, etc.)
CREATE TABLE IF NOT EXISTS event_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Postes dans les modèles (entrée, marketing, match officiel, etc.)
CREATE TABLE IF NOT EXISTS template_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  default_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, name)
);

-- 4. Tâches dans les postes des modèles
CREATE TABLE IF NOT EXISTS template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES template_positions(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  default_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  default_delay_days INTEGER DEFAULT 0, -- Délai par défaut en jours avant l'événement
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Événements
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  template_id UUID REFERENCES event_templates(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Postes dans les événements (peut être différent du modèle)
CREATE TABLE IF NOT EXISTS event_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  template_position_id UUID REFERENCES template_positions(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  default_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tâches dans les événements
CREATE TABLE IF NOT EXISTS event_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  position_id UUID REFERENCES event_positions(id) ON DELETE SET NULL,
  template_task_id UUID REFERENCES template_tasks(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date TIMESTAMP WITH TIME ZONE, -- Date d'échéance
  delay_days INTEGER, -- Délai en jours avant l'événement (si due_date n'est pas défini)
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Commentaires sur les tâches
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_events_team_id ON events(team_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_template_id ON events(template_id);
CREATE INDEX IF NOT EXISTS idx_event_tasks_event_id ON event_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tasks_due_date ON event_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_event_tasks_status ON event_tasks(status);
CREATE INDEX IF NOT EXISTS idx_event_tasks_assigned_user ON event_tasks(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_template_positions_template_id ON template_positions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_tasks_position_id ON template_tasks(position_id);
CREATE INDEX IF NOT EXISTS idx_event_positions_event_id ON event_positions(event_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

-- ============================================
-- FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour calculer la couleur du statut (rouge/orange/vert)
CREATE OR REPLACE FUNCTION get_task_status_color(task_due_date TIMESTAMP WITH TIME ZONE, task_status VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  IF task_status = 'completed' THEN
    RETURN 'green';
  END IF;
  
  IF task_due_date IS NULL THEN
    RETURN 'green'; -- Pas de date = pas urgent
  END IF;
  
  IF task_due_date < NOW() THEN
    RETURN 'red'; -- En retard
  END IF;
  
  IF task_due_date < NOW() + INTERVAL '3 days' THEN
    RETURN 'red'; -- Moins de 3 jours = rouge
  END IF;
  
  IF task_due_date < NOW() + INTERVAL '7 days' THEN
    RETURN 'orange'; -- Moins de 7 jours = orange
  END IF;
  
  RETURN 'green'; -- Plus de 7 jours = vert
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir la couleur prédominante d'un événement (la pire couleur)
CREATE OR REPLACE FUNCTION get_event_status_color(event_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  worst_color VARCHAR := 'green';
  task_color VARCHAR;
BEGIN
  FOR task_color IN
    SELECT get_task_status_color(et.due_date, et.status)
    FROM event_tasks et
    WHERE et.event_id = get_event_status_color.event_id
      AND et.status != 'completed'
  LOOP
    IF task_color = 'red' THEN
      worst_color := 'red';
      EXIT;
    ELSIF task_color = 'orange' AND worst_color != 'red' THEN
      worst_color := 'orange';
    END IF;
  END LOOP;
  
  RETURN worst_color;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS POUR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_templates_updated_at BEFORE UPDATE ON event_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_positions_updated_at BEFORE UPDATE ON template_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_tasks_updated_at BEFORE UPDATE ON template_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_positions_updated_at BEFORE UPDATE ON event_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_tasks_updated_at BEFORE UPDATE ON event_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Insérer les équipes par défaut
INSERT INTO teams (name, description) VALUES
  ('Ligue A', 'Équipe Ligue A'),
  ('Nat dame', 'Nationale 1 Dames')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Politiques: Tous les utilisateurs authentifiés peuvent tout voir/modifier
-- (Pas de gestion de droits selon le cahier des charges)

CREATE POLICY "Authenticated users can read teams" ON teams
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert teams" ON teams
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update teams" ON teams
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete teams" ON teams
  FOR DELETE USING (auth.role() = 'authenticated');

-- Répéter pour toutes les autres tables...
-- (Pour simplifier, on peut créer une fonction générique)

-- Politiques pour event_templates
CREATE POLICY "Authenticated users can manage event_templates" ON event_templates
  FOR ALL USING (auth.role() = 'authenticated');

-- Politiques pour template_positions
CREATE POLICY "Authenticated users can manage template_positions" ON template_positions
  FOR ALL USING (auth.role() = 'authenticated');

-- Politiques pour template_tasks
CREATE POLICY "Authenticated users can manage template_tasks" ON template_tasks
  FOR ALL USING (auth.role() = 'authenticated');

-- Politiques pour events
CREATE POLICY "Authenticated users can manage events" ON events
  FOR ALL USING (auth.role() = 'authenticated');

-- Politiques pour event_positions
CREATE POLICY "Authenticated users can manage event_positions" ON event_positions
  FOR ALL USING (auth.role() = 'authenticated');

-- Politiques pour event_tasks
CREATE POLICY "Authenticated users can manage event_tasks" ON event_tasks
  FOR ALL USING (auth.role() = 'authenticated');

-- Politiques pour task_comments
CREATE POLICY "Authenticated users can manage task_comments" ON task_comments
  FOR ALL USING (auth.role() = 'authenticated');



