import { describe, expect, it } from 'vitest';
import type { SavedFieldSetting } from '../src/types/cricket';
import { StorageEngine } from '../src/storage/db';

describe('saved field settings', () => {
  it('persists, updates and deletes a field setting', () => {
    const setting: SavedFieldSetting = { id: 'field-test', name: 'Test field', batterHand: 'right', bowlerStyle: 'pace', tacticalPhase: 'new_ball', positions: [], createdAt: '2026-08-11T00:00:00Z', updatedAt: '2026-08-11T00:00:00Z' };
    StorageEngine.saveFieldSetting(setting);
    expect(StorageEngine.getSavedFieldSettings().find(item => item.id === setting.id)?.name).toBe('Test field');
    StorageEngine.saveFieldSetting({ ...setting, name: 'Updated field' });
    expect(StorageEngine.getSavedFieldSettings().find(item => item.id === setting.id)?.name).toBe('Updated field');
    StorageEngine.deleteFieldSetting(setting.id);
    expect(StorageEngine.getSavedFieldSettings().some(item => item.id === setting.id)).toBe(false);
  });
});
