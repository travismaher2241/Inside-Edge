import { describe, it, expect } from 'vitest';
import {
  filterReportsByDateRange,
  aggregateTagFrequencies,
  groupReportsByTeam,
  getTopRecurringIssues,
  getLatestReport
} from '../src/modules/cricket/roundupAggregation';
import type { MatchReport, ClubTeam } from '../src/types/cricket';

describe('Round-Up Aggregation Logic', () => {
  const refDate = new Date('2026-08-10T12:00:00Z');

  const mockTeams: ClubTeam[] = [
    { id: 'team-1', name: '1st XI', ageGroup: 'Seniors', submissionToken: 'tok-1', createdAt: '2026-08-01' },
    { id: 'team-2', name: '2nd XI', ageGroup: 'Seniors', submissionToken: 'tok-2', createdAt: '2026-08-01' },
    { id: 'team-3', name: 'U17 Boys', ageGroup: 'Under 17', submissionToken: 'tok-3', createdAt: '2026-08-01' }
  ];

  const mockReports: MatchReport[] = [
    {
      id: 'rep-1',
      teamId: 'team-1',
      submissionToken: 'tok-1',
      matchDate: '2026-08-09T14:00:00Z', // 1 day before refDate
      opponent: 'St George',
      submittedBy: 'David W',
      freeTextNotes: 'Dropped 3 catches in slips. Bowled too short.',
      taggedIssues: ['Close Catching (Slip / Short Leg)', 'New-Ball Line & Length', 'High Catching under Pressure'],
      createdAt: '2026-08-09T18:00:00Z'
    },
    {
      id: 'rep-2',
      teamId: 'team-2',
      submissionToken: 'tok-2',
      matchDate: '2026-08-08T14:00:00Z', // 2 days before refDate
      opponent: 'Bankstown',
      submittedBy: 'Steve S',
      freeTextNotes: 'Inconsistent line and length. Missed 2 run outs.',
      taggedIssues: ['New-Ball Line & Length', 'Ground Fielding & Clean Pickups', 'Close Catching (Slip / Short Leg)'],
      createdAt: '2026-08-08T18:00:00Z'
    },
    {
      id: 'rep-3',
      teamId: 'team-1',
      submissionToken: 'tok-1',
      matchDate: '2026-07-20T14:00:00Z', // 21 days before refDate (old)
      opponent: 'Manly',
      submittedBy: 'David W',
      freeTextNotes: 'Poor running between wickets.',
      taggedIssues: ['Running Between Wickets', 'Strike Rotation'],
      createdAt: '2026-07-20T18:00:00Z'
    }
  ];

  it('filters reports correctly by date range', () => {
    const recent7Days = filterReportsByDateRange(mockReports, 7, refDate);
    expect(recent7Days.length).toBe(2);
    expect(recent7Days.map(r => r.id)).toEqual(['rep-1', 'rep-2']);

    const recent30Days = filterReportsByDateRange(mockReports, 30, refDate);
    expect(recent30Days.length).toBe(3);
  });

  it('aggregates tag frequencies across multiple match reports correctly', () => {
    const recent = filterReportsByDateRange(mockReports, 7, refDate);
    const frequencies = aggregateTagFrequencies(recent);

    expect(frequencies[0].tag).toBe('Close Catching (Slip / Short Leg)');
    expect(frequencies[0].count).toBe(2);

    expect(frequencies[1].tag).toBe('New-Ball Line & Length');
    expect(frequencies[1].count).toBe(2);

    const topIssues = getTopRecurringIssues(frequencies, 3);
    expect(topIssues.length).toBe(3);
    expect(topIssues).toContain('Close Catching (Slip / Short Leg)');
    expect(topIssues).toContain('New-Ball Line & Length');
  });

  it('groups reports by team, correctly handling teams with zero submissions in range', () => {
    const recent = filterReportsByDateRange(mockReports, 7, refDate);
    const grouped = groupReportsByTeam(mockTeams, recent);

    expect(grouped.length).toBe(3);

    const team1Group = grouped.find(g => g.team.id === 'team-1');
    expect(team1Group?.reports.length).toBe(1);

    const team2Group = grouped.find(g => g.team.id === 'team-2');
    expect(team2Group?.reports.length).toBe(1);

    // team-3 submitted zero reports
    const team3Group = grouped.find(g => g.team.id === 'team-3');
    expect(team3Group?.reports.length).toBe(0);
  });

  it('finds the latest report using submission time', () => {
    expect(getLatestReport(mockReports)?.id).toBe('rep-1');
    expect(getLatestReport([])).toBeUndefined();
  });
});
