'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getEventWithDetails, updateEvent, createEventPost, createEventTask, updateEventPost, updateEventTask, deleteEventPost, deleteEventTask } from '@/lib/supabase/queries';
import type { EventWithDetails, EventUpdate, EventPost, EventTask } from '@/lib/types/database';
import { addDays } from '@/lib/utils/date';
import { formatUserName } from '@/lib/utils/user';
import { getTaskStatusColor, getStatusTextColorClasses } from '@/lib/utils/status-color';
import { StatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPostFormOpen, setNewPostFormOpen] = useState(false);
  const [newPostFormData, setNewPostFormData] = useState({ name: '', responsible: '' });
  const [newTaskForm, setNewTaskForm] = useState<{
    postId: string;
    name: string;
    criticalDelay: string;
    alertDelay: string;
    responsible: string;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_date: '',
  });

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
      setFormData({
        name: eventData.name,
        description: eventData.description || '',
        event_date: eventData.event_date,
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de l\'événement');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;

    try {
      setSaving(true);
      setError(null);

      const updates: EventUpdate = {
        name: formData.name,
        description: formData.description || null,
        event_date: formData.event_date,
      };

      await updateEvent(event.id, updates);
      router.push(`/events/${event.id}`);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour de l\'événement');
    } finally {
      setSaving(false);
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
      await loadEvent();
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  function handleCancelNewPost() {
    setNewPostFormOpen(false);
    setNewPostFormData({ name: '', responsible: '' });
  }

  async function handleDeletePost(postId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce poste ?')) return;
    try {
      await deleteEventPost(postId);
      await loadEvent();
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  function handleAddTask(postId: string) {
    setNewPostFormOpen(false);
    setNewTaskForm({ postId, name: '', criticalDelay: '', alertDelay: '', responsible: '' });
  }

  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  function computeDelayFromDate(dateString: string | null, eventDate: string): number | null {
    if (!dateString) return null;
    const eventDateObj = new Date(eventDate);
    const target = new Date(dateString);
    eventDateObj.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((eventDateObj.getTime() - target.getTime()) / MS_PER_DAY);
    return diffDays >= 0 ? diffDays : 0;
  }

  function computeDateFromDelay(eventDate: string, delay: number): string {
    return addDays(eventDate, -delay);
  }

  function handleTaskDelayChange(
    postId: string,
    taskId: string,
    field: 'critical' | 'alert',
    rawValue: string
  ) {
    setEvent((prev) => {
      if (!prev) return prev;
      const parsed = rawValue === '' ? null : parseInt(rawValue, 10);
      const delay = parsed === null || Number.isNaN(parsed) ? null : Math.max(0, parsed);
      const newDate = delay === null ? null : computeDateFromDelay(prev.event_date, delay);

      return {
        ...prev,
        posts: prev.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                tasks: post.tasks.map((task) => {
                  if (task.id !== taskId) return task;
                  if (field === 'alert') {
                    return { ...task, alert_date: newDate };
                  }
                  return { ...task, due_date: newDate };
                }),
              }
            : post
        ),
      };
    });
  }

  async function handleTaskDelaySave(
    postId: string,
    taskId: string,
    field: 'critical' | 'alert',
    rawValue: string
  ) {
    if (!event) return;

    const trimmed = rawValue.trim();
    if (!trimmed) {
      alert(`Le délai ${field === 'critical' ? 'critique' : 'd\'alerte'} est obligatoire.`);
      await loadEvent();
      return;
    }

    const delay = parseInt(trimmed, 10);
    if (Number.isNaN(delay) || delay < 0) {
      alert('Les délais doivent être des nombres positifs.');
      await loadEvent();
      return;
    }

    const currentPost = event.posts.find((p) => p.id === postId);
    const currentTask = currentPost?.tasks.find((t) => t.id === taskId);
    if (!currentTask) return;

    const currentAlertDelay = computeDelayFromDate(currentTask.alert_date, event.event_date);
    const currentCriticalDelay = computeDelayFromDate(currentTask.due_date, event.event_date);

    if (field === 'alert' && currentCriticalDelay !== null && delay < currentCriticalDelay) {
      alert('Le délai d\'alerte doit être supérieur ou égal au délai critique.');
      await loadEvent();
      return;
    }

    if (field === 'critical' && currentAlertDelay !== null && currentAlertDelay < delay) {
      alert('Le délai critique doit être inférieur ou égal au délai d\'alerte.');
      await loadEvent();
      return;
    }

    const newDate = computeDateFromDelay(event.event_date, delay);

    try {
      if (field === 'alert') {
        await updateEventTask(taskId, { alert_date: newDate });
      } else {
        await updateEventTask(taskId, { due_date: newDate });
      }
    } catch (err: any) {
      alert('Erreur: ' + err.message);
      await loadEvent();
    }
  }

  async function handleCreateTaskSubmit(e: FormEvent) {
    e.preventDefault();
    if (!event || !newTaskForm) return;

    const name = newTaskForm.name.trim();
    if (!name) {
      alert('Le nom de la tâche est requis');
      return;
    }

    const post = event.posts.find((p) => p.id === newTaskForm.postId);
    if (!post) return;

    const criticalRaw = newTaskForm.criticalDelay.trim();
    const alertRaw = newTaskForm.alertDelay.trim();

    if (!criticalRaw || !alertRaw) {
      alert('Les délais d\'alerte et critique sont obligatoires.');
      return;
    }

    const criticalDelay = parseInt(criticalRaw, 10);
    const alertDelay = parseInt(alertRaw, 10);

    if (Number.isNaN(criticalDelay) || Number.isNaN(alertDelay) || criticalDelay < 0 || alertDelay < 0) {
      alert('Les délais doivent être des nombres positifs.');
      return;
    }

    if (alertDelay < criticalDelay) {
      alert('Le délai d\'alerte doit être supérieur ou égal au délai critique.');
      return;
    }

    const dueDate = computeDateFromDelay(event.event_date, criticalDelay);
    const alertDate = computeDateFromDelay(event.event_date, alertDelay);

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

  function handleCancelNewTask() {
    setNewTaskForm(null);
  }

  // Gestion des champs locaux
 
  function setEventPostField(postId: string, updates: Partial<EventPost>) {
    setEvent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        posts: prev.posts.map((post) => (post.id === postId ? { ...post, ...updates } : post)),
      };
    });
  }

  function setEventTaskField(postId: string, taskId: string, updates: Partial<EventTask>) {
    setEvent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        posts: prev.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                tasks: post.tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task)),
              }
            : post
        ),
      };
    });
  }

  async function handlePostDefaultNameSave(postId: string, name: string) {
    const trimmed = name.trim() || null;
    setEventPostField(postId, { default_responsible_name: trimmed || '' });
    try {
      await updateEventPost(postId, { default_responsible_name: trimmed });
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handleTaskResponsibleNameSave(postId: string, taskId: string, name: string) {
    const trimmed = name.trim() || null;
    setEventTaskField(postId, taskId, { responsible_name: trimmed || '' });
    try {
      await updateEventTask(taskId, { responsible_name: trimmed });
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return;
    try {
      await deleteEventTask(taskId);
      await loadEvent();
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

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
 
  const responsibleSuggestions = Array.from(
    new Set(
      event.posts.flatMap((post) => [
        post.default_responsible_name,
        ...post.tasks.map((task) => task.responsible_name),
      ])
    )
  ).filter((name): name is string => Boolean(name && name.trim()));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-secondary">Modifier l'événement</h1>
        <Link href={`/events/${event.id}`} className="btn-secondary">
          Annuler
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Nom de l'événement <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-2">
            Date de l'événement <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="event_date"
            value={formData.event_date}
            onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description (optionnel)
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input"
            rows={4}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Link href={`/events/${event.id}`} className="btn-secondary">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-secondary">Postes et tâches</h2>
        </div>

        <div className="space-y-4">
          {newPostFormOpen && (
            <form onSubmit={handleCreatePostSubmit} className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3 bg-gray-50">
                <h3 className="font-medium text-sm text-secondary">Nouveau poste</h3>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Nom du poste *</label>
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
                    list="event-responsible-suggestions"
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

          {event.posts.length === 0 && (
            <p className="text-gray-500 text-sm">Aucun poste défini</p>
          )}

          {event.posts.map((post) => {
            const postDefaultName =
              post.default_responsible_name?.trim() || formatUserName(post.default_user, 'Non défini');
            return (
              <div key={post.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-secondary">{post.name}</h3>
                    {post.tasks.length > 0 && (
                      <p className="text-xs text-gray-500">{post.tasks.length} tâche(s)</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsable par défaut du poste
                  </label>
                  <input
                    type="text"
                    value={post.default_responsible_name || ''}
                    onChange={(e) => setEventPostField(post.id, { default_responsible_name: e.target.value })}
                    onBlur={(e) => handlePostDefaultNameSave(post.id, e.target.value)}
                    className="input"
                    placeholder="Nom du responsable"
                    list="event-responsible-suggestions"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Les tâches sans responsable utiliseront celui du poste.
                  </p>
                </div>

                <div className="space-y-3">
                  {post.tasks.length === 0 ? (
                    <p className="text-gray-500 text-xs">Aucune tâche</p>
                  ) : (
                    <div className="space-y-3">
                      {post.tasks.map((task) => {
                        const taskColor = getTaskStatusColor(task);
                        const isCompleted = Boolean(task.completed_at);
                        const alertDelay = computeDelayFromDate(task.alert_date, event.event_date);
                        const criticalDelay = computeDelayFromDate(task.due_date, event.event_date);
                        const criticalValue = String(criticalDelay ?? alertDelay ?? 0);
                        const alertValue = String(alertDelay ?? criticalDelay ?? 0);

                        return (
                          <div key={task.id} className="p-3 bg-gray-50 rounded-lg space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {!isCompleted && (
                                    <>
                                      <StatusBadge color={taskColor} size="lg" />
                                      <span
                                        className={`text-xs font-semibold uppercase tracking-wide ${getStatusTextColorClasses(taskColor)}`}
                                      >
                                        {taskColor === 'red'
                                          ? 'Urgent'
                                          : taskColor === 'orange'
                                            ? 'Attention'
                                            : 'À jour'}
                                      </span>
                                    </>
                                  )}
                                  <span className="font-medium text-sm text-secondary">{task.name}</span>
                                  {isCompleted && (
                                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                      ✓ Complétée
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400">
                                  Responsable par défaut : {postDefaultName}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                Supprimer
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                  Délai d'alerte (jours avant) <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={alertValue}
                                  onChange={(e) => handleTaskDelayChange(post.id, task.id, 'alert', e.target.value)}
                                  onBlur={(e) => handleTaskDelaySave(post.id, task.id, 'alert', e.target.value)}
                                  className="input text-sm"
                                  required
                                  disabled={isCompleted}
                                />
                                <p className="text-[10px] text-gray-500 mt-1">
                                  Converti automatiquement en date relative à l'événement.
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                  Délai critique (jours avant) <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={criticalValue}
                                  onChange={(e) => handleTaskDelayChange(post.id, task.id, 'critical', e.target.value)}
                                  onBlur={(e) => handleTaskDelaySave(post.id, task.id, 'critical', e.target.value)}
                                  className="input text-sm"
                                  required
                                  disabled={isCompleted}
                                />
                                <p className="text-[10px] text-gray-500 mt-1">
                                  Le délai d'alerte doit rester supérieur ou égal à ce délai.
                                </p>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Responsable de la tâche
                              </label>
                              <input
                                type="text"
                                value={task.responsible_name || ''}
                                onChange={(e) =>
                                  setEventTaskField(post.id, task.id, { responsible_name: e.target.value })
                                }
                                onBlur={(e) => handleTaskResponsibleNameSave(post.id, task.id, e.target.value)}
                                className="input text-sm"
                                placeholder={`Par défaut : ${postDefaultName}`}
                                list="event-responsible-suggestions"
                                disabled={isCompleted}
                              />
                            </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Supprimer la tâche
                        </button>
                      </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {newTaskForm?.postId === post.id && (
                    <form onSubmit={handleCreateTaskSubmit} className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3 bg-gray-50">
                        <h3 className="font-medium text-sm text-secondary">Nouvelle tâche</h3>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Nom de la tâche *</label>
                          <input
                            type="text"
                            value={newTaskForm.name}
                            onChange={(e) => setNewTaskForm((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                            className="input text-sm"
                            placeholder="Ex: Préparer l'équipe"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Responsable (optionnel)</label>
                          <input
                            type="text"
                            value={newTaskForm.responsible}
                            onChange={(e) => setNewTaskForm((prev) => prev ? { ...prev, responsible: e.target.value } : prev)}
                            className="input text-sm"
                            placeholder={`Par défaut : ${postDefaultName}`}
                            list="event-responsible-suggestions"
                          />
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
                              setNewTaskForm((prev) =>
                                prev ? { ...prev, criticalDelay: e.target.value } : prev
                              )
                            }
                            className="input text-sm"
                            placeholder="Ex : 3"
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
                              setNewTaskForm((prev) =>
                                prev ? { ...prev, alertDelay: e.target.value } : prev
                              )
                            }
                            className="input text-sm"
                            placeholder="Ex : 7"
                            required
                          />
                          <p className="text-[10px] text-gray-500 mt-1">
                            Doit être supérieur ou égal au délai critique.
                          </p>
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
                  )}
                  {!newTaskForm && (
                    <div className="flex justify-end">
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
              </div>
            );
          })}

          {!newPostFormOpen && !newTaskForm && (
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
 
        <datalist id="event-responsible-suggestions">
          {responsibleSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

