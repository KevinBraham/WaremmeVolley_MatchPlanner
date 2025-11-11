'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getTeams, getEventTemplates, createEvent, createEventFromTemplate, createEventPost, createEventTask } from '@/lib/supabase/queries';
import type { Team, EventTemplate, EventInsert } from '@/lib/types/database';
import { formatDateISO } from '@/lib/utils/date';
import Link from 'next/link';

export default function NewEventPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    team_id: '',
    template_id: '',
    name: '',
    description: '',
    event_date: formatDateISO(new Date()),
  });

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
      const [teamsData, templatesData] = await Promise.all([
        getTeams(),
        getEventTemplates(),
      ]);
      setTeams(teamsData);
      setTemplates(templatesData);
      if (teamsData.length > 0) {
        setFormData(prev => ({ ...prev, team_id: teamsData[0].id }));
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      setError(null);

      if (!formData.team_id || !formData.name || !formData.event_date) {
        setError('Veuillez remplir tous les champs obligatoires');
        return;
      }

      const eventData: EventInsert = {
        team_id: formData.team_id,
        template_id: formData.template_id || null,
        name: formData.name,
        description: formData.description || null,
        event_date: formData.event_date,
        created_by: user.id,
      };

      let event;
      if (formData.template_id) {
        // Créer l'événement à partir du modèle
        event = await createEventFromTemplate(eventData, formData.template_id);
      } else {
        // Créer un événement vide
        event = await createEvent(eventData);
      }

      router.push(`/events/${event.id}`);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de l\'événement');
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nouvel événement</h1>
        <Link href="/" className="btn-secondary text-sm">
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
          <label htmlFor="team_id" className="block text-sm font-medium text-gray-700 mb-2">
            Équipe <span className="text-red-500">*</span>
          </label>
          <select
            id="team_id"
            value={formData.team_id}
            onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
            className="input"
            required
          >
            <option value="">Sélectionnez une équipe</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="template_id" className="block text-sm font-medium text-gray-700 mb-2">
            Modèle (optionnel)
          </label>
          <select
            id="template_id"
            value={formData.template_id}
            onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
            className="input"
          >
            <option value="">Aucun modèle (événement vide)</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Sélectionnez un modèle pour préremplir les postes et tâches
          </p>
        </div>

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
            placeholder="Ex: Match amical - Ligue A"
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
            placeholder="Description de l'événement..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Link href="/" className="btn-secondary">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Création...' : 'Créer l\'événement'}
          </button>
        </div>
      </form>
    </div>
  );
}


