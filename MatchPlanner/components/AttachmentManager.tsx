'use client';

import { useState, useEffect } from 'react';
import type { Attachment } from '@/lib/types/database';
import { getAttachmentsByTask, getAttachmentsByComment, deleteAttachment } from '@/lib/supabase/queries';
import { supabase } from '@/lib/supabaseClient';

interface AttachmentManagerProps {
  taskId?: string;
  commentId?: string;
  onAttachmentsChange?: () => void;
}

export default function AttachmentManager({ taskId, commentId, onAttachmentsChange }: AttachmentManagerProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  // Charger les pièces jointes
  const loadAttachments = async () => {
    if (!taskId && !commentId) return;
    
    setLoading(true);
    try {
      const data = taskId 
        ? await getAttachmentsByTask(taskId)
        : await getAttachmentsByComment(commentId!);
      setAttachments(data);
    } catch (error: any) {
      console.error('Erreur lors du chargement des pièces jointes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage
  useEffect(() => {
    loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, commentId]);

  // Upload d'un fichier
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Vous devez être connecté pour uploader un fichier');
        return;
      }

      // Créer FormData
      const formData = new FormData();
      formData.append('file', file);
      if (taskId) formData.append('taskId', taskId);
      if (commentId) formData.append('commentId', commentId);

      // Upload vers l'API
      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        // Essayer de parser le JSON, sinon utiliser le texte
        let errorMessage = 'Erreur lors de l\'upload';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } else {
            const text = await response.text();
            errorMessage = text || errorMessage;
          }
        } catch (parseError) {
          // Si le parsing échoue, utiliser le statut HTTP
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Vérifier que la réponse est bien du JSON et la parser
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Réponse inattendue du serveur: ${text.substring(0, 100)}`);
      }

      const result = await response.json();
      
      // Recharger les pièces jointes
      await loadAttachments();
      if (onAttachmentsChange) onAttachmentsChange();
      setShowUpload(false);
    } catch (error: any) {
      console.error('Erreur upload:', error);
      // Afficher un message d'erreur plus détaillé
      const errorMsg = error.message || 'Erreur inconnue lors de l\'upload';
      alert(`Erreur lors de l'upload: ${errorMsg}\n\nVérifiez:\n- Que le fichier ne dépasse pas 50MB\n- Que vous êtes bien connecté\n- Les logs de la console pour plus de détails`);
    } finally {
      setUploading(false);
      // Réinitialiser l'input file
      event.target.value = '';
    }
  };

  // Supprimer une pièce jointe
  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Supprimer cette pièce jointe ?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Vous devez être connecté pour supprimer un fichier');
        return;
      }

      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }

      // Recharger les pièces jointes
      await loadAttachments();
      if (onAttachmentsChange) onAttachmentsChange();
    } catch (error: any) {
      alert('Erreur: ' + error.message);
    }
  };

  // Formater la taille du fichier
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Obtenir l'icône selon le type de fichier
  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
    return '📎';
  };

  if (loading) {
    return <div className="text-xs text-gray-500">Chargement des pièces jointes...</div>;
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Liste des pièces jointes */}
      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs hover:bg-gray-100"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-base">{getFileIcon(attachment.mime_type)}</span>
                <div className="flex-1 min-w-0">
                  <a
                    href={attachment.google_drive_web_view_link || attachment.google_drive_download_link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 truncate block"
                    title={attachment.file_name}
                  >
                    {attachment.file_name}
                  </a>
                  <span className="text-gray-500 text-[10px]">
                    {formatFileSize(attachment.file_size)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(attachment.id)}
                className="text-red-500 hover:text-red-700 ml-2"
                title="Supprimer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bouton pour ajouter une pièce jointe */}
      {!showUpload ? (
        <button
          onClick={() => setShowUpload(true)}
          className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
        >
          <span>📎</span> Ajouter une pièce jointe
        </button>
      ) : (
        <div className="space-y-2">
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="text-xs"
            accept="*/*"
          />
          {uploading && (
            <div className="text-xs text-gray-500">Upload en cours...</div>
          )}
          <button
            onClick={() => setShowUpload(false)}
            className="text-xs text-gray-600 hover:text-gray-800"
            disabled={uploading}
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}

