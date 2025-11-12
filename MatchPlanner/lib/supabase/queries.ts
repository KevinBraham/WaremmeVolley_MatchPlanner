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

let templateLinkingSupported: boolean | null = null;

async function detectTemplateLinkingSupport(): Promise<boolean> {
  if (templateLinkingSupported !== null) {
    return templateLinkingSupported;
  }

  const checks: Array<{ table: string; column: string }> = [
    { table: 'event_posts', column: 'template_post_id' },
    { table: 'event_tasks', column: 'template_task_id' },
  ];

  for (const { table, column } of checks) {
    const { error } = await supabase.from(table).select(column).limit(1);
    if (error) {
      const message = (error.message || '').toLowerCase();
      const details = (error.details || '').toLowerCase();
      const columnMissing =
        error.code === '42703' ||
        message.includes('does not exist') ||
        details.includes('does not exist');

      if (columnMissing) {
        templateLinkingSupported = false;
        return templateLinkingSupported;
      }

      throw error;
    }
  }

  templateLinkingSupported = true;
  return templateLinkingSupported;
}

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
  const payload: UserProfileInsert = {
    ...profile,
    role: profile.role ?? 'agent',
  };

  const { data, error } = await supabase
    .from('users_profiles')
    .insert(payload)
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

export async function removeTemplatePostFromFutureEvents(templateId: string, templatePost: TemplatePost): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, event_date')
    .eq('template_id', templateId)
    .gte('event_date', today);

  if (eventsError) throw eventsError;

  for (const event of events || []) {
    const { data: posts, error: postsError } = await supabase
      .from('event_posts')
      .select('id, template_post_id, name')
      .eq('event_id', event.id);

    if (postsError) throw postsError;

    for (const post of posts || []) {
      const isLinked =
        post.template_post_id === templatePost.id ||
        (!post.template_post_id && post.name === templatePost.name);

      if (isLinked) {
        await deleteEventPost(post.id);
      }
    }
  }
}

