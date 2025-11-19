// API route pour uploader un fichier vers Google Drive et créer l'enregistrement dans la DB
import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToDrive } from '@/lib/google-drive/client';
import { createClient } from '@supabase/supabase-js';

// Forcer le mode dynamique car on utilise formData et headers
export const dynamic = 'force-dynamic';

// Configuration pour accepter les fichiers jusqu'à 50MB et timeout de 60s
export const maxDuration = 60;
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Utiliser la clé service role pour les opérations serveur
);

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer l'utilisateur depuis le token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer les données du formulaire
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const taskId = formData.get('taskId') as string | null;
    const commentId = formData.get('commentId') as string | null;

    // Validation
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (!taskId && !commentId) {
      return NextResponse.json(
        { error: 'taskId ou commentId doit être fourni' },
        { status: 400 }
      );
    }

    if (taskId && commentId) {
      return NextResponse.json(
        { error: 'taskId et commentId ne peuvent pas être fournis simultanément' },
        { status: 400 }
      );
    }

    // Limite de taille (par exemple 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Le fichier est trop volumineux. Taille maximale: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Convertir le fichier en buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload vers Google Drive
    const driveResult = await uploadFileToDrive(
      buffer,
      file.name,
      file.type || 'application/octet-stream'
    );

    // Créer l'enregistrement dans la base de données
    // Utiliser le client service role pour contourner RLS
    const { data: attachment, error: insertError } = await supabase
      .from('attachments')
      .insert({
        task_id: taskId || null,
        comment_id: commentId || null,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        google_drive_file_id: driveResult.fileId,
        google_drive_web_view_link: driveResult.webViewLink,
        google_drive_download_link: driveResult.downloadLink,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erreur lors de la création de l'enregistrement: ${insertError.message}`);
    }

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur lors de l\'upload:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'upload' },
      { status: 500 }
    );
  }
}

