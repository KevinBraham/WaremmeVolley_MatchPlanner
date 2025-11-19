// API route pour échanger le code d'autorisation contre un refresh token
import { NextRequest, NextResponse } from 'next/server';
import { getRefreshToken } from '@/lib/google-drive/client';

// Forcer le mode dynamique car on utilise searchParams
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Code d\'autorisation manquant' }, { status: 400 });
    }

    const refreshToken = await getRefreshToken(code);

    return NextResponse.json(
      { 
        refreshToken,
        message: 'Authentification réussie! Ajoutez ce refresh token à votre fichier .env.local:',
        instruction: `GOOGLE_REFRESH_TOKEN=${refreshToken}`
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Erreur lors de l\'échange du code:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'échange du code' },
      { status: 500 }
    );
  }
}

