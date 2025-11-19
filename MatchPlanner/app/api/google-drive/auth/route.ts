// API route pour rediriger vers l'URL d'autorisation Google Drive
import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-drive/client';

// Forcer le mode dynamique car on fait une redirection dynamique
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authUrl = getAuthUrl();
    // Rediriger directement vers l'URL d'autorisation Google
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Erreur lors de la génération de l\'URL d\'autorisation:', error);
    // Si erreur, retourner une réponse avec un message d'erreur et un lien vers la page d'aide
    const errorMessage = error.message || 'Erreur lors de la génération de l\'URL';
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <title>Erreur Configuration Google Drive</title>
  <style>
    body { font-family: system-ui; padding: 2rem; max-width: 800px; margin: 0 auto; }
    .error { background: #fee; border: 1px solid #fcc; padding: 1rem; border-radius: 4px; }
    .link { display: inline-block; margin-top: 1rem; padding: 10px 20px; background: #4285f4; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Erreur de Configuration</h1>
  <div class="error">
    <p><strong>Erreur:</strong> ${errorMessage}</p>
    <p>Vérifiez que <code>GOOGLE_CLIENT_ID</code> et <code>GOOGLE_CLIENT_SECRET</code> sont bien configurés dans Vercel (Settings → Environment Variables).</p>
  </div>
  <a href="/api/google-drive/setup" class="link">Voir les instructions de configuration</a>
</body>
</html>`,
      { 
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

