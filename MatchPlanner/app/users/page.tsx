'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getAllUserProfiles, createUserProfile, deleteUserProfile, updateUserProfile } from '@/lib/supabase/queries';
import { supabase } from '@/lib/supabaseClient';
import type { UserProfile } from '@/lib/types/database';
import { formatUserName } from '@/lib/utils/user';

export default function UsersPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editValues, setEditValues] = useState({
    display_name: '',
    first_name: '',
    last_name: '',
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      loadUsers();
    }
  }, [isAuthenticated, authLoading]);

  async function loadUsers() {
    try {
      setLoading(true);
      const usersData = await getAllUserProfiles();
      setUsers(usersData);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      // Note: La création d'utilisateurs nécessite l'API Admin de Supabase
      // Pour l'instant, on utilise signUp qui enverra un email de confirmation
      // L'utilisateur devra ensuite définir son mot de passe via le lien reçu
      
      const firstName = newUserFirstName.trim() || null;
      const lastName = newUserLastName.trim() || null;
      const displayNameCandidate = newUserDisplayName.trim() || `${firstName || ''} ${lastName || ''}`.trim();
      const fallbackDisplayName = newUserEmail.split('@')[0];
      const displayName = displayNameCandidate || fallbackDisplayName;

      // Utiliser signUp pour créer un nouvel utilisateur
      // Cela enverra automatiquement un email de confirmation
      const { data, error: authError } = await supabase.auth.signUp({
        email: newUserEmail,
        password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + 'A1!', // Mot de passe temporaire
        options: {
          data: {
            display_name: displayName,
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: `${window.location.origin}/set-password`,
        },
      });

      if (authError) {
        setError(authError.message);
        setCreating(false);
        return;
      }

      if (!data.user) {
        setError('Erreur lors de la création de l\'utilisateur');
        setCreating(false);
        return;
      }

      // Créer le profil utilisateur
      await createUserProfile({
        user_id: data.user.id,
        display_name: displayName,
        first_name: firstName,
        last_name: lastName,
      });

      // Envoyer un email de réinitialisation pour que l'utilisateur puisse définir son mot de passe
      await supabase.auth.resetPasswordForEmail(newUserEmail, {
        redirectTo: `${window.location.origin}/set-password`,
      });

      // Réinitialiser le formulaire et recharger la liste
      setNewUserEmail('');
      setNewUserDisplayName('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setShowCreateForm(false);
      await loadUsers();
      
      alert(`Un email a été envoyé à ${newUserEmail} pour définir le mot de passe`);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }

    setDeleting(userId);
    try {
      // Supprimer le profil utilisateur
      await deleteUserProfile(userId);
      
      // Supprimer l'utilisateur de Supabase Auth
      // Note: Cela nécessite les fonctions admin de Supabase
      // Pour l'instant, on supprime juste le profil
      
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la suppression');
    } finally {
      setDeleting(null);
    }
  }

  function startEditingUser(user: UserProfile) {
    setEditingUser(user);
    setEditValues({
      display_name: user.display_name || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
    });
    setShowCreateForm(false);
    setError(null);
  }

  async function handleUpdateUser(e: FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    setUpdating(true);
    setError(null);

    try {
      await updateUserProfile(editingUser.user_id, {
        display_name: editValues.display_name.trim() || null,
        first_name: editValues.first_name.trim() || null,
        last_name: editValues.last_name.trim() || null,
      });
      await loadUsers();
      setEditingUser(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setUpdating(false);
    }
  }

  async function handleResetPassword(email: string) {
    try {
      // Envoyer un email de réinitialisation de mot de passe
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        alert(`Un email de réinitialisation a été envoyé à ${email}`);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
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
        <h1 className="text-2xl font-semibold text-secondary">Gestion des utilisateurs</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary"
        >
          {showCreateForm ? 'Annuler' : '+ Nouvel utilisateur'}
        </button>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {showCreateForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Créer un nouvel utilisateur</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email *
              </label>
              <input
                id="email"
                type="email"
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="utilisateur@example.com"
                className="input"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={newUserFirstName}
                  onChange={(e) => setNewUserFirstName(e.target.value)}
                  placeholder="Prénom"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={newUserLastName}
                  onChange={(e) => setNewUserLastName(e.target.value)}
                  placeholder="Nom"
                  className="input"
                />
              </div>
            </div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nom d'affichage
              </label>
              <input
                id="name"
                type="text"
                value={newUserDisplayName}
                onChange={(e) => setNewUserDisplayName(e.target.value)}
                placeholder="Nom d'affichage (optionnel)"
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si non renseigné, le nom sera dérivé de l'email
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Création...' : 'Créer l\'utilisateur'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewUserEmail('');
                  setNewUserDisplayName('');
                  setNewUserFirstName('');
                  setNewUserLastName('');
                  setError(null);
                }}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Liste des utilisateurs</h2>
        {users.length === 0 ? (
          <p className="text-gray-500">Aucun utilisateur trouvé</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nom complet</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Prénom</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nom</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nom d'affichage</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ID utilisateur</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {formatUserName(user, 'Non défini')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {user.first_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {user.last_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {user.display_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 font-mono text-xs">
                      {user.user_id.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button
                          onClick={() => startEditingUser(user)}
                          className="text-sm text-gray-600 hover:text-gray-800 px-2 py-1"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => {
                            // Pour réinitialiser le mot de passe, on demande l'email
                            // Dans une vraie application, on pourrait stocker l'email dans le profil
                            const email = prompt('Entrez l\'email de l\'utilisateur pour réinitialiser le mot de passe:');
                            if (email && email.includes('@')) {
                              handleResetPassword(email);
                            } else if (email) {
                              alert('Email invalide');
                            }
                          }}
                          className="text-sm text-accent hover:text-accent-dark px-2 py-1"
                        >
                          Réinitialiser le mot de passe
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.user_id)}
                          disabled={deleting === user.user_id}
                          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 px-2 py-1"
                        >
                          {deleting === user.user_id ? 'Suppression...' : 'Supprimer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingUser && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Modifier {formatUserName(editingUser)}</h2>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="editFirstName" className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom
                </label>
                <input
                  id="editFirstName"
                  type="text"
                  value={editValues.first_name}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Prénom"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="editLastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom
                </label>
                <input
                  id="editLastName"
                  type="text"
                  value={editValues.last_name}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Nom"
                  className="input"
                />
              </div>
            </div>
            <div>
              <label htmlFor="editDisplayName" className="block text-sm font-medium text-gray-700 mb-2">
                Nom d'affichage
              </label>
              <input
                id="editDisplayName"
                type="text"
                value={editValues.display_name}
                onChange={(e) => setEditValues((prev) => ({ ...prev, display_name: e.target.value }))}
                placeholder="Nom d'affichage"
                className="input"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={updating}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setEditValues({ display_name: '', first_name: '', last_name: '' });
                }}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}
 
      <div className="text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-medium text-blue-900 mb-2">ℹ️ Note importante</p>
        <ul className="list-disc list-inside space-y-1 text-blue-800">
          <li>Pour créer un utilisateur, entrez son email et un nom d'affichage (optionnel).</li>
          <li>Un email sera automatiquement envoyé au nouvel utilisateur pour définir son mot de passe.</li>
          <li>L'utilisateur pourra se connecter une fois qu'il aura défini son mot de passe.</li>
          <li>Pour réinitialiser le mot de passe d'un utilisateur existant, cliquez sur "Réinitialiser le mot de passe" et entrez son email.</li>
        </ul>
      </div>
    </div>
  );
}

