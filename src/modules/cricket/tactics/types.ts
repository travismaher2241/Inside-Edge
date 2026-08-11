import type { BattingHand, BowlingStyle } from '../../../types/cricket';

export type TacticalFormat = 'multi_day' | 'one_day' | 't20';
export type TacticalPhase =
  | 'new_ball'
  | 'powerplay'
  | 'middle_overs'
  | 'old_ball'
  | 'death'
  | 'wicket_push'
  | 'run_defence';

export type EvidenceConfidence = 'low' | 'medium' | 'high';
export type PlanIntent = 'attack' | 'pressure' | 'contain' | 'boundary_defence';
export type FieldDepth = 'close' | 'saving_one' | 'inner_ring' | 'outfield' | 'boundary';
export type FieldSide = 'off' | 'leg' | 'straight';

export type BatterTrait =
  | 'new_to_crease'
  | 'strong_front_foot_drive'
  | 'drives_away_from_body'
  | 'strong_cut'
  | 'weak_cut_or_square_drive'
  | 'strong_pull_hook'
  | 'weak_against_short_ball'
  | 'strong_leg_side'
  | 'falls_across_front_pad'
  | 'stays_leg_side_of_ball'
  | 'plays_early'
  | 'plays_late'
  | 'hard_hands'
  | 'soft_hands'
  | 'deep_in_crease'
  | 'commits_front_foot_early'
  | 'vulnerable_to_yorker'
  | 'vulnerable_to_change_of_pace'
  | 'strong_sweep'
  | 'weak_sweep'
  | 'strong_reverse_sweep'
  | 'uses_feet_to_spin'
  | 'crease_bound_to_spin'
  | 'weak_to_ball_turning_away'
  | 'weak_to_ball_turning_in'
  | 'rotates_strike_well'
  | 'poor_strike_rotation'
  | 'boundary_hitter_straight'
  | 'boundary_hitter_square_off'
  | 'boundary_hitter_square_leg'
  | 'targets_short_boundary'
  | 'tailender';

export type BowlerCapability =
  | 'high_pace'
  | 'steep_bounce'
  | 'skiddy'
  | 'accurate_fourth_stump'
  | 'outswing'
  | 'inswing'
  | 'wobble_seam'
  | 'reverse_swing'
  | 'off_cutter'
  | 'leg_cutter'
  | 'slower_ball'
  | 'wide_yorker'
  | 'straight_yorker'
  | 'bouncer_control'
  | 'stock_spin_control'
  | 'turns_away_from_batter'
  | 'turns_into_batter'
  | 'arm_ball_or_slider'
  | 'top_spinner'
  | 'googly_or_wrong_un'
  | 'flight_and_dip'
  | 'change_of_pace'
  | 'changes_crease_angle';

export interface BatterObservation {
  trait: BatterTrait;
  confidence: EvidenceConfidence;
  note?: string;
  sampleSize?: number;
}

export interface TacticalBowlerProfile {
  playerId: string;
  style: BowlingStyle;
  capabilities: BowlerCapability[];
  controlRating?: 1 | 2 | 3 | 4 | 5;
  availableVariations?: string[];
}

export interface FieldSpot {
  id: string;
  name: string;
  x: number;
  y: number;
  side: FieldSide;
  depth: FieldDepth;
  behindSquareLeg?: boolean;
  role: string;
}

export interface TacticalFieldPreset {
  id: string;
  name: string;
  intent: PlanIntent;
  positions: FieldSpot[];
  notes: string[];
  maxOutsideCircle: number;
}

export interface BowlingPlan {
  id: string;
  title: string;
  intent: PlanIntent;
  batterTraits: BatterTrait[];
  usefulCapabilities: BowlerCapability[];
  suitableStyles?: BowlingStyle[];
  phases: TacticalPhase[];
  formats: TacticalFormat[];
  line: string;
  length: string;
  sequence: string[];
  dismissalRoutes: string[];
  scoringAreasConceded: string[];
  fieldPresetId: string;
  rationale: string;
  executionRisk: string;
  changeTriggers: string[];
  safetyNote?: string;
}

export interface TacticalContext {
  batterHand: BattingHand;
  format: TacticalFormat;
  phase: TacticalPhase;
  maxFieldersOutsideCircle: number;
  shortBoundarySide?: FieldSide;
  pitch?: 'seaming' | 'slow' | 'turning' | 'low' | 'bouncy' | 'flat';
  ball?: 'new' | 'used' | 'old' | 'wet';
  localRulesConfirmed: boolean;
}

