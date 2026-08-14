import type { RuleSetAssignment } from '../schemas/competitionRuleTypes';

const ASSIGNMENT_STORAGE_KEY = 'inside_edge_ruleset_assignments_v1';

let inMemoryAssignments: RuleSetAssignment[] = [];

function loadAssignments(): RuleSetAssignment[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const data = localStorage.getItem(ASSIGNMENT_STORAGE_KEY);
      if (data) return JSON.parse(data) as RuleSetAssignment[];
    } catch {
      // Fallback
    }
  }
  return inMemoryAssignments;
}

function saveAssignments(assignments: RuleSetAssignment[]): void {
  inMemoryAssignments = [...assignments];
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(ASSIGNMENT_STORAGE_KEY, JSON.stringify(assignments));
    } catch (err) {
      console.error('Failed to save ruleset assignments:', err);
    }
  }
}

export const RuleSetAssignmentService = {
  assignRuleSet(params: {
    ruleSetId: string;
    ruleSetVersion: number;
    clubId: string;
    teamId?: string;
    gradeName?: string;
    competitionName: string;
    season: string;
    assignedBy: string;
  }): RuleSetAssignment {
    const list = loadAssignments();
    const newAssignment: RuleSetAssignment = {
      id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ruleSetId: params.ruleSetId,
      ruleSetVersion: params.ruleSetVersion,
      clubId: params.clubId,
      teamId: params.teamId,
      gradeName: params.gradeName,
      competitionName: params.competitionName,
      season: params.season,
      assignedAt: new Date().toISOString(),
      assignedBy: params.assignedBy
    };

    list.push(newAssignment);
    saveAssignments(list);
    return newAssignment;
  },

  getAssignmentsForTeam(teamId: string, season?: string): RuleSetAssignment[] {
    let list = loadAssignments().filter(a => a.teamId === teamId);
    if (season) list = list.filter(a => a.season === season);
    return list;
  },

  getAssignmentsForClub(clubId: string, season?: string): RuleSetAssignment[] {
    let list = loadAssignments().filter(a => a.clubId === clubId);
    if (season) list = list.filter(a => a.season === season);
    return list;
  },

  clearAll(): void {
    inMemoryAssignments = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ASSIGNMENT_STORAGE_KEY);
    }
  }
};
