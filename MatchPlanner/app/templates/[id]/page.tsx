'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getEventTemplateWithDetails } from '@/lib/supabase/queries';
import type { EventTemplateWithDetails } from '@/lib/types/database';
import Link from 'next/link';

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [template, setTemplate] = useState<EventTemplateWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du modèle');
    } finally {
      setLoading(false);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/templates" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            ← Retour aux modèles
          </Link>
          <h1 className="text-2xl font-semibold text-secondary">{template.name}</h1>
          {template.description && (
            <p className="text-gray-600 mt-1">{template.description}</p>
          )}
          {template.team && (
            <p className="text-sm text-gray-500 mt-1">Équipe: {template.team.name}</p>
          )}
        </div>
        <Link
          href={`/templates/${template.id}/edit`}
          className="btn-primary"
        >
          Modifier
        </Link>
      </div>

      <div className="space-y-4">
        {template.posts.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">Aucun poste défini pour ce modèle</p>
          </div>
        ) : (
          template.posts.map((post) => (
            <div key={post.id} className="card">
              <h2 className="text-lg font-semibold mb-3">{post.name}</h2>
              {(post.default_responsible_name || post.default_user_id) && (
                <p className="text-xs text-gray-500 mb-3">
                  Responsable par défaut : {post.default_responsible_name || 'Non défini'}
                </p>
              )}
              
              {post.tasks.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune tâche pour ce poste</p>
              ) : (
                <div className="space-y-2">
                  {post.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{task.name}</div>
                        <div className="space-y-1 text-xs text-gray-500 mt-1">
                          {typeof task.default_alert_offset_days === 'number' && (
                            <div>Délai d'alerte : {task.default_alert_offset_days} jour(s) avant</div>
                          )}
                          <div>
                            Délai critique :{' '}
                            {task.default_due_offset_days > 0
                              ? `${task.default_due_offset_days} jour(s) avant`
                              : 'aucun'}
                          </div>
                        </div>
                        {(task.default_responsible_name || task.default_user_id) && (
                          <div className="text-xs text-gray-500 mt-1">
                            Responsable par défaut : {task.default_responsible_name || 'Responsable du poste'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

