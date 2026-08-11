// Development Domain Taxonomy & Constants for Cricket

import type { DevelopmentDomain, FocusState, ObservationTag, PrimaryRole, BowlingStyle } from '../../types/cricket';

export const DEVELOPMENT_DOMAINS: { domain: DevelopmentDomain; label: string; subAreas: string[] }[] = [
  {
    domain: 'Batting',
    label: 'Batting',
    subAreas: [
      'Setup & Alignment',
      'Front Foot Movement',
      'Back Foot Movement',
      'Decision Outside Off',
      'Playing Seam / Swing',
      'Playing Spin / Footwork',
      'Strike Rotation',
      'Power Hitting / Boundary Options',
      'Short Ball Defense / Attack',
      'Running Between Wickets'
    ]
  },
  {
    domain: 'Bowling',
    label: 'Bowling',
    subAreas: [
      'Run-up & Rhythm',
      'Action Consistency',
      'New-Ball Line & Length',
      'Swing / Seam Movement',
      'Spin Control & Revolutions',
      'Yorker Execution',
      'Death Over Change-ups',
      'Wicket-taking Strategy'
    ]
  },
  {
    domain: 'Fielding',
    label: 'Fielding',
    subAreas: [
      'Close Catching (Slip / Short Leg)',
      'High Catching under Pressure',
      'Ground Fielding & Clean Pickups',
      'Flat Throwing & Relay Accuracy',
      'Boundary Defense & Movement'
    ]
  },
  {
    domain: 'Wicketkeeping',
    label: 'Wicketkeeping',
    subAreas: [
      'Standing Back (Pace)',
      'Standing Up (Spin / Medium)',
      'Lateral Footwork',
      'Take Quality & Clean Hands',
      'Leg-side Takes & Stumpings'
    ]
  },
  {
    domain: 'Tactical',
    label: 'Tactical Awareness',
    subAreas: [
      'Powerplay Strategy',
      'Middle-Overs Control',
      'Death Over Execution',
      'Field Setting & Angles',
      'Match Scenario Decision Making',
      'Partnerships & Tempo'
    ]
  },
  {
    domain: 'Physical',
    label: 'Physical & Athletic',
    subAreas: [
      'Shoulder & Throwing Activation',
      'Lateral Agility & Change of Direction',
      'Bowling Workload Management',
      'Match Fitness & Stamina'
    ]
  },
  {
    domain: 'Team',
    label: 'Team Behaviours',
    subAreas: [
      'Communication & Energy',
      'Intent & Positive Body Language',
      'Warm-Up Discipline',
      'Match Preparation & Focus'
    ]
  }
];

export const FOCUS_STATES: FocusState[] = [
  'Current Focus',
  'Developing',
  'Consistent',
  'Strength',
  'Archived'
];

export const OBSERVATION_TAGS: ObservationTag[] = [
  'Good execution',
  'Needs work',
  'Decision',
  'Technique',
  'Intent',
  'Workload',
  'Custom Note'
];

export function getRoleBadgeLabel(role: PrimaryRole): string {
  switch (role) {
    case 'top_order_batter': return 'Top Order Bat';
    case 'middle_order_batter': return 'Middle Order Bat';
    case 'all_rounder': return 'All Rounder';
    case 'pace_bowler': return 'Pace Bowler';
    case 'spin_bowler': return 'Spin Bowler';
    case 'wicketkeeper': return 'Wicketkeeper';
  }
}

export function getBowlingStyleLabel(style: BowlingStyle): string {
  switch (style) {
    case 'right_arm_fast': return 'R/A Fast';
    case 'right_arm_fast_medium': return 'R/A Fast Medium';
    case 'right_arm_off_spin': return 'R/A Off Spin';
    case 'right_arm_leg_spin': return 'R/A Leg Spin';
    case 'left_arm_fast_medium': return 'L/A Fast Medium';
    case 'left_arm_orthodox': return 'L/A Orthodox Spin';
    case 'left_arm_unorthodox': return 'L/A Wrist Spin';
    case 'does_not_bowl': return 'No Bowling';
  }
}
