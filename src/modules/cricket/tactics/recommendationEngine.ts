import type {
  BatterObservation,
  BowlingPlan,
  TacticalBowlerProfile,
  TacticalContext,
} from './types';
import { BOWLING_PLAN_LIBRARY } from './planLibrary';
import { TACTICAL_FIELD_PRESETS } from './fieldPresets';

const confidenceWeight = { low: 1, medium: 2, high: 3 } as const;

export interface RankedPlan {
  plan: BowlingPlan;
  score: number;
  reasons: string[];
  warnings: string[];
}

export function rankBowlingPlans(
  bowler: TacticalBowlerProfile,
  observations: BatterObservation[],
  context: TacticalContext,
): RankedPlan[] {
  return BOWLING_PLAN_LIBRARY
    .filter(plan => plan.formats.includes(context.format) && plan.phases.includes(context.phase))
    .map(plan => {
      let score = 0;
      const reasons: string[] = [];
      const warnings: string[] = [];

      const capabilityMatches = plan.usefulCapabilities.filter(capability => bowler.capabilities.includes(capability));
      score += capabilityMatches.length * 5;
      if (capabilityMatches.length) reasons.push(`Bowler can execute: ${capabilityMatches.join(', ')}`);
      if (!capabilityMatches.length) warnings.push('No stated bowler capability directly supports this plan.');

      const matchingObservations = observations.filter(observation => plan.batterTraits.includes(observation.trait));
      const observationScore = matchingObservations.reduce((total, observation) => total + confidenceWeight[observation.confidence], 0);
      score += observationScore * 2;
      if (matchingObservations.length) reasons.push(`Matches observed batter traits: ${matchingObservations.map(item => item.trait).join(', ')}`);

      if (plan.suitableStyles?.includes(bowler.style)) score += 2;
      if ((bowler.controlRating ?? 3) < 3 && ['death_wide_yorker', 'death_straight_yorker', 'pace_body_bouncer'].includes(plan.fieldPresetId)) {
        score -= 8;
        warnings.push('This plan has a small margin for error and the bowler control rating is below 3/5.');
      }

      const field = TACTICAL_FIELD_PRESETS.find(item => item.id === plan.fieldPresetId);
      if (!field) {
        score -= 100;
        warnings.push('The linked field preset is missing.');
      } else if (field.maxOutsideCircle > context.maxFieldersOutsideCircle) {
        score -= 20;
        warnings.push(`Field needs up to ${field.maxOutsideCircle} outside the circle; current phase allows ${context.maxFieldersOutsideCircle}.`);
      }

      if (!context.localRulesConfirmed && (plan.safetyNote || context.format !== 'multi_day')) {
        warnings.push('Confirm local playing conditions before using this recommendation.');
      }

      return { plan, score, reasons, warnings };
    })
    .sort((a, b) => b.score - a.score || a.plan.title.localeCompare(b.plan.title));
}

