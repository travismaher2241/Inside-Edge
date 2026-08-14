import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/lib/firebase', () => ({ storage: {}, isFirebaseConfigured: false }));
import { uploadObservationClip, MediaUploadError } from '../src/modules/cricket/mediaStorageEngine';

describe('mediaStorageEngine (Firebase not configured)', () => {
  it('fails fast with an actionable message instead of attempting a network call', async () => {
    const file = new File(['fake video bytes'], 'clip.mp4', { type: 'video/mp4' });

    await expect(
      uploadObservationClip({ observationId: 'obs-1', file, uploadedByUserId: 'coach-1' })
    ).rejects.toThrow(MediaUploadError);

    await expect(
      uploadObservationClip({ observationId: 'obs-1', file, uploadedByUserId: 'coach-1' })
    ).rejects.toThrow(/Firebase project/);
  });
});
