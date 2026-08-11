import type { BatterTrait, BowlerCapability } from './types';

export interface TraitCategory {
  name: string;
  traits: { trait: BatterTrait; label: string; description: string }[];
}

export const BATTER_TRAIT_CATEGORIES: TraitCategory[] = [
  {
    name: 'Pace and bounce',
    traits: [
      { trait: 'weak_against_short_ball', label: 'Weak Against Short Ball', description: 'Struggles with short-pitched deliveries at body/shoulder line.' },
      { trait: 'strong_pull_hook', label: 'Strong Pull & Hook', description: 'Capitalizes quickly on short or half-tracker deliveries.' },
      { trait: 'plays_early', label: 'Plays Early / Hard Hands', description: 'Tends to push forward before line and length settle.' },
      { trait: 'tailender', label: 'Lower-Order / Tailender', description: 'Limited defensive alignment under top-of-off pressure.' },
    ],
  },
  {
    name: 'Line and length',
    traits: [
      { trait: 'drives_away_from_body', label: 'Drives Away from Body', description: 'Reaches out for full balls without moving feet across line.' },
      { trait: 'strong_front_foot_drive', label: 'Strong Front-Foot Drive', description: 'Clean driver down the ground and through cover.' },
      { trait: 'strong_cut', label: 'Strong Cut Shot', description: 'Punishes any width outside off stump.' },
      { trait: 'weak_cut_or_square_drive', label: 'Weak Cut / Square Drive', description: 'Vulnerable when room is offered outside off stump.' },
      { trait: 'falls_across_front_pad', label: 'Falls Across Front Pad', description: 'Head falls off to off-side; vulnerable to in-swing and LBW.' },
      { trait: 'stays_leg_side_of_ball', label: 'Stays Leg Side of Ball', description: 'Opens up off-side arc; vulnerable to tight body line.' },
    ],
  },
  {
    name: 'Footwork and timing',
    traits: [
      { trait: 'new_to_crease', label: 'New to Crease', description: 'Finding rhythm and judging pace/bounce.' },
      { trait: 'deep_in_crease', label: 'Deep in Crease', description: 'Stands back on crease; vulnerable to base-of-stumps yorkers.' },
      { trait: 'commits_front_foot_early', label: 'Commits Front Foot Early', description: 'Weight lands forward before ball arrives; vulnerable to length changes.' },
      { trait: 'hard_hands', label: 'Hard Hands', description: 'Pushes firmly at the ball; creates thick edges.' },
      { trait: 'soft_hands', label: 'Soft Hands', description: 'Plays with relaxed wrists; drops edges short.' },
      { trait: 'plays_late', label: 'Plays Late', description: 'Lets the ball come deep under eyes.' },
    ],
  },
  {
    name: 'Scoring areas',
    traits: [
      { trait: 'strong_leg_side', label: 'Strong Leg Side', description: 'Prefers scoring through midwicket and square leg.' },
      { trait: 'boundary_hitter_straight', label: 'Straight Boundary Hitter', description: 'Targets long-off and long-on arcs.' },
      { trait: 'boundary_hitter_square_off', label: 'Square Off-Side Hitter', description: 'Targets point and cover boundaries.' },
      { trait: 'boundary_hitter_square_leg', label: 'Square Leg-Side Hitter', description: 'Targets midwicket and square leg boundaries.' },
      { trait: 'targets_short_boundary', label: 'Targets Short Boundary', description: 'Directs aerial risk toward shorter boundary side.' },
    ],
  },
  {
    name: 'Spin',
    traits: [
      { trait: 'weak_to_ball_turning_away', label: 'Weak to Turn Away', description: 'Struggles when ball turns past outside edge.' },
      { trait: 'weak_to_ball_turning_in', label: 'Weak to Turn In', description: 'Struggles against turn into pad and stumps.' },
      { trait: 'uses_feet_to_spin', label: 'Uses Feet to Spin', description: 'Advances down pitch to smother turn or hit straight.' },
      { trait: 'crease_bound_to_spin', label: 'Crease-Bound to Spin', description: 'Stays anchored on back foot; vulnerable to dip/flight.' },
      { trait: 'strong_sweep', label: 'Strong Sweep', description: 'Uses conventional sweep effectively.' },
      { trait: 'weak_sweep', label: 'Weak Sweep', description: 'Uncomfortable or unrefined sweep stroke.' },
      { trait: 'strong_reverse_sweep', label: 'Strong Reverse Sweep', description: 'Plays reverse sweep/ramp against spin.' },
      { trait: 'vulnerable_to_change_of_pace', label: 'Vulnerable to Change of Pace', description: 'Deceived by flight, dip, or cutter variations.' },
      { trait: 'vulnerable_to_yorker', label: 'Vulnerable to Yorker', description: 'Struggles with full blockhole deliveries.' },
    ],
  },
  {
    name: 'Strike rotation and intent',
    traits: [
      { trait: 'rotates_strike_well', label: 'Rotates Strike Well', description: 'Consistently finds singles to reset pressure.' },
      { trait: 'poor_strike_rotation', label: 'Poor Strike Rotation', description: 'Dot-ball pressure builds easily.' },
    ],
  },
];

