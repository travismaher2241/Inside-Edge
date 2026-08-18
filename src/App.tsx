import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import './styles/designTokens.css';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  subscribeToCoachProfile,
  logoutCoach,
  type CoachProfileLoadError
} from './modules/cricket/authService';
import { seedDefaultFirestoreIfEmpty } from './modules/cricket/cloudStorageEngine';
import type { Team, Player, Activity, MatchRecord, DevelopmentFocus, Observation, FocusLifecycleState, CoachUser, ClubTeam, TrainingResource, ClubTrainingSession, RollingFairnessLedger, SavedClubTemplate, SavedFieldSetting, ActiveScope } from './types/cricket';
import { getActiveMatch } from './modules/cricket/matchHelpers';
import { getPlayersForScope, getSessionsForScope, getMatchesForScope, getRecordsForPlayers } from './modules/cricket/scopeHelpers';
import { AppShell } from './components/layout/AppShell';
import type { TabType } from './components/layout/AppShell';
import { HomeView } from './views/HomeView';
import { TrainView } from './views/TrainView';
import { TeamView } from './views/TeamView';
import { MatchView } from './views/MatchView';
import { LibraryView } from './views/LibraryView';
import { LoginView } from './views/LoginView';
import { AcceptInviteView } from './views/AcceptInviteView';
import { CoachManagerModal } from './components/cricket/CoachManagerModal';
import { QuickObservationModal } from './components/cricket/planner/QuickObservationModal';
import { FieldBoardModal } from './components/cricket/FieldBoardModal';
import { CoachAssistantPanel } from './components/cricket/CoachAssistantPanel';
import { LiveClubSession } from './components/cricket/planner/LiveClubSession';
import { activityToClubBlock, selectCurrentClubSession } from './modules/cricket/sessionModel';
import { completeSessionWithFairness } from './modules/cricket/clubRotationEngine';
import { SyncOutboxEngine } from './modules/cricket/syncOutboxEngine';
import { ClubSetupWizard } from './components/onboarding/ClubSetupWizard';
import { ReportProblemModal } from './components/diagnostics/ReportProblemModal';
import { DataExportService } from './modules/export/dataExportService';
import { PermissionMatrix } from './modules/permissions/permissionMatrix';
import { useToast } from './components/common/Toast';
import { createCricketRepository } from './storage/CricketRepository';
import { RepositoryProvider } from './storage/RepositoryContext';
import { SEED_TEAM, SEED_PLAYERS, SEED_ACTIVITIES, SEED_MATCH_RECORD, SEED_DEVELOPMENT_FOCUSES, SEED_OBSERVATIONS, SEED_CLUB_TEAMS, SEED_TRAINING_RESOURCES, SEED_FAIRNESS_LEDGER, SEED_SAVED_TEMPLATES } from './modules/cricket/seedData';
const RulesManagementView = lazy(() => import('./components/cricket/rules/RulesManagementView').then(m => ({ default: m.RulesManagementView })));
const PublicCaptainReportView = lazy(() => import('./views/PublicCaptainReportView').then(m => ({ default: m.PublicCaptainReportView })));
const PublicRsvpView = lazy(() => import('./views/PublicRsvpView').then(m => ({ default: m.PublicRsvpView })));
const PublicProgressView = lazy(() => import('./views/PublicProgressView').then(m => ({ default: m.PublicProgressView })));

// Competition-rules ingestion — PDF/OCR extraction, confidence scoring,
// versioning and approvals — is parked. It has no route into match planning
// yet (fixtures still read the seeded CompetitionRulesProfile), so it ships
// disabled and its chunk is only fetched when the flag is on.
// Enable with VITE_FEATURE_RULES_INGESTION=true.
const isRulesIngestionEnabled = import.meta.env.VITE_FEATURE_RULES_INGESTION === 'true';

const TEST_ACCESS_COACH: CoachUser = {
  uid: 'test-access',
  email: 'tester@insideedge.local',
  displayName: 'Tester (Test Access)',
  role: 'head_coach',
  createdAt: new Date().toISOString()
};

