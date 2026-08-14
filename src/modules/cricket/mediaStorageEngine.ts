// Media upload/playback engine for Inside Edge. Wraps Firebase Storage the
// same way cloudStorageEngine.ts wraps Firestore: one small, mockable module
// so the rest of the app never touches the Storage SDK directly.

import { ref, uploadBytesResumable, getDownloadURL, type UploadTaskSnapshot } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../../lib/firebase';
import type { ObservationAttachment } from '../../types/cricket';

export class MediaUploadError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'MediaUploadError';
    this.cause = cause;
  }
}

function inferAttachmentType(mimeType: string): ObservationAttachment['type'] {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'image';
}

export interface UploadObservationClipInput {
  observationId: string;
  file: File;
  uploadedByUserId: string;
  onProgress?: (percent: number) => void;
}

/**
 * Uploads a clip to Firebase Storage under observations/{observationId}/{filename}
 * and returns a fully-populated ObservationAttachment ready to push onto
 * Observation.attachments[]. Throws MediaUploadError with an actionable
 * message on failure — including the common case where Firebase Storage
 * has not been enabled for this project yet.
 */
export async function uploadObservationClip({
  observationId,
  file,
  uploadedByUserId,
  onProgress
}: UploadObservationClipInput): Promise<ObservationAttachment> {
  if (!isFirebaseConfigured) {
    throw new MediaUploadError('Video upload needs a configured Firebase project. This looks like a local/dev environment without Firebase set up.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `observations/${observationId}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, storagePath);

  // Firebase's resumable upload retries silently on network/CORS failures rather
  // than rejecting quickly, which would otherwise leave the coach staring at an
  // "Uploading…" state indefinitely if Storage isn't enabled/configured yet.
  // A client-side timeout guarantees this always fails fast and visibly instead.
  const UPLOAD_TIMEOUT_MS = 20000;
  const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

  try {
    await new Promise<UploadTaskSnapshot>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        task.cancel();
        reject(new Error('timeout'));
      }, UPLOAD_TIMEOUT_MS);

      task.on(
        'state_changed',
        snapshot => onProgress?.(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
        err => { clearTimeout(timeoutId); reject(err); },
        () => { clearTimeout(timeoutId); resolve(task.snapshot); }
      );
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'timeout') {
      throw new MediaUploadError('Upload timed out — Firebase Storage may not be enabled for this project yet. Ask your Firebase project owner to enable Storage in the console.', err);
    }
    const code = (err as { code?: string })?.code || '';
    if (code.includes('storage/unauthorized') || code.includes('storage/unknown')) {
      throw new MediaUploadError('Upload failed — Firebase Storage may not be enabled for this project yet. Ask your Firebase project owner to enable Storage in the console.', err);
    }
    throw new MediaUploadError('Upload failed. Check your connection and try again.', err);
  }

  return {
    id: storagePath,
    observationId,
    type: inferAttachmentType(file.type),
    storagePath,
    createdAt: new Date().toISOString(),
    uploadedByUserId,
    mimeType: file.type,
    sizeBytes: file.size
  };
}

/** Resolves a playable/viewable URL for an attachment's storage path. */
export async function getAttachmentDownloadUrl(storagePath: string): Promise<string> {
  try {
    return await getDownloadURL(ref(storage, storagePath));
  } catch (err) {
    throw new MediaUploadError('Could not load this clip — it may have been removed from storage.', err);
  }
}
