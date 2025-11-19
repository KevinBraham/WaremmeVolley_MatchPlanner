'use client';

import { useState } from 'react';

export default function ExchangeTokenPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExchange = async () => {
    if (!code.trim()) {
      setError('Veuillez entrer le code');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/google-drive/callback?code=${encodeURIComponent(code)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'échange');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'échange du code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Échanger le code d'autorisation</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Code d'autorisation :
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Collez le code ici"
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
          Collez le code que vous avez reçu après l'autorisation Google
        </p>
      </div>

      <button
        onClick={handleExchange}
        disabled={loading || !code.trim()}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          background: loading ? '#ccc' : '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Échange en cours...' : 'Échanger le code'}
      </button>

      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c33'
        }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#efe',
          border: '1px solid #cfc',
          borderRadius: '4px'
        }}>
          <h2 style={{ marginTop: 0 }}>✅ Succès !</h2>
          <p><strong>Refresh Token :</strong></p>
          <pre style={{
            background: '#f5f5f5',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
            wordBreak: 'break-all'
          }}>
            {result.refreshToken}
          </pre>
          <p style={{ marginTop: '1rem' }}>
            <strong>Instructions :</strong>
          </p>
          <ol>
            <li>Copiez le refresh token ci-dessus</li>
            <li>Allez dans Vercel Dashboard → Settings → Environment Variables</li>
            <li>Ajoutez la variable <code>GOOGLE_REFRESH_TOKEN</code> avec la valeur copiée</li>
            <li>Redéployez l'application sur Vercel</li>
          </ol>
        </div>
      )}
    </div>
  );
}


