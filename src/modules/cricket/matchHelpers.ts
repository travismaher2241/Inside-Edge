// Match Helper Utilities for Inside Edge

import type { MatchRecord, MatchObservation } from '../../types/cricket';

/**
 * Today's date as YYYY-MM-DD in the local timezone. Unlike
 * `new Date().toISOString().split('T')[0]` (which reads the UTC calendar
 * date), this matches what the user actually sees on their clock — needed
 * so date pickers don't default to the wrong day for AU-based users near
 * local midnight (UTC+10/+11 puts them a day ahead of UTC for hours daily).
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the most relevant active match from a list of MatchRecords.
 * Prioritizes the nearest upcoming fixture (date >= today).
 * If no upcoming fixture exists, falls back to the most recent match by date.
 */
export function getActiveMatch(matches: MatchRecord[], todayISO?: string): MatchRecord | null {
  if (!matches || matches.length === 0) return null;

  const today = todayISO || new Date().toISOString().split('T')[0];

  // Find upcoming fixtures (date >= today), sorted by date ascending (nearest first)
  const upcoming = matches
    .filter(m => m.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (upcoming.length > 0) {
    return upcoming[0];
  }

  // Fallback: sort all matches by date descending (most recent first)
  const sortedPast = [...matches].sort((a, b) => b.date.localeCompare(a.date));
  return sortedPast[0];
}

/**
 * Extracts derived training priorities from a list of match observations.
 * Collects any non-empty `suggestedPriority` tags or generates priority statements from observation text.
 */
export function deriveTrainingPriorities(observations: MatchObservation[]): string[] {
  if (!observations || observations.length === 0) return [];

  const priorities: string[] = [];

  observations.forEach(obs => {
    if (obs.suggestedPriority && obs.suggestedPriority.trim()) {
      const p = obs.suggestedPriority.trim();
      if (!priorities.includes(p)) {
        priorities.push(p);
      }
    } else if (obs.observationText && obs.observationText.trim()) {
      // Derive a short summary statement from area + note text
      const summary = `${obs.area}: ${obs.observationText.slice(0, 45)}${obs.observationText.length > 45 ? '...' : ''}`;
      if (!priorities.includes(summary)) {
        priorities.push(summary);
      }
    }
  });

  return priorities;
}
