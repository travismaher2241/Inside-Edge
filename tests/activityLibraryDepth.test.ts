import { describe, expect, it } from 'vitest';
import { SEED_ACTIVITIES } from '../src/modules/cricket/seedData';
import { DEVELOPMENT_DOMAINS } from '../src/modules/cricket/taxonomy';

describe('Activity Library depth & data integrity', () => {
  it('provides at least 40 curated activities (blueprint target: 40-70)', () => {
    expect(SEED_ACTIVITIES.length).toBeGreaterThanOrEqual(40);
  });

  it('has no duplicate activity ids', () => {
    const ids = SEED_ACTIVITIES.map(a => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('covers every development domain with at least one activity', () => {
    const coveredCategories = new Set(SEED_ACTIVITIES.map(a => a.category));
    DEVELOPMENT_DOMAINS.forEach(({ domain }) => {
      expect(coveredCategories.has(domain)).toBe(true);
    });
  });

  it('every activity has complete required metadata', () => {
    SEED_ACTIVITIES.forEach(activity => {
      expect(activity.name.trim().length).toBeGreaterThan(0);
      expect(activity.purpose.trim().length).toBeGreaterThan(0);
      expect(activity.minPlayers).toBeGreaterThan(0);
      expect(activity.maxPlayers).toBeGreaterThanOrEqual(activity.minPlayers);
      expect(activity.durationMinutes).toBeGreaterThan(0);
      expect(activity.setupSteps.length).toBeGreaterThan(0);
      expect(activity.coachingPoints.length).toBeGreaterThan(0);
      expect(activity.equipment.length).toBeGreaterThan(0);
      expect(activity.tags.length).toBeGreaterThan(0);
      expect(['High', 'Medium', 'Low']).toContain(activity.participationDensity);
      expect(['net', 'pitch', 'outfield', 'small_grid', 'indoor']).toContain(activity.spaceRequired);
    });
  });
});
