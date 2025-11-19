// Page d'aide pour la configuration Google Drive
export default function GoogleDriveSetupPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Configuration Google Drive</h1>
      
      <h2>Étape 1 : Configurer les variables d'environnement</h2>
      <p>Assurez-vous d'avoir configuré ces variables dans Vercel (Settings → Environment Variables) :</p>
      <ul>
        <li><code>GOOGLE_CLIENT_ID</code></li>
        <li><code>GOOGLE_CLIENT_SECRET</code></li>
        <li><code>GOOGLE_REDIRECT_URI</code> (ex: <code>https://match-planner.vercel.app/api/google-drive/callback</code>)</li>
      </ul>

      <h2>Étape 2 : Obtenir le Refresh Token</h2>
      <p>Une fois les variables configurées :</p>
      <ol>
        <li>Cliquez sur ce lien : <a href="/api/google-drive/auth">/api/google-drive/auth</a></li>
        <li>Vous serez redirigé vers Google pour autoriser l'application</li>
        <li>Acceptez les permissions</li>
        <li>Vous serez redirigé vers /api/google-drive/callback avec le refresh token</li>
        <li>Copiez le refresh token et ajoutez-le dans Vercel comme <code>GOOGLE_REFRESH_TOKEN</code></li>
      </ol>

      <h2>Dépannage</h2>
      <p>Si rien ne se passe quand vous cliquez sur le lien :</p>
      <ul>
        <li>Vérifiez que <code>GOOGLE_CLIENT_ID</code> et <code>GOOGLE_CLIENT_SECRET</code> sont bien configurés dans Vercel</li>
        <li>Vérifiez les logs de Vercel pour voir les erreurs</li>
        <li>Assurez-vous que l'URI de redirection est bien configurée dans Google Cloud Console</li>
      </ul>

      <p>
        <a href="/api/google-drive/auth" style={{ 
          display: 'inline-block', 
          padding: '10px 20px', 
          background: '#4285f4', 
          color: 'white', 
          textDecoration: 'none', 
          borderRadius: '4px',
          marginTop: '1rem'
        }}>
          Lancer l'autorisation Google Drive
        </a>
      </p>
    </div>
  );
}

