import { supabase } from '@/lib/supabaseClient';
import type {
  Team,
  TeamInsert,
  TeamUpdate,
  EventTemplate,
  EventTemplateInsert,
  EventTemplateUpdate,
  EventTemplateWithDetails,
  TemplatePost,
  TemplatePostInsert,
  TemplatePostUpdate,
  TemplateTask,
  TemplateTaskInsert,
  TemplateTaskUpdate,
  Event,
  EventInsert,
  EventUpdate,
  EventWithDetails,
  EventPost,
  EventPostInsert,
  EventPostUpdate,
  EventTask,
  EventTaskInsert,
  EventTaskUpdate,
  TaskComment,
  TaskCommentInsert,
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
  TaskStatus,
} from '@/lib/types/database';
import { addDays } from '@/lib/utils/date';

// ============================================
// TEAMS
// ============================================

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
}

export async function getTeam(id: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createTeam(team: TeamInsert): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .insert(team)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTeam(id: string, updates: TeamUpdate): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteTeam(id: string): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================
// USER PROFILES
// ============================================

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data || null;
}

export async function createUserProfile(profile: UserProfileInsert): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users_profiles')
    .insert(profile)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId: string, updates: UserProfileUpdate): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getAllUserProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('users_profiles')
    .select('*')
    .order('display_name');
  
  if (error) throw error;
  return data || [];
}

export async function deleteUserProfile(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users_profiles')
    .delete()
    .eq('user_id', userId);
  
  if (error) throw error;
}

// ============================================
// EVENT TEMPLATES
// ============================================