export async function removeTemplateTaskFromFutureEvents(
  templateId: string,
  templatePost: TemplatePost,
  templateTask: TemplateTask
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, event_date')
    .eq('template_id', templateId)
    .gte('event_date', today);

  if (eventsError) throw eventsError;

  for (const event of events || []) {
    const { data: posts, error: postsError } = await supabase
      .from('event_posts')
      .select('id, template_post_id, name')
      .eq('event_id', event.id);

    if (postsError) throw postsError;

    const candidatePosts = (posts || []).filter(
      (post) =>
        post.template_post_id === templatePost.id ||
        (!post.template_post_id && post.name === templatePost.name)
    );

    if (candidatePosts.length === 0) continue;

    const criticalOffset = templateTask.default_due_offset_days ?? 0;
    const alertOffset =
      templateTask.default_alert_offset_days ??
      templateTask.default_due_offset_days ??
      criticalOffset;

    const expectedDueDate = addDays(event.event_date, -criticalOffset);
    const computedAlertDate = addDays(event.event_date, -alertOffset);
    const expectedAlertDates = new Set<string | null>([computedAlertDate]);
    if (templateTask.default_alert_offset_days === null) {
      expectedAlertDates.add(null);
    }

    for (const eventPost of candidatePosts) {
      const { data: tasks, error: tasksError } = await supabase
        .from('event_tasks')
        .select('id, template_task_id, name, due_date, alert_date')
        .eq('event_post_id', eventPost.id);

      if (tasksError) throw tasksError;

      for (const task of tasks || []) {
        const matchesTemplateId = task.template_task_id === templateTask.id;
        const matchesHeuristic =
          !task.template_task_id &&
          task.name === templateTask.name &&
          task.due_date === expectedDueDate &&
          expectedAlertDates.has(task.alert_date);

        if (matchesTemplateId || matchesHeuristic) {
          await deleteEventTask(task.id);
        }
      }
    }
  }
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

  const supportsLinking = await detectTemplateLinkingSupport().catch(() => false);

  // Créer les posts et tâches à partir du modèle
  for (const templatePost of template.posts) {
    const postInsert: EventPostInsert = {
      event_id: event.id,
      name: templatePost.name,
      default_user_id: templatePost.default_user_id,
      default_responsible_name: templatePost.default_responsible_name,
      position: templatePost.position,
    };

    if (supportsLinking) {
      (postInsert as EventPostInsert & { template_post_id?: string | null }).template_post_id =
        templatePost.id;
    }

    const eventPost = await createEventPost(postInsert);

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

      const taskInsert: EventTaskInsert = {
        event_post_id: eventPost.id,
        name: templateTask.name,
        assignee_user_id: assigneeUserId,
        responsible_name: responsibleName,
        due_date: dueDate,
        alert_date: alertDate,
        completed_at: null,
        completed_by: null,
        status: 'todo',
        position: templateTask.position,
      };

      if (supportsLinking) {
        (taskInsert as EventTaskInsert & { template_task_id?: string | null }).template_task_id =
          templateTask.id;
      }

      await createEventTask(taskInsert);
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
  const { error: tasksError } = await supabase
    .from('event_tasks')
    .delete()
    .eq('event_post_id', id);

  if (tasksError) throw tasksError;

  const { error } = await supabase
    .from('event_posts')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

type MinimalEventRow = {
  id: string;
  event_date: string;
};

async function syncEventWithTemplate(template: EventTemplateWithDetails, event: MinimalEventRow) {
  const supportsLinking = await detectTemplateLinkingSupport();
  if (!supportsLinking) {
    throw new Error(
      'Synchronisation impossible : les colonnes "template_post_id" et "template_task_id" sont absentes. ' +
        'Ajoutez-les aux tables "event_posts" et "event_tasks" pour activer la mise à jour automatique.'
    );
  }

  const { data: currentPostsData, error: postsError } = await supabase
    .from('event_posts')
    .select('id, event_id, template_post_id, name, default_user_id, default_responsible_name, position')
    .eq('event_id', event.id);

  if (postsError) throw postsError;

  const currentPosts = (currentPostsData || []) as (EventPost & { template_post_id: string | null })[];
  const postByTemplateId = new Map<string, EventPost>();

  currentPosts.forEach((post) => {
    if (post.template_post_id) {
      postByTemplateId.set(post.template_post_id, post);
    }
  });

  for (const templatePost of template.posts) {
    let matchedPost = postByTemplateId.get(templatePost.id);

    if (!matchedPost) {
      const fallback = currentPosts.find(
        (post) => !post.template_post_id && post.name === templatePost.name
      );

      if (fallback) {
        const updated = await updateEventPost(fallback.id, {
          template_post_id: templatePost.id,
        });
        matchedPost = updated;
        postByTemplateId.set(
          templatePost.id,
          updated as EventPost & { template_post_id: string | null }
        );
      }
    }

    if (!matchedPost) {
      const created = await createEventPost({
        event_id: event.id,
        template_post_id: templatePost.id,
        name: templatePost.name,
        default_user_id: templatePost.default_user_id || null,
        default_responsible_name: templatePost.default_responsible_name || null,
        position: templatePost.position,
      });
      matchedPost = created;
      currentPosts.push(created as EventPost & { template_post_id: string | null });
      postByTemplateId.set(
        templatePost.id,
        created as EventPost & { template_post_id: string | null }
      );
    } else if (matchedPost.position !== templatePost.position) {
      const updated = await updateEventPost(matchedPost.id, { position: templatePost.position });
      postByTemplateId.set(
        templatePost.id,
        updated as EventPost & { template_post_id: string | null }
      );
    }
  }

  const templatePostIds = new Set(template.posts.map((post) => post.id));
  for (const post of currentPosts) {
    if (post.template_post_id && !templatePostIds.has(post.template_post_id)) {
      await deleteEventPost(post.id);
    }
  }

  const { data: refreshedPostsData, error: refreshedPostsError } = await supabase
    .from('event_posts')
    .select('id, template_post_id, default_user_id, default_responsible_name, position')
    .eq('event_id', event.id);

  if (refreshedPostsError) throw refreshedPostsError;

  const refreshedPosts = (refreshedPostsData || []) as (EventPost & { template_post_id: string | null })[];
  if (refreshedPosts.length === 0) return;

  const postIds = refreshedPosts.map((post) => post.id);
  if (postIds.length === 0) return;

  const { data: tasksData, error: tasksError } = await supabase
    .from('event_tasks')
    .select('id, event_post_id, template_task_id, name, position, responsible_name, assignee_user_id, due_date, alert_date, completed_at, completed_by')
    .in('event_post_id', postIds);

  if (tasksError) throw tasksError;

  const tasksByPost = new Map<string, (EventTask & { template_task_id: string | null })[]>();
  (tasksData || []).forEach((task) => {
    const existing = tasksByPost.get(task.event_post_id) || [];
    existing.push(task as EventTask & { template_task_id: string | null });
    tasksByPost.set(task.event_post_id, existing);
  });

  for (const templatePost of template.posts) {
    const eventPost = refreshedPosts.find((post) => post.template_post_id === templatePost.id);
    if (!eventPost) continue;

    const templateTasks = templatePost.tasks || [];
    const templateTaskIds = new Set(templateTasks.map((task) => task.id));
    const currentTasks = tasksByPost.get(eventPost.id) || [];

    const taskByTemplateId = new Map<string, EventTask>();
    currentTasks.forEach((task) => {
      if (task.template_task_id) {
        taskByTemplateId.set(task.template_task_id, task);
      }
    });

    for (const templateTask of templateTasks) {
      let matchedTask = taskByTemplateId.get(templateTask.id);

      if (!matchedTask) {
        const fallback = currentTasks.find(
          (task) => !task.template_task_id && task.name === templateTask.name
        );

        if (fallback) {
          const updated = await updateEventTask(fallback.id, {
            template_task_id: templateTask.id,
          });
          matchedTask = updated;
          taskByTemplateId.set(
            templateTask.id,
            updated as EventTask & { template_task_id: string | null }
          );
        }
      }

      if (!matchedTask) {
        const criticalOffset = templateTask.default_due_offset_days ?? 0;
        const alertOffset =
          templateTask.default_alert_offset_days ?? templateTask.default_due_offset_days ?? criticalOffset;
        const dueDate = addDays(event.event_date, -criticalOffset);
        const alertDate = addDays(event.event_date, -alertOffset);

        const createdTask = await createEventTask({
          event_post_id: eventPost.id,
          template_task_id: templateTask.id,
          name: templateTask.name,
          assignee_user_id: templateTask.default_user_id || templatePost.default_user_id || null,
          responsible_name:
            templateTask.default_responsible_name ??
            templatePost.default_responsible_name ??
            null,
          due_date: dueDate,
          alert_date: alertDate,
          completed_at: null,
          completed_by: null,
          status: 'todo',
          position: templateTask.position,
        });

        currentTasks.push(createdTask as EventTask & { template_task_id: string | null });
        taskByTemplateId.set(
          templateTask.id,
          createdTask as EventTask & { template_task_id: string | null }
        );
        continue;
      }

      if (matchedTask.position !== templateTask.position) {
        await updateEventTask(matchedTask.id, { position: templateTask.position });
      }
    }

    for (const task of currentTasks) {
      if (task.template_task_id && !templateTaskIds.has(task.template_task_id)) {
        await deleteEventTask(task.id);
      }
    }
  }
}

export async function syncFutureEventsWithTemplate(templateId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const template = await getEventTemplateWithDetails(templateId);
  if (!template) return;

  const supportsLinking = await detectTemplateLinkingSupport();
  if (!supportsLinking) {
    throw new Error(
      'Synchronisation impossible : les colonnes "template_post_id" et "template_task_id" sont absentes. ' +
        'Ajoutez-les aux tables "event_posts" et "event_tasks" pour activer la mise à jour automatique.'
    );
  }

  const { data: events, error } = await supabase
    .from('events')
    .select('id, event_date')
    .eq('template_id', templateId)
    .gte('event_date', today);

  if (error) throw error;

  for (const event of events || []) {
    await syncEventWithTemplate(template, event as MinimalEventRow);
  }
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

