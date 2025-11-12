'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getEventTemplates, deleteEventTemplate } from '@/lib/supabase/queries';
import type { EventTemplate } from '@/lib/types/database';
import Link from 'next/link';

export default function TemplatesPage() {
  const { profile, isAuthenticated, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const router = useRouter();
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        loadTemplates();
      }
    }
  }, [isAuthenticated, authLoading]);

  async function loadTemplates() {
    try {
      setLoading(true);
      const templatesData = await getEventTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Erreur lors du chargement des modèles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!isAdmin) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) {
      return;
    }

    try {
      setDeleting(id);
      await deleteEventTemplate(id);
      await loadTemplates();
    } catch (error: any) {
      alert('Erreur: ' + error.message);
    } finally {
      setDeleting(null);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Modèles d'événements</h1>
        <Link href="/templates/new" className="btn-primary">
          + Nouveau modèle
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">Aucun modèle créé</p>
          <Link href="/templates/new" className="btn-primary inline-block">
            Créer un modèle
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="card">
              <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
              {template.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {template.description}
                </p>
              )}
              <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                <Link
                  href={`/templates/${template.id}`}
                  className="text-sm text-accent hover:text-accent-dark"
                >
                  Voir
                </Link>
                <Link
                  href={`/templates/${template.id}/edit`}
                  className="text-sm text-accent hover:text-accent-dark"
                >
                  Modifier
                </Link>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(template.id)}
                    disabled={deleting === template.id}
                    className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    {deleting === template.id ? 'Suppression...' : 'Supprimer'}
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


