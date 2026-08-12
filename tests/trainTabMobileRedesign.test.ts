import { describe, it, expect } from 'vitest';
import { deriveSquadBalanceData } from '../src/components/cricket/planner/FairnessReviewPanel';
import type { Player, RollingFairnessLedger } from '../src/types/cricket';

const mockPlayer = (id: string, name: string, isRestricted = false): Player => ({
  id,
  name,
  primaryRole: 'top_order_batter',
  secondaryRole: 'none',
  battingHand: 'right',
  bowlingStyle: 'right_arm_fast',
  wicketkeepingCapability: 'none',
  trainingAvailability: true,
  workloadRestriction: isRestricted ? { restrictedBowler: true, maxDeliveries: 30 } : undefined,
  activeDevelopmentFocusIds: []
});

describe('Train Tab Mobile Redesign — Squad Balance / Fairness Tests', () => {
  it('FLOW G — BALANCED SQUAD: Returns all players as balanced when fairness credit is even', () => {
    const players = [mockPlayer('p1', 'Ben Harris'), mockPlayer('p2', 'Sam Batter')];
    const ledger: RollingFairnessLedger[] = [
      { playerId: 'p1', totalSessionsAttended: 4, totalBattingMinutes: 48, totalDeliveriesBowled: 72, totalCentreWicketOvers: 0, accumulatedFairnessCreditMinutes: 0 },
      { playerId: 'p2', totalSessionsAttended: 4, totalBattingMinutes: 48, totalDeliveriesBowled: 72, totalCentreWicketOvers: 0, accumulatedFairnessCreditMinutes: 0 }
    ];

    const data = deriveSquadBalanceData(players, ledger);

    expect(data.needsAttention).toHaveLength(0);
    expect(data.balancedPlayers).toHaveLength(2);
  });

  it('FLOW H — FAIRNESS ISSUE: Identifies players needing opportunity or high workload', () => {
    const players = [
      mockPlayer('p1', 'Jack Davies'),
      mockPlayer('p2', 'Ryan Cooper', true)
    ];
    const ledger: RollingFairnessLedger[] = [
      { playerId: 'p1', totalSessionsAttended: 4, totalBattingMinutes: 10, totalDeliveriesBowled: 20, totalCentreWicketOvers: 0, accumulatedFairnessCreditMinutes: 25 },
      { playerId: 'p2', totalSessionsAttended: 4, totalBattingMinutes: 60, totalDeliveriesBowled: 120, totalCentreWicketOvers: 0, accumulatedFairnessCreditMinutes: 0 }
    ];

    const data = deriveSquadBalanceData(players, ledger);

    expect(data.needsAttention.length).toBeGreaterThan(0);
    const jack = data.needsAttention.find(s => s.player.name === 'Jack Davies');
    expect(jack?.status).toBe('NEEDS OPPORTUNITY');
    expect(jack?.reason).toContain('Batting opportunity below squad average');

    const ryan = data.needsAttention.find(s => s.player.name === 'Ryan Cooper');
    expect(ryan?.status).toBe('HIGH WORKLOAD');
    expect(ryan?.reason).toContain('Bowling workload higher than squad average');
  });

  it('FLOW A/B/F — Safely handles empty ledger state without division by zero', () => {
    const players = [mockPlayer('p1', 'Ben Harris')];
    const data = deriveSquadBalanceData(players, []);

    expect(data.needsAttention).toHaveLength(0);
    expect(data.statuses).toHaveLength(1);
    expect(data.statuses[0].status).toBe('BALANCED');
  });
});
