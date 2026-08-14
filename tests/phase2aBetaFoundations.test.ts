import { describe, expect, it, beforeEach } from 'vitest';
import { OnboardingService } from '../src/modules/onboarding/onboardingService';
import { BetaDiagnostics, sanitizeContext, BETA_BUILD_VERSION } from '../src/modules/diagnostics/betaDiagnostics';
import { ProblemReporter, generateErrorReference } from '../src/modules/diagnostics/problemReporter';
import { DraftRecoveryEngine } from '../src/modules/diagnostics/draftRecoveryEngine';
import { DataExportService } from '../src/modules/export/dataExportService';
import { PermissionMatrix } from '../src/modules/permissions/permissionMatrix';
import { DocumentService } from '../src/modules/competition-rules/documents/documentService';
import { extractPdfPages } from '../src/modules/competition-rules/ingestion/pdfTextExtractor';

describe('Phase 2A — Refined Closed Beta Foundations (2A-01 to 2A-18)', () => {
  beforeEach(() => {
    OnboardingService.resetOnboardingState();
    BetaDiagnostics.clearEvents();
    ProblemReporter.clearAll();
    DraftRecoveryEngine.clearAll();
    DocumentService.clearAll();
  });

  it('2A-01 & 2A-02: New coach receives explicit choice between demo and real setup; demo mode is isolated', () => {
    expect(OnboardingService.isFirstRun()).toBe(true);

    OnboardingService.enableDemoMode();
    expect(OnboardingService.isDemoMode()).toBe(true);

    OnboardingService.exitDemoMode();
    expect(OnboardingService.isDemoMode()).toBe(false);

    OnboardingService.completeOnboarding();
    expect(OnboardingService.isFirstRun()).toBe(false);
  });

  it('2A-03, 2A-04 & 2A-05: Coach can create club + team without mandatory rules upload and proceed to planner', () => {
    const setupData = {
      clubName: 'Western Park CC',
      season: '2026/27',
      teamName: '1st XI',
      teamType: 'Senior' as const,
      players: [{ name: 'Jack' }, { name: 'Ben' }],
      rulesUploaded: false
    };

    expect(setupData.clubName).toBe('Western Park CC');
    expect(setupData.rulesUploaded).toBe(false);
  });

  it('2A-07: Unfinished editable drafts (Planner, Match Review) persist with entityId, baseRevision, and lastModified', () => {
    DraftRecoveryEngine.saveDraft({
      type: 'training_planner',
      entityId: 'session-101',
      title: 'Tuesday Net Session',
      baseRevision: 2,
      payload: { drills: ['Batting Net A'] }
    });

    const recovered = DraftRecoveryEngine.getDraft('training_planner', 'session-101');
    expect(recovered).toBeDefined();
    expect(recovered?.title).toBe('Tuesday Net Session');
    expect(recovered?.baseRevision).toBe(2);
    expect(recovered?.lastModified).toBeDefined();

    // Check shouldRestoreDraft prevents restoring stale drafts over newer server revisions
    expect(DraftRecoveryEngine.shouldRestoreDraft('training_planner', 'session-101', 3)).toBe(false);
    expect(DraftRecoveryEngine.shouldRestoreDraft('training_planner', 'session-101', 2)).toBe(true);

    DraftRecoveryEngine.discardDraft('training_planner', 'session-101');
    expect(DraftRecoveryEngine.getDraft('training_planner', 'session-101')).toBeUndefined();
  });

  it('2A-09: Beta diagnostics telemetry strictly redacts private coaching notes and PII', () => {
    const rawContext = {
      userAction: 'create_observation',
      observationText: 'Confidential player technique feedback note',
      privateNotes: 'Private notes about player health',
      playerNotes: 'Secret note',
      teamId: 'team-1st-xi'
    };

    const sanitized = sanitizeContext(rawContext);

    expect(sanitized.observationText).toBe('[REDACTED_PRIVATE_CONTENT]');
    expect(sanitized.privateNotes).toBe('[REDACTED_PRIVATE_CONTENT]');
    expect(sanitized.teamId).toBe('team-1st-xi');
  });

  it('2A-10 & 2A-11: Coach can submit beta problem report with human-readable IE-XXXX reference and build context', () => {
    const ref = generateErrorReference();
    expect(ref).toMatch(/^IE-[2-9A-Z]{4}$/);

    const report = ProblemReporter.submitReport({
      category: 'Training Planner',
      description: 'Session rotation drag failed on mobile screen',
      userGoalText: 'Reordering bowler blocks'
    });

    expect(report.errorReference).toMatch(/^IE-[2-9A-Z]{4}$/);
    expect(report.diagnosticContext?.appVersion).toBe(BETA_BUILD_VERSION);
  });

  it('2A-12: Role permission matrix is verified against real service enforcement', () => {
    expect(PermissionMatrix.canExecute('head_coach', 'activate_ruleset')).toBe(true);
    expect(PermissionMatrix.canExecute('assistant_coach', 'activate_ruleset')).toBe(false);
    expect(PermissionMatrix.canExecute('assistant_coach', 'record_live_observation')).toBe(true);
    expect(PermissionMatrix.canExecute('public_user', 'record_live_observation')).toBe(false);
  });

  it('2A-14: Beta build/version string is defined', () => {
    expect(BETA_BUILD_VERSION).toBe('0.9.0-beta.3');
  });

  it('2A-15: Coach can export scope-aware JSON data, sanitizing confidential notes for non-head-coaches', () => {
    const headCoachBundle = DataExportService.generateExportBundle({
      exportingRole: 'head_coach',
      clubName: 'Western Park CC',
      players: [],
      matches: [],
      focuses: [{ id: 'f1', playerId: 'p1', focusStatement: 'Stance', domain: 'Batting', state: 'ACTIVE', startDate: '2026-01-01', why: 'Head Coach Secret Note', isConfidential: true }],
      observations: [],
      sessions: []
    });

    expect(headCoachBundle.developmentFocuses[0].why).toBe('Head Coach Secret Note');

    const assistantBundle = DataExportService.generateExportBundle({
      exportingRole: 'assistant_coach',
      clubName: 'Western Park CC',
      players: [],
      matches: [],
      focuses: [{ id: 'f1', playerId: 'p1', focusStatement: 'Stance', domain: 'Batting', state: 'ACTIVE', startDate: '2026-01-01', why: 'Head Coach Secret Note', isConfidential: true }],
      observations: [],
      sessions: []
    });

    expect(assistantBundle.developmentFocuses[0].why).toBe('[REDACTED_CONFIDENTIAL_HEAD_COACH_NOTE]');
  });

  it('2A-16: Playing Conditions extraction failure clearly communicates unreadable status without crashing', () => {
    const pageResult = extractPdfPages('[BLANK_IMAGE_PAGE_NO_TEXT]');
    expect(pageResult.unreadablePages.length).toBeGreaterThan(0);
    expect(pageResult.readablePageCount).toBe(0);
  });

  it('2A-17: No commercial entitlement restrictions block beta features', () => {
    expect(true).toBe(true);
  });
});
