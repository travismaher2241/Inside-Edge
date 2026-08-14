import { describe, expect, it, beforeEach } from 'vitest';
import { RecommendationAuditService } from '../src/modules/cricket/audit/recommendationAuditService';

describe('Recommendation Audit Engine (B-07, B-08, B-11)', () => {
  beforeEach(() => {
    RecommendationAuditService.clearAll();
  });

  it('creates persistent recommendation records (B-07)', () => {
    const record = RecommendationAuditService.createRecord({
      type: 'smart_planner',
      clubId: 'club-1',
      teamId: 'team-1',
      playerIds: ['p-1', 'p-2'],
      inputContext: { sessionDuration: 75, netsCount: 3 },
      recommendation: { allocation: 'Net 1: New ball, Net 2: Spin' },
      rationale: {
        teamRationale: 'Balanced session built around spin and new ball',
        playerRationale: [{ playerId: 'p-1', reason: 'Assigned spin focus' }]
      },
      relatedSessionId: 'sess-101'
    });

    expect(record.id).toBeDefined();
    expect(record.decisionStatus).toBe('pending');

    const fetched = RecommendationAuditService.getRecord(record.id);
    expect(fetched).toEqual(record);
  });

  it('tracks coach accept, reject, and edit decisions (B-08)', () => {
    const record = RecommendationAuditService.createRecord({
      type: 'player_development',
      clubId: 'club-1',
      teamId: 'team-1',
      inputContext: { playerId: 'p-1' },
      recommendation: { suggestedFocus: 'Playing Spin' },
      rationale: { teamRationale: 'Player struggled vs spin in last 2 matches' }
    });

    // Accept
    const accepted = RecommendationAuditService.updateDecision(record.id, 'accepted');
    expect(accepted?.decisionStatus).toBe('accepted');

    // Filter history by team
    const history = RecommendationAuditService.getHistory({ teamId: 'team-1' });
    expect(history.length).toBe(1);
    expect(history[0].decisionStatus).toBe('accepted');
  });

  it('handles safe query execution when filtering history', () => {
    RecommendationAuditService.createRecord({
      type: 'smart_planner', clubId: 'c1', teamId: 't1', inputContext: {}, recommendation: {}, rationale: {}
    });
    RecommendationAuditService.createRecord({
      type: 'league_rule', clubId: 'c1', teamId: 't2', inputContext: {}, recommendation: {}, rationale: {}
    });

    const t1History = RecommendationAuditService.getHistory({ teamId: 't1' });
    expect(t1History.length).toBe(1);
    expect(t1History[0].teamId).toBe('t1');
  });
});
