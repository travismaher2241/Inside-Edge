import type { CompetitionRuleSet } from '../schemas/competitionRuleTypes';

const RULESET_STORAGE_KEY = 'inside_edge_competition_rulesets_v1';

let inMemoryRuleSets: CompetitionRuleSet[] = [];

function loadRuleSets(): CompetitionRuleSet[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const data = localStorage.getItem(RULESET_STORAGE_KEY);
      if (data) return JSON.parse(data) as CompetitionRuleSet[];
    } catch {
      // Fallback
    }
  }
  return inMemoryRuleSets;
}

function saveRuleSets(sets: CompetitionRuleSet[]): void {
  inMemoryRuleSets = [...sets];
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(RULESET_STORAGE_KEY, JSON.stringify(sets));
    } catch (err) {
      console.error('Failed to save competition rulesets:', err);
    }
  }
}

export const CompetitionRuleRepository = {
  saveRuleSet(ruleSet: CompetitionRuleSet): void {
    const list = loadRuleSets();
    const index = list.findIndex(s => s.id === ruleSet.id);
    if (index >= 0) {
      list[index] = ruleSet;
    } else {
      list.push(ruleSet);
    }
    saveRuleSets(list);
  },

  getRuleSet(id: string): CompetitionRuleSet | undefined {
    return loadRuleSets().find(s => s.id === id);
  },

  getAllRuleSets(): CompetitionRuleSet[] {
    return loadRuleSets();
  },

  getActiveRuleSetForCompetition(competitionName: string, season: string, gradeName?: string): CompetitionRuleSet | undefined {
    return loadRuleSets().find(s =>
      s.status === 'active' &&
      s.competitionName.toLowerCase() === competitionName.toLowerCase() &&
      s.season === season &&
      (!gradeName || s.gradeName?.toLowerCase() === gradeName.toLowerCase())
    );
  },

  clearAll(): void {
    inMemoryRuleSets = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(RULESET_STORAGE_KEY);
    }
  }
};
