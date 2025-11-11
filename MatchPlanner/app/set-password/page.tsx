'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { deriveNamesFromEmail } from '@/lib/utils/user';

export default function SetPasswordPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Si l'utilisateur n'est pas connecté, rediriger vers login
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Si le mot de passe vient d'être défini, la redirection est gérée dans onSubmit
  }, [isAuthenticated, authLoading, done, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        setDone(true);
        // Créer ou mettre à jour le profil utilisateur
        if (user) {
          const { getUserProfile, createUserProfile } = await import('@/lib/supabase/queries');
          try {
            let profile = await getUserProfile(user.id);
            if (!profile) {
              const derived = deriveNamesFromEmail(user.email || null);
              await createUserProfile({
                user_id: user.id,
                display_name: derived.display_name,
                first_name: derived.first_name,
                last_name: derived.last_name,
              });
            }
          } catch (err) {
            console.error('Erreur lors de la création du profil:', err);
          }
        }
        // Rediriger vers la page d'accueil après 1 seconde
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="card text-center">
            <p className="text-gray-600 mb-4">Vous devez être connecté pour définir votre mot de passe.</p>
            <a href="/login" className="btn-primary inline-block">
              Aller à la page de connexion
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary mb-4">
              <span className="text-white font-bold text-2xl">WV</span>
            </div>
            <h1 className="text-2xl font-semibold text-secondary mb-2">Définir votre mot de passe</h1>
            <p className="text-gray-600 text-sm">
              Choisissez un mot de passe sécurisé pour votre compte
            </p>
          </div>
          
          {done ? (
            <div className="rounded-lg border border-green-500 bg-green-50 p-4 text-sm text-green-800 text-center">
              <p className="font-medium mb-2">✅ Mot de passe enregistré avec succès !</p>
              <p>Redirection en cours...</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  className="input"
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Au moins 6 caractères</p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirmer le mot de passe"
                  className="input"
                  minLength={6}
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}