import { describe, expect, it } from 'vitest';
import {
  TACTICAL_FIELD_PRESETS,
  fieldForBatterHand,
  rankBowlingPlans,
  validateFieldPreset,
} from '../src/modules/cricket/tactics';

describe('tactical field presets', () => {
  it('all contain a legal team count and satisfy their declared constraints', () => {
    for (const preset of TACTICAL_FIELD_PRESETS) {
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
});

describe('bowling-plan ranking', () => {
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

