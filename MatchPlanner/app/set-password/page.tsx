'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { deriveNamesFromEmail } from '@/lib/utils/user';

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading: authLoading, refresh } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [hashParams, setHashParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      setHashParams(new URLSearchParams(hash));
    }
  }, []);

  const accessToken = useMemo(
    () => hashParams?.get('access_token') || undefined,
    [hashParams]
  );

  const refreshToken = useMemo(
    () => hashParams?.get('refresh_token') || undefined,
    [hashParams]
  );

  const code = useMemo(
    () =>
      searchParams.get('code') ||
      hashParams?.get('code') ||
      undefined,
    [searchParams, hashParams]
  );

  const token = useMemo(
    () =>
      searchParams.get('token') ||
      searchParams.get('token_hash') ||
      hashParams?.get('token') ||
      hashParams?.get('token_hash') ||
      undefined,
    [searchParams, hashParams]
  );

  const errorCode = useMemo(
    () => searchParams.get('error_code') || hashParams?.get('error_code') || undefined,
    [searchParams, hashParams]
  );

  const errorDescription = useMemo(
    () =>
      searchParams.get('error_description') ||
      hashParams?.get('error_description') ||
      undefined,
    [searchParams, hashParams]
  );

  const email = useMemo(
    () => searchParams.get('email') || hashParams?.get('email') || undefined,
    [searchParams, hashParams]
  );

  const otpType = useMemo(() => {
    const type = searchParams.get('type') || hashParams?.get('type');
    if (
      type === 'invite' ||
      type === 'recovery' ||
      type === 'magiclink' ||
      type === 'signup'
    ) {
      return type as 'invite' | 'recovery' | 'magiclink' | 'signup';
    }
    return 'signup';
  }, [searchParams, hashParams]);

  const validateOtp = useCallback(async () => {
    if (authLoading || verified || (!code && !token && !(accessToken && refreshToken))) return;

    setLoading(true);
    try {
      let session = null;
      let errorMessage: string | null = null;

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        session = data.session;
        errorMessage = error?.message || null;
      } else if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        session = data.session;
        errorMessage = error?.message || null;
      } else if (token) {
        const { data, error } = await supabase.auth.verifyOtp({
          type: otpType,
          token_hash: token,
          email,
        });
        session = data.session;
        errorMessage = error?.message || null;
      }

      if (errorMessage) {
        setError(errorMessage);
        return;
      }

      setVerified(true);
      if (session) {
        await refresh();
      } else {
        await refresh();
      }
    } finally {
      setLoading(false);
    }
  }, [authLoading, verified, code, token, email, refresh, otpType, accessToken, refreshToken]);

  useEffect(() => {
    if (!isAuthenticated && !verified && (code || token || (accessToken && refreshToken))) {
      validateOtp();
    }
  }, [isAuthenticated, verified, validateOtp, code, token, accessToken, refreshToken]);

  useEffect(() => {
    if (
      !authLoading &&
      hashParams &&
      !code &&
      !token &&
      !(accessToken && refreshToken) &&
      !verified &&
      !errorCode
    ) {
      validateOtp();
    }
  }, [
    authLoading,
    hashParams,
    code,
    token,
    accessToken,
    refreshToken,
    verified,
    validateOtp,
    errorCode,
  ]);

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
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const targetUser = currentUser || user;
        if (targetUser) {
          const { getUserProfile, createUserProfile } = await import('@/lib/supabase/queries');
          try {
            let profile = await getUserProfile(targetUser.id);
            if (!profile) {
              const derived = deriveNamesFromEmail(targetUser.email || null);
              await createUserProfile({
                user_id: targetUser.id,
                display_name: derived.display_name,
                first_name: derived.first_name,
                last_name: derived.last_name,
                role: 'agent',
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

  if (!isAuthenticated && !verified) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="card text-center">
            {errorCode ? (
              <>
                <p className="text-red-600 text-sm mb-4">
                  {errorDescription || 'Le lien est invalide ou a expiré. Veuillez demander un nouvel email.'}
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  Nous validons votre lien, un instant...
                </p>
                {error && (
                  <p className="text-red-600 text-sm mb-4">{error}</p>
                )}
              </>
            )}
            <a href="/login" className="btn-primary inline-block">
              Retour à la connexion
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

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Chargement...</div>
        </div>
      }
    >
      <SetPasswordForm />
    </Suspense>
  );
}