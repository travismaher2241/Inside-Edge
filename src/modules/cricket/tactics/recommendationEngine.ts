import type {
  BatterObservation,
  BowlingPlan,
  TacticalBowlerProfile,
  TacticalContext,
} from './types';
import { BOWLING_PLAN_LIBRARY } from './planLibrary';
import { TACTICAL_FIELD_PRESETS } from './fieldPresets';
import { getBowlerCapabilityLabel } from './taxonomyLabels';

const confidenceWeight = { low: 1, medium: 2, high: 3 } as const;

export interface RankedPlan {
  plan: BowlingPlan;
  score: number;
  reasons: string[];
  warnings: string[];
  isFallback?: boolean;
}

export const STOCK_BALL_PLAN: BowlingPlan = {
  id: 'stock_line_and_length',
  title: 'Stock Line & Length Discipline',
  intent: 'pressure',
  batterTraits: [],
  usefulCapabilities: [],
  phases: ['new_ball', 'powerplay', 'middle_overs', 'old_ball', 'death', 'wicket_push', 'run_defence'],
  formats: ['multi_day', 'one_day', 't20'],
  line: 'Top of off stump / fourth-stump channel.',
  length: 'Repeatable good length.',
  sequence: [
    'Establish repeatable stock delivery in channel.',
    'Build dot-ball pressure without forcing variations.',
    'Wait for batter to manufacture high-risk stroke.',
  ],
  dismissalRoutes: [
    'Outside edge to keeper or cordon',
    'Bowled or LBW on across-line mistake',
    'Frustration mishit to inner ring',
  ],
  scoringAreasConceded: ['Difficult straight single to long-off/on.'],
  fieldPresetId: 'pace_fourth_stump_pressure',
  rationale: 'No specialized tactical plan has adequate bowler capability support. Default to stock-ball repeatability.',
  executionRisk: 'Drifting onto pads feeds leg side; bowling short-and-wide feeds cut.',
  changeTriggers: ['Bowler establishes control of a specific variation', 'Batter demonstrates a clear technical error'],
};

export function rankBowlingPlans(
  bowler: TacticalBowlerProfile,
  observations: BatterObservation[],
  context: TacticalContext,
): RankedPlan[] {
  const ranked = BOWLING_PLAN_LIBRARY
    .filter(plan => plan.formats.includes(context.format) && plan.phases.includes(context.phase))
    .map(plan => {
      let score = 0;
      const reasons: string[] = [];
      const warnings: string[] = [];

      const capabilityMatches = plan.usefulCapabilities.filter(capability => (bowler.capabilities || []).includes(capability));
      score += capabilityMatches.length * 5;

      if (capabilityMatches.length > 0) {
        const labels = capabilityMatches.map(c => getBowlerCapabilityLabel(c));
        reasons.push(`Bowler can execute: ${labels.join(', ')}`);
      } else {
        score -= 15;
        warnings.push('No stated bowler capability directly supports this plan.');
      }

      const matchingObservations = observations.filter(observation => plan.batterTraits.includes(observation.trait));
      const observationScore = matchingObservations.reduce((total, observation) => total + confidenceWeight[observation.confidence], 0);
      score += observationScore * 2;
      if (matchingObservations.length > 0) {
        reasons.push(`Matches observed batter traits: ${matchingObservations.map(item => item.trait.replace(/_/g, ' ')).join(', ')}`);
      }

      if (plan.suitableStyles?.includes(bowler.style)) {
        score += 2;
      }

      // Control rating check for small-margin / safety plans
      const isSmallMarginPlan = ['death_wide_yorker', 'death_straight_yorker', 'pace_body_bouncer', 'controlled_short_ball'].includes(plan.id) || ['death_wide_yorker', 'death_straight_yorker', 'pace_body_bouncer'].includes(plan.fieldPresetId);
      if ((bowler.controlRating ?? 3) < 3 && isSmallMarginPlan) {
        score -= 25;
        warnings.push('This plan has a small margin for error and bowler control rating is below 3/5.');
      }

      // Junior / Safety guardrails for short ball
      const isShortBallPlan = plan.id === 'controlled_short_ball' || plan.fieldPresetId === 'pace_body_bouncer';
      if (isShortBallPlan && (context.isJunior || !context.localRulesConfirmed)) {
        score -= 30;
        warnings.push('Automatic short-ball recommendation suppressed for safety and unconfirmed local rules.');
      }

      const field = TACTICAL_FIELD_PRESETS.find(item => item.id === plan.fieldPresetId);
      if (!field) {
        score -= 100;
        warnings.push('The linked field preset is missing.');
      } else if (field.maxOutsideCircle > context.maxFieldersOutsideCircle) {
        score -= 50;
        warnings.push(`Field needs up to ${field.maxOutsideCircle} outside the circle; current phase allows ${context.maxFieldersOutsideCircle}.`);
      }

      if (!context.localRulesConfirmed && (plan.safetyNote || context.format !== 'multi_day')) {
        warnings.push('Confirm local playing conditions before using this recommendation.');
      }

      return { plan, score, reasons, warnings };
    })
    .sort((a, b) => b.score - a.score || a.plan.title.localeCompare(b.plan.title));

  // Fallback check: If top plan score is low or lacks capability match, offer stock-ball plan
  const top = ranked[0];
  const hasCapabilitySupport = top && top.plan.usefulCapabilities.some(c => (bowler.capabilities || []).includes(c));

  if (!top || top.score <= 0 || !hasCapabilitySupport) {
    const stockRanked: RankedPlan = {
      plan: STOCK_BALL_PLAN,
      score: 1,
      reasons: ['Recommended stock-ball fallback as no specialized plan has supporting bowler capabilities.'],
      warnings: ['No specialized plan fits bowler capabilities with high confidence.'],
      isFallback: true,
    };
    return [stockRanked, ...ranked];
  }

  return ranked;
}


