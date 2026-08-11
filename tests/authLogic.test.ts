import { describe, expect, it } from 'vitest';
import { generateInviteToken } from '../src/modules/cricket/authService';
import type { Observation, DevelopmentFocus, CoachRole } from '../src/types/cricket';

describe('auth logic and token generation', () => {
  it('generates a 24-character unguessable invite token', () => {
    const token1 = generateInviteToken();
    const token2 = generateInviteToken();

    expect(token1).toHaveLength(24);
    expect(token2).toHaveLength(24);
    expect(token1).not.toEqual(token2);
  });
});

describe('role-based visibility filtering', () => {
  const sampleObservations: Observation[] = [
    {
      id: 'obs-1',
      playerId: 'p-1',
      timestamp: '2026-08-11T10:00:00Z',
      source: 'training',
      tag: 'Good execution',
      textNote: 'Public coaching observation for all coaches',
      visibility: 'all_coaches'
    },
    {
      id: 'obs-2',
      playerId: 'p-1',
      timestamp: '2026-08-11T11:00:00Z',
      source: 'match',
      tag: 'Custom Note',
      textNote: 'Head Coach confidential review note',
      visibility: 'head_coach_only'
    }
  ];

  const sampleFocuses: DevelopmentFocus[] = [
    {
      id: 'f-1',
      playerId: 'p-1',
      domain: 'Batting',
      focusStatement: 'Front foot alignment',
      state: 'Current Focus',
      why: 'Match review',
      startDate: '2026-08-01',
      reviewDate: '2026-08-20',
      evidenceObservationIds: ['obs-1'],
      coachSummary: 'Shared focus summary',
      visibility: 'all_coaches'
    },
    {
      id: 'f-2',
      playerId: 'p-1',
      domain: 'Tactical',
      focusStatement: 'Leadership assessment',
      state: 'Current Focus',
      why: 'Confidential assessment',
      startDate: '2026-08-01',
      reviewDate: '2026-08-20',
      evidenceObservationIds: [],
      coachSummary: 'Head Coach confidential summary',
      visibility: 'head_coach_only'
    }
  ];

  function filterObservationsByRole(items: Observation[], role: CoachRole): Observation[] {
    if (role === 'assistant_coach') {
      return items.filter(o => o.visibility !== 'head_coach_only');
    }
    return items;
  }

  function filterFocusesByRole(items: DevelopmentFocus[], role: CoachRole): DevelopmentFocus[] {
    if (role === 'assistant_coach') {
      return items.filter(f => f.visibility !== 'head_coach_only');
    }
    return items;
  }

  it('allows Head Coach to view all observations and development focuses', () => {
    const obs = filterObservationsByRole(sampleObservations, 'head_coach');
    const focuses = filterFocusesByRole(sampleFocuses, 'head_coach');

    expect(obs).toHaveLength(2);
    expect(focuses).toHaveLength(2);
  });

  it('filters out head_coach_only content for Assistant Coach sessions', () => {
    const obs = filterObservationsByRole(sampleObservations, 'assistant_coach');
    const focuses = filterFocusesByRole(sampleFocuses, 'assistant_coach');

    expect(obs).toHaveLength(1);
    expect(obs[0].id).toBe('obs-1');

    expect(focuses).toHaveLength(1);
    expect(focuses[0].id).toBe('f-1');
  });
});