export function App() {
  const { showToast } = useToast();
  // Auth & Coach State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [coachProfile, setCoachProfile] = useState<CoachUser | null>(null);
  const [coachProfileError, setCoachProfileError] = useState<CoachProfileLoadError | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isCoachManagerOpen, setIsCoachManagerOpen] = useState<boolean>(false);
  const [isCoachAssistantOpen, setIsCoachAssistantOpen] = useState<boolean>(false);
  const [isRulesManagementOpen, setIsRulesManagementOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isReportProblemOpen, setIsReportProblemOpen] = useState<boolean>(false);
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const effectiveCoachProfile = isTestMode ? TEST_ACCESS_COACH : coachProfile;

  // One data-access implementation, chosen once. Views read it from context.
  const repository = useMemo(() => createCricketRepository(isTestMode), [isTestMode]);

  // App Tab & View State
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [isFieldBoardOpen, setIsFieldBoardOpen] = useState<boolean>(false);

  // Active Scope State (Team vs Club Context)
  const [activeScope, setActiveScope] = useState<ActiveScope>({ mode: 'team', teamId: 'ct-1' });

  // Firestore Real-Time Squad Data State
  const [team, setTeam] = useState<Team>(SEED_TEAM);
  const [players, setPlayers] = useState<Player[]>(SEED_PLAYERS);
  const [activities, setActivities] = useState<Activity[]>(SEED_ACTIVITIES);
  const [matches, setMatches] = useState<MatchRecord[]>([SEED_MATCH_RECORD]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | undefined>(undefined);
  const [focuses, setFocuses] = useState<DevelopmentFocus[]>(SEED_DEVELOPMENT_FOCUSES);
  const [observations, setObservations] = useState<Observation[]>(SEED_OBSERVATIONS);
  const [clubTeams, setClubTeams] = useState<ClubTeam[]>(SEED_CLUB_TEAMS);
  const [trainingResources, setTrainingResources] = useState<TrainingResource[]>(SEED_TRAINING_RESOURCES);
  const [clubSessions, setClubSessions] = useState<ClubTrainingSession[]>([]);
  const [currentClubSessionId, setCurrentClubSessionId] = useState<string | undefined>();
  const [fairnessLedger, setFairnessLedger] = useState<RollingFairnessLedger[]>(SEED_FAIRNESS_LEDGER);
  const [savedClubTemplates, setSavedClubTemplates] = useState<SavedClubTemplate[]>(SEED_SAVED_TEMPLATES);
  const [savedFieldSettings, setSavedFieldSettings] = useState<SavedFieldSetting[]>([]);

  // Quick Observation Drawer State
  const [observedPlayer, setObservedPlayer] = useState<Player | null>(null);

  // Auto-Sync Listener (Guarded against test mode)
  useEffect(() => {
    SyncOutboxEngine.setTestMode(isTestMode);
    if (isTestMode || !authUser) return;

    const cleanup = SyncOutboxEngine.initAutoSyncListener();
    return () => cleanup();
  }, [isTestMode, authUser]);

  // 1. Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      setAuthUser(user);
      if (!user) {
        setCoachProfile(null);
        setCoachProfileError(null);
        setIsAuthLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. Subscribe to Coach Profile document when authUser is present
  useEffect(() => {
    if (!authUser) return;
    setIsAuthLoading(true);

    const unsubProfile = subscribeToCoachProfile(authUser.uid, (profile, error) => {
      setCoachProfile(profile);
      setCoachProfileError(error ?? null);
      setIsAuthLoading(false);
    });

    // Seed default records if Firestore is completely empty upon first sign-in
    seedDefaultFirestoreIfEmpty();

    return () => unsubProfile();
  }, [authUser]);

  // 3. Subscribe to cloud data when signed in. In Test Access the repository's
  //    subscribeAll is a no-op, so no mode check is needed here.
  useEffect(() => {
    if (!authUser || !coachProfile) return;

    return repository.subscribeAll(coachProfile.role, {
      onTeam: setTeam,
      onPlayers: setPlayers,
      onActivities: setActivities,
      onMatches: setMatches,
      onDevelopmentFocuses: setFocuses,
      onObservations: setObservations,
      onClubTeams: setClubTeams,
      onTrainingResources: setTrainingResources,
      onClubSessions: sessions => {
        setClubSessions(sessions);
        setCurrentClubSessionId(current => current && sessions.some(session => session.id === current && session.status !== 'completed') ? current : sessions.find(session => session.status !== 'completed')?.id);
      },
      onFairnessLedger: setFairnessLedger,
      onTemplates: setSavedClubTemplates,
      onFieldSettings: setSavedFieldSettings
    });
  }, [authUser, coachProfile, repository]);

  // Everything the shell renders sees data already narrowed to the active
  // scope, so no view has to decide for itself what "current team" means.
  // Two things stay club-wide on purpose: the drill library, because a drill
  // belongs to the club rather than a squad, and the training planner's player
  // list, because a session can deliberately span several teams.
  const scopedPlayers = useMemo(
    () => getPlayersForScope(players, activeScope),
    [players, activeScope]
  );

  const scopedFocuses = useMemo(
    () => getRecordsForPlayers(focuses, scopedPlayers),
    [focuses, scopedPlayers]
  );

  const scopedObservations = useMemo(
    () => getRecordsForPlayers(observations, scopedPlayers),
    [observations, scopedPlayers]
  );

  const scopedSessions = useMemo(
    () => getSessionsForScope(clubSessions, activeScope),
    [clubSessions, activeScope]
  );

  const scopedMatches = useMemo(
    () => getMatchesForScope(matches, activeScope),
    [matches, activeScope]
  );

  const currentClubSession = useMemo(
    () => selectCurrentClubSession(scopedSessions, currentClubSessionId),
    [scopedSessions, currentClubSessionId]
  );

  // Compute current active match for HomeView and default MatchView selection
  const activeMatch = useMemo<MatchRecord>(() => {
    if (selectedMatchId) {
      const target = scopedMatches.find(m => m.id === selectedMatchId);
      if (target) return target;
    }
    return getActiveMatch(scopedMatches) || scopedMatches[0];
  }, [scopedMatches, selectedMatchId]);

  // Save handlers. Each updates React state optimistically and hands persistence
  // to the repository, which no-ops in Test Access mode.
  const handleSaveObservation = (observation: Observation) => {
    setObservations(prev => [...prev, observation]);
    void repository.addObservation(observation);
  };

  const handleAddMatch = (newMatch: MatchRecord) => {
    const matchWithTeam: MatchRecord = {
      ...newMatch,
      teamId: newMatch.teamId || (activeScope.mode === 'team' ? activeScope.teamId : 'ct-1')
    };
    setMatches(prev => [...prev, matchWithTeam]);
    void repository.addMatch(matchWithTeam);
    setSelectedMatchId(matchWithTeam.id);
  };

  const handleExportData = () => {
    const role = effectiveCoachProfile?.role || 'head_coach';
    if (!PermissionMatrix.canExecute(role, 'export_data')) {
      showToast('Permission denied: Only coaches can export data.', 'error');
      return;
    }
    const bundle = DataExportService.generateExportBundle({
      exportingRole: role,
      clubName: team?.name || 'Inside Edge Cricket Club',
      team,
      players: scopedPlayers,
      matches: scopedMatches,
      focuses: scopedFocuses,
      observations: scopedObservations,
      sessions: scopedSessions
    });
    DataExportService.downloadJsonExport(bundle);
    showToast('Club data export downloaded.', 'success');
  };

  const handleUpdateMatch = (updatedMatch: MatchRecord) => {
    setMatches(prev => prev.map(m => (m.id === updatedMatch.id ? updatedMatch : m)));
    void repository.updateMatch(updatedMatch);
  };

  const handleAddDevelopmentFocus = (focus: DevelopmentFocus) => {
    setFocuses(prev => [...prev, focus]);
    void repository.addDevelopmentFocus(focus);
  };

  const handleUpdateDevelopmentFocusState = (focusId: string, newState: FocusLifecycleState) => {
    const target = focuses.find(f => f.id === focusId);
    if (target) {
      const updated = { ...target, state: newState };
      setFocuses(prev => prev.map(f => (f.id === focusId ? updated : f)));
      void repository.updateDevelopmentFocus(updated);
    }
  };

  const handleAddPlayer = (newPlayer: Player) => {
    setPlayers(prev => [...prev, newPlayer]);
    void repository.addPlayer(newPlayer);
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    setPlayers(prev => prev.map(p => (p.id === updatedPlayer.id ? updatedPlayer : p)));
    void repository.updatePlayer(updatedPlayer);
  };

  const handleSaveClubSession = (updatedSession: ClubTrainingSession) => {
    setClubSessions(prev => [updatedSession, ...prev.filter(item => item.id !== updatedSession.id)]);
    setCurrentClubSessionId(updatedSession.id);
    void repository.saveSession(updatedSession);
  };

  const handleSaveClubTemplate = (template: SavedClubTemplate) => {
    setSavedClubTemplates(prev => [...prev.filter(item => item.id !== template.id), template]);
    void repository.saveTemplate(template);
  };

  const handleDeleteClubTemplate = (templateId: string) => {
    setSavedClubTemplates(previous => previous.filter(template => template.id !== templateId));
    void repository.deleteTemplate(templateId);
  };

  const handleSaveFieldSetting = (setting: SavedFieldSetting) => {
    setSavedFieldSettings(previous => [setting, ...previous.filter(item => item.id !== setting.id)]);
    void repository.saveFieldSetting(setting);
  };

  const handleDeleteFieldSetting = (settingId: string) => {
    setSavedFieldSettings(previous => previous.filter(item => item.id !== settingId));
    void repository.deleteFieldSetting(settingId);
  };


  const handleApplyMatchPrioritiesToSession = (priorities: string[]) => {
    if (currentClubSession) handleSaveClubSession({ ...currentClubSession, sessionObjectives: priorities });
    setActiveTab('train');
  };

  const handleAddActivityToSession = (act: Activity) => {
    if (!currentClubSession || currentClubSession.blocks.some(block => block.activityId === act.id)) return;
    handleSaveClubSession({ ...currentClubSession, blocks: [...currentClubSession.blocks, activityToClubBlock(act)] });
  };

  const handleUndoActivity = (activityId: string) => {
    if (!currentClubSession) return;
    handleSaveClubSession({ ...currentClubSession, blocks: currentClubSession.blocks.filter(block => block.activityId !== activityId) });
  };

  const handleCompleteSession = () => {
    if (currentClubSession) {
      const completed = completeSessionWithFairness(currentClubSession, players, fairnessLedger);
      handleSaveClubSession(completed.session);
      if (completed.applied) {
        setFairnessLedger(completed.ledger);
        void repository.saveFairnessLedger(completed.ledger);
      }
      setCurrentClubSessionId(undefined);
    }
    setIsLiveMode(false);
    setActiveTab('home');
  };

  // Route check 1: Public Captain Submission Page (/report/:token) — No login required
  const pathname = window.location.pathname;
  if (pathname.startsWith('/report/')) {
    const token = pathname.replace('/report/', '').trim();
    return (
      <Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-main)', textAlign: 'center' }}>Loading Captain Report Form...</div>}>
        <PublicCaptainReportView token={token} />
      </Suspense>
    );
  }

  // Route check 2: Coach Invitation Page (/invite/:token) — Public registration with pre-approved token
  if (pathname.startsWith('/invite/')) {
    const token = pathname.replace('/invite/', '').trim();
    return (
      <AcceptInviteView
        token={token}
        onAccountCreated={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  // Route check 3: Public Parent RSVP Page (/rsvp/:token) — No login required
  if (pathname.startsWith('/rsvp/')) {
    const token = pathname.replace('/rsvp/', '').trim();
    return (
      <Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-main)', textAlign: 'center' }}>Loading Training RSVP Page...</div>}>
        <PublicRsvpView token={token} />
      </Suspense>
    );
  }

  // Route check 4: Public Parent Progress Summary Page (/progress/:token) — No login required
  if (pathname.startsWith('/progress/')) {
    const progressToken = pathname.replace('/progress/', '').trim();
    return (
      <Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-main)', textAlign: 'center' }}>Loading Player Progress Report...</div>}>
        <PublicProgressView token={progressToken} />
      </Suspense>
    );
  }

  // Auth Gate: Unauthenticated users are presented with LoginView (bypassed if live session is active)
  if (isAuthLoading && !isTestMode && !isLiveMode) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Authenticating coach session...
      </div>
    );
  }

  if (!isTestMode && (!authUser || !coachProfile) && !isLiveMode) {
    return <LoginView onTestAccess={() => setIsTestMode(true)} />;
  }

  // A signed-in Firebase user without a loaded coach profile is not the same
  // as being logged out — silently falling through to LoginView here made a
  // propagation delay or a Firestore permission error look like a wrong
  // password, so surface what actually happened instead.
  if (!isTestMode && authUser && !coachProfile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="card" style={{ maxWidth: '420px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px' }}>We couldn't load your coach profile</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
            {coachProfileError === 'not_found'
              ? "Your coach profile hasn't been set up yet. If you just accepted an invite, wait a moment and refresh. Otherwise, ask your club Head Coach to check your account."
              : 'There was a problem reaching your coach profile. Check your connection and try again.'}
          </p>
          <button className="btn btn-secondary" onClick={() => void logoutCoach()}>Sign out</button>
        </div>
      </div>
    );
  }

  if (!isTestMode && (!authUser || !coachProfile)) {
    return <LoginView onTestAccess={() => setIsTestMode(true)} />;
  }

  if (isLiveMode && currentClubSession) {
    return (
      <div className="app-container" style={{ padding: '16px', maxWidth: '1400px' }}>
        <LiveClubSession
          session={currentClubSession}
          players={players}
          teams={clubTeams}
          resources={trainingResources}
          onUpdateSession={handleSaveClubSession}
          onExitLive={() => setIsLiveMode(false)}
          onOpenQuickObservation={p => setObservedPlayer(p)}
          onCompleteSession={handleCompleteSession}
        />
        {observedPlayer && (
          <QuickObservationModal
            player={observedPlayer}
            sessionId={currentClubSession?.id}
            activeFocuses={focuses.filter(f => f.playerId === observedPlayer.id && f.state !== 'ARCHIVED')}
            isOpen={!!observedPlayer}
            onClose={() => setObservedPlayer(null)}
            onSaved={handleSaveObservation}
            isJuniorTeam={!!clubTeams.find(t => t.id === observedPlayer.primaryTeamId)?.juniorMode}
          />
        )}
      </div>
    );
  }

  const handleSignOut = () => {
    if (isTestMode) {
      setIsTestMode(false);
    } else {
      logoutCoach();
    }
  };

  return (
    <RepositoryProvider repository={repository}>
      <AppShell
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        team={team}
        clubTeams={clubTeams}
        totalPlayersCount={players.length}
        activeScope={activeScope}
        onSelectScope={setActiveScope}
        onOpenFieldBoard={() => setIsFieldBoardOpen(true)}
        currentCoach={effectiveCoachProfile}
        onOpenCoachManager={isTestMode ? undefined : () => setIsCoachManagerOpen(true)}
        onOpenCoachAssistant={() => setIsCoachAssistantOpen(true)}
        onOpenRulesManagement={isRulesIngestionEnabled ? () => setIsRulesManagementOpen(true) : undefined}
        onOpenReportProblem={() => setIsReportProblemOpen(true)}
        onExportData={handleExportData}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onSignOut={handleSignOut}
      >
        {activeTab === 'home' && (
          <HomeView
            session={currentClubSession}
            match={activeMatch}
            matches={scopedMatches}
            sessions={scopedSessions}
            players={scopedPlayers}
            focuses={scopedFocuses}
            resources={trainingResources}
            team={team}
            clubTeams={clubTeams}
            activeScope={activeScope}
            onStartLiveSession={() => { if (currentClubSession) setIsLiveMode(true); }}
            onNavigateToTrain={() => setActiveTab('train')}
            onNavigateToMatch={() => setActiveTab('match')}
            onNavigateToTeam={() => setActiveTab('team')}
            onNavigateToLibrary={() => setActiveTab('library')}
          />
        )}

        {activeTab === 'train' && (
          <TrainView
            players={players}
            clubTeams={clubTeams}
            activeScope={activeScope}
            trainingResources={trainingResources}
            currentSession={currentClubSession}
            fairnessLedger={fairnessLedger}
            savedClubTemplates={savedClubTemplates}
            onSaveClubSession={handleSaveClubSession}
            onSaveClubTemplate={handleSaveClubTemplate}
            onDeleteClubTemplate={handleDeleteClubTemplate}
            onStartLiveSession={(session) => {
              handleSaveClubSession({ ...session, status: 'live' });
              setIsLiveMode(true);
            }}
          />
        )}

        {activeTab === 'team' && (
          <TeamView
            players={scopedPlayers}
            clubTeams={clubTeams}
            activeScope={activeScope}
            onSelectScope={setActiveScope}
            focuses={scopedFocuses}
            observations={scopedObservations}
            session={currentClubSession}
            onUpdateSession={handleSaveClubSession}
            onOpenQuickObservation={p => setObservedPlayer(p)}
            onAddDevelopmentFocus={handleAddDevelopmentFocus}
            onUpdateDevelopmentFocusState={handleUpdateDevelopmentFocusState}
            onAddPlayer={handleAddPlayer}
            onUpdatePlayer={handleUpdatePlayer}
          />

        )}

        {activeTab === 'match' && (
          <MatchView
            matches={scopedMatches}
            players={scopedPlayers}
            clubTeams={clubTeams}
            activeScope={activeScope}
            selectedMatchId={activeMatch?.id}
            onSelectMatch={setSelectedMatchId}
            onAddMatch={handleAddMatch}
            onUpdateMatch={handleUpdateMatch}
            onApplyPrioritiesToSession={handleApplyMatchPrioritiesToSession}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            activities={activities}
            onAddActivityToSession={handleAddActivityToSession}
            addedActivityIds={currentClubSession?.blocks.flatMap(block => block.activityId ? [block.activityId] : [])}
            onUndoAddActivity={handleUndoActivity}
          />
        )}

        {observedPlayer && (
          <QuickObservationModal
            player={observedPlayer}
            sessionId={currentClubSession?.id}
            activeFocuses={focuses.filter(f => f.playerId === observedPlayer.id && f.state !== 'ARCHIVED')}
            isOpen={!!observedPlayer}
            onClose={() => setObservedPlayer(null)}
            onSaved={handleSaveObservation}
            isJuniorTeam={!!clubTeams.find(t => t.id === observedPlayer.primaryTeamId)?.juniorMode}
          />
        )}

        {isFieldBoardOpen && (
          <Suspense fallback={null}>
            <FieldBoardModal
              onClose={() => setIsFieldBoardOpen(false)}
              savedSettings={savedFieldSettings}
              matchId={activeMatch?.id}
              onSaveSetting={handleSaveFieldSetting}
              onDeleteSetting={handleDeleteFieldSetting}
            />
          </Suspense>
        )}

        {isCoachManagerOpen && !isTestMode && coachProfile?.role === 'head_coach' && (
          <CoachManagerModal
            currentCoach={coachProfile}
            onClose={() => setIsCoachManagerOpen(false)}
          />
        )}

        {isCoachAssistantOpen && (
          <CoachAssistantPanel
            players={scopedPlayers}
            sessions={scopedSessions}
            focuses={scopedFocuses}
            observations={scopedObservations}
            activeScope={activeScope}
            onClose={() => setIsCoachAssistantOpen(false)}
          />
        )}

        {isRulesIngestionEnabled && isRulesManagementOpen && (
          <div className="bottom-sheet-overlay" onClick={() => setIsRulesManagementOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Competition rules management"
              className="bottom-sheet-content"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <button
                  onClick={() => setIsRulesManagementOpen(false)}
                  className="btn btn-secondary"
                  style={{ width: 'auto', padding: '4px 12px', fontSize: '0.78rem' }}
                >
                  Close Rules
                </button>
              </div>
              <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading competition rules…</div>}>
                <RulesManagementView
                  teamId={activeScope.mode === 'team' ? activeScope.teamId : 'ct-1'}
                  userRole={effectiveCoachProfile?.role || 'head_coach'}
                />
              </Suspense>
            </div>
          </div>
        )}

        {isOnboardingOpen && (
          <div className="bottom-sheet-overlay" onClick={() => setIsOnboardingOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Club setup wizard"
              className="bottom-sheet-content"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <ClubSetupWizard
                isOpen={isOnboardingOpen}
                onClose={() => setIsOnboardingOpen(false)}
                onComplete={() => setIsOnboardingOpen(false)}
              />
            </div>
          </div>
        )}

        {isReportProblemOpen && (
          <ReportProblemModal
            isOpen={isReportProblemOpen}
            onClose={() => setIsReportProblemOpen(false)}
          />
        )}
      </AppShell>
    </RepositoryProvider>
  );
}

export default App;
