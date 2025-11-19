// Types TypeScript pour la base de données Supabase
// Basés sur le schéma existant

export type TaskStatus = 'todo' | 'in_progress' | 'pending' | 'completed' | 'done';

export interface Team {
  id: string;
  name: string;
  created_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  created_at: string;
}

export interface UserProfile {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  role: 'agent' | 'admin';
  created_at: string;
}

export interface EventTemplate {
  id: string;
  team_id: string | null;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TemplatePost {
  id: string;
  template_id: string;
  name: string;
  default_user_id: string | null;
  default_responsible_name: string | null;
  position: number;
}

export interface TemplateTask {
  id: string;
  template_post_id: string;
  name: string;
  default_due_offset_days: number;
  default_alert_offset_days: number | null;
  default_user_id: string | null;
  default_responsible_name: string | null;
  position: number;
}

export interface Event {
  id: string;
  team_id: string;
  template_id: string | null;
  name: string;
  description: string | null;
  event_date: string; // date format YYYY-MM-DD
  created_by: string | null;
  created_at: string;
}

export interface EventPost {
  id: string;
  event_id: string;
  name: string;
  default_user_id: string | null;
  default_responsible_name: string | null;
  position: number;
  template_post_id?: string | null;
}

export interface EventTask {
  id: string;
  event_post_id: string;
  name: string;
  assignee_user_id: string | null;
  due_date: string | null; // date format YYYY-MM-DD
  alert_date: string | null;
  reference_date: string | null; // date format YYYY-MM-DD - date de référence pour calculer les délais (par défaut event_date)
  status: TaskStatus;
  completed_at: string | null;
  completed_by: string | null;
  position: number;
  created_at: string;
  responsible_name: string | null;
  template_task_id?: string | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_user_id: string;
  content: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  task_id: string | null;
  comment_id: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  google_drive_file_id: string;
  google_drive_web_view_link: string | null;
  google_drive_download_link: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// Types pour les insertions (sans les champs auto-générés)
export type TeamInsert = Omit<Team, 'id' | 'created_at'>;
export type EventTemplateInsert = Omit<EventTemplate, 'id' | 'created_at'>;
export type TemplatePostInsert = Omit<TemplatePost, 'id'>;
export type TemplateTaskInsert = Omit<TemplateTask, 'id'>;
export type EventInsert = Omit<Event, 'id' | 'created_at'>;
export type EventPostInsert = Omit<EventPost, 'id'>;
export type EventTaskInsert = Omit<EventTask, 'id' | 'created_at'>;
export type TaskCommentInsert = Omit<TaskComment, 'id' | 'created_at'>;
export type AttachmentInsert = Omit<Attachment, 'id' | 'created_at' | 'updated_at'>;
export type UserProfileInsert = Omit<UserProfile, 'created_at'>;

// Types pour les updates (tous les champs optionnels sauf l'id)
export type TeamUpdate = Partial<Omit<Team, 'id'>>;
export type EventTemplateUpdate = Partial<Omit<EventTemplate, 'id'>>;
export type TemplatePostUpdate = Partial<Omit<TemplatePost, 'id'>>;
export type TemplateTaskUpdate = Partial<Omit<TemplateTask, 'id'>>;
export type EventUpdate = Partial<Omit<Event, 'id'>>;
export type EventPostUpdate = Partial<Omit<EventPost, 'id'>>;
export type EventTaskUpdate = Partial<Omit<EventTask, 'id'>>;
export type AttachmentUpdate = Partial<Omit<Attachment, 'id'>>;
export type UserProfileUpdate = Partial<Omit<UserProfile, 'user_id'>>;

// Types pour les réponses avec relations
export interface EventWithDetails extends Event {
  team: Team;
  template: EventTemplate | null;
  posts: (EventPost & {
    default_user: UserProfile | null;
    tasks: (EventTask & {
      assignee: UserProfile | null;
      completed_by_user: UserProfile | null;
      comments: (TaskComment & {
        author: UserProfile;
        attachments?: Attachment[];
      })[];
      attachments?: Attachment[];
    })[];
  })[];
}

export interface EventTemplateWithDetails extends EventTemplate {
  team: Team | null;
  posts: (TemplatePost & {
    default_user?: UserProfile | null;
    tasks: TemplateTask[];
  })[];
}

// Type pour calculer la couleur du statut
export type StatusColor = 'red' | 'orange' | 'green';


