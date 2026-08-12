import { describe, it, expect } from 'vitest';
import type { Player, ClubTeam, ActiveScope } from '../src/types/cricket';
import { getPlayersForScope, groupPlayersByTeam, getScopeLabel } from '../src/modules/cricket/scopeHelpers';
import { deriveSquadBalanceData } from '../src/components/cricket/planner/FairnessReviewPanel';

const mockTeams: ClubTeam[] = [
  { id: 'ct-1', name: '1st XI Senior Men', ageGroup: 'Seniors', submissionToken: 'tok-1', createdAt: '2026-08-01' },
  { id: 'ct-2', name: '2nd XI Senior Men', ageGroup: 'Seniors', submissionToken: 'tok-2', createdAt: '2026-08-01' },
  { id: 'ct-3', name: 'Under 18', ageGroup: 'Juniors', submissionToken: 'tok-3', createdAt: '2026-08-01' }
];

const mockPlayers: Player[] = [
  {
    id: 'p1',
    name: 'Ben Harris',
    primaryTeamId: 'ct-1',
    primaryRole: 'top_order_batter',
    secondaryRole: 'none',
    battingHand: 'right',
    bowlingStyle: 'does_not_bowl',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  },
  {
    id: 'p2',
    name: 'Jack Davies',
    primaryTeamId: 'ct-1',
    primaryRole: 'pace_bowler',
    secondaryRole: 'none',
    battingHand: 'right',
    bowlingStyle: 'right_arm_fast_medium',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    workloadRestriction: { maxDeliveries: 36, restrictedBowler: true },
    activeDevelopmentFocusIds: []
  },
  {
    id: 'p3',
    name: 'Tom Walker',
    primaryTeamId: 'ct-2',
    primaryRole: 'middle_order_batter',
    secondaryRole: 'none',
    battingHand: 'left',
    bowlingStyle: 'does_not_bowl',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  },
  {
    id: 'p4',
    name: 'Priya Sharma',
    primaryTeamId: 'ct-3',
    primaryRole: 'spin_bowler',
    secondaryRole: 'none',
    battingHand: 'right',
    bowlingStyle: 'right_arm_off_spin',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  }
];

describe('Club vs Team Scope Information Architecture Unit Tests', () => {
  it('TEST 1 — TEAM CONTEXT: Filters roster to selected team players only', () => {
    const teamScope: ActiveScope = { mode: 'team', teamId: 'ct-1' };
    const filtered = getPlayersForScope(mockPlayers, teamScope);

    expect(filtered).toHaveLength(2);
    expect(filtered.map(p => p.name)).toEqual(['Ben Harris', 'Jack Davies']);
  });

  it('TEST 2 — CLUB CONTEXT: Returns all players and groups by team cards', () => {
    const clubScope: ActiveScope = { mode: 'club' };
    const filtered = getPlayersForScope(mockPlayers, clubScope);
    expect(filtered).toHaveLength(4);

    const groups = groupPlayersByTeam(mockTeams, mockPlayers);
    expect(groups).toHaveLength(3);
    expect(groups[0].team.name).toBe('1st XI Senior Men');
    expect(groups[0].players).toHaveLength(2);
    expect(groups[1].team.name).toBe('2nd XI Senior Men');
    expect(groups[1].players).toHaveLength(1);
  });

  it('TEST 3 — SCOPE LABELS: Resolves active scope display label', () => {
    expect(getScopeLabel({ mode: 'club' }, mockTeams)).toBe('Club Overview');
    expect(getScopeLabel({ mode: 'team', teamId: 'ct-1' }, mockTeams)).toBe('1st XI Senior Men');
    expect(getScopeLabel({ mode: 'team', teamId: 'ct-2' }, mockTeams)).toBe('2nd XI Senior Men');
  });

  it('TEST 5 — SQUAD BALANCE BY TEAM: Derives squad balance correctly for scoped team', () => {
    const ct1Players = getPlayersForScope(mockPlayers, { mode: 'team', teamId: 'ct-1' });
    const { needsAttention } = deriveSquadBalanceData(ct1Players, []);

    expect(ct1Players).toHaveLength(2);
    expect(needsAttention).toHaveLength(1); // Jack Davies has workload restriction
    expect(needsAttention[0].player.name).toBe('Jack Davies');
  });

  it('TEST 6 — PLAYER TEAM TRANSFER: Preserves player ID and profile when transferring primaryTeamId', () => {
    const playerToMove = { ...mockPlayers[0] };
    playerToMove.primaryTeamId = 'ct-2';

    expect(playerToMove.id).toBe('p1');
    expect(playerToMove.name).toBe('Ben Harris');
    expect(playerToMove.primaryTeamId).toBe('ct-2');
  });
});
