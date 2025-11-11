'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getEventTemplateWithDetails, updateEventTemplate, createTemplatePost, createTemplateTask, updateTemplatePost, updateTemplateTask, deleteTemplatePost, deleteTemplateTask } from '@/lib/supabase/queries';
import type { EventTemplateWithDetails, EventTemplateUpdate, TemplatePost, TemplateTask } from '@/lib/types/database';
import { formatUserName } from '@/lib/utils/user';
import Link from 'next/link';

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [template, setTemplate] = useState<EventTemplateWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPostFormOpen, setNewPostFormOpen] = useState(false);
  const [newPostFormData, setNewPostFormData] = useState({ name: '', responsible: '' });
  const [newTaskForm, setNewTaskForm] = useState<{
    postId: string;
    name: string;
    alertDelay: string;
    criticalDelay: string;
    responsible: string;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        loadTemplate();
      }
    }
  }, [params.id, isAuthenticated, authLoading]);

  async function loadTemplate() {
    try {
      setLoading(true);
      const templateData = await getEventTemplateWithDetails(params.id as string);
      if (!templateData) {
        setError('Modèle non trouvé');
        return;
      }
      setTemplate(templateData);
      setFormData({
        name: templateData.name,
        description: templateData.description || '',
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du modèle');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!template) return;

    try {
      setSaving(true);
      setError(null);

      const updates: EventTemplateUpdate = {
        name: formData.name,
        description: formData.description || null,
      };

      await updateEventTemplate(template.id, updates);
      router.push(`/templates/${template.id}`);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du modèle');
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
    if (!template) return;

    const name = newPostFormData.name.trim();
    if (!name) {
      alert('Le nom du poste est requis');
      return;
    }

    try {
      const maxPosition = Math.max(...template.posts.map((p) => p.position), -1);
      await createTemplatePost({
        template_id: template.id,
        name,
        default_user_id: null,
        default_responsible_name: newPostFormData.responsible.trim() || null,
        position: maxPosition + 1,
      });
      setNewPostFormOpen(false);
      setNewPostFormData({ name: '', responsible: '' });
      await loadTemplate();
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
      await deleteTemplatePost(postId);
      await loadTemplate();
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  function handleAddTask(postId: string) {
    setNewPostFormOpen(false);
    setNewTaskForm({ postId, name: '', alertDelay: '', criticalDelay: '', responsible: '' });
  }

  async function handleCreateTaskSubmit(e: FormEvent) {
    e.preventDefault();
    if (!template || !newTaskForm) return;

    const name = newTaskForm.name.trim();
    if (!name) {
      alert('Le nom de la tâche est requis');
      return;
    }

    const post = template.posts.find((p) => p.id === newTaskForm.postId);
    if (!post) return;

    if (!newTaskForm.alertDelay.trim() || !newTaskForm.criticalDelay.trim()) {
      alert('Les délais d\'alerte et critique sont obligatoires.');
      return;
    }

    const alertDelay = Math.max(0, parseInt(newTaskForm.alertDelay, 10));
    const criticalDelay = Math.max(0, parseInt(newTaskForm.criticalDelay, 10));

    if (Number.isNaN(alertDelay) || Number.isNaN(criticalDelay)) {
      alert('Les délais doivent être des nombres positifs.');
      return;
    }

    if (alertDelay < criticalDelay) {
      alert('Le délai d\'alerte doit être supérieur ou égal au délai critique.');
      return;
    }

    try {
      const maxPosition = Math.max(...post.tasks.map((t) => t.position), -1);
      await createTemplateTask({
        template_post_id: newTaskForm.postId,
        name,
        default_due_offset_days: criticalDelay,
        default_alert_offset_days: alertDelay,
        default_user_id: null,
        default_responsible_name: newTaskForm.responsible.trim() || post.default_responsible_name || null,
        position: maxPosition + 1,
      });
      setNewTaskForm(null);
      await loadTemplate();
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  function handleCancelNewTask() {
    setNewTaskForm(null);
  }

  function setPostField(postId: string, updates: Partial<TemplatePost>) {
    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        posts: prev.posts.map((post) => (post.id === postId ? { ...post, ...updates } : post)),
      };
    });
  }

  function setTaskField(postId: string, taskId: string, updates: Partial<TemplateTask>) {
    setTemplate((prev) => {
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

  function normalizeDelayInput(value: string): number {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  }

  function handleTaskDelayInput(
    postId: string,
    taskId: string,
    field: 'alert' | 'critical',
    rawValue: string
  ) {
    if (field === 'alert') {
      setTaskField(postId, taskId, {
        default_alert_offset_days: normalizeDelayInput(rawValue),
      });
    } else {
      setTaskField(postId, taskId, {
        default_due_offset_days: normalizeDelayInput(rawValue),
      });
    }
  }

  async function handleTaskDelayPersist(
    postId: string,
    taskId: string,
    field: 'alert' | 'critical',
    rawValue: string
  ) {
    const value = normalizeDelayInput(rawValue);

    const currentPost = template?.posts.find((p) => p.id === postId);
    const currentTask = currentPost?.tasks.find((t) => t.id === taskId);
    if (!currentTask) return;

    if (field === 'alert') {
      const criticalDelay = currentTask.default_due_offset_days ?? 0;
      if (value < criticalDelay) {
        alert('Le délai d\'alerte doit être supérieur ou égal au délai critique.');
        setTaskField(postId, taskId, { default_alert_offset_days: criticalDelay });
        return;
      }
    } else {
      const alertDelay =
        currentTask.default_alert_offset_days ?? currentTask.default_due_offset_days ?? 0;
      if (alertDelay < value) {
        alert('Le délai critique doit être inférieur ou égal au délai d\'alerte.');
        setTaskField(postId, taskId, { default_due_offset_days: alertDelay });
        return;
      }
    }

    const updates =
      field === 'alert'
        ? { default_alert_offset_days: value }
        : { default_due_offset_days: value };
    try {
      setTaskField(postId, taskId, updates);
      await updateTemplateTask(taskId, updates);
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handlePostDefaultNameSave(postId: string, name: string) {
    const trimmed = name.trim() || null;
    setPostField(postId, { default_responsible_name: trimmed || '' });
    try {
      await updateTemplatePost(postId, { default_responsible_name: trimmed });
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handleTaskDefaultNameSave(postId: string, taskId: string, name: string) {
    const trimmed = name.trim() || null;
    setTaskField(postId, taskId, { default_responsible_name: trimmed || '' });
    try {
      await updateTemplateTask(taskId, { default_responsible_name: trimmed });
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return;
    try {
      await deleteTemplateTask(taskId);
      await loadTemplate();
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

  if (error || !template) {
    return (
      <div className="card border-red-200 bg-red-50">
        <p className="text-red-800">{error || 'Modèle non trouvé'}</p>
        <Link href="/templates" className="link mt-2 inline-block">
          Retour aux modèles
        </Link>
      </div>
    );
  }

  const responsibleSuggestions = Array.from(
    new Set(
      template.posts.flatMap((post) => [
        post.default_responsible_name,
        ...post.tasks.map((task) => task.default_responsible_name),
      ])
    )
  ).filter((name): name is string => Boolean(name && name.trim()));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-secondary">Modifier le modèle</h1>
        <Link href={`/templates/${template.id}`} className="btn-secondary">
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
            Nom du modèle <span className="text-red-500">*</span>
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
          <Link href={`/templates/${template.id}`} className="btn-secondary">
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
                  list="template-responsible-suggestions"
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

          {template.posts.length === 0 && (
            <p className="text-gray-500 text-sm">Aucun poste défini</p>
          )}

          {template.posts.map((post) => {
            const postDefaultName = post.default_responsible_name?.trim() || null;
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
                    Responsable par défaut (optionnel)
                  </label>
                  <input
                    type="text"
                    value={post.default_responsible_name || ''}
                    onChange={(e) => setPostField(post.id, { default_responsible_name: e.target.value })}
                    onBlur={(e) => handlePostDefaultNameSave(post.id, e.target.value)}
                    className="input"
                    placeholder="Nom du responsable"
                    list="template-responsible-suggestions"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si une tâche n'a pas de responsable spécifique, celui du poste sera utilisé.
                  </p>
                </div>

                <div className="space-y-3">
                  {post.tasks.length === 0 ? (
                    <p className="text-gray-500 text-xs">Aucune tâche</p>
                  ) : (
                    <div className="space-y-3">
                      {post.tasks.map((task) => (
                        <div key={task.id} className="p-3 bg-gray-50 rounded-lg space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div>
                              <div className="font-medium text-sm text-secondary">{task.name}</div>
                              <div className="space-y-1 text-xs text-gray-500 mt-1">
                                <div>
                                  Délai d'alerte :{' '}
                                  {typeof task.default_alert_offset_days === 'number'
                                    ? `${task.default_alert_offset_days} jour(s) avant`
                                    : 'désactivé'}
                                </div>
                                <div>
                                  Délai critique :{' '}
                                  {task.default_due_offset_days > 0
                                    ? `${task.default_due_offset_days} jour(s) avant`
                                    : 'aucun'}
                                </div>
                              </div>
                              {postDefaultName && (
                                <div className="text-xs text-gray-400">
                                  Par défaut : {postDefaultName}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Supprimer
                            </button>
                          </div>

                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Responsable (optionnel)
                            </label>
                            <input
                              type="text"
                              value={task.default_responsible_name || ''}
                              onChange={(e) => setTaskField(post.id, task.id, { default_responsible_name: e.target.value })}
                              onBlur={(e) => handleTaskDefaultNameSave(post.id, task.id, e.target.value)}
                              className="input text-sm"
                              placeholder={postDefaultName ? `Par défaut : ${postDefaultName}` : 'Nom du responsable'}
                              list="template-responsible-suggestions"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Délai d'alerte (jours avant)
                              </label>
                              <input
                                type="number"
                                min="0"
                              value={task.default_alert_offset_days ?? task.default_due_offset_days ?? 0}
                                onChange={(e) =>
                                  handleTaskDelayInput(post.id, task.id, 'alert', e.target.value)
                                }
                                onBlur={(e) =>
                                  handleTaskDelayPersist(post.id, task.id, 'alert', e.target.value)
                                }
                                className="input text-sm"
                              required
                              />
                            <p className="text-[10px] text-gray-500 mt-1">
                              Doit être supérieur ou égal au délai critique.
                            </p>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Délai critique (jours avant)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={task.default_due_offset_days ?? 0}
                                onChange={(e) =>
                                  handleTaskDelayInput(post.id, task.id, 'critical', e.target.value)
                                }
                                onBlur={(e) =>
                                  handleTaskDelayPersist(post.id, task.id, 'critical', e.target.value)
                                }
                                className="input text-sm"
                              required
                              />
                            <p className="text-[10px] text-gray-500 mt-1">
                              0 = le jour de l'événement.
                            </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                {newTaskForm?.postId === post.id && (
                  <form onSubmit={handleCreateTaskSubmit} className="p-3 bg-gray-100 border border-dashed border-gray-300 rounded-lg space-y-3">
                    <h4 className="font-medium text-sm text-secondary">Nouvelle tâche</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Nom *</label>
                        <input
                          type="text"
                          value={newTaskForm.name}
                          onChange={(e) => setNewTaskForm((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                          className="input text-sm"
                          placeholder="Nom de la tâche"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Délai critique (jours avant) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
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
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Délai d'alerte (jours avant) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
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
                      <label className="block text-xs text-gray-600 mb-1">Responsable (optionnel)</label>
                      <input
                        type="text"
                        value={newTaskForm.responsible}
                        onChange={(e) => setNewTaskForm((prev) => prev ? { ...prev, responsible: e.target.value } : prev)}
                        className="input text-sm"
                        placeholder={postDefaultName ? `Par défaut : ${postDefaultName}` : 'Nom du responsable'}
                        list="template-responsible-suggestions"
                      />
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
      </div>
      <datalist id="template-responsible-suggestions">
        {responsibleSuggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}