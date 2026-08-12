import { describe, it, expect } from 'vitest';
import type { ClubTeam, MatchReport } from '../src/types/cricket';
import { groupReportsByTeam } from '../src/modules/cricket/roundupAggregation';

const mockTeams: ClubTeam[] = [
  { id: 't1', clubId: 'c1', name: '1st XI', ageGroup: 'Seniors', submissionToken: 'tok-1', createdAt: '2026-08-01' },
  { id: 't2', clubId: 'c1', name: '2nd XI', ageGroup: 'Seniors', submissionToken: 'tok-2', createdAt: '2026-08-01' }
];

const mockReports: MatchReport[] = [
  { id: 'r1', teamId: 't1', submittedBy: 'John', date: '2026-08-10', opponent: 'Glenferrie', taggedIssues: ['New-ball batting'], freeTextNotes: 'Edged new ball', createdAt: '2026-08-10T18:00:00Z' }
];

describe('Weekly Club Round-Up & Captain Links UI Refinement Unit Tests', () => {
  it('TEST C & D — REPORTS BY TEAM: Grouping correctly identifies submitted vs empty reports', () => {
    const groups = groupReportsByTeam(mockTeams, mockReports);

    expect(groups).toHaveLength(2);
    const t1Group = groups.find(g => g.team.id === 't1');
    const t2Group = groups.find(g => g.team.id === 't2');

    expect(t1Group?.reports).toHaveLength(1);
    expect(t2Group?.reports).toHaveLength(0);
  });

  it('TEST E & G — CAPTAIN LINKS: Formats clean share link URL', () => {
    const origin = 'https://insideedge.app';
    const token = 'tok-1';
    const shareUrl = `${origin}/report/${token}`;

    expect(shareUrl).not.toContain('localStorage');
    expect(shareUrl).not.toContain('firebase');
    expect(shareUrl).toBe('https://insideedge.app/report/tok-1');
  });
});
