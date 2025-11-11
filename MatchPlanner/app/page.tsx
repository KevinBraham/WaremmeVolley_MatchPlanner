'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getEvents } from '@/lib/supabase/queries';
import { EventCard } from '@/components/EventCard';
import type { EventWithDetails } from '@/lib/types/database';
import Link from 'next/link';

export default function HomePage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      // Charger les événements une fois authentifié
      loadEvents();
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    // Recharger les événements quand showPast change
    if (isAuthenticated && !authLoading) {
      loadEvents();
    }
  }, [showPast]);

  async function loadEvents() {
    try {
      setLoading(true);
      const eventsData = await getEvents(undefined, showPast);
      // Pour chaque événement, charger les détails complets pour avoir les couleurs
      const { getEventWithDetails } = await import('@/lib/supabase/queries');
      const eventsWithDetails = await Promise.all(
        eventsData.map(async (event) => getEventWithDetails(event.id))
      );
      setEvents(eventsWithDetails.filter((e): e is EventWithDetails => e !== null));
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold text-secondary">Événements à venir</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showPast}
              onChange={(e) => setShowPast(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>Afficher les événements passés</span>
          </label>
          <Link
            href="/events/new"
            className="btn-primary text-center"
          >
            + Nouvel événement
          </Link>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">
            {showPast
              ? 'Aucun événement trouvé'
              : 'Aucun événement à venir. Créez-en un nouveau !'}
          </p>
          {!showPast && (
            <Link href="/events/new" className="btn-primary inline-block">
              Créer un événement
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
