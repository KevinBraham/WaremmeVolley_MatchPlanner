'use client';

import { useEffect, useMemo, useState, FormEvent, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  getEventWithDetails,
  completeTask,
  reopenTask,
  createTaskComment,
  deleteTaskComment,
  deleteEvent,
  deleteEventTask,
  createEventTask,
  createEventPost,
  deleteEventPost,
  updateEventTask,
  updateEvent,
  countAttachmentsForTask,
  countAttachmentsForEvent,
  getAllAttachmentsForTask,
} from '@/lib/supabase/queries';
import type { EventWithDetails } from '@/lib/types/database';
import { formatDateFullFrench, formatDateISO, addDays } from '@/lib/utils/date';
import { getTaskStatusColor, getStatusTextColorClasses } from '@/lib/utils/status-color';
import { formatUserName } from '@/lib/utils/user';
import { StatusBadge } from '@/components/StatusBadge';
import AttachmentManager from '@/components/AttachmentManager';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [showCommentInputs, setShowCommentInputs] = useState<Record<string, boolean>>({});
  const [responsibleFilter, setResponsibleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'red' | 'orange' | 'green'>('pending');
  const [newTaskForm, setNewTaskForm] = useState<{
    postId: string;
    name: string;
    criticalDelay: string;
    alertDelay: string;
    responsible: string;
    referenceDate: string;
  } | null>(null);
  const [newPostFormOpen, setNewPostFormOpen] = useState(false);
  const [newPostFormData, setNewPostFormData] = useState({ name: '', responsible: '' });
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkCompleting, setBulkCompleting] = useState(false);
  // Suppression du mode édition - les tâches sont directement éditables
  const isAdmin = profile?.role === 'admin';
  
  // Référence pour sauvegarder la position de scroll
  const scrollPositionRef = useRef<number>(0);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        loadEvent();
      }
    }
  }, [params.id, isAuthenticated, authLoading]);

  async function loadEvent(restoreScroll: boolean = false) {
    try {
      setLoading(true);
      // Sauvegarder la position de scroll avant le rechargement
      if (restoreScroll && typeof window !== 'undefined') {
        scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
      }
      const eventData = await getEventWithDetails(params.id as string);
      if (!eventData) {
        setError('Événement non trouvé');
        return;
      }
      setEvent(eventData);
      const availableTaskIds = eventData.posts.flatMap((post) => post.tasks.map((task) => task.id));
      setSelectedTaskIds((prev) => prev.filter((id) => availableTaskIds.includes(id)));
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de l\'événement');
    } finally {
      setLoading(false);
      // Restaurer la position de scroll après le chargement
      if (restoreScroll && typeof window !== 'undefined') {
        // Utiliser un double requestAnimationFrame pour s'assurer que le DOM est complètement mis à jour
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo({
              top: scrollPositionRef.current,
              behavior: 'auto'
            });
          });
        });
      }
    }
  }

  async function handleCompleteSelectedTasks() {
    if (!user || selectedTaskIds.length === 0) return;
    const tasksToComplete = selectedTaskIds;
    try {
      setBulkCompleting(true);
      setSelectedTaskIds([]);
      await Promise.all(tasksToComplete.map((taskId) => completeTask(taskId, user.id)));
      await loadEvent(true);
    } catch (err: any) {
      alert('Erreur: ' + err.message);
      setSelectedTaskIds(tasksToComplete);
    } finally {
      setBulkCompleting(false);
    }
  }

  async function handleCompleteTask(taskId: string) {
    if (!user) return;
    try {
      await completeTask(taskId, user.id);
      await loadEvent(true);
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handleReopenTask(taskId: string) {
    try {
      await reopenTask(taskId);
      await loadEvent(true);
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  function handleAddPost() {
    setNewTaskForm(null);
    setNewPostFormOpen(true);
    setNewPostFormData({ name: '', responsible: '' });
  }

  async function handleCreatePostSubmit(e: FormEvent) {
    e.preventDefault();
    if (!event) return;

    const name = newPostFormData.name.trim();
    if (!name) {
      alert('Le nom du poste est requis');
      return;
    }

    try {
      const maxPosition = Math.max(...event.posts.map((p) => p.position), -1);
      await createEventPost({
        event_id: event.id,
        name,
        default_user_id: null,
        default_responsible_name: newPostFormData.responsible.trim() || null,
        position: maxPosition + 1,
      });
      setNewPostFormOpen(false);
      setNewPostFormData({ name: '', responsible: '' });
      await loadEvent(true);
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  function handleCancelNewPost() {
    setNewPostFormOpen(false);
    setNewPostFormData({ name: '', responsible: '' });
  }

  function handleAddTask(postId: string) {
    setNewPostFormOpen(false);
    setNewTaskForm({ postId, name: '', criticalDelay: '', alertDelay: '', responsible: '', referenceDate: event?.event_date || '' });
  }

  function handleCancelNewTask() {
    setNewTaskForm(null);
  }

  async function handleCreateTaskSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!event || !newTaskForm) return;

    const name = newTaskForm.name.trim();
    if (!name) {
      alert('Le nom de la tâche est requis');
      return;
    }

    const post = event.posts.find((p) => p.id === newTaskForm.postId);
    if (!post) return;

    if (!newTaskForm.criticalDelay.trim() || !newTaskForm.alertDelay.trim()) {
      alert('Les délais d\'alerte et critique sont obligatoires.');
      return;
    }

    const criticalDelay = Math.max(0, parseInt(newTaskForm.criticalDelay, 10));
    const alertDelay = Math.max(0, parseInt(newTaskForm.alertDelay, 10));

    if (Number.isNaN(criticalDelay) || Number.isNaN(alertDelay)) {
      alert('Les délais doivent être des nombres positifs.');
      return;
    }

    if (alertDelay < criticalDelay) {
      alert('Le délai d\'alerte doit être supérieur ou égal au délai critique.');
      return;
    }

    const refDate = newTaskForm.referenceDate.trim() || event.event_date;
    const dueDate = addDays(refDate, -criticalDelay);
    const alertDate = addDays(refDate, -alertDelay);

    try {
      const maxPosition = Math.max(...post.tasks.map((t) => t.position), -1);
      await createEventTask({
        event_post_id: newTaskForm.postId,
        name,
        assignee_user_id: null,
        responsible_name: newTaskForm.responsible.trim() || post.default_responsible_name || null,
        due_date: dueDate,
        alert_date: alertDate,
        reference_date: newTaskForm.referenceDate.trim() || null,
        completed_at: null,
        completed_by: null,
        status: 'todo',
        position: maxPosition + 1,
      });
      setNewTaskForm(null);
      await loadEvent(true);
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handleEventFieldUpdate(field: 'name' | 'event_date', value: string) {
    if (!event) return;

    try {
      const updates: any = {};
      
      if (field === 'name') {
        const trimmed = value.trim();
        if (trimmed === event.name) return;
        updates.name = trimmed;
      } else if (field === 'event_date') {
        if (value === event.event_date) return;
        updates.event_date = value;
      }

      if (Object.keys(updates).length > 0) {
        await updateEvent(event.id, updates);
        await loadEvent(true);
      }
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handleTaskFieldUpdate(taskId: string, field: string, value: any) {
    if (!user || !event) return;

    try {
      const currentTask = event.posts
        .flatMap(p => p.tasks)
        .find(t => t.id === taskId);
      
      if (!currentTask) return;

      const updates: any = {};
      
      if (field === 'name' && value.trim() !== currentTask.name) {
        updates.name = value.trim();
      } else if (field === 'responsible_name' && value.trim() !== (currentTask.responsible_name || '')) {
        updates.responsible_name = value.trim() || null;
      } else if (field === 'due_date' && value !== (currentTask.due_date || '')) {
        updates.due_date = value || null;
      } else if (field === 'alert_date' && value !== (currentTask.alert_date || '')) {
        updates.alert_date = value || null;
      } else if (field === 'reference_date' && value !== (currentTask.reference_date || event.event_date)) {
        updates.reference_date = value || null;
      }

      if (Object.keys(updates).length > 0) {
        await updateEventTask(taskId, updates, user.id, true);
        await loadEvent(true);
      }
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!isAdmin) return;
    
    // Compter les fichiers associés
    const fileCount = await countAttachmentsForTask(taskId);
    const fileMessage = fileCount > 0 
      ? `\n\n⚠️ Attention : ${fileCount} fichier(s) associé(s) seront également supprimé(s) de Google Drive.`
      : '';
    
    if (!confirm(`Supprimer définitivement cette tâche ?${fileMessage}`)) return;
    
    try {
      // Supprimer les fichiers Google Drive avant de supprimer la tâche
      if (fileCount > 0) {
        // Les fichiers seront supprimés via l'API lors de la suppression de la tâche
        // On utilise l'API pour supprimer les fichiers
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const attachments = await getAllAttachmentsForTask(taskId);
          for (const attachment of attachments) {
            try {
              await fetch(`/api/attachments/${attachment.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                },
              });
            } catch (err) {
              console.error('Erreur lors de la suppression du fichier:', err);
              // Continuer même si un fichier échoue
            }
          }
        }
      }
      
      await deleteEventTask(taskId);
      await loadEvent(true);
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!isAdmin) return;
    
    // Compter les fichiers associés à toutes les tâches du poste
    if (!event) return;
    const post = event.posts.find(p => p.id === postId);
    if (!post) return;
    
    let totalFiles = 0;
    for (const task of post.tasks) {
      totalFiles += await countAttachmentsForTask(task.id);
    }
    
    const fileMessage = totalFiles > 0 
      ? `\n\n⚠️ Attention : ${totalFiles} fichier(s) associé(s) seront également supprimé(s) de Google Drive.`
      : '';
    
    if (!confirm(`Supprimer ce poste et toutes ses tâches ?${fileMessage}`)) return;
    
    try {
      // Supprimer les fichiers Google Drive avant de supprimer le poste
      if (totalFiles > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          for (const task of post.tasks) {
            const attachments = await getAllAttachmentsForTask(task.id);
            for (const attachment of attachments) {
              try {
                await fetch(`/api/attachments/${attachment.id}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                });
              } catch (err) {
                console.error('Erreur lors de la suppression du fichier:', err);
              }
            }
          }
        }
      }
      
      await deleteEventPost(postId);
      await loadEvent(true);
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handleDeleteEvent() {
    if (!isAdmin || !event) return;
    
    // Compter les fichiers associés à toutes les tâches de l'événement
    const fileCount = await countAttachmentsForEvent(event.id);
    const fileMessage = fileCount > 0 
      ? `\n\n⚠️ Attention : ${fileCount} fichier(s) associé(s) seront également supprimé(s) de Google Drive.`
      : '';
    
    if (!confirm(`Supprimer définitivement cet événement ?${fileMessage}`)) return;
    
    try {
      // Supprimer les fichiers Google Drive avant de supprimer l'événement
      if (fileCount > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          for (const post of event.posts) {
            for (const task of post.tasks) {
              const attachments = await getAllAttachmentsForTask(task.id);
              for (const attachment of attachments) {
                try {
                  await fetch(`/api/attachments/${attachment.id}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${session.access_token}`,
                    },
                  });
                } catch (err) {
                  console.error('Erreur lors de la suppression du fichier:', err);
                }
              }
            }
          }
        }
      }
      
      await deleteEvent(event.id);
      router.push('/');
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handleAddComment(taskId: string) {
    if (!user || !commentTexts[taskId]?.trim()) return;
    try {
      await createTaskComment({
        task_id: taskId,
        author_user_id: user.id,
        content: commentTexts[taskId].trim(),
      });
      setCommentTexts({ ...commentTexts, [taskId]: '' });
      setShowCommentInputs({ ...showCommentInputs, [taskId]: false });
      await loadEvent(true);
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  function canDeleteComment(comment: any, allComments: any[]): boolean {
    if (!user || !comment.author_user_id) return false;
    
    // Ne pas autoriser la suppression des commentaires automatiques d'historique de modification
    if (comment.content && comment.content.startsWith('Modification:')) {
      return false;
    }
    
    // Vérifier si l'utilisateur est l'auteur du commentaire
    if (comment.author_user_id !== user.id) return false;
    
    // Vérifier s'il y a un commentaire créé après celui-ci
    const commentDate = new Date(comment.created_at);
    const hasLaterComments = allComments.some(c => 
      c.id !== comment.id && new Date(c.created_at) > commentDate
    );
    
    // On peut supprimer seulement s'il n'y a pas de commentaire créé après
    return !hasLaterComments;
  }

  async function handleDeleteComment(commentId: string) {
    if (!event) return;
    
    // Trouver le commentaire dans l'événement pour vérifier s'il est automatique
    let comment: any = null;
    for (const post of event.posts) {
      for (const task of post.tasks) {
        const foundComment = task.comments?.find((c: any) => c.id === commentId);
        if (foundComment) {
          comment = foundComment;
          break;
        }
      }
      if (comment) break;
    }
    
    // Ne pas autoriser la suppression des commentaires automatiques d'historique de modification
    if (comment && comment.content && comment.content.startsWith('Modification:')) {
      alert('Les commentaires automatiques d\'historique de modification ne peuvent pas être supprimés.');
      return;
    }
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) return;
    
    try {
      await deleteTaskComment(commentId);
      await loadEvent(true);
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  const responsibleOptions = useMemo(() => {
    if (!event) return [] as string[];
    const names = new Set<string>();
    event.posts.forEach((post) => {
      const postDefault = post.default_responsible_name?.trim() || formatUserName(post.default_user, 'Non défini');
      if (postDefault) names.add(postDefault);
      post.tasks.forEach((task) => {
        const explicit = task.responsible_name?.trim();
        if (explicit) {
          names.add(explicit);
        } else {
          const assigneeName = task.assignee ? formatUserName(task.assignee) : '';
          if (assigneeName) {
            names.add(assigneeName);
          } else if (postDefault) {
            names.add(postDefault);
          }
        }
      });
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [event]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="card border-red-200 bg-red-50">
        <p className="text-red-800">{error || 'Événement non trouvé'}</p>
        <Link href="/" className="link mt-2 inline-block">
          Retour aux événements
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux événements
          </Link>
          {isAdmin && (
            <button
              onClick={handleDeleteEvent}
              className="btn-secondary text-sm text-red-600 hover:text-red-700 border-red-200"
            >
              Supprimer l'événement
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Nom de l'événement</label>
            <input
              type="text"
              defaultValue={event.name}
              onBlur={(e) => handleEventFieldUpdate('name', e.target.value)}
              className="input text-xl font-semibold text-secondary w-full"
              placeholder="Nom de l'événement"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Date de l'événement</label>
              <input
                type="date"
                defaultValue={event.event_date}
                onBlur={(e) => handleEventFieldUpdate('event_date', e.target.value)}
                className="input w-full"
              />
            </div>
            <div className="flex items-end">
              <p className="text-sm text-gray-600">
                {formatDateFullFrench(event.event_date)} • {event.team.name}
              </p>
            </div>
          </div>
          
          {event.posts.length > 0 && (
            <p className="text-xs text-gray-500 pt-2 border-t">
              Les tâches affichent le responsable défini dans le modèle ou dans l'événement.
            </p>
          )}
        </div>
      </div>

      <div className="card space-y-3 text-sm">
        <span className="font-medium text-secondary">Filtres d'affichage</span>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {responsibleOptions.length > 0 && (
            <label className="flex flex-col sm:flex-1 gap-1">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Responsable</span>
              <select
                value={responsibleFilter}
                onChange={(e) => setResponsibleFilter(e.target.value)}
                className="input"
              >
                <option value="all">Tous les responsables</option>
                {responsibleOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col sm:w-48 gap-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Statut</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'completed' | 'red' | 'orange' | 'green')}
              className="input"
            >
              <option value="all">Toutes les tâches</option>
              <option value="pending">Tâches non validées</option>
              <option value="red">Tâches urgentes</option>
              <option value="orange">Tâches en attention</option>
              <option value="green">Tâches à jour</option>
              <option value="completed">Tâches validées uniquement</option>
            </select>
          </label>
        </div>
        {statusFilter === 'pending' && (
          <p className="text-xs text-gray-500">
            Les tâches validées sont masquées par défaut. Passez le filtre sur "Toutes les tâches" pour les afficher.
          </p>
        )}
        {statusFilter === 'completed' && (
          <p className="text-xs text-gray-500">
            Seules les tâches validées sont affichées.
          </p>
        )}
        {(statusFilter === 'red' || statusFilter === 'orange' || statusFilter === 'green') && (
          <p className="text-xs text-gray-500">
            Affichage uniquement des tâches non validées avec le statut sélectionné.
          </p>
        )}
      </div>

      {event.description && (
        <div className="card">
          <p className="text-gray-700">{event.description}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCompleteSelectedTasks}
            className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={selectedTaskIds.length === 0 || bulkCompleting}
          >
            {bulkCompleting ? 'Validation...' : `Valider la sélection (${selectedTaskIds.length})`}
          </button>
        </div>

        {newPostFormOpen && (
          <form onSubmit={handleCreatePostSubmit} className="card border-dashed border-2 border-gray-300 bg-gray-50 space-y-3">
            <h3 className="font-medium text-sm text-secondary">Nouveau poste</h3>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Nom du poste <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newPostFormData.name}
                onChange={(e) => setNewPostFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="input text-sm"
                placeholder="Ex: Entrée"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Responsable (optionnel)</label>
              <input
                type="text"
                value={newPostFormData.responsible}
                onChange={(e) => setNewPostFormData((prev) => ({ ...prev, responsible: e.target.value }))}
                className="input text-sm"
                placeholder="Nom du responsable"
                list="event-post-responsible-suggestions"
              />
            </div>
            <div className="flex justify-end gap-2 text-sm">
              <button type="button" className="btn-secondary" onClick={handleCancelNewPost}>
                Annuler
              </button>
              <button type="submit" className="btn-primary">
                Ajouter le poste
              </button>
            </div>
          </form>
        )}

        {event.posts.length === 0 && !newPostFormOpen && (
          <div className="card text-center py-8">
            <p className="text-gray-500 mb-4">Aucun poste défini pour cet événement</p>
            <button
              type="button"
              onClick={handleAddPost}
              className="btn-primary"
            >
              + Ajouter un poste
            </button>
          </div>
        )}

        {event.posts.map((post) => {
          const postDefaultName = post.default_responsible_name?.trim() || formatUserName(post.default_user, 'Non assigné');
          const filteredTasks = post.tasks.filter((task) => {
            const explicit = task.responsible_name?.trim();
            const assignee = task.assignee ? formatUserName(task.assignee) : '';
            const nameForFilter = explicit || assignee || postDefaultName;
            const matchesResponsible = responsibleFilter === 'all' || nameForFilter === responsibleFilter;
            
            // Logique de filtrage par statut
            let matchesStatus = false;
            if (statusFilter === 'all') {
              matchesStatus = true;
            } else if (statusFilter === 'pending') {
              matchesStatus = !task.completed_at;
            } else if (statusFilter === 'completed') {
              matchesStatus = !!task.completed_at;
            } else if (statusFilter === 'red' || statusFilter === 'orange' || statusFilter === 'green') {
              // Pour les filtres par couleur, on filtre uniquement les tâches non terminées avec la couleur correspondante
              matchesStatus = !task.completed_at && getTaskStatusColor(task) === statusFilter;
            }
            
            return matchesResponsible && matchesStatus;
          });

          return (
          <div key={post.id} className="card">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-secondary">{post.name}</h2>
              {isAdmin && (
                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="btn-secondary text-xs sm:text-sm text-red-600 border-red-200 hover:text-red-700 self-start"
                >
                  Supprimer le poste
                </button>
              )}
            </div>
            
            {filteredTasks.length === 0 ? (
              <p className="text-gray-500 text-sm">
                {post.tasks.length === 0
                  ? 'Aucune tâche pour ce poste'
                  : 'Aucune tâche ne correspond aux filtres actuels'}
              </p>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => {
                  const taskColor = getTaskStatusColor(task);
                  const isCompleted = Boolean(task.completed_at);
                  const responsibleName = task.responsible_name?.trim() || '';
                  const assigneeDisplay = responsibleName
                    || (task.assignee ? formatUserName(task.assignee) : '')
                    || '';
                  const assigneeName = assigneeDisplay || postDefaultName;
                  const usesPostDefault = !assigneeDisplay;
                  const actionColorClasses =
                    taskColor === 'red'
                      ? 'bg-red-600 hover:bg-red-700'
                      : taskColor === 'orange'
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : 'bg-emerald-600 hover:bg-emerald-700';
                  
                  return (
                    <div
                      key={task.id}
                      className={`border rounded-lg p-4 transition-all ${isCompleted ? 'bg-gray-50 opacity-75' : 'bg-white hover:shadow-sm'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                              checked={selectedTaskIds.includes(task.id)}
                              disabled={isCompleted || bulkCompleting}
                              onChange={() =>
                                setSelectedTaskIds((prev) =>
                                  prev.includes(task.id)
                                    ? prev.filter((id) => id !== task.id)
                                    : [...prev, task.id]
                                )
                              }
                              aria-label={`Sélectionner la tâche ${task.name}`}
                            />
                            {!isCompleted && (
                              <>
                                <StatusBadge color={taskColor} size="lg" />
                                <span className={`text-xs font-semibold uppercase tracking-wide ${getStatusTextColorClasses(taskColor)}`}>
                                  {taskColor === 'red' ? 'Urgent' : taskColor === 'orange' ? 'Attention' : 'À jour'}
                                </span>
                              </>
                            )}
                            {isCompleted && (
                              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">✓ Complétée</span>
                            )}
                          </div>
                          
                          {/* Champs éditables directement */}
                          <div className="space-y-2 text-sm">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Nom de la tâche</label>
                              <input
                                type="text"
                                defaultValue={task.name || ''}
                                onBlur={(e) => handleTaskFieldUpdate(task.id, 'name', e.target.value)}
                                className="input text-sm w-full"
                                disabled={isCompleted}
                                placeholder="Nom de la tâche"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Date d'alerte</label>
                                <input
                                  type="date"
                                  defaultValue={task.alert_date || ''}
                                  onBlur={(e) => handleTaskFieldUpdate(task.id, 'alert_date', e.target.value)}
                                  className="input text-sm w-full"
                                  disabled={isCompleted}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Date d'échéance</label>
                                <input
                                  type="date"
                                  defaultValue={task.due_date || ''}
                                  onBlur={(e) => handleTaskFieldUpdate(task.id, 'due_date', e.target.value)}
                                  className="input text-sm w-full"
                                  disabled={isCompleted}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Date de référence (optionnel)</label>
                              <input
                                type="date"
                                defaultValue={task.reference_date || event?.event_date || ''}
                                onBlur={(e) => handleTaskFieldUpdate(task.id, 'reference_date', e.target.value)}
                                className="input text-sm w-full"
                                disabled={isCompleted}
                              />
                              <p className="text-[10px] text-gray-500 mt-1">
                                Par défaut : date de l'événement. Les délais sont calculés à partir de cette date.
                              </p>
                            </div>

                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Responsable</label>
                              <input
                                type="text"
                                defaultValue={task.responsible_name || ''}
                                onBlur={(e) => handleTaskFieldUpdate(task.id, 'responsible_name', e.target.value)}
                                className="input text-sm w-full"
                                disabled={isCompleted}
                                placeholder={postDefaultName || 'Responsable'}
                                list="event-task-responsible"
                              />
                              {usesPostDefault && (
                                <p className="text-[10px] text-gray-500 mt-1">
                                  Utilise le responsable par défaut du poste ({postDefaultName})
                                </p>
                              )}
                            </div>

                            {task.completed_by_user && (
                              <div className="text-green-600 text-sm">
                                <span className="font-medium">Complétée par:</span> {formatUserName(task.completed_by_user)}
                                {task.completed_at && (
                                  <span className="text-gray-500">
                                    {' '}le {new Date(task.completed_at).toLocaleDateString('fr-FR')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Pièces jointes de la tâche */}
                          <AttachmentManager
                            taskId={task.id}
                            onAttachmentsChange={() => loadEvent(true)}
                          />

                          {/* Commentaires - toujours visibles */}
                          {task.comments && task.comments.length > 0 && (
                            <div className="mt-4 space-y-2 pt-3 border-t border-gray-200">
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Commentaires et historique:</div>
                              {task.comments.map((comment) => {
                                const isModification = comment.content.startsWith('Modification:');
                                const canDelete = canDeleteComment(comment, task.comments || []);
                                return (
                                  <div key={comment.id} className={`rounded-lg p-3 text-sm ${isModification ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'} relative`}>
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <div className="font-medium text-gray-700">
                                        {formatUserName(comment.author, 'Anonyme')}
                                        {isModification && <span className="text-xs text-blue-600 ml-2">(modification)</span>}
                                      </div>
                                      {canDelete && (
                                        <button
                                          onClick={() => handleDeleteComment(comment.id)}
                                          className="text-xs text-red-600 hover:text-red-700 ml-auto"
                                          title="Supprimer ce commentaire"
                                        >
                                          Supprimer
                                        </button>
                                      )}
                                    </div>
                                    <div className={`${isModification ? 'text-gray-700 whitespace-pre-line' : 'text-gray-600'}`}>
                                      {comment.content}
                                    </div>
                                    {/* Pièces jointes du commentaire */}
                                    {comment.attachments && comment.attachments.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {comment.attachments.map((attachment) => (
                                          <div key={attachment.id} className="flex items-center gap-2 text-xs">
                                            <span>📎</span>
                                            <a
                                              href={attachment.google_drive_web_view_link || attachment.google_drive_download_link || '#'}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800"
                                            >
                                              {attachment.file_name}
                                            </a>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-400 mt-1">
                                      {new Date(comment.created_at).toLocaleString('fr-FR')}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Ajouter un commentaire */}
                          {!showCommentInputs[task.id] ? (
                            <button
                              onClick={() => setShowCommentInputs({ ...showCommentInputs, [task.id]: true })}
                              className="text-sm text-accent hover:text-accent-dark mt-3 inline-flex items-center gap-1"
                            >
                              <span>+</span> Ajouter un commentaire
                            </button>
                          ) : (
                            <div className="mt-4 space-y-2 pt-3 border-t border-gray-200">
                              <textarea
                                value={commentTexts[task.id] || ''}
                                onChange={(e) => setCommentTexts({ ...commentTexts, [task.id]: e.target.value })}
                                placeholder="Écrivez un commentaire..."
                                className="input text-sm"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAddComment(task.id)}
                                  className="btn-primary text-sm py-1.5 px-3"
                                >
                                  Envoyer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowCommentInputs({ ...showCommentInputs, [task.id]: false });
                                    setCommentTexts({ ...commentTexts, [task.id]: '' });
                                  }}
                                  className="btn-secondary text-sm py-1.5 px-3"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex sm:flex-col gap-2 sm:min-w-[160px]">
                          {!isCompleted ? (
                            <button
                              onClick={() => handleCompleteTask(task.id)}
                              className={`btn-primary text-sm py-2 px-4 border-0 flex-1 sm:flex-none ${actionColorClasses}`}
                            >
                              Valider
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReopenTask(task.id)}
                              className="btn-secondary text-sm py-2 px-4 flex-1 sm:flex-none"
                            >
                              Rouvrir
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="btn-secondary text-sm py-2 px-4 flex-1 sm:flex-none text-red-600 border-red-200 hover:text-red-700"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {newTaskForm?.postId === post.id ? (
              <form onSubmit={handleCreateTaskSubmit} className="mt-4 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 space-y-3">
                <h4 className="font-medium text-sm text-secondary">Nouvelle tâche</h4>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Nom *</label>
                  <input
                    type="text"
                    value={newTaskForm.name}
                    onChange={(e) => setNewTaskForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                    className="input text-sm"
                    placeholder="Ex : Affiche du match"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Responsable (optionnel)</label>
                  <input
                    type="text"
                    value={newTaskForm.responsible}
                    onChange={(e) => setNewTaskForm((prev) => (prev ? { ...prev, responsible: e.target.value } : prev))}
                    className="input text-sm"
                    placeholder={postDefaultName ? `Par défaut : ${postDefaultName}` : 'Nom du responsable'}
                    list="event-task-responsible"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Date de référence (optionnel)
                  </label>
                  <input
                    type="date"
                    value={newTaskForm.referenceDate}
                    onChange={(e) => setNewTaskForm((prev) => (prev ? { ...prev, referenceDate: e.target.value } : prev))}
                    className="input text-sm"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Par défaut : date de l'événement ({event.event_date}). Les délais sont calculés à partir de cette date.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Délai d'alerte (jours avant) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newTaskForm.alertDelay}
                      onChange={(e) =>
                        setNewTaskForm((prev) => (prev ? { ...prev, alertDelay: e.target.value } : prev))
                      }
                      className="input text-sm"
                      placeholder="0"
                      required
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Doit être supérieur ou égal au délai critique.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Délai critique (jours avant) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newTaskForm.criticalDelay}
                      onChange={(e) =>
                        setNewTaskForm((prev) => (prev ? { ...prev, criticalDelay: e.target.value } : prev))
                      }
                      className="input text-sm"
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 text-sm">
                  <button type="button" className="btn-secondary" onClick={handleCancelNewTask}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary">
                    Ajouter la tâche
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => handleAddTask(post.id)}
                  className="text-sm text-accent hover:text-accent-dark"
                >
                  + Ajouter une tâche
                </button>
              </div>
            )}
          </div>
        )})}

        {event.posts.length > 0 && !newPostFormOpen && !newTaskForm && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddPost}
              className="btn-secondary text-sm"
            >
              + Ajouter un poste
            </button>
          </div>
        )}
      </div>
      <datalist id="event-task-responsible">
        {responsibleOptions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id="event-post-responsible-suggestions">
        {responsibleOptions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}

