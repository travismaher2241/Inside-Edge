// Template-based Coach Assistant query layer for Inside Edge.
// Every function here is a pure, deterministic read over already-loaded app
// data — no LLM call, no network request. Each answers one grounded coaching
// question a coach can tap instead of typing.

import type {
  Player,
  ClubTrainingSession,
  DevelopmentFocus,
  MatchReport,
  Observation
} from '../../types/cricket';
import { filterReportsByDateRange, aggregateTagFrequencies, getTopRecurringIssues } from './roundupAggregation';

export interface PlayerBattingGap {
  playerId: string;
  playerName: string;
}

/**
 * Players who were not assigned a batting turn in any session within the lookback window.
 * Reads directly from each session's rotation plan (the same data the Live Session screen uses).
 */
export function findPlayersWithoutRecentBatting(
  players: Player[],
  sessions: ClubTrainingSession[],
  days: number = 7,
  referenceDate: Date = new Date()
): PlayerBattingGap[] {
  const cutoffTime = referenceDate.getTime() - days * 24 * 60 * 60 * 1000;

  const recentSessions = sessions.filter(s => {
    const t = new Date(s.date).getTime();
    return !Number.isNaN(t) && t >= cutoffTime && t <= referenceDate.getTime();
  });

  const battedPlayerIds = new Set<string>();
  recentSessions.forEach(session => {
    session.rotationPlan.forEach(block => {
      block.resourceAssignments.forEach(assignment => {
        assignment.batterPlayerIds.forEach(id => battedPlayerIds.add(id));
      });
    });
  });

  return players
    .filter(p => !battedPlayerIds.has(p.id))
    .map(p => ({ playerId: p.id, playerName: p.name }));
}

export interface PlayerFocusSummary {
  focusStatement: string;
  domain: DevelopmentFocus['domain'];
  state: DevelopmentFocus['state'];
  why: string;
}

/**
 * Every non-archived development focus for a named player, most recently started first.
 */
export function getPlayerCurrentFocuses(
  playerId: string,
  focuses: DevelopmentFocus[]
): PlayerFocusSummary[] {
  return focuses
    .filter(f => f.playerId === playerId && f.state !== 'ARCHIVED')
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .map(f => ({ focusStatement: f.focusStatement, domain: f.domain, state: f.state, why: f.why }));
}

export interface WorkloadFlag {
  playerId: string;
  playerName: string;
  notes?: string;
  maxDeliveries?: number;
}

/** Players currently flagged with a bowling workload restriction. */
export function findPlayersWithWorkloadRestrictions(players: Player[]): WorkloadFlag[] {
  return players
    .filter(p => p.workloadRestriction?.restrictedBowler)
    .map(p => ({
      playerId: p.id,
      playerName: p.name,
      notes: p.workloadRestriction?.notes,
      maxDeliveries: p.workloadRestriction?.maxDeliveries
    }));
}

export interface FocusReviewDue {
  playerId: string;
  playerName: string;
  focusStatement: string;
  reviewDate: string;
}

/** Development focuses whose review date has arrived or passed. */
export function findFocusesDueForReview(
  players: Player[],
  focuses: DevelopmentFocus[],
  referenceDate: Date = new Date()
): FocusReviewDue[] {
  return focuses
    .filter(f => f.state !== 'ARCHIVED' && f.reviewDate && new Date(f.reviewDate).getTime() <= referenceDate.getTime())
    .map(f => {
      const player = players.find(p => p.id === f.playerId);
      return {
        playerId: f.playerId,
        playerName: player?.name ?? 'Unknown player',
        focusStatement: f.focusStatement,
        reviewDate: f.reviewDate as string
      };
    })
    .sort((a, b) => new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime());
}

/**
 * Top recurring match-review issues across the club in the last `days` days —
 * reuses the same aggregation the Weekly Club Round-Up screen is built on.
 */
export function getWeeklyTrainingPriorities(
  reports: MatchReport[],
  days: number = 7,
  topN: number = 3,
  referenceDate: Date = new Date()
): string[] {
  const recentReports = filterReportsByDateRange(reports, days, referenceDate);
  const tagFrequencies = aggregateTagFrequencies(recentReports);
  return getTopRecurringIssues(tagFrequencies, topN);
}

export interface ObservationGap {
  playerId: string;
  playerName: string;
}

/** Players with zero recorded observations of any kind within the lookback window. */
export function findPlayersWithoutRecentObservations(
  players: Player[],
  observations: Observation[],
  days: number = 14,
  referenceDate: Date = new Date()
): ObservationGap[] {
  const cutoffTime = referenceDate.getTime() - days * 24 * 60 * 60 * 1000;
  const observedPlayerIds = new Set(
    observations
      .filter(o => {
        const t = new Date(o.createdAt).getTime();
        return !Number.isNaN(t) && t >= cutoffTime && t <= referenceDate.getTime();
      })
      .map(o => o.playerId)
  );

  return players
    .filter(p => !observedPlayerIds.has(p.id))
    .map(p => ({ playerId: p.id, playerName: p.name }));
}
