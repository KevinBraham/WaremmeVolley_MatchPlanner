import { StatusColor, EventTask, EventWithDetails } from '@/lib/types/database';

/**
 * Calcule la couleur du statut d'une tâche basée sur sa date d'échéance
 */
export function getTaskStatusColor(task: EventTask): StatusColor {
  // Si la tâche est complétée, elle est toujours verte
  if (task.completed_at) {
    return 'green';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const criticalDate = task.due_date ? new Date(task.due_date) : null;
  const alertDate = task.alert_date ? new Date(task.alert_date) : null;

  if (criticalDate) {
    criticalDate.setHours(0, 0, 0, 0);
  }
  if (alertDate) {
    alertDate.setHours(0, 0, 0, 0);
  }

  if (criticalDate && today.getTime() > criticalDate.getTime()) {
    return 'red';
  }

  if (alertDate && today.getTime() > alertDate.getTime()) {
    return 'orange';
  }

  // Jour même de l'alerte => orange
  if (alertDate && today.getTime() === alertDate.getTime()) {
    return 'orange';
  }

  // Jour même de l'échéance => orange (sauf si déjà rouge ci-dessus)
  if (criticalDate && today.getTime() === criticalDate.getTime()) {
    return 'orange';
  }

  return 'green';
}

/**
 * Calcule la couleur prédominante d'un événement (la pire couleur parmi les tâches non complétées)
 */
export function getEventStatusColor(event: EventWithDetails): StatusColor {
  // Récupérer toutes les tâches de tous les posts
  const allTasks: EventTask[] = [];
  for (const post of event.posts) {
    allTasks.push(...post.tasks);
  }

  const nonCompletedTasks = allTasks.filter(task => !task.completed_at);
  
  if (nonCompletedTasks.length === 0) {
    return 'green'; // Toutes les tâches sont complétées
  }

  let worstColor: StatusColor = 'green';

  for (const task of nonCompletedTasks) {
    const taskColor = getTaskStatusColor(task);
    
    if (taskColor === 'red') {
      return 'red'; // Rouge est la pire, on peut s'arrêter
    }
    
    if (taskColor === 'orange') {
      worstColor = 'orange';
    }
  }

  return worstColor;
}

/**
 * Retourne les classes CSS pour la couleur de statut
 */
export function getStatusColorClasses(color: StatusColor): string {
  switch (color) {
    case 'red':
      return 'bg-red-600';
    case 'orange':
      return 'bg-amber-500';
    case 'green':
      return 'bg-emerald-600';
    default:
      return 'bg-gray-400';
  }
}

/**
 * Retourne les classes CSS pour le texte de couleur de statut
 */
export function getStatusTextColorClasses(color: StatusColor): string {
  switch (color) {
    case 'red':
      return 'text-red-600';
    case 'orange':
      return 'text-amber-600';
    case 'green':
      return 'text-emerald-600';
    default:
      return 'text-gray-600';
  }
}