export const BOWLER_CAPABILITY_LABELS: Record<BowlerCapability, { label: string; description: string }> = {
  high_pace: { label: 'High Pace', description: 'Consistently high speed to beat batter timing' },
  steep_bounce: { label: 'Steep Bounce', description: 'Generates steep bounce from good length' },
  skiddy: { label: 'Skiddy Trajectory', description: 'Low, skiddy trajectory through the air' },
  accurate_fourth_stump: { label: 'Fourth-Stump Accuracy', description: 'Relentless precision in fourth-stump corridor' },
  outswing: { label: 'Outswing', description: 'Shapes ball away from right-hander / into left-hander' },
  inswing: { label: 'Inswing', description: 'Shapes ball into right-hander / away from left-hander' },
  wobble_seam: { label: 'Wobble Seam', description: 'Unpredictable seam movement off surface' },
  reverse_swing: { label: 'Reverse Swing', description: 'Late movement with older, dry ball' },
  off_cutter: { label: 'Off-Cutter', description: 'Grips and cuts into right-handed batter' },
  leg_cutter: { label: 'Leg-Cutter', description: 'Grips and cuts away from right-handed batter' },
  slower_ball: { label: 'Disguised Slower Ball', description: 'Deceptive change-up without action change' },
  wide_yorker: { label: 'Wide Yorker', description: 'Accurate full blockhole wide outside off' },
  straight_yorker: { label: 'Straight Yorker', description: 'Accurate base-of-stumps delivery at death' },
  bouncer_control: { label: 'Controlled Bouncer', description: 'Controlled short ball at shoulder/hip line' },
  stock_spin_control: { label: 'Stock Spin Control', description: 'Reliable landing of primary stock turn' },
  turns_away_from_batter: { label: 'Turns Away from Batter', description: 'Spins away from striker\'s outside edge' },
  turns_into_batter: { label: 'Turns Into Batter', description: 'Spins into striker\'s pad and stumps' },
  arm_ball_or_slider: { label: 'Arm Ball / Slider', description: 'Straight variation that holds line through air' },
  top_spinner: { label: 'Top Spinner', description: 'Extra bounce and dip over pitch' },
  googly_or_wrong_un: { label: 'Googly / Wrong \'Un', description: 'Counter-spinning variation' },
  flight_and_dip: { label: 'Flight & Dip', description: 'Changes trajectory to draw batter forward' },
  change_of_pace: { label: 'Tactical Change of Pace', description: 'Mixes speeds within an over' },
  changes_crease_angle: { label: 'Crease Angle Variation', description: 'Uses wide/tight release angles' },
};

export function getBatterTraitLabel(trait: BatterTrait): string {
  for (const cat of BATTER_TRAIT_CATEGORIES) {
    const found = cat.traits.find(t => t.trait === trait);
    if (found) return found.label;
  }
  return trait.replace(/_/g, ' ');
}

export function getBowlerCapabilityLabel(cap: BowlerCapability): string {
  return BOWLER_CAPABILITY_LABELS[cap]?.label || cap.replace(/_/g, ' ');
}
