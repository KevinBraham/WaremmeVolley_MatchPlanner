// Client Google Drive pour gérer les uploads de fichiers
import { google } from 'googleapis';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';

// Configuration Google Drive
// Ces variables doivent être définies dans .env.local
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google-drive/callback';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID; // ID du dossier où stocker les fichiers

// Ne pas lancer d'erreur au chargement, mais vérifier dans les fonctions
// Cela permet à l'application de démarrer même si les variables ne sont pas encore configurées

// Créer le client OAuth2
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

// Si un refresh token est disponible, l'utiliser
if (GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: GOOGLE_REFRESH_TOKEN,
  });
}

// Créer le client Drive
export const drive = google.drive({
  version: 'v3',
  auth: oauth2Client,
});

/**
 * Upload un fichier vers Google Drive
 * @param fileBuffer - Le contenu du fichier
 * @param fileName - Le nom original du fichier (sera préservé dans la DB)
 * @param mimeType - Le type MIME du fichier
 * @returns Les informations du fichier uploadé
 */
export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string; webViewLink: string; downloadLink: string }> {
  try {
    // Vérifier que le refresh token est configuré
    if (!GOOGLE_REFRESH_TOKEN) {
      throw new Error('GOOGLE_REFRESH_TOKEN n\'est pas configuré. Veuillez configurer l\'authentification Google Drive.');
    }

    // Générer un nom unique pour éviter les conflits de noms
    // Format: timestamp_uuid_nom-original.ext
    // Le nom original est conservé dans la DB pour l'affichage
    const timestamp = Date.now();
    const uuid = randomUUID();
    const fileExtension = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';
    const fileNameWithoutExt = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
    // Nettoyer le nom de fichier pour éviter les caractères problématiques
    const sanitizedFileName = fileNameWithoutExt.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${timestamp}_${uuid}_${sanitizedFileName}${fileExtension}`;

    // Paramètres pour l'upload
    const fileMetadata = {
      name: uniqueFileName, // Nom unique sur Google Drive
      parents: GOOGLE_DRIVE_FOLDER_ID ? [GOOGLE_DRIVE_FOLDER_ID] : undefined,
    };

    // Convertir le Buffer en Readable stream (requis par googleapis)
    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null); // Indique la fin du flux

    const media = {
      mimeType: mimeType,
      body: bufferStream,
    };

    // Upload le fichier
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    if (!response.data.id) {
      throw new Error('Impossible de récupérer l\'ID du fichier uploadé');
    }

    // Rendre le fichier accessible (lecture seule pour tous)
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
      downloadLink: response.data.webContentLink || `https://drive.google.com/uc?export=download&id=${response.data.id}`,
    };
  } catch (error: any) {
    console.error('Erreur lors de l\'upload vers Google Drive:', error);
    throw new Error(`Erreur upload Google Drive: ${error.message}`);
  }
}

/**
 * Supprime un fichier de Google Drive
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  try {
    if (!GOOGLE_REFRESH_TOKEN) {
      throw new Error('GOOGLE_REFRESH_TOKEN n\'est pas configuré.');
    }

    await drive.files.delete({
      fileId: fileId,
    });
  } catch (error: any) {
    console.error('Erreur lors de la suppression du fichier Google Drive:', error);
    throw new Error(`Erreur suppression Google Drive: ${error.message}`);
  }
}

/**
 * Génère l'URL d'autorisation OAuth2 pour Google Drive
 */
export function getAuthUrl(): string {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET doivent être définis. Configurez-les dans Vercel (Settings → Environment Variables).');
  }

  const scopes = [
    'https://www.googleapis.com/auth/drive.file', // Accès pour créer/modifier/supprimer des fichiers
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force la demande de consentement pour obtenir le refresh token
  });
}

/**
 * Échange le code d'autorisation contre un refresh token
 */
export async function getRefreshToken(code: string): Promise<string> {
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.refresh_token) {
    throw new Error('Aucun refresh token reçu. Veuillez réessayer.');
  }

  return tokens.refresh_token;
}

