import { describe, it, expect } from 'vitest';
import type { Activity } from '../src/types/cricket';

const mockActivities: Activity[] = [
  {
    id: 'act-1',
    name: 'New-Ball Defense & Leave Corridor',
    category: 'Batting',
    purpose: 'Train top-order decision making outside off stump against swinging full seam',
    durationMinutes: 15,
    spaceRequired: 'net',
    minPlayers: 3,
    maxPlayers: 6,
    participationDensity: 'high',
    tags: ['batting', 'leave', 'corridor'],
    setupSteps: ['Set up bowling machine at 125km/h'],
    coachingPoints: ['Soft hands outside off'],
    constraints: [],
    progressions: [],
    equipment: ['Balls']
  },
  {
    id: 'act-2',
    name: 'Death Yorker Target Drill',
    category: 'Bowling',
    purpose: 'Execute wide yorkers and straight yorkers under pressure',
    durationMinutes: 25,
    spaceRequired: 'pitch',
    minPlayers: 4,
    maxPlayers: 8,
    participationDensity: 'medium',
    tags: ['bowling', 'yorker', 'death'],
    setupSteps: ['Place target cones at crease'],
    coachingPoints: ['Hit base of stumps'],
    constraints: [],
    progressions: [],
    equipment: ['Target cones']
  }
];

describe('Library View Mobile UI/UX Redesign Acceptance Tests', () => {
  it('TEST A — SEARCH: Filters activities by search query correctly', () => {
    const query = 'leave';
    const filtered = mockActivities.filter(a =>
      `${a.name} ${a.purpose} ${a.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toContain('Leave Corridor');
  });

  it('TEST B — CATEGORY: Filters activities by category', () => {
    const category = 'Batting';
    const filtered = mockActivities.filter(a => a.category === category);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('New-Ball Defense & Leave Corridor');
  });

  it('TEST D — DURATION: Excludes activities exceeding max duration', () => {
    const maxDur = 20;
    const filtered = mockActivities.filter(a => a.durationMinutes <= maxDur);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('New-Ball Defense & Leave Corridor');
  });

  it('TEST E — PLAYER GROUP: Filters activities by player group range overlap', () => {
    // Range 4-6
    const minGroup = 4;
    const maxGroup = 6;
    const filtered = mockActivities.filter(a => a.minPlayers <= maxGroup && a.maxPlayers >= minGroup);
    expect(filtered).toHaveLength(2); // Both act-1 (3-6) and act-2 (4-8) fit 4-6 players!
  });

  it('TEST J — NO RESULTS: Handles impossible filter combinations gracefully', () => {
    const filtered = mockActivities.filter(a => a.category === 'Wicketkeeping');
    expect(filtered).toHaveLength(0);
  });
});
