import { describe, expect, it, beforeEach } from 'vitest';
import {
  TACTICAL_FIELD_PRESETS,
  fieldForBatterHand,
  rankBowlingPlans,
  validateFieldPreset,
  STOCK_BALL_PLAN,
} from '../src/modules/cricket/tactics';
import { StorageEngine } from '../src/storage/db';
import type { Player, MatchSquad, OppositionBatter, CompetitionRulesProfile, SavedTacticalPlan } from '../src/types/cricket';

describe('tactical field presets', () => {
  it('all contain a legal team count (10 markers: 1 keeper + 9 fielders) and satisfy declared constraints', () => {
    for (const preset of TACTICAL_FIELD_PRESETS) {
      expect(preset.positions.length).toBe(10);
      expect(validateFieldPreset(preset), preset.id).toEqual([]);
    }
  });

  it('mirrors coordinates but preserves tactical field roles for a left-hander', () => {
    const right = TACTICAL_FIELD_PRESETS[0];
    const left = fieldForBatterHand(right, 'left');

    expect(left.positions).toHaveLength(right.positions.length);
    left.positions.forEach((position, index) => {
      expect(position.x).toBe(100 - right.positions[index].x);
      expect(position.name).toBe(right.positions[index].name);
      expect(position.role).toBe(right.positions[index].role);
    });
  });

  it('rejects illegal field settings exceeding 2 fielders behind square on leg side', () => {
    const preset = TACTICAL_FIELD_PRESETS[0];
    const illegalPreset = {
      ...preset,
      positions: preset.positions.map((pos, idx) =>
        idx < 3 ? { ...pos, behindSquareLeg: true } : pos
      ),
    };
    const errors = validateFieldPreset(illegalPreset);
    expect(errors).toContain('More than two fielders are behind square on the leg side.');
  });

  it('rejects field settings exceeding declared boundary rider limit', () => {
    const preset = TACTICAL_FIELD_PRESETS[0]; // maxOutsideCircle: 1
    const illegalPreset = {
      ...preset,
      positions: preset.positions.map((pos, idx) =>
        idx < 3 ? { ...pos, depth: 'boundary' as const } : pos
      ),
    };
    const errors = validateFieldPreset(illegalPreset);
    expect(errors.some(e => e.includes('outside the circle'))).toBe(true);
  });
});

describe('bowling-plan ranking & guardrails', () => {
  it('favours an executable away-movement plan for a hard-handed driver', () => {
    const results = rankBowlingPlans(
      {
        playerId: 'bowler-1',
        style: 'right_arm_fast_medium',
        capabilities: ['outswing', 'accurate_fourth_stump'],
        controlRating: 4,
      },
      [
        { trait: 'drives_away_from_body', confidence: 'high' },
        { trait: 'hard_hands', confidence: 'medium' },
      ],
      {
        batterHand: 'right',
        format: 'one_day',
        phase: 'new_ball',
        maxFieldersOutsideCircle: 2,
        localRulesConfirmed: true,
      },
    );

    expect(results[0].plan.id).toBe('invite_drive_with_away_movement');
  });

  it('penalises small-margin plans when bowler control rating is below 3', () => {
    const results = rankBowlingPlans(
      {
        playerId: 'bowler-low-control',
        style: 'right_arm_fast',
        capabilities: ['wide_yorker'],
        controlRating: 2,
      },
      [{ trait: 'boundary_hitter_straight', confidence: 'high' }],
      {
        batterHand: 'right',
        format: 't20',
        phase: 'death',
        maxFieldersOutsideCircle: 5,
        localRulesConfirmed: true,
      },
    );

    const yorkerResult = results.find(r => r.plan.id === 'wide_yorker_death');
    expect(yorkerResult?.warnings).toContain('This plan has a small margin for error and bowler control rating is below 3/5.');
  });

  it('suppresses short-ball recommendations for junior players or unconfirmed safety rules', () => {
    const results = rankBowlingPlans(
      {
        playerId: 'junior-fast-bowler',
        style: 'right_arm_fast',
        capabilities: ['high_pace', 'bouncer_control'],
        controlRating: 4,
      },
      [{ trait: 'weak_against_short_ball', confidence: 'high' }],
      {
        batterHand: 'right',
        format: 't20',
        phase: 'middle_overs',
        maxFieldersOutsideCircle: 5,
        localRulesConfirmed: true,
        isJunior: true,
      },
    );

    const shortBallResult = results.find(r => r.plan.id === 'controlled_short_ball');
    expect(shortBallResult?.warnings).toContain('Automatic short-ball recommendation suppressed for safety and unconfirmed local rules.');
  });

  it('provides stock-ball fallback when no specialized plan is supported by bowler capabilities', () => {
    const results = rankBowlingPlans(
      {
        playerId: 'bowler-no-caps',
        style: 'right_arm_fast_medium',
        capabilities: [], // No capabilities listed
        controlRating: 3,
      },
      [{ trait: 'drives_away_from_body', confidence: 'high' }],
      {
        batterHand: 'right',
        format: 'one_day',
        phase: 'new_ball',
        maxFieldersOutsideCircle: 2,
        localRulesConfirmed: true,
      },
    );

    expect(results[0].isFallback).toBe(true);
    expect(results[0].plan.id).toBe(STOCK_BALL_PLAN.id);
  });

  it('warns when local playing conditions are unconfirmed', () => {
    const results = rankBowlingPlans(
      {
        playerId: 'bowler-2',
        style: 'right_arm_fast',
        capabilities: ['wide_yorker'],
        controlRating: 4,
      },
      [{ trait: 'boundary_hitter_straight', confidence: 'high' }],
      {
        batterHand: 'right',
        format: 't20',
        phase: 'death',
        maxFieldersOutsideCircle: 5,
        localRulesConfirmed: false,
      },
    );

    expect(results[0].warnings).toContain('Confirm local playing conditions before using this recommendation.');
  });
});

