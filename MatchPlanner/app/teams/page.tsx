'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getTeams, createTeam, updateTeam, deleteTeam } from '@/lib/supabase/queries';
import type { Team, TeamInsert } from '@/lib/types/database';
import Link from 'next/link';

export default function TeamsPage() {
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        loadTeams();
      }
    }
  }, [isAuthenticated, authLoading]);

  async function loadTeams() {
    try {
      setLoading(true);
      const teamsData = await getTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error('Erreur lors du chargement des équipes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      if (editing) {
        await updateTeam(editing.id, { name: formData.name });
      } else {
        await createTeam({ name: formData.name });
      }
      setFormData({ name: '' });
      setShowForm(false);
      setEditing(null);
      await loadTeams();
    } catch (error: any) {
      alert('Erreur: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!isAdmin) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) {
      return;
    }

    try {
      setDeleting(id);
      await deleteTeam(id);
      await loadTeams();
    } catch (error: any) {
      alert('Erreur: ' + error.message);
    } finally {
      setDeleting(null);
    }
  }

  function startEdit(team: Team) {
    setEditing(team);
    setFormData({ name: team.name });
    setShowForm(true);
  }

  function cancelEdit() {
    setEditing(null);
    setFormData({ name: '' });
    setShowForm(false);
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Équipes</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Nouvelle équipe
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-lg font-semibold">
            {editing ? 'Modifier l\'équipe' : 'Nouvelle équipe'}
          </h2>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'équipe <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
              className="input"
              placeholder="Ex: Ligue A"
              required
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={cancelEdit}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      {teams.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">Aucune équipe créée</p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-block">
            Créer une équipe
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div key={team.id} className="card">
              <h3 className="font-semibold text-lg mb-2">{team.name}</h3>
              <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                <button
                  onClick={() => startEdit(team)}
                  className="text-sm text-accent hover:text-accent-dark"
                >
                  Modifier
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(team.id)}
                    disabled={deleting === team.id}
                    className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    {deleting === team.id ? 'Suppression...' : 'Supprimer'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


