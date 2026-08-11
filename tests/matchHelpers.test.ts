import { describe, it, expect } from 'vitest';
import { getActiveMatch, deriveTrainingPriorities } from '../src/modules/cricket/matchHelpers';
import type { MatchRecord, MatchObservation } from '../src/types/cricket';
import { SEED_MATCH_RECORD } from '../src/modules/cricket/seedData';

describe('Match Helper Utilities', () => {
  it('getActiveMatch should return null for empty matches array', () => {
    expect(getActiveMatch([])).toBeNull();
  });

  it('getActiveMatch should return the single seeded match when only one match exists', () => {
    const active = getActiveMatch([SEED_MATCH_RECORD]);
    expect(active?.id).toBe(SEED_MATCH_RECORD.id);
  });

  it('getActiveMatch should prioritize the nearest upcoming match (date >= today)', () => {
    const today = '2026-08-11';

    const pastMatch: MatchRecord = {
      ...SEED_MATCH_RECORD,
      id: 'm-past',
      date: '2026-08-01',
      opponent: 'Past Opponent CC'
    };

    const upcomingFar: MatchRecord = {
      ...SEED_MATCH_RECORD,
      id: 'm-far',
      date: '2026-08-25',
      opponent: 'Far Upcoming CC'
    };

    const upcomingNear: MatchRecord = {
      ...SEED_MATCH_RECORD,
      id: 'm-near',
      date: '2026-08-15',
      opponent: 'Near Upcoming CC'
    };

    const matches = [pastMatch, upcomingFar, upcomingNear];
    const active = getActiveMatch(matches, today);

    expect(active).toBeDefined();
    expect(active?.id).toBe('m-near');
    expect(active?.opponent).toBe('Near Upcoming CC');
  });

  it('getActiveMatch should fall back to the most recent match if all matches are in the past', () => {
    const today = '2026-08-30';

    const matchOld: MatchRecord = {
      ...SEED_MATCH_RECORD,
      id: 'm-old',
      date: '2026-08-01'
    };

    const matchRecent: MatchRecord = {
      ...SEED_MATCH_RECORD,
      id: 'm-recent',
      date: '2026-08-20'
    };

    const active = getActiveMatch([matchOld, matchRecent], today);
    expect(active?.id).toBe('m-recent');
  });

  it('deriveTrainingPriorities should extract non-empty suggested priorities and note summaries', () => {
    const observations: MatchObservation[] = [
      {
        id: 'obs-1',
        area: 'Batting',
        observationText: '3 dismissals driving away from body against full seam.',
        suggestedPriority: 'New-ball decision making'
      },
      {
        id: 'obs-2',
        area: 'Fielding',
        observationText: '4 dropped catches in inner ring.',
        suggestedPriority: 'Catching under pressure'
      },
      {
        id: 'obs-3',
        area: 'Bowling',
        observationText: 'Conceded 40 runs in death overs missing yorker length.'
        // No suggestedPriority provided
      }
    ];

    const derived = deriveTrainingPriorities(observations);

    expect(derived.length).toBe(3);
    expect(derived[0]).toBe('New-ball decision making');
    expect(derived[1]).toBe('Catching under pressure');
    expect(derived[2]).toContain('Bowling: Conceded 40 runs in death overs');
  });
});
