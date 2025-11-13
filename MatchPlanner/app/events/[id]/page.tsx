'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  getEventWithDetails,
  completeTask,
  reopenTask,
  createTaskComment,
  deleteEvent,
  deleteEventTask,
  createEventTask,
  deleteEventPost,
} from '@/lib/supabase/queries';
import type { EventWithDetails } from '@/lib/types/database';
import { formatDateFullFrench, formatDateISO, addDays } from '@/lib/utils/date';
import { getTaskStatusColor, getStatusTextColorClasses } from '@/lib/utils/status-color';
import { formatUserName } from '@/lib/utils/user';
import { StatusBadge } from '@/components/StatusBadge';
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
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
  const [newTaskForm, setNewTaskForm] = useState<{
    postId: string;
    name: string;
    criticalDelay: string;
    alertDelay: string;
    responsible: string;
  } | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkCompleting, setBulkCompleting] = useState(false);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        loadEvent();
      }
    }
  }, [params.id, isAuthenticated, authLoading]);

  async function loadEvent() {
    try {
      setLoading(true);
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
    }
  }

  async function handleCompleteTask(taskId: string) {
    if (!user) return;
    try {
      setSelectedTaskIds((prev) => prev.filter((id) => id !== taskId));
      await completeTask(taskId, user.id);
      await loadEvent();
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handleCompleteSelectedTasks() {
    if (!user || selectedTaskIds.length === 0) return;
    const tasksToComplete = selectedTaskIds;
    try {
      setBulkCompleting(true);
      setSelectedTaskIds([]);
      await Promise.all(tasksToComplete.map((taskId) => completeTask(taskId, user.id)));
      await loadEvent();
    } catch (err: any) {
      alert('Erreur: ' + err.message);
      setSelectedTaskIds(tasksToComplete);
    } finally {
      setBulkCompleting(false);
    }
  }

  async function handleReopenTask(taskId: string) {
    try {
      await reopenTask(taskId);
      await loadEvent();
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  function handleAddTask(postId: string) {
    setNewTaskForm({ postId, name: '', criticalDelay: '', alertDelay: '', responsible: '' });
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

    const dueDate = addDays(event.event_date, -criticalDelay);
    const alertDate = addDays(event.event_date, -alertDelay);

    try {
      const maxPosition = Math.max(...post.tasks.map((t) => t.position), -1);
      await createEventTask({
        event_post_id: newTaskForm.postId,
        name,
        assignee_user_id: null,
        responsible_name: newTaskForm.responsible.trim() || post.default_responsible_name || null,
        due_date: dueDate,
        alert_date: alertDate,
        completed_at: null,
        completed_by: null,
        status: 'todo',
        position: maxPosition + 1,
      });
      setNewTaskForm(null);
      await loadEvent();
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!isAdmin) return;
    if (!confirm('Supprimer définitivement cette tâche ?')) return;
    try {
      await deleteEventTask(taskId);
      await loadEvent();
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!isAdmin) return;
    if (!confirm('Supprimer ce poste et toutes ses tâches ?')) return;
    try {
      await deleteEventPost(postId);
      await loadEvent();
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handleDeleteEvent() {
    if (!isAdmin || !event) return;
    if (!confirm('Supprimer définitivement cet événement ?')) return;
    try {
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
      await loadEvent();
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            ← Retour aux événements
          </Link>
          <h1 className="text-2xl font-semibold text-secondary">{event.name}</h1>
          <p className="text-gray-600 mt-1">
            {formatDateFullFrench(event.event_date)} • {event.team.name}
          </p>
          {event.posts.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Les tâches affichent le responsable défini dans le modèle ou dans l'événement.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/events/${event.id}/edit`}
            className="btn-primary"
          >
            Modifier
          </Link>
          {isAdmin && (
            <button
              onClick={handleDeleteEvent}
              className="btn-secondary text-sm text-red-600 hover:text-red-700 border-red-200"
            >
              Supprimer
            </button>
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
              onChange={(e) => setStatusFilter(e.target.value as 'pending' | 'all')}
              className="input"
            >
              <option value="pending">Tâches non validées</option>
              <option value="all">Toutes les tâches</option>
            </select>
          </label>
        </div>
        {statusFilter === 'pending' && (
          <p className="text-xs text-gray-500">
            Les tâches validées sont masquées par défaut. Passez le filtre sur "Toutes les tâches" pour les afficher.
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
        {event.posts.map((post) => {
          const postDefaultName = post.default_responsible_name?.trim() || formatUserName(post.default_user, 'Non assigné');
          const filteredTasks = post.tasks.filter((task) => {
            const explicit = task.responsible_name?.trim();
            const assignee = task.assignee ? formatUserName(task.assignee) : '';
            const nameForFilter = explicit || assignee || postDefaultName;
            const matchesResponsible = responsibleFilter === 'all' || nameForFilter === responsibleFilter;
            const matchesStatus = statusFilter === 'all' || !task.completed_at;
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
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                            <span className="font-medium text-secondary">{task.name}</span>
                            {isCompleted && (
                              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">✓ Complétée</span>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            {task.alert_date && !isCompleted && (
                              <div>
                                <span className="font-medium">Alerte:</span> {formatDateISO(task.alert_date)}
                              </div>
                            )}
                            {task.due_date && (
                              <div>
                                <span className="font-medium">Échéance critique:</span> {formatDateISO(task.due_date)}
                              </div>
                            )}
                            
                            <div>
                              <span className="font-medium">Assigné à:</span> {assigneeName}
                              {usesPostDefault && (
                                <span className="text-xs text-gray-500 ml-2">(responsable du poste)</span>
                              )}
                            </div>
                            
                            {task.completed_by_user && (
                              <div className="text-green-600">
                                <span className="font-medium">Complétée par:</span> {formatUserName(task.completed_by_user)}
                                {task.completed_at && (
                                  <span className="text-gray-500">
                                    {' '}le {new Date(task.completed_at).toLocaleDateString('fr-FR')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Commentaires */}
                          {task.comments && task.comments.length > 0 && (
                            <div className="mt-4 space-y-2 pt-3 border-t border-gray-100">
                              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Commentaires:</div>
                              {task.comments.map((comment) => (
                                <div key={comment.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                                  <div className="font-medium text-gray-700 mb-1">
                                    {formatUserName(comment.author, 'Anonyme')}
                                  </div>
                                  <div className="text-gray-600">{comment.content}</div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    {new Date(comment.created_at).toLocaleString('fr-FR')}
                                  </div>
                                </div>
                              ))}
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
                            <div className="mt-4 space-y-2 pt-3 border-t border-gray-100">
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
                              Supprimer la tâche
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      </div>
      <datalist id="event-task-responsible">
        {responsibleOptions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}

