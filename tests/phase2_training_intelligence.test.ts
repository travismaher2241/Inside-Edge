import { describe, it, expect } from 'vitest';
import { SafetyCompatibilityService } from '../src/modules/cricket/safetyCompatibilityService';
import { CoachingObjectiveTaxonomy } from '../src/modules/cricket/coachingObjectiveTaxonomy';
import { FairnessEngine } from '../src/modules/cricket/fairnessEngine';
import { ActivityUsageService } from '../src/modules/cricket/activityUsageService';
import type {
  PlayerTrainingProfile,
  PlayerOpportunityProfile,
  PlayerSessionOpportunityRecord,
  ClubTrainingSession,
  Activity
} from '../src/types/cricket';

describe('Phase 2 — Training Intelligence & Fairness Specifications', () => {
  it('1. Safety Compatibility & Unrated Fallback (Criteria #1, #2, #20)', () => {
    const batter: PlayerTrainingProfile = {
      primaryRole: 'batter',
      battingTier: 'competent',
      safetyProfile: {
        playerId: 'p1',
        canFacePace: true,
        canFaceAdvancedPace: false,
        canFaceSpin: true,
        maxCompatiblePaceTier: 'competent'
      }
    };

    const fastBowler: PlayerTrainingProfile = {
      primaryRole: 'bowler',
      paceBowlingTier: 'performance', // 4
      safetyProfile: {
        playerId: 'p2',
        canFacePace: true,
        canFaceAdvancedPace: true,
        canFaceSpin: true
      }
    };

    const evalRes = SafetyCompatibilityService.isSafeMatchup(batter, fastBowler);
    expect(evalRes.status).toBe('BLOCKED');
    expect(evalRes.reasons[0]).toContain('not approved for advanced pace');
  });

  it('2. Data-Driven Taxonomy & Parent-Child Matching (Criteria #12)', () => {
    const isMatch = CoachingObjectiveTaxonomy.matchesObjective(
      'facing_spin_strike_rotation',
      'playing_spin'
    );
    expect(isMatch).toBe(true);

    const isMatchExact = CoachingObjectiveTaxonomy.matchesObjective(
      'playing_spin',
      'playing_spin'
    );
    expect(isMatchExact).toBe(true);
  });

  it('3. Durable PlayerSessionOpportunityRecord Generation (Criteria #5, #6, #19)', () => {
    const mockSession: any = {
      id: 'sess-p2-01',
      completedAt: '2026-08-20T19:30:00Z',
      includedTeamIds: ['team-u15'],
      expectedPlayerIds: ['p1', 'p2'],
      confirmedAttendingPlayerIds: ['p1'],
      blocks: [
        { type: 'rotation', durationMinutes: 20 },
        { type: 'centre_wicket', durationMinutes: 30 }
      ]
    };

    const records = FairnessEngine.generateSessionOpportunityRecords(mockSession);
    expect(records.length).toBe(2);

    const p1Record = records.find(r => r.playerId === 'p1');
    expect(p1Record?.attended).toBe(true);
    expect(p1Record?.battingMinutes).toBe(20); // 10 from net + 10 from CW
    expect(p1Record?.netMinutes).toBe(20);
    expect(p1Record?.centreWicketMinutes).toBe(30);

    const p2Record = records.find(r => r.playerId === 'p2');
    expect(p2Record?.attended).toBe(false);
    expect(p2Record?.battingMinutes).toBe(0);
  });

  it('4. Role-Aware Fairness, N/A Ineligibility & Insufficient History (Criteria #4, #15, #16)', () => {
    const nonBowlerProfile: PlayerOpportunityProfile = {
      battingEligible: true,
      bowlingEligible: false, // Ineligible for bowling!
      fieldingEligible: true,
      wicketkeepingEligible: false,
      battingTargetWeight: 1.0,
      bowlingTargetWeight: 0.0,
      fieldingTargetWeight: 1.0,
      centreWicketTargetWeight: 1.0,
      scenarioTargetWeight: 1.0
    };

    const sampleRecords: PlayerSessionOpportunityRecord[] = [
      {
        id: 'r1',
        sessionId: 's1',
        teamId: 'team-u15',
        playerId: 'p-keeper',
        completedAt: '2026-08-01T19:00:00Z',
        attended: true,
        totalActiveMinutes: 30,
        battingMinutes: 20,
        bowlingMinutes: 0,
        fieldingMinutes: 10,
        netMinutes: 20,
        centreWicketMinutes: 0,
        scenarioMinutes: 0,
        source: 'live_blocks'
      }
    ];

    // Single session attended -> insufficient history (< 2 sessions)
    const assessment = FairnessEngine.assessPlayerFairness(
      'p-keeper',
      'team-u15',
      nonBowlerProfile,
      sampleRecords
    );

    expect(assessment.hasInsufficientHistory).toBe(true);
    expect(assessment.flags).toContain('insufficient_history');
    expect(assessment.balance.bowling.status).toBe('not_applicable');
    expect(assessment.balance.bowling.ratio).toBeNull();
  });

  it('5. Zero-Opportunity Session Exclusion & Multi-Flag Evaluation (Criteria #7, #15)', () => {
    const batterProfile: PlayerOpportunityProfile = {
      battingEligible: true,
      bowlingEligible: true,
      fieldingEligible: true,
      wicketkeepingEligible: false,
      battingTargetWeight: 1.0,
      bowlingTargetWeight: 1.0,
      fieldingTargetWeight: 1.0,
      centreWicketTargetWeight: 1.0,
      scenarioTargetWeight: 1.0
    };

    const records: PlayerSessionOpportunityRecord[] = [
      {
        id: 'r1',
        sessionId: 's1',
        teamId: 't1',
        playerId: 'p1',
        completedAt: '2026-08-01T19:00:00Z',
        attended: true,
        totalActiveMinutes: 40,
        battingMinutes: 10,
        bowlingMinutes: 10,
        fieldingMinutes: 20,
        netMinutes: 20,
        centreWicketMinutes: 20,
        scenarioMinutes: 20,
        source: 'live_blocks'
      },
      {
        id: 'r1-peer',
        sessionId: 's1',
        teamId: 't1',
        playerId: 'p2',
        completedAt: '2026-08-01T19:00:00Z',
        attended: true,
        totalActiveMinutes: 40,
        battingMinutes: 25, // Peer got 25 mins
        bowlingMinutes: 10,
        fieldingMinutes: 20,
        netMinutes: 20,
        centreWicketMinutes: 20,
        scenarioMinutes: 5,
        source: 'live_blocks'
      },
      {
        id: 'r2',
        sessionId: 's2',
        teamId: 't1',
        playerId: 'p1',
        completedAt: '2026-08-05T19:00:00Z',
        attended: true,
        totalActiveMinutes: 40,
        battingMinutes: 10,
        bowlingMinutes: 10,
        fieldingMinutes: 20,
        netMinutes: 20,
        centreWicketMinutes: 20,
        scenarioMinutes: 25,
        source: 'live_blocks'
      },
      {
        id: 'r2-peer',
        sessionId: 's2',
        teamId: 't1',
        playerId: 'p2',
        completedAt: '2026-08-05T19:00:00Z',
        attended: true,
        totalActiveMinutes: 40,
        battingMinutes: 25, // Peer got 25 mins again
        bowlingMinutes: 10,
        fieldingMinutes: 20,
        netMinutes: 20,
        centreWicketMinutes: 20,
        scenarioMinutes: 5,
        source: 'live_blocks'
      }
    ];

    const assessment = FairnessEngine.assessPlayerFairness('p1', 't1', batterProfile, records);
    expect(assessment.hasInsufficientHistory).toBe(false);
    expect(assessment.balance.batting.status).toBe('deficit');
    expect(assessment.flags).toContain('needs_batting');
    expect(assessment.flags).toContain('high_scenario');
  });

  it('6. Activity Usage Records & Fresh Alternatives (Criteria #10, #11, #12, #17, #18)', () => {
    const currentDrill: Activity = {
      id: 'drill-1',
      name: 'Spin Strike Rotation Net',
      purpose: 'Facing spin bowling',
      objectiveIds: ['facing_spin_strike_rotation'],
      category: 'Batting',
      minPlayers: 4,
      maxPlayers: 12,
      durationMinutes: 15,
      spaceRequired: 'net',
      equipment: ['Stumps', 'Spin balls'],
      setupSteps: ['Set up net 1'],
      coachingPoints: ['Soft hands'],
      constraints: ['2 runs per hit'],
      progressions: ['Add fielder'],
      participationDensity: 'High',
      tags: ['spin', 'batting']
    };

    const alternativeDrill: Activity = {
      id: 'drill-2',
      name: 'Fresh Spin Footwork Challenge',
      purpose: 'Facing spin bowling',
      objectiveIds: ['spin_footwork_defense'],
      category: 'Batting',
      minPlayers: 4,
      maxPlayers: 12,
      durationMinutes: 15,
      spaceRequired: 'net',
      equipment: ['Stumps'],
      setupSteps: ['Set up net 2'],
      coachingPoints: ['Foot to pitch'],
      constraints: ['No lofted shots'],
      progressions: ['Add bowler variation'],
      structuredProgressions: {
        simplification: ['Use throwdowns'],
        advancement: ['Live spin bowler'],
        decisionMaking: ['Call length late'],
        gameScenarios: [{ id: 'gs1', title: 'Spin target', description: 'Defend 6 balls' }]
      },
      participationDensity: 'High',
      tags: ['spin', 'footwork']
    };

    const suggested = ActivityUsageService.suggestFreshAlternative(
      currentDrill,
      'team-u15',
      [currentDrill, alternativeDrill],
      [],
      8
    );

    expect(suggested).not.toBeNull();
    expect(suggested?.id).toBe('drill-2');
  });
});
