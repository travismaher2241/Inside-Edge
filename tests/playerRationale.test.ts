import { describe, expect, it } from 'vitest';
import type { ClubTeam, Player, DevelopmentFocus, TrainingResource } from '../src/types/cricket';
import { generateClubRotationPlan, generateStructuredRationale } from '../src/modules/cricket/clubRotationEngine';

const player = (index: number, name: string): Player => ({
  id: `p-${index}`,
  name,
  primaryRole: index % 3 === 0 ? 'pace_bowler' : 'middle_order_batter',
  secondaryRole: 'none',
  battingHand: 'right',
  bowlingStyle: index % 3 === 0 ? 'right_arm_fast_medium' : 'does_not_bowl',
  wicketkeepingCapability: 'none',
  trainingAvailability: true,
  activeDevelopmentFocusIds: []
});

const resource = (id: string, name: string): TrainingResource => ({
  id,
  facilityId: 'facility-1',
  name,
  type: 'standard_net',
  active: true,
  maxBatters: 2,
  minBowlers: 1,
  maxBowlers: 3,
  maxTotalParticipants: 6,
  requiresCoachOrLeader: true,
  supportsLiveBatting: true,
  supportsCentreWicket: false
});

describe('Player-Aware Rationale Generator (B-05, B-06)', () => {
  it('generates player rationale when active development focus evidence exists (B-05)', () => {
    const p1 = player(1, 'Ben Stokes');
    const p2 = player(2, 'Joe Root');
    const resources = [resource('r-1', 'Net 1 - Spin & Strike Rotation')];

    const team: ClubTeam = {
      id: 'team-1',
      name: 'Club XI',
      ageGroup: 'Senior',
      submissionToken: 'tok',
      createdAt: '2026-01-01',
      active: true,
      squadPlayerIds: [p1.id, p2.id]
    };

    const devFocuses: DevelopmentFocus[] = [
      {
        id: 'f-1',
        playerId: p1.id,
        domain: 'Batting',
        focusStatement: 'Playing spin footwork',
        state: 'Developing',
        why: 'Struggled against leg spin',
        startDate: '2026-01-01',
        history: [],
        coachSummary: 'Work on soft hands',
        access: { staffVisibility: 'all_staff', shareWithPlayerGuardian: false }
      }
    ];

    const planOutput = generateClubRotationPlan({
      players: [p1, p2],
      teams: [team],
      resources,
      availability: {
        [p1.id]: { playerId: p1.id, status: 'attending' },
        [p2.id]: { playerId: p2.id, status: 'attending' }
      },
      staffAssignments: {
        [p1.id]: { playerId: p1.id, trainingBattingRole: 'general_rotation', trainingBowlingRole: 'none' },
        [p2.id]: { playerId: p2.id, trainingBattingRole: 'general_rotation', trainingBowlingRole: 'none' }
      },
      sessionObjectives: ['Playing spin'],
      rotationBlockDurationMinutes: 15,
      sessionStartTime: '18:00',
      sessionFinishTime: '18:30'
    });

    const structured = generateStructuredRationale(planOutput, ['Playing spin'], {
      players: [p1, p2],
      developmentFocuses: devFocuses
    });

    expect(structured.teamRationale.toLowerCase()).toContain('playing spin');
    expect(structured.playerRationale.length).toBeGreaterThan(0);
    expect(structured.playerRationale[0].playerId).toBe(p1.id);
    expect(structured.playerRationale[0].reason).toContain("Ben Stokes has been assigned to Net 1 - Spin & Strike Rotation because 'Playing spin footwork' is an active development focus.");
  });

  it('does not generate fake player rationale when evidence is absent (B-06)', () => {
    const p1 = player(1, 'Player One');
    const resources = [resource('r-1', 'Net 1')];
    const team: ClubTeam = { id: 'team-1', name: 'Club XI', ageGroup: 'Senior', submissionToken: 'tok', createdAt: '2026-01-01', active: true, squadPlayerIds: [p1.id] };

    const planOutput = generateClubRotationPlan({
      players: [p1],
      teams: [team],
      resources,
      availability: { [p1.id]: { playerId: p1.id, status: 'attending' } },
      staffAssignments: { [p1.id]: { playerId: p1.id, trainingBattingRole: 'general_rotation', trainingBowlingRole: 'none' } },
      sessionObjectives: [],
      rotationBlockDurationMinutes: 15,
      sessionStartTime: '18:00',
      sessionFinishTime: '18:15'
    });

    const structured = generateStructuredRationale(planOutput, [], {
      players: [p1],
      developmentFocuses: []
    });

    expect(structured.playerRationale).toEqual([]);
  });

  it('filters private development focus rationale if userRole is assistant_coach', () => {
    const p1 = player(1, 'Private Player');
    const resources = [resource('r-1', 'Net 1')];
    const team: ClubTeam = { id: 'team-1', name: 'Club XI', ageGroup: 'Senior', submissionToken: 'tok', createdAt: '2026-01-01', active: true, squadPlayerIds: [p1.id] };
    const devFocuses: DevelopmentFocus[] = [{
      id: 'f-1', playerId: p1.id, domain: 'Batting', focusStatement: 'Confidential Focus', state: 'Developing', why: '', startDate: '2026-01-01', history: [], coachSummary: '', access: { staffVisibility: 'head_coach_only', shareWithPlayerGuardian: false }
    }];

    const planOutput = generateClubRotationPlan({
      players: [p1], teams: [team], resources,
      availability: { [p1.id]: { playerId: p1.id, status: 'attending' } },
      staffAssignments: { [p1.id]: { playerId: p1.id, trainingBattingRole: 'general_rotation', trainingBowlingRole: 'none' } },
      sessionObjectives: [], rotationBlockDurationMinutes: 15, sessionStartTime: '18:00', sessionFinishTime: '18:15'
    });

    const structured = generateStructuredRationale(planOutput, [], {
      players: [p1],
      developmentFocuses: devFocuses,
      userRole: 'assistant_coach'
    });

    expect(structured.playerRationale).toEqual([]);
  });
});
