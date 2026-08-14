import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/firebase', () => ({ storage: {}, isFirebaseConfigured: true }));

let simulateError: { code: string } | null = null;
let simulateHang = false;
let cancelCalled = false;

vi.mock('firebase/storage', () => ({
  ref: (_storage: unknown, path: string) => ({ path }),
  uploadBytesResumable: (storageRef: { path: string }) => ({
    snapshot: { ref: storageRef },
    cancel: () => { cancelCalled = true; },
    on: (_event: string, _progress: (s: unknown) => void, onError: (e: unknown) => void, onComplete: () => void) => {
      if (simulateHang) return; // never resolves — mirrors a CORS-blocked resumable upload that keeps retrying
      if (simulateError) {
        onError(simulateError);
      } else {
        onComplete();
      }
    }
  }),
  getDownloadURL: async (storageRef: { path: string }) => {
    if (simulateError) throw simulateError;
    return `https://example-storage.test/${storageRef.path}`;
  }
}));

import { uploadObservationClip, getAttachmentDownloadUrl, MediaUploadError } from '../src/modules/cricket/mediaStorageEngine';

describe('mediaStorageEngine (Firebase configured)', () => {
  it('uploads a clip and returns a fully-populated ObservationAttachment', async () => {
    simulateError = null;
    const file = new File(['fake video bytes'], 'catch drill.mp4', { type: 'video/mp4' });

    const attachment = await uploadObservationClip({
      observationId: 'obs-42',
      file,
      uploadedByUserId: 'coach-1'
    });

    expect(attachment.type).toBe('video');
    expect(attachment.observationId).toBe('obs-42');
    expect(attachment.uploadedByUserId).toBe('coach-1');
    expect(attachment.mimeType).toBe('video/mp4');
    expect(attachment.storagePath).toContain('observations/obs-42/');
    expect(attachment.storagePath).not.toContain(' '); // filename sanitised
  });

  it('maps a storage-unauthorized failure to an actionable "Storage may not be enabled" message', async () => {
    simulateError = { code: 'storage/unauthorized' };
    const file = new File(['bytes'], 'clip.mp4', { type: 'video/mp4' });

    await expect(
      uploadObservationClip({ observationId: 'obs-1', file, uploadedByUserId: 'coach-1' })
    ).rejects.toThrow(/Storage may not be enabled/);

    simulateError = null;
  });

  it('resolves a download URL for playback', async () => {
    simulateError = null;
    const url = await getAttachmentDownloadUrl('observations/obs-42/clip.mp4');
    expect(url).toBe('https://example-storage.test/observations/obs-42/clip.mp4');
  });

  it('wraps a failed download URL lookup in MediaUploadError', async () => {
    simulateError = { code: 'storage/object-not-found' };
    await expect(getAttachmentDownloadUrl('observations/missing.mp4')).rejects.toThrow(MediaUploadError);
    simulateError = null;
  });

  it('times out and cancels the task instead of hanging forever when the upload never resolves (e.g. CORS-blocked Storage)', async () => {
    vi.useFakeTimers();
    simulateHang = true;
    cancelCalled = false;
    const file = new File(['bytes'], 'clip.mp4', { type: 'video/mp4' });

    const uploadPromise = uploadObservationClip({ observationId: 'obs-1', file, uploadedByUserId: 'coach-1' });
    const assertion = expect(uploadPromise).rejects.toThrow(/timed out/);

    await vi.advanceTimersByTimeAsync(20000);
    await assertion;
    expect(cancelCalled).toBe(true);

    simulateHang = false;
    vi.useRealTimers();
  });
});
