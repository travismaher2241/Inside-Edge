import type { MatchReport, ClubTeam } from '../../types/cricket';

export interface TagFrequency {
  tag: string;
  count: number;
}

export interface TeamReportGroup {
  team: ClubTeam;
  reports: MatchReport[];
}

/**
 * Filter match reports within the specified number of days up to referenceDate.
 */
export function filterReportsByDateRange(
  reports: MatchReport[],
  daysLimit: number = 7,
  referenceDate: Date = new Date()
): MatchReport[] {
  const cutoffTime = referenceDate.getTime() - daysLimit * 24 * 60 * 60 * 1000;
  
  return reports.filter(r => {
    const reportDateStr = r.matchDate || r.createdAt;
    if (!reportDateStr) return false;
    const reportTime = new Date(reportDateStr).getTime();
    return !isNaN(reportTime) && reportTime >= cutoffTime;
  });
}

/**
 * Counts frequencies of tagged issues across a set of reports.
 */
export function aggregateTagFrequencies(reports: MatchReport[]): TagFrequency[] {
  const counts: Record<string, number> = {};

  for (const report of reports) {
    if (Array.isArray(report.taggedIssues)) {
      for (const tag of report.taggedIssues) {
        if (tag && tag.trim().length > 0) {
          const cleanTag = tag.trim();
          counts[cleanTag] = (counts[cleanTag] || 0) + 1;
        }
      }
    }
  }

  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Groups reports by team. Includes all registered teams even if they submitted zero reports in range.
 */
export function groupReportsByTeam(teams: ClubTeam[], reports: MatchReport[]): TeamReportGroup[] {
  return teams.map(team => {
    const teamReports = reports.filter(r => r.teamId === team.id);
    return {
      team,
      reports: teamReports
    };
  });
}

/**
 * Extracts top N recurring tag strings.
 */
export function getTopRecurringIssues(tagFrequencies: TagFrequency[], topN: number = 5): string[] {
  return tagFrequencies.slice(0, topN).map(tf => tf.tag);
}
