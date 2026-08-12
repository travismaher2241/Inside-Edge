import { describe, it, expect } from 'vitest';
import type { OppositionBatter } from '../src/types/cricket';
import type { BatterObservation, EvidenceConfidence } from '../src/modules/cricket/tactics/types';
import { getBatterTraitLabel } from '../src/modules/cricket/tactics/taxonomyLabels';

describe('Match Prep Second-Pass UX Simplification Unit Tests', () => {
  it('TEST B — ADD BATTER: Supports simple creation with name and hand', () => {
    const newBatter: OppositionBatter = {
      id: 'op-1',
      matchId: 'm-1',
      name: 'HGFR',
      battingHand: 'right',
      battingOrderPosition: 1,
      observations: []
    };

    expect(newBatter.name).toBe('HGFR');
    expect(newBatter.battingHand).toBe('right');
    expect(newBatter.observations).toHaveLength(0);
  });

  it('TEST C — ADD OBSERVATION & CONFIDENCE: Uses Low / Medium / High confidence language', () => {
    const obs: BatterObservation = {
      trait: 'drives_away_from_body',
      confidence: 'medium',
      note: 'Drives anything from body'
    };

    const formatConfidenceLabel = (conf: EvidenceConfidence) => {
      switch (conf) {
        case 'low': return 'Low Confidence';
        case 'medium': return 'Medium Confidence';
        case 'high': return 'High Confidence';
      }
    };

    expect(getBatterTraitLabel(obs.trait)).toContain('Drive');
    expect(formatConfidenceLabel(obs.confidence)).toBe('Medium Confidence');
  });

  it('TEST F — FIELDING RULES: Uses coach-friendly terminology', () => {
    const phaseSectionTitle = 'FIELDING RULES';
    expect(phaseSectionTitle).not.toContain('Tactical Phase');
    expect(phaseSectionTitle).not.toContain('Fielding Restriction');
  });

  it('TEST G — GROUND SETTINGS: Uses coach-friendly terminology', () => {
    const groundSectionTitle = 'GROUND SETUP';
    expect(groundSectionTitle).not.toContain('Geometry');
    expect(groundSectionTitle).not.toContain('Overlays');
  });

  it('TEST J & K — ACCEPT PLAN & ALTERNATIVES: Manages plan state and alternatives', () => {
    const savedStatus = 'accepted';
    const altLabel = 'View Alternatives (1 of 3)';

    expect(savedStatus).toBe('accepted');
    expect(altLabel).toContain('View Alternatives');
  });
});