export async function getEventTemplates(teamId?: string): Promise<EventTemplate[]> {
  let query = supabase
    .from('event_templates')
    .select('*')
    .order('name');
  
  if (teamId) {
    query = query.eq('team_id', teamId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getEventTemplate(id: string): Promise<EventTemplate | null> {
  const { data, error } = await supabase
    .from('event_templates')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // PGRST116 = not found
    throw error;
  }
  return data || null;
}

export async function getEventTemplateWithDetails(id: string): Promise<EventTemplateWithDetails | null> {
  const { data: template, error: templateError } = await supabase
    .from('event_templates')
    .select('*')
    .eq('id', id)
    .single();
  
  if (templateError) throw templateError;
  if (!template) return null;

  // Charger l'équipe si team_id existe
  let team = null;
  if (template.team_id) {
    team = await getTeam(template.team_id);
  }

  const { data: posts, error: postsError } = await supabase
    .from('template_posts')
    .select('*')
    .eq('template_id', id)
    .order('position');
  
  if (postsError) throw postsError;

  // Charger les tâches pour chaque post
  const postsWithTasks = await Promise.all(
    (posts || []).map(async (post: TemplatePost) => {
      const defaultUser = post.default_user_id ? await getUserProfile(post.default_user_id) : null;

      const { data: tasks, error: tasksError } = await supabase
        .from('template_tasks')
        .select('*')
        .eq('template_post_id', post.id)
        .order('position');
      
      if (tasksError) throw tasksError;
      
      return {
        ...post,
        default_user: defaultUser,
        tasks: (tasks || []).sort((a: TemplateTask, b: TemplateTask) => a.position - b.position)
      };
    })
  );

  return {
    ...template,
    team,
    posts: postsWithTasks.sort((a: TemplatePost, b: TemplatePost) => a.position - b.position)
  };
}

export async function createEventTemplate(template: EventTemplateInsert): Promise<EventTemplate> {
  const { data, error } = await supabase
    .from('event_templates')
    .insert(template)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateEventTemplate(id: string, updates: EventTemplateUpdate): Promise<EventTemplate> {
  const { data, error } = await supabase
    .from('event_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteEventTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('event_templates')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================
// TEMPLATE POSTS
// ============================================

export async function createTemplatePost(post: TemplatePostInsert): Promise<TemplatePost> {
  const { data, error } = await supabase
    .from('template_posts')
    .insert(post)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTemplatePost(id: string, updates: TemplatePostUpdate): Promise<TemplatePost> {
  const { data, error } = await supabase
    .from('template_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteTemplatePost(id: string): Promise<void> {
  const { error } = await supabase
    .from('template_posts')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================
// TEMPLATE TASKS
// ============================================

export async function createTemplateTask(task: TemplateTaskInsert): Promise<TemplateTask> {
  const { data, error } = await supabase
    .from('template_tasks')
    .insert(task)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTemplateTask(id: string, updates: TemplateTaskUpdate): Promise<TemplateTask> {
  const { data, error } = await supabase
    .from('template_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteTemplateTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('template_tasks')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================
// EVENTS
// ============================================

export async function getEvents(teamId?: string, includePast: boolean = false): Promise<Event[]> {
  let query = supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true });
  
  if (teamId) {
    query = query.eq('team_id', teamId);
  }
  
  if (!includePast) {
    const today = new Date().toISOString().split('T')[0];
    query = query.gte('event_date', today);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getEventWithDetails(id: string): Promise<EventWithDetails | null> {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();
  
  if (eventError) throw eventError;
  if (!event) return null;

  // Charger l'équipe et le modèle
  const team = await getTeam(event.team_id);
  let template = null;
  if (event.template_id) {
    template = await getEventTemplate(event.template_id);
  }

  // Charger les posts
  const { data: posts, error: postsError } = await supabase
    .from('event_posts')
    .select('*')
    .eq('event_id', id)
    .order('position');
  
  if (postsError) throw postsError;

  // Charger les tâches pour chaque post avec leurs assignés, complétées par et commentaires
  const postsWithTasks = await Promise.all(
    (posts || []).map(async (post: EventPost) => {
      const defaultUser = post.default_user_id ? await getUserProfile(post.default_user_id) : null;

      const { data: tasks, error: tasksError } = await supabase
        .from('event_tasks')
        .select('*')
        .eq('event_post_id', post.id)
        .order('position');
      
      if (tasksError) throw tasksError;

      // Pour chaque tâche, charger l'assigné, qui a complété, et les commentaires
      const tasksWithDetails = await Promise.all(
        (tasks || []).map(async (task: EventTask) => {
          let assignee = null;
          let completed_by_user = null;
          
          if (task.assignee_user_id) {
            assignee = await getUserProfile(task.assignee_user_id);
          }
          
          if (task.completed_by) {
            completed_by_user = await getUserProfile(task.completed_by);
          }

          // Charger les commentaires
          const { data: comments, error: commentsError } = await supabase
            .from('task_comments')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at', { ascending: true });
          
          if (commentsError) throw commentsError;

          // Charger les auteurs des commentaires
          const commentsWithAuthors = await Promise.all(
            (comments || []).map(async (comment: any) => {
              const author = await getUserProfile(comment.author_user_id);
              return {
                ...comment,
                author: author || {
                  user_id: comment.author_user_id,
                  display_name: null,
                  first_name: null,
                  last_name: null,
                  created_at: '',
                },
              };
            })
          );

          return {
            ...task,
            assignee,
            completed_by_user,
            comments: commentsWithAuthors
          };
        })
      );

      return {
        ...post,
        default_user: defaultUser,
        tasks: tasksWithDetails.sort((a: EventTask, b: EventTask) => a.position - b.position)
      };
    })
  );

  return {
    ...event,
    team: team || { id: event.team_id, name: '', created_at: '' },
    template,
    posts: postsWithTasks.sort((a: EventPost, b: EventPost) => a.position - b.position)
  };
}

export async function createEvent(event: EventInsert): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Crée un événement à partir d'un modèle
 */
export async function createEventFromTemplate(
  eventData: Omit<EventInsert, 'template_id'>,
  templateId: string
): Promise<Event> {
  // Récupérer le modèle avec ses posts et tâches
  const template = await getEventTemplateWithDetails(templateId);
  if (!template) {
    throw new Error('Modèle non trouvé');
  }

  // Créer l'événement
  const event = await createEvent({
    ...eventData,
    template_id: templateId
  });

  // Créer les posts et tâches à partir du modèle
  for (const templatePost of template.posts) {
     const eventPost = await createEventPost({
       event_id: event.id,
       name: templatePost.name,
       default_user_id: templatePost.default_user_id,
       default_responsible_name: templatePost.default_responsible_name,
       position: templatePost.position
     });
 
     // Créer les tâches pour ce post
    for (const templateTask of templatePost.tasks) {
      const criticalOffset = templateTask.default_due_offset_days ?? 0;
      const alertOffset = templateTask.default_alert_offset_days ?? criticalOffset;

      const dueDate = addDays(event.event_date, -criticalOffset);
      const alertDate = addDays(event.event_date, -alertOffset);

      const responsibleName = templateTask.default_responsible_name
        ? templateTask.default_responsible_name
        : templatePost.default_responsible_name;
      const assigneeUserId = templateTask.default_user_id || templatePost.default_user_id || null;
 
       await createEventTask({
         event_post_id: eventPost.id,
         name: templateTask.name,
         assignee_user_id: assigneeUserId,
         responsible_name: responsibleName,
         due_date: dueDate,
        alert_date: alertDate,
        completed_at: null,
        completed_by: null,
         status: 'todo',
         position: templateTask.position
       });
     }
  }

  return event;
}

export async function updateEvent(id: string, updates: EventUpdate): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================
// EVENT POSTS
// ============================================

export async function createEventPost(post: EventPostInsert): Promise<EventPost> {
  const { data, error } = await supabase
    .from('event_posts')
    .insert(post)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateEventPost(id: string, updates: EventPostUpdate): Promise<EventPost> {
  const { data, error } = await supabase
    .from('event_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteEventPost(id: string): Promise<void> {
  const { error } = await supabase
    .from('event_posts')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================
// EVENT TASKS
// ============================================

export async function createEventTask(task: EventTaskInsert): Promise<EventTask> {
  const { data, error } = await supabase
    .from('event_tasks')
    .insert(task)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateEventTask(id: string, updates: EventTaskUpdate): Promise<EventTask> {
  const { data, error } = await supabase
    .from('event_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteEventTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('event_tasks')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

/**
 * Marque une tâche comme complétée
 */
export async function completeTask(taskId: string, userId: string): Promise<EventTask> {
  return updateEventTask(taskId, {
    completed_at: new Date().toISOString(),
    completed_by: userId
  });
}

/**
 * Réouvre une tâche (la marque comme todo)
 */
export async function reopenTask(taskId: string): Promise<EventTask> {
  return updateEventTask(taskId, {
    completed_at: null,
    completed_by: null
  });
}

// ============================================
// TASK COMMENTS
// ============================================

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function createTaskComment(comment: TaskCommentInsert): Promise<TaskComment> {
  const { data, error } = await supabase
    .from('task_comments')
    .insert(comment)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteTaskComment(id: string): Promise<void> {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

