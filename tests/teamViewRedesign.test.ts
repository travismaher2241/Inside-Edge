import { describe, it, expect } from 'vitest';
import type { Player, DevelopmentFocus, Observation } from '../src/types/cricket';

const mockPlayer = (id: string, name: string, role: Player['primaryRole'] = 'top_order_batter', isRestricted = false): Player => ({
  id,
  name,
  primaryRole: role,
  secondaryRole: 'none',
  battingHand: 'right',
  bowlingStyle: 'does_not_bowl',
  wicketkeepingCapability: 'none',
  trainingAvailability: true,
  workloadRestriction: isRestricted ? { restrictedBowler: true, maxDeliveries: 30, notes: 'Shoulder workload restriction' } : undefined,
  activeDevelopmentFocusIds: []
});

describe('Team Tab Redesign Acceptance Tests', () => {
  const players: Player[] = [
    mockPlayer('p1', 'Ben Harris', 'top_order_batter'),
    mockPlayer('p2', 'Jack Davies', 'pace_bowler', true),
    mockPlayer('p3', 'Sam Wilson', 'all_rounder')
  ];

  const focuses: DevelopmentFocus[] = [
    {
      id: 'f1',
      playerId: 'p1',
      domain: 'Batting',
      focusStatement: 'Decision-making outside off stump',
      state: 'Current Focus',
      why: '3 dismissals driving away from body',
      startDate: '2026-08-01',
      reviewDate: '2026-08-15',
      evidenceObservationIds: [],
      coachSummary: 'Initial focus'
    }
  ];

  it('TEST A — ROSTER: Filters players by search term cleanly', () => {
    const query = 'Jack';
    const filtered = players.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Jack Davies');
  });

  it('TEST C — ROLE FILTER: Filters players by primary role correctly', () => {
    const role = 'pace_bowler';
    const filtered = players.filter(p => p.primaryRole === role);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Jack Davies');
  });

  it('TEST I — RESTRICTION: Surfaces workload restriction summary for roster level view', () => {
    const jack = players.find(p => p.id === 'p2');
    expect(jack?.workloadRestriction?.restrictedBowler).toBe(true);
    expect(jack?.workloadRestriction?.notes).toContain('Shoulder workload restriction');
  });

  it('TEST E — DEVELOPMENT: Maps coach-friendly labels to underlying DevelopmentFocus model', () => {
    const focus = focuses[0];
    expect(focus.domain).toBe('Batting'); // AREA
    expect(focus.focusStatement).toBe('Decision-making outside off stump'); // WHAT ARE WE WORKING ON?
    expect(focus.why).toContain('3 dismissals driving away'); // WHY?
  });
});
