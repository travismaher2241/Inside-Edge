import { describe, it, expect } from 'vitest';
import type { Player, DevelopmentFocus, ClubTrainingSession, MatchRecord, TrainingResource } from '../src/types/cricket';
import { deriveHomeState } from '../src/views/HomeView';

const mockPlayers: Player[] = [
  { id: 'p1', name: 'Jack Davies', primaryRole: 'pace_bowler', secondaryRole: 'none', battingHand: 'right', bowlingStyle: 'right_arm_fast', wicketkeepingCapability: 'none', trainingAvailability: true, activeDevelopmentFocusIds: [], workloadRestriction: { restrictedBowler: true, maxDeliveries: 36, notes: 'Shoulder strain' } },
  { id: 'p2', name: 'Ben Harris', primaryRole: 'top_order_batter', secondaryRole: 'none', battingHand: 'right', bowlingStyle: 'does_not_bowl', wicketkeepingCapability: 'none', trainingAvailability: true, activeDevelopmentFocusIds: [] },
  { id: 'p3', name: 'Sam Miller', primaryRole: 'all_rounder', secondaryRole: 'none', battingHand: 'left', bowlingStyle: 'right_arm_spin', wicketkeepingCapability: 'none', trainingAvailability: true, activeDevelopmentFocusIds: [] },
  { id: 'p4', name: 'Tom Wilson', primaryRole: 'middle_order_batter', secondaryRole: 'none', battingHand: 'right', bowlingStyle: 'does_not_bowl', wicketkeepingCapability: 'none', trainingAvailability: true, activeDevelopmentFocusIds: [] }
];

const mockFocuses: DevelopmentFocus[] = [
  { id: 'f1', playerId: 'p1', domain: 'Bowling', focusStatement: 'Front foot alignment', state: 'Current Focus', targets: [], notes: '', createdAt: '2026-08-01', updatedAt: '2026-08-01' },
  { id: 'f2', playerId: 'p2', domain: 'Batting', focusStatement: 'Decision-making outside off stump', state: 'Current Focus', targets: [], notes: '', createdAt: '2026-08-01', updatedAt: '2026-08-01' },
  { id: 'f3', playerId: 'p3', domain: 'Spin Bowling', focusStatement: 'Flight and loop', state: 'Developing', targets: [], notes: '', createdAt: '2026-08-01', updatedAt: '2026-08-01' },
  { id: 'f4', playerId: 'p4', domain: 'Fielding', focusStatement: 'High catching in deep', state: 'Current Focus', targets: [], notes: '', createdAt: '2026-08-01', updatedAt: '2026-08-01' }
];

describe('Home View Second-Pass UX Refinement Unit Tests', () => {
  it('TEST A — DUPLICATE PLAYER: Player with workload restriction in Worth a Look is NOT duplicated in Player Focus', () => {
    const state = deriveHomeState({
      players: mockPlayers,
      focuses: mockFocuses
    });

    // Jack Davies (p1) has workload restriction, so Jack appears in coachingNotes (Worth a Look)
    const inWorthALook = state.coachingNotes.some(n => n.targetPlayerId === 'p1');
    expect(inWorthALook).toBe(true);

    // Jack Davies MUST NOT appear in playerFocusItems!
    const inPlayerFocus = state.playerFocusItems.some(pf => pf.playerId === 'p1');
    expect(inPlayerFocus).toBe(false);
  });

  it('TEST B — MANY ATTENTION ITEMS: Limits Worth a Look items to max 3', () => {
    const manyPlayers = Array.from({ length: 6 }, (_, i) => ({
      ...mockPlayers[0],
      id: `p-work-${i}`,
      name: `Player ${i}`,
      workloadRestriction: { restrictedBowler: true, maxDeliveries: 30 }
    }));

    const state = deriveHomeState({
      players: manyPlayers,
      focuses: []
    });

    expect(state.coachingNotes.length).toBeLessThanOrEqual(3);
    expect(state.totalCoachingNotesCount).toBe(6);
  });

  it('TEST C — MANY PLAYER FOCUSES: Limits Player Focus to max 3', () => {
    const manyFocuses: DevelopmentFocus[] = Array.from({ length: 6 }, (_, i) => ({
      id: `f-many-${i}`,
      playerId: `p-${i}`,
      domain: 'Batting',
      focusStatement: `Focus ${i}`,
      state: 'Current Focus' as const,
      targets: [],
      notes: '',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01'
    }));

    const playersForFocus = Array.from({ length: 6 }, (_, i) => ({
      ...mockPlayers[1],
      id: `p-${i}`,
      name: `Batter ${i}`
    }));

    const state = deriveHomeState({
      players: playersForFocus,
      focuses: manyFocuses
    });

    expect(state.playerFocusItems.length).toBeLessThanOrEqual(3);
    expect(state.totalPlayerFocusCount).toBe(6);
  });

  it('TEST D — NO TRAINING: Quick actions adapt to prevent duplicate Plan Training CTA', () => {
    const state = deriveHomeState({
      players: mockPlayers,
      sessions: []
    });

    expect(state.primaryContextType).toBe('NO_SESSION');
    expect(state.quickActions.some(qa => qa.label === 'Plan Training')).toBe(false);
    expect(state.quickActions.map(qa => qa.label)).toContain('Create Drill');
    expect(state.quickActions.map(qa => qa.label)).toContain('Team');
  });

  it('TEST E — TRAINING EXISTS: Quick actions include Plan Training when primary card is active session', () => {
    const state = deriveHomeState({
      players: mockPlayers,
      sessions: [{
        id: 's1',
        clubId: 'c1',
        title: 'Thursday Session',
        date: '2026-08-12',
        startTime: '18:00',
        finishTime: '19:30',
        venueFacilityId: 'f1',
        includedTeamIds: ['t1'],
        availableResourceIds: [],
        expectedPlayerIds: [],
        confirmedAttendingPlayerIds: [],
        availabilityRecords: {},
        staffPlayerAssignments: {},
        sessionObjectives: [],
        rotationDurationMinutes: 12,
        captainCoachAssignments: [],
        rotationPlan: [],
        manualLocks: {},
        fairnessSettings: { targetEqualBattingMinutes: 30 },
        blocks: [],
        activeBlockIndex: 0,
        activeRotationIndex: 0,
        status: 'live',
        warnings: []
      }]
    });

    expect(state.primaryContextType).toBe('IN_PROGRESS');
    expect(state.quickActions.some(qa => qa.label === 'Plan Training')).toBe(true);
  });

  it('TEST G & H — HIDDEN SECTIONS: Hides Worth a Look or Player Focus when empty', () => {
    const state = deriveHomeState({
      players: [mockPlayers[1]], // Ben Harris without workload restriction
      focuses: []
    });

    expect(state.coachingNotes.length).toBe(0);
    expect(state.playerFocusItems.length).toBe(0);
  });
});