describe('StorageEngine & match-scoped data isolation', () => {
  beforeEach(() => {
    StorageEngine.resetToSeed();
  });

  it('persists player bowling capability profiles', () => {
    const players = StorageEngine.getPlayers();
    const target = players[0];
    const updatedPlayer: Player = {
      ...target,
      capabilities: ['outswing', 'accurate_fourth_stump'],
      controlRating: 4,
      availableVariations: ['Outswing', 'Off-Cutter'],
      preferredPhases: ['new_ball'],
      tacticalNotes: 'Swing bowling specialist',
    };

    StorageEngine.updatePlayer(updatedPlayer);
    const reloaded = StorageEngine.getPlayers().find(p => p.id === target.id);
    expect(reloaded?.capabilities).toEqual(['outswing', 'accurate_fourth_stump']);
    expect(reloaded?.controlRating).toBe(4);
    expect(reloaded?.tacticalNotes).toBe('Swing bowling specialist');
  });

  it('persists and retrieves match squads scoped by match ID', () => {
    const squad: MatchSquad = {
      matchId: 'match-test-101',
      selectedPlayerIds: ['p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-7', 'p-8', 'p-9', 'p-10', 'p-11'],
      wicketkeeperId: 'p-1',
    };

    StorageEngine.saveMatchSquad(squad);
    const retrieved = StorageEngine.getMatchSquad('match-test-101');
    expect(retrieved?.selectedPlayerIds).toHaveLength(11);
    expect(retrieved?.wicketkeeperId).toBe('p-1');
  });

  it('persists opposition batters and filters by match ID', () => {
    const batter1: OppositionBatter = {
      id: 'op-1',
      matchId: 'match-1',
      name: 'Batter Alpha',
      battingHand: 'right',
      observations: [{ trait: 'drives_away_from_body', confidence: 'high' }],
    };
    const batter2: OppositionBatter = {
      id: 'op-2',
      matchId: 'match-2',
      name: 'Batter Beta',
      battingHand: 'left',
      observations: [{ trait: 'strong_pull_hook', confidence: 'medium' }],
    };

    StorageEngine.saveOppositionBatter(batter1);
    StorageEngine.saveOppositionBatter(batter2);

    const match1Batters = StorageEngine.getOppositionBatters('match-1');
    expect(match1Batters.some(b => b.id === 'op-1')).toBe(true);
    expect(match1Batters.some(b => b.id === 'op-2')).toBe(false);
  });

  it('persists competition rules profiles', () => {
    const profiles = StorageEngine.getRulesProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(4);
    const t20Profile: CompetitionRulesProfile | undefined = profiles.find(p => p.format === 't20');
    expect(t20Profile?.inningsOvers).toBe(20);
    expect(t20Profile?.maxBehindSquareLeg).toBe(2);
  });

  it('saves, retrieves and deletes tactical plans scoped by match ID', () => {
    const plan: SavedTacticalPlan = {
      id: 'plan-101',
      matchId: 'match-1',
      batterId: 'op-1',
      bowlerId: 'p-2',
      planId: 'invite_drive_with_away_movement',
      fieldPresetId: 'pace_outswing_attack',
      positions: TACTICAL_FIELD_PRESETS[0].positions,
      status: 'accepted',
      updatedAt: new Date().toISOString(),
      warnings: [],
    };

    StorageEngine.saveTacticalPlan(plan);
    const retrieved = StorageEngine.getSavedTacticalPlans('match-1');
    expect(retrieved.some(p => p.id === 'plan-101')).toBe(true);

    StorageEngine.deleteTacticalPlan('plan-101');
    expect(StorageEngine.getSavedTacticalPlans('match-1').some(p => p.id === 'plan-101')).toBe(false);
  });
});


