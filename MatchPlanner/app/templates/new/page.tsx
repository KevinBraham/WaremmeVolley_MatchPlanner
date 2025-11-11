'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getTeams, createEventTemplate, createTemplatePost, createTemplateTask } from '@/lib/supabase/queries';
import type { Team, EventTemplateInsert, TemplatePostInsert, TemplateTaskInsert } from '@/lib/types/database';
import Link from 'next/link';

export default function NewTemplatePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    team_id: '',
    name: '',
    description: '',
  });

  const [posts, setPosts] = useState<Array<{
    name: string;
    default_responsible_name: string;
    tasks: Array<{
      name: string;
      default_due_offset_days: number;
      default_alert_offset_days: number;
      default_responsible_name: string;
    }>;
  }>>([
    {
      name: '',
      default_responsible_name: '',
      tasks: [
        {
          name: '',
          default_due_offset_days: 0,
          default_alert_offset_days: 0,
          default_responsible_name: '',
        },
      ],
    },
  ]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        loadData();
      }
    }
  }, [isAuthenticated, authLoading]);

  async function loadData() {
    try {
      setLoading(true);
      const teamsData = await getTeams();
      setTeams(teamsData);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }

  function addPost() {
    setPosts([
      ...posts,
      {
        name: '',
        default_responsible_name: '',
        tasks: [
          {
            name: '',
            default_due_offset_days: 0,
            default_alert_offset_days: 0,
            default_responsible_name: '',
          },
        ],
      },
    ]);
  }

  function removePost(index: number) {
    setPosts(posts.filter((_, i) => i !== index));
  }

  function updatePost(index: number, field: string, value: any) {
    const newPosts = [...posts];
    newPosts[index] = { ...newPosts[index], [field]: value };
    setPosts(newPosts);
  }

  function addTask(postIndex: number) {
    const newPosts = [...posts];
    newPosts[postIndex].tasks.push({
      name: '',
      default_due_offset_days: 0,
      default_alert_offset_days: 0,
      default_responsible_name: '',
    });
    setPosts(newPosts);
  }

  function removeTask(postIndex: number, taskIndex: number) {
    const newPosts = [...posts];
    newPosts[postIndex].tasks = newPosts[postIndex].tasks.filter((_, i) => i !== taskIndex);
    setPosts(newPosts);
  }

  function updateTask(postIndex: number, taskIndex: number, field: string, value: any) {
    const newPosts = [...posts];
    newPosts[postIndex].tasks[taskIndex] = { ...newPosts[postIndex].tasks[taskIndex], [field]: value };
    setPosts(newPosts);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      setError(null);

      if (!formData.name) {
        setError('Le nom du modèle est requis');
        return;
      }

      // Créer le modèle
      const templateData: EventTemplateInsert = {
        team_id: formData.team_id || null,
        name: formData.name,
        description: formData.description || null,
        created_by: user.id,
      };

      const template = await createEventTemplate(templateData);

      // Créer les posts et tâches
      for (let postIndex = 0; postIndex < posts.length; postIndex++) {
        const post = posts[postIndex];
        if (!post.name) continue; // Ignorer les posts vides

        const postData: TemplatePostInsert = {
          template_id: template.id,
          name: post.name,
          default_user_id: null,
          default_responsible_name: post.default_responsible_name.trim() || null,
          position: postIndex,
        };

        const createdPost = await createTemplatePost(postData);

        // Créer les tâches
        for (let taskIndex = 0; taskIndex < post.tasks.length; taskIndex++) {
          const task = post.tasks[taskIndex];
          if (!task.name) continue; // Ignorer les tâches vides

          const taskData: TemplateTaskInsert = {
            template_post_id: createdPost.id,
            name: task.name,
            default_due_offset_days: task.default_due_offset_days || 0,
            default_alert_offset_days: task.default_alert_offset_days || 0,
            default_user_id: null,
            default_responsible_name: task.default_responsible_name.trim() || null,
            position: taskIndex,
          };

          await createTemplateTask(taskData);
        }
      }

      router.push(`/templates/${template.id}`);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du modèle');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  const nameSuggestions = Array.from(
    new Set(
      posts.flatMap((post) => [
        post.default_responsible_name,
        ...post.tasks.map((task) => task.default_responsible_name),
      ])
    )
  ).filter((name): name is string => Boolean(name && name.trim()));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nouveau modèle</h1>
        <Link href="/templates" className="btn-secondary">
          Annuler
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">Informations générales</h2>
          
          <div>
            <label htmlFor="team_id" className="block text-sm font-medium text-gray-700 mb-2">
              Équipe (optionnel)
            </label>
            <select
              id="team_id"
              value={formData.team_id}
              onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
              className="input"
            >
              <option value="">Aucune équipe spécifique</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

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
              placeholder="Ex: Match officiel"
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
              rows={3}
              placeholder="Description du modèle..."
            />
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Postes et tâches</h2>
            <button
              type="button"
              onClick={addPost}
              className="btn-secondary text-sm"
            >
              + Ajouter un poste
            </button>
          </div>

          {posts.map((post, postIndex) => (
            <div key={postIndex} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Poste {postIndex + 1}</h3>
                <button
                  type="button"
                  onClick={() => removePost(postIndex)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Supprimer
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du poste
                </label>
                <input
                  type="text"
                  value={post.name}
                  onChange={(e) => updatePost(postIndex, 'name', e.target.value)}
                  className="input"
                  placeholder="Ex: Entrée"
                />
              </div>

              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Responsable par défaut (optionnel)
                 </label>
                 <input
                   type="text"
                   value={post.default_responsible_name}
                   onChange={(e) => updatePost(postIndex, 'default_responsible_name', e.target.value)}
                   className="input"
                   placeholder={post.default_responsible_name ? post.default_responsible_name : 'Nom du responsable (optionnel)'}
                   list="responsible-name-suggestions"
                 />
               </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Tâches
                  </label>
                  <button
                    type="button"
                    onClick={() => addTask(postIndex)}
                    className="text-sm text-accent hover:text-accent-dark"
                  >
                    + Ajouter une tâche
                  </button>
                </div>

                {post.tasks.map((task, taskIndex) => (
                  <div key={taskIndex} className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Tâche {taskIndex + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeTask(postIndex, taskIndex)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                    <input
                      type="text"
                      value={task.name}
                      onChange={(e) => updateTask(postIndex, taskIndex, 'name', e.target.value)}
                      className="input text-sm"
                      placeholder="Nom de la tâche"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Délai critique (jours avant événement) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={task.default_due_offset_days}
                          onChange={(e) => updateTask(postIndex, taskIndex, 'default_due_offset_days', parseInt(e.target.value, 10) || 0)}
                          className="input text-sm"
                          min="0"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Délai d'alerte (jours avant) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={task.default_alert_offset_days}
                          onChange={(e) =>
                            updateTask(
                              postIndex,
                              taskIndex,
                              'default_alert_offset_days',
                              Math.max(0, parseInt(e.target.value, 10) || 0)
                            )
                          }
                          className="input text-sm"
                          min="0"
                          placeholder="0"
                          required
                        />
                        <p className="text-[10px] text-gray-500 mt-1">
                          Doit être supérieur ou égal au délai critique.
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Responsable (optionnel)
                        </label>
                        <input
                          type="text"
                          value={task.default_responsible_name}
                          onChange={(e) => updateTask(postIndex, taskIndex, 'default_responsible_name', e.target.value)}
                          className="input text-sm"
                          placeholder={post.default_responsible_name ? `Ex: ${post.default_responsible_name}` : 'Nom du responsable (optionnel)'}
                          list="responsible-name-suggestions"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => addTask(postIndex)}
                    className="text-sm text-accent hover:text-accent-dark"
                  >
                    + Ajouter une tâche
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={addPost}
              className="btn-secondary text-sm"
            >
              + Ajouter un poste
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Link href="/templates" className="btn-secondary">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Création...' : 'Créer le modèle'}
          </button>
        </div>
      </form>
      {nameSuggestions.length > 0 && (
        <datalist id="responsible-name-suggestions">
          {nameSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      )}
    </div>
  );
}

