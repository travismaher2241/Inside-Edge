import { describe, expect, it } from 'vitest';
import { PublicStationView } from '../src/views/PublicStationView';

describe('PublicStationView', () => {
  it('exports the station leader screen', () => {
    expect(PublicStationView).toBeDefined();
    expect(typeof PublicStationView).toBe('function');
  });
});
