import type { CompetitionRule, RuleCategory, RuleBehaviour } from '../schemas/competitionRuleTypes';
import type { ExtractedPageText } from '../documents/documentTypes';
import { detectAmbiguities } from './ambiguityDetector';
import { calculateConfidence } from './confidenceScorer';
import { normalizeStructuredValue } from './ruleNormalizer';

export function extractCandidateRulesFromPages(
  documentId: string,
  pages: ExtractedPageText[]
): CompetitionRule[] {
  const candidateRules: CompetitionRule[] = [];

  pages.forEach(page => {
    const lines = page.text.split('\n').map(l => l.trim()).filter(Boolean);
    let currentSection = page.detectedHeadings[0] || '';

    lines.forEach((line, lineIdx) => {
      const lower = line.toLowerCase();

      // Check section headers
      if (/^section \d+/i.test(line) || /^rule \d+/i.test(line)) {
        currentSection = line;
      }

      let detectedCategory: RuleCategory | null = null;
      let detectedBehaviour: RuleBehaviour = 'CONSTRAINT';
      let title = '';
      let interpretation = '';

      // 1. Bowling Max Overs
      if (lower.includes('maximum') && (lower.includes('bowler') || lower.includes('overs per bowler') || lower.includes('overs a bowler'))) {
        detectedCategory = 'bowling';
        detectedBehaviour = 'CONSTRAINT';
        title = 'Maximum Overs Per Bowler';
        interpretation = line;
      }
      // 2. Junior Bowling Restrictions
      else if ((lower.includes('junior') || currentSection.toLowerCase().includes('junior')) && (lower.includes('spell') || lower.includes('limit') || lower.includes('overs'))) {
        detectedCategory = 'bowling';
        detectedBehaviour = 'CONSTRAINT';
        title = 'Junior Pace Bowling Spell Limit';
        interpretation = line;
      }
      // 3. Batting Retirement
      else if (lower.includes('retire') || lower.includes('retirement score') || lower.includes('compulsory retirement')) {
        detectedCategory = 'batting';
        detectedBehaviour = 'CONSTRAINT';
        title = 'Batting Retirement Rule';
        interpretation = line;
      }
      // 4. Powerplay & Fielding Circle
      else if (lower.includes('powerplay') || lower.includes('outside the circle') || lower.includes('30-yard') || lower.includes('30 yard')) {
        detectedCategory = 'fielding';
        detectedBehaviour = lower.includes('maximum') ? 'CONSTRAINT' : 'WARNING';
        title = 'Powerplay & Fielding Circle Restriction';
        interpretation = line;
      }
      // 5. Match Format & Overs
      else if (lower.includes('overs per side') || lower.includes('overs per innings') || lower.includes('match format')) {
        detectedCategory = 'match_structure';
        detectedBehaviour = 'INFORMATION';
        title = 'Match Overs & Format';
        interpretation = line;
      }
      // 6. Innings Interval / Time limits
      else if (lower.includes('interval') || lower.includes('drinks break') || lower.includes('start time')) {
        detectedCategory = 'match_phases';
        detectedBehaviour = 'PROCEDURE';
        title = 'Match Phase & Interval Duration';
        interpretation = line;
      }
      // 7. Pitch Length & Ground
      else if (lower.includes('pitch length') || lower.includes('boundary size') || lower.includes('leather ball')) {
        detectedCategory = 'equipment_ground';
        detectedBehaviour = 'INFORMATION';
        title = 'Pitch & Equipment Specification';
        interpretation = line;
      }
      // 8. Reduced Overs / Rain
      else if (lower.includes('reduced over') || lower.includes('target calculation') || lower.includes('rain')) {
        detectedCategory = 'result_conditions';
        detectedBehaviour = 'CALCULATION';
        title = 'Reduced Overs Target Calculation';
        interpretation = line;
      }
      // 9. Safety / Protective Gear
      else if (lower.includes('helmet') || lower.includes('protective') || lower.includes('fast bowler rest')) {
        detectedCategory = 'safety';
        detectedBehaviour = 'CONSTRAINT';
        title = 'Player Safety & Protective Requirement';
        interpretation = line;
      }
      // 10. Team Sheet / Procedure
      else if (lower.includes('team sheet') || lower.includes('submit team') || lower.includes('toss')) {
        detectedCategory = 'procedure';
        detectedBehaviour = 'PROCEDURE';
        title = 'Match Day Administrative Procedure';
        interpretation = line;
      }

      if (detectedCategory) {
        const sourceExcerpt = lines.slice(Math.max(0, lineIdx - 1), Math.min(lines.length, lineIdx + 2)).join(' ');
        const structuredValue = normalizeStructuredValue(title, line);
        const ambiguityFlags = detectAmbiguities(line, page);
        const extractionConfidence = calculateConfidence(line, ambiguityFlags, page.isReadable);

        const candidateRule: CompetitionRule = {
          id: `rule_cand_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          category: detectedCategory,
          behaviour: detectedBehaviour,
          title,
          rawInterpretation: interpretation,
          structuredValue,
          applicabilityConditions: [],
          sourceDocumentId: documentId,
          sourcePage: page.pageNumber,
          sourceSection: currentSection || `Page ${page.pageNumber}`,
          sourceExcerpt,
          extractionConfidence,
          ambiguityFlags,
          status: ambiguityFlags.length > 0 || extractionConfidence !== 'high' ? 'Needs Review' : 'Extracted'
        };

        candidateRules.push(candidateRule);
      }
    });
  });

  return candidateRules;
}
