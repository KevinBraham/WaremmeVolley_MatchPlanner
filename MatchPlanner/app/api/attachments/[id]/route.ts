// API route pour supprimer une pièce jointe
import { NextRequest, NextResponse } from 'next/server';
import { deleteFileFromDrive } from '@/lib/google-drive/client';
import { createClient } from '@supabase/supabase-js';

// Forcer le mode dynamique car on utilise headers et params
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const attachmentId = params.id;

    // Récupérer l'attachment pour obtenir le file_id Google Drive
    // Utiliser le client service role pour contourner RLS
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('google_drive_file_id')
      .eq('id', attachmentId)
      .single();
    
    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Pièce jointe non trouvée' }, { status: 404 });
    }

    // Supprimer le fichier de Google Drive
    try {
      await deleteFileFromDrive(attachment.google_drive_file_id);
    } catch (error: any) {
      console.error('Erreur lors de la suppression du fichier Google Drive:', error);
      // Continuer quand même pour supprimer l'enregistrement DB
    }

    // Supprimer l'enregistrement de la base de données
    // Utiliser le client service role pour contourner RLS
    const { error: deleteError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      throw new Error(`Erreur lors de la suppression: ${deleteError.message}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Erreur lors de la suppression:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}

