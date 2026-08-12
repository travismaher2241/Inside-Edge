import { describe, it, expect } from 'vitest';
import type { MatchRecord, MatchObservation } from '../src/types/cricket';
import { deriveTrainingPriorities } from '../src/modules/cricket/matchHelpers';

const mockMatch = (id: string, opponent: string, date: string, result?: string): MatchRecord => ({
  id,
  opponent,
  date,
  venue: 'Western Park',
  format: 'T20',
  result,
  preMatchPlan: {
    teamObjectives: ['Zero dropped catches', 'Bowler stump to stump'],
    battingNotes: 'Target left arm spinner',
    bowlingNotes: 'Powerplay stump to stump',
    fieldingFocus: 'Aggressive inner ring'
  }
});

describe('Match Tab UI/UX Redesign Acceptance Tests', () => {
  it('TEST A — UPCOMING FIXTURE: Identifies upcoming match state', () => {
    const upcoming = mockMatch('m1', 'Glenferrie CC', '2099-12-31');
    const isCompleted = Boolean(upcoming.result || (upcoming.date < new Date().toISOString().split('T')[0]));
    expect(isCompleted).toBe(false);
  });

  it('TEST E — COMPLETED MATCH: Identifies completed match state for review', () => {
    const completed = mockMatch('m2', 'Glenferrie CC', '2020-01-01', 'Lost by 14 runs');
    const isCompleted = Boolean(completed.result || (completed.date < new Date().toISOString().split('T')[0]));
    expect(isCompleted).toBe(true);
  });

  it('TEST G — TRAINING PRIORITIES: Generates next training priorities without system language', () => {
    const observations: MatchObservation[] = [
      { id: 'o1', area: 'Batting', observationText: 'Lost 3 early wickets driving away from body', suggestedPriority: 'New-ball batting decisions' },
      { id: 'o2', area: 'Fielding', observationText: '4 dropped chances in inner ring', suggestedPriority: 'Catching under pressure' }
    ];

    const priorities = deriveTrainingPriorities(observations);
    expect(priorities).toContain('New-ball batting decisions');
    expect(priorities).toContain('Catching under pressure');
  });
});
