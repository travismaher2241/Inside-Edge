import { BETA_BUILD_VERSION, BETA_BUILD_TIMESTAMP, BetaDiagnostics } from './betaDiagnostics';

export interface ProblemReport {
  errorReference: string; // e.g. IE-8F2K
  createdAt: string;
  category: 'Training Planner' | 'Live Training' | 'Match' | 'Players' | 'Playing Conditions' | 'Video' | 'Account' | 'Other';
  description: string;
  userGoalText?: string;
  includeDiagnostics: boolean;
  diagnosticContext?: {
    appVersion: string;
    buildTimestamp: string;
    isOnline: boolean;
    recentActionCount: number;
  };
}

const PROBLEM_REPORT_STORAGE_KEY = 'inside_edge_problem_reports_v1';
let inMemoryReports: ProblemReport[] = [];

function loadReports(): ProblemReport[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const data = localStorage.getItem(PROBLEM_REPORT_STORAGE_KEY);
      if (data) return JSON.parse(data) as ProblemReport[];
    } catch {
      // Fallback
    }
  }
  return inMemoryReports;
}

function saveReports(reports: ProblemReport[]): void {
  inMemoryReports = [...reports];
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(PROBLEM_REPORT_STORAGE_KEY, JSON.stringify(reports));
    } catch (err) {
      console.error('Failed to save problem report:', err);
    }
  }
}

/**
 * Generates a human-readable error reference code (e.g. IE-8F2K).
 */
export function generateErrorReference(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let ref = 'IE-';
  for (let i = 0; i < 4; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

export const ProblemReporter = {
  submitReport(params: {
    category: ProblemReport['category'];
    description: string;
    userGoalText?: string;
    includeDiagnostics?: boolean;
  }): ProblemReport {
    const errorReference = generateErrorReference();
    const reports = loadReports();

    const report: ProblemReport = {
      errorReference,
      createdAt: new Date().toISOString(),
      category: params.category,
      description: params.description,
      userGoalText: params.userGoalText,
      includeDiagnostics: params.includeDiagnostics ?? true,
      diagnosticContext: params.includeDiagnostics !== false ? {
        appVersion: BETA_BUILD_VERSION,
        buildTimestamp: BETA_BUILD_TIMESTAMP,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        recentActionCount: BetaDiagnostics.getRecentEvents().length
      } : undefined
    };

    reports.push(report);
    saveReports(reports);

    BetaDiagnostics.logEvent(`problem_report_submitted_${errorReference}`, 'ProblemReporter', {
      errorCategory: params.category
    });

    return report;
  },

  getAllReports(): ProblemReport[] {
    return loadReports();
  },

  clearAll(): void {
    inMemoryReports = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PROBLEM_REPORT_STORAGE_KEY);
    }
  }
};
