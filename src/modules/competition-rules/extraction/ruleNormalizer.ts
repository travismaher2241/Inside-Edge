import type { RuleStructuredValue } from '../schemas/competitionRuleTypes';

export function normalizeStructuredValue(title: string, textLine: string): RuleStructuredValue | undefined {
  const matchNum = textLine.match(/(\d+)\s*(overs|runs|balls|minutes|fielders|m|meters)/i);
  if (matchNum) {
    const val = parseInt(matchNum[1], 10);
    const unit = matchNum[2].toLowerCase();

    return {
      kind: 'number',
      key: title.toLowerCase().replace(/\s+/g, '_'),
      value: val,
      unit
    };
  }

  const matchRange = textLine.match(/(\d+)\s*to\s*(\d+)\s*(overs|runs|minutes)/i);
  if (matchRange) {
    return {
      kind: 'range',
      key: title.toLowerCase().replace(/\s+/g, '_'),
      min: parseInt(matchRange[1], 10),
      max: parseInt(matchRange[2], 10),
      unit: matchRange[3].toLowerCase()
    };
  }

  if (textLine.toLowerCase().includes('permitted') || textLine.toLowerCase().includes('allowed')) {
    return {
      kind: 'boolean',
      key: title.toLowerCase().replace(/\s+/g, '_'),
      value: true
    };
  }

  return {
    kind: 'text',
    key: title.toLowerCase().replace(/\s+/g, '_'),
    value: textLine.trim()
  };
}
