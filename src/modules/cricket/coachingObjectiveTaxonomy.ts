import type { CoachingObjectiveId, DevelopmentDomain } from '../../types/cricket';

// Legacy lightweight taxonomy, superseded by coachingObjectiveRegistry.ts's fuller
// CoachingObjective records. Kept only for matchesObjective()'s parent/child lookups
// (see activityUsageService.ts), so it deliberately doesn't carry the full
// CoachingObjective shape.
interface LegacyObjectiveEntry {
  id: CoachingObjectiveId;
  name: string;
  domain: DevelopmentDomain;
  parentObjectiveId?: CoachingObjectiveId;
}

export const COACHING_OBJECTIVES_REGISTRY: Record<CoachingObjectiveId, LegacyObjectiveEntry> = {
  // Batting Domain
  playing_spin: {
    id: 'playing_spin',
    name: 'Playing Spin Bowling',
    domain: 'Batting'
  },
  facing_spin_strike_rotation: {
    id: 'facing_spin_strike_rotation',
    name: 'Strike Rotation Against Spin',
    domain: 'Batting',
    parentObjectiveId: 'playing_spin'
  },
  spin_footwork_defense: {
    id: 'spin_footwork_defense',
    name: 'Footwork & Defensive Alignment vs Spin',
    domain: 'Batting',
    parentObjectiveId: 'playing_spin'
  },
  playing_seam_swing: {
    id: 'playing_seam_swing',
    name: 'Playing Seam & Swing Bowling',
    domain: 'Batting'
  },
  short_pitch_defense: {
    id: 'short_pitch_defense',
    name: 'Short Pitch Defense & Evasion',
    domain: 'Batting',
    parentObjectiveId: 'playing_seam_swing'
  },
  t20_powerplay_batting: {
    id: 't20_powerplay_batting',
    name: 'Powerplay Boundary Hitting',
    domain: 'Batting'
  },
  t20_death_batting: {
    id: 't20_death_batting',
    name: 'Death Overs Finish & Target Pursuit',
    domain: 'Batting'
  },
  running_between_wickets: {
    id: 'running_between_wickets',
    name: 'Running Between Wickets & Calling',
    domain: 'Batting'
  },

  // Bowling Domain
  t20_death_bowling: {
    id: 't20_death_bowling',
    name: 'Death Overs Bowling (Yorkers & Slower Balls)',
    domain: 'Bowling'
  },
  new_ball_swing_control: {
    id: 'new_ball_swing_control',
    name: 'New Ball Swing & Length Control',
    domain: 'Bowling'
  },
  spin_flight_variation: {
    id: 'spin_flight_variation',
    name: 'Spin Flight & Pace Variation',
    domain: 'Bowling'
  },

  // Fielding Domain
  high_catch_pressure: {
    id: 'high_catch_pressure',
    name: 'High Catching Under Pressure',
    domain: 'Fielding'
  },
  ground_fielding_accuracy: {
    id: 'ground_fielding_accuracy',
    name: 'Ground Fielding & Target Throwing',
    domain: 'Fielding'
  }
};

export const CoachingObjectiveTaxonomy = {
  getObjective(id: CoachingObjectiveId): LegacyObjectiveEntry | undefined {
    return COACHING_OBJECTIVES_REGISTRY[id];
  },

  /**
   * Checks if an objective matches a target (either exact match or parent-child hierarchy match).
   */
  matchesObjective(candidateId: CoachingObjectiveId, targetId: CoachingObjectiveId): boolean {
    if (candidateId === targetId) return true;

    const candidate = COACHING_OBJECTIVES_REGISTRY[candidateId];
    if (candidate && candidate.parentObjectiveId === targetId) return true;

    const target = COACHING_OBJECTIVES_REGISTRY[targetId];
    if (target && target.parentObjectiveId === candidateId) return true;

    return false;
  },

  /**
   * Returns all objective IDs in registry.
   */
  getAllObjectiveIds(): CoachingObjectiveId[] {
    return Object.keys(COACHING_OBJECTIVES_REGISTRY);
  }
};
