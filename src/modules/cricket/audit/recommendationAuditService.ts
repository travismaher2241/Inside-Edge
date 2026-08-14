import type { RecommendationRecord, RecommendationDecisionStatus, RecommendationType } from '../../../types/cricket';

const RECOMMENDATION_STORAGE_KEY = 'inside_edge_recommendations_v1';

let inMemoryRecords: RecommendationRecord[] = [];

function loadRecords(): RecommendationRecord[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const data = localStorage.getItem(RECOMMENDATION_STORAGE_KEY);
      if (data) return JSON.parse(data) as RecommendationRecord[];
    } catch {
      // Fallback
    }
  }
  return inMemoryRecords;
}

function persistRecords(records: RecommendationRecord[]): void {
  inMemoryRecords = [...records];
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(RECOMMENDATION_STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      console.error('Failed to persist recommendation audit records:', err);
    }
  }
}

export const RecommendationAuditService = {
  createRecord(params: {
    type: RecommendationType;
    clubId: string;
    teamId: string;
    playerIds?: string[];
    createdBy?: string;
    inputContext: Record<string, unknown>;
    recommendation: Record<string, unknown>;
    rationale: {
      teamRationale?: string;
      activityRationale?: string;
      playerRationale?: Array<{ playerId: string; reason: string }>;
      ruleTraceability?: Array<{ ruleId: string; citation: string }>;
    };
    sourceIds?: string[];
    ruleIds?: string[];
    relatedSessionId?: string;
    relatedMatchId?: string;
  }): RecommendationRecord {
    const records = loadRecords();
    const newRecord: RecommendationRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: params.type,
      clubId: params.clubId,
      teamId: params.teamId,
      playerIds: params.playerIds || [],
      createdAt: new Date().toISOString(),
      createdBy: params.createdBy || 'coach_head_1',
      inputContext: params.inputContext,
      recommendation: params.recommendation,
      rationale: params.rationale,
      sourceIds: params.sourceIds || [],
      ruleIds: params.ruleIds || [],
      decisionStatus: 'pending',
      originalRecommendation: params.recommendation,
      relatedSessionId: params.relatedSessionId,
      relatedMatchId: params.relatedMatchId
    };

    records.push(newRecord);
    persistRecords(records);
    return newRecord;
  },

  updateDecision(
    recordId: string,
    status: RecommendationDecisionStatus,
    finalCoachDecision?: Record<string, unknown>
  ): RecommendationRecord | undefined {
    const records = loadRecords();
    const index = records.findIndex(r => r.id === recordId);
    if (index === -1) return undefined;

    records[index] = {
      ...records[index],
      decisionStatus: status,
      finalCoachDecision: finalCoachDecision || records[index].recommendation
    };

    persistRecords(records);
    return records[index];
  },

  getRecord(recordId: string): RecommendationRecord | undefined {
    const records = loadRecords();
    return records.find(r => r.id === recordId);
  },

  getHistory(filters?: {
    clubId?: string;
    teamId?: string;
    type?: RecommendationType;
    relatedSessionId?: string;
    relatedMatchId?: string;
  }): RecommendationRecord[] {
    let records = loadRecords();
    if (!filters) return records;

    if (filters.clubId) records = records.filter(r => r.clubId === filters.clubId);
    if (filters.teamId) records = records.filter(r => r.teamId === filters.teamId);
    if (filters.type) records = records.filter(r => r.type === filters.type);
    if (filters.relatedSessionId) records = records.filter(r => r.relatedSessionId === filters.relatedSessionId);
    if (filters.relatedMatchId) records = records.filter(r => r.relatedMatchId === filters.relatedMatchId);

    return records;
  },

  clearAll(): void {
    inMemoryRecords = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(RECOMMENDATION_STORAGE_KEY);
    }
  }
};
