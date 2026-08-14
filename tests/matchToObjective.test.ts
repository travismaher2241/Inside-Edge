import { describe, expect, it } from 'vitest';
import { CoachingObjectiveRegistry } from '../src/modules/cricket/objectives/coachingObjectiveRegistry';
import { RecommendationAuditService } from '../src/modules/cricket/audit/recommendationAuditService';

describe('Match Review → Objective & Recommendation Audit (B-03, B-07, B-08)', () => {
  it('maps a match issue to a candidate CoachingObjective and flows to planner prompt', () => {
    const issueText = 'Top order early wickets driving away from body';
    const candidateObjs = CoachingObjectiveRegistry.suggestObjectivesForMatchIssue(issueText);

    expect(candidateObjs.length).toBeGreaterThan(0);
    const selectedObj = candidateObjs[0];
    expect(selectedObj.id).toBe('batting.new_ball_decision_making');

    // Simulate audit logging of recommendation
    const rec = RecommendationAuditService.createRecord({
      type: 'match_to_training',
      clubId: 'club-1',
      teamId: 'team-1',
      inputContext: { matchIssue: issueText },
      recommendation: { objectiveId: selectedObj.id, name: selectedObj.name },
      rationale: { teamRationale: `Match Review flagged: ${issueText}` },
      sourceIds: ['match-report-101']
    });

    expect(rec.id).toBeDefined();
    expect(rec.decisionStatus).toBe('pending');
    expect(rec.type).toBe('match_to_training');

    // Simulate coach decision: accept recommendation
    const updated = RecommendationAuditService.updateDecision(rec.id, 'accepted');
    expect(updated?.decisionStatus).toBe('accepted');
  });

  it('stores coach rejection or edit of recommended objectives (B-08)', () => {
    const rec = RecommendationAuditService.createRecord({
      type: 'smart_planner',
      clubId: 'club-1',
      teamId: 'team-1',
      inputContext: { sessionObjectives: ['Death bowling'] },
      recommendation: { objectiveId: 'bowling.death_bowling' },
      rationale: { teamRationale: 'Prioritized death bowling' }
    });

    // Coach edits recommendation
    const edited = RecommendationAuditService.updateDecision(rec.id, 'edited', {
      objectiveId: 'bowling.middle_over_control',
      coachNote: 'Changed focus to middle over control instead'
    });

    expect(edited?.decisionStatus).toBe('edited');
    expect(edited?.finalCoachDecision).toEqual({
      objectiveId: 'bowling.middle_over_control',
      coachNote: 'Changed focus to middle over control instead'
    });
  });
});
