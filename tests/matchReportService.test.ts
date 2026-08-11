import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/lib/firebase', () => ({ db: {}, isFirebaseConfigured: false }));
import { getMatchReports, getTeamByToken, submitMatchReport } from '../src/modules/cricket/matchReportService';

describe('captain report local fallback', () => {
  it('resolves a fallback team and stores its report', async () => {
    const team = await getTeamByToken('1st-xi-secret-token-789');
    expect(team?.name).toBe('1st XI');

    const report = await submitMatchReport({
      teamId: team!.id,
      teamName: team!.name,
      submissionToken: team!.submissionToken,
      matchDate: '2026-08-11',
      submittedBy: 'Test Captain',
      freeTextNotes: 'Local acceptance report',
      taggedIssues: ['Strike Rotation']
    });

    expect(report.id).toMatch(/^rep-/);
    expect((await getMatchReports()).some(item => item.id === report.id)).toBe(true);
  });
});
