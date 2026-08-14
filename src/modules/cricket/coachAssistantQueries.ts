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

import { RulesService } from '../competition-rules/application/rulesService';

/**
 * Answers a competition rule question grounded strictly in approved, active competition rules.
 * Sourced directly from uploaded playing conditions with document/page citations (D-10, D-11).
 */
export function answerCompetitionRuleQuery(
  context: { clubId: string; teamId?: string; seasonId: string; competitionId?: string },
  questionText: string
): { answer: string; isRuleSourced: boolean; citation?: string } {
  return RulesService.answerRuleQuestion(context, questionText);
}

// ---------------------------------------------------------------------------
// Open Q&A intent classifier
// ---------------------------------------------------------------------------
// Routes a coach's free-typed question to one of the grounded answer functions
// above. Still fully deterministic — this is keyword/name matching, not an
// LLM — so it can only ever point at real data or say it doesn't know.

export type CoachAssistantIntent =
  | { type: 'no_recent_batting' }
  | { type: 'player_focus'; playerId: string; playerName: string }
  | { type: 'player_focus_unresolved' }
  | { type: 'workload_restrictions' }
  | { type: 'focus_reviews_due' }
  | { type: 'weekly_priorities' }
  | { type: 'no_recent_observations' }
  | { type: 'competition_rule'; questionText: string }
  | { type: 'unrecognised' };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Finds the player whose first or last name appears as a whole word in the question, longest name first. */
function findMentionedPlayer(questionText: string, players: Player[]): Player | undefined {
  const lowerQ = questionText.toLowerCase();
  return [...players]
    .sort((a, b) => b.name.length - a.name.length)
    .find(p =>
      p.name
        .toLowerCase()
        .split(' ')
        .some(part => part.length >= 3 && new RegExp(`\\b${escapeRegExp(part)}\\b`, 'i').test(lowerQ))
    );
}

/**
 * Classifies a free-typed coach question into a grounded intent. Never invents
 * an answer — anything it can't confidently match falls through to
 * 'unrecognised' so the UI can say so plainly instead of guessing.
 */
export function classifyCoachAssistantQuestion(questionText: string, players: Player[]): CoachAssistantIntent {
  const q = questionText.toLowerCase().trim();
  if (!q) return { type: 'unrecognised' };

  if (q.includes('focus') || q.includes('working on') || q.includes('development')) {
    const mentioned = findMentionedPlayer(questionText, players);
    if (mentioned) return { type: 'player_focus', playerId: mentioned.id, playerName: mentioned.name };
    if (!q.includes('due') && !q.includes('review')) return { type: 'player_focus_unresolved' };
  }

  if (q.includes('review') && (q.includes('focus') || q.includes('due'))) {
    return { type: 'focus_reviews_due' };
  }

  if (q.includes('workload') || q.includes('restrict') || (q.includes('bowl') && (q.includes('limit') || q.includes('max')))) {
    return { type: 'workload_restrictions' };
  }

  if (q.includes('priorit')) {
    return { type: 'weekly_priorities' };
  }

  if (q.includes('observ')) {
    return { type: 'no_recent_observations' };
  }

  if ((q.includes('bat') || q.includes('batting')) && (q.includes("hasn't") || q.includes('has not') || q.includes("haven't") || q.includes('who ') || q.includes('not batted'))) {
    return { type: 'no_recent_batting' };
  }

  if (
    q.includes('rule') || q.includes('law') || q.includes('allowed') || q.includes('legal') ||
    q.includes('powerplay') || q.includes('circle') || q.includes('permitted') ||
    (q.includes('overs') && q.includes('can')) || q.includes('playing condition')
  ) {
    return { type: 'competition_rule', questionText };
  }

  return { type: 'unrecognised' };
}

