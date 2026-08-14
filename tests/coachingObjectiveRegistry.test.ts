import { describe, expect, it } from 'vitest';
import { CoachingObjectiveRegistry, SEED_COACHING_OBJECTIVES } from '../src/modules/cricket/objectives/coachingObjectiveRegistry';

describe('CoachingObjectiveRegistry (B-01, B-02)', () => {
  it('contains seed objectives across 7 cricket domains', () => {
    const objectives = CoachingObjectiveRegistry.getAll();
    expect(objectives.length).toBeGreaterThanOrEqual(15);

    const domains = new Set(objectives.map(o => o.domain));
    expect(domains.has('Batting')).toBe(true);
    expect(domains.has('Bowling')).toBe(true);
    expect(domains.has('Fielding')).toBe(true);
    expect(domains.has('Wicketkeeping')).toBe(true);
    expect(domains.has('Tactical')).toBe(true);
    expect(domains.has('Team')).toBe(true);
    expect(domains.has('Physical')).toBe(true);
  });

  it('retrieves objectives by ID', () => {
    const obj = CoachingObjectiveRegistry.getById('batting.new_ball_decision_making');
    expect(obj).toBeDefined();
    expect(obj?.name).toBe('New-ball decision making');
    expect(obj?.domain).toBe('Batting');
  });

  it('filters objectives by domain', () => {
    const bowlingObjs = CoachingObjectiveRegistry.getByDomain('Bowling');
    expect(bowlingObjs.length).toBeGreaterThan(0);
    expect(bowlingObjs.every(o => o.domain === 'Bowling')).toBe(true);
  });

  it('maps legacy taxonomy string identifiers to canonical objective ID (B-02)', () => {
    const mappedSpin = CoachingObjectiveRegistry.mapLegacyTaxonomyToObjectiveId('playing_spin');
    expect(mappedSpin).toBe('batting.playing_spin');

    const mappedSeam = CoachingObjectiveRegistry.mapLegacyTaxonomyToObjectiveId('new_ball_swing_control');
    expect(mappedSeam).toBe('batting.new_ball_decision_making');

    const mappedUnknown = CoachingObjectiveRegistry.mapLegacyTaxonomyToObjectiveId('unknown_custom_drill');
    expect(mappedUnknown).toBeDefined();
    expect(typeof mappedUnknown).toBe('string');
  });

  it('suggests objectives for match review issue text (B-03)', () => {
    const suggested = CoachingObjectiveRegistry.suggestObjectivesForMatchIssue('Top order early wickets');
    expect(suggested.length).toBeGreaterThan(0);
    expect(suggested.some(o => o.id === 'batting.new_ball_decision_making')).toBe(true);
  });
});
