'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { getUserProfile, createUserProfile } from '@/lib/supabase/queries';
import { deriveNamesFromEmail } from '@/lib/utils/user';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    // Fonction pour charger le profil
    async function loadProfile(userId: string, userEmail?: string) {
      try {
        let userProfile = await getUserProfile(userId);
        
        // Si le profil n'existe pas, le créer
        if (!userProfile) {
          const email = userEmail || user?.email || '';
          const derived = deriveNamesFromEmail(email);
          userProfile = await createUserProfile({
            user_id: userId,
            display_name: derived.display_name,
            first_name: derived.first_name,
            last_name: derived.last_name,
          });
        }
        
        if (mounted) {
          setProfile(userProfile);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    // Vérifier la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id, session.user.email);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return {
    user,
    profile,
    loading,
    signOut,
    isAuthenticated: !!user,
  };
}


