import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import './styles/designTokens.css';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  subscribeToCoachProfile,
  logoutCoach,
  type CoachProfileLoadError
} from './modules/cricket/authService';
import { CloudStorageEngine, seedDefaultFirestoreIfEmpty } from './modules/cricket/cloudStorageEngine';
import type { Team, Player, Activity, MatchRecord, DevelopmentFocus, Observation, FocusLifecycleState, CoachUser, ClubTeam, TrainingResource, ClubTrainingSession, RollingFairnessLedger, SavedClubTemplate, SavedFieldSetting, ActiveScope } from './types/cricket';
import { getActiveMatch } from './modules/cricket/matchHelpers';
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
import { SEED_TEAM, SEED_PLAYERS, SEED_ACTIVITIES, SEED_MATCH_RECORD, SEED_DEVELOPMENT_FOCUSES, SEED_OBSERVATIONS, SEED_CLUB_TEAMS, SEED_TRAINING_RESOURCES, SEED_FAIRNESS_LEDGER, SEED_SAVED_TEMPLATES } from './modules/cricket/seedData';
const PublicCaptainReportView = lazy(() => import('./views/PublicCaptainReportView').then(m => ({ default: m.PublicCaptainReportView })));
const PublicRsvpView = lazy(() => import('./views/PublicRsvpView').then(m => ({ default: m.PublicRsvpView })));
const PublicProgressView = lazy(() => import('./views/PublicProgressView').then(m => ({ default: m.PublicProgressView })));

const TEST_ACCESS_COACH: CoachUser = {
  uid: 'test-access',
  email: 'tester@insideedge.local',
  displayName: 'Tester (Test Access)',
  role: 'head_coach',
  createdAt: new Date().toISOString()
};

export function App() {
  // Auth & Coach State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [coachProfile, setCoachProfile] = useState<CoachUser | null>(null);
  const [coachProfileError, setCoachProfileError] = useState<CoachProfileLoadError | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isCoachManagerOpen, setIsCoachManagerOpen] = useState<boolean>(false);
  const [isCoachAssistantOpen, setIsCoachAssistantOpen] = useState<boolean>(false);
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const effectiveCoachProfile = isTestMode ? TEST_ACCESS_COACH : coachProfile;

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

  // 3. Subscribe to Firestore cloud data when signed in
  useEffect(() => {
    if (isTestMode || !authUser || !coachProfile) return;

    const role = coachProfile.role;

    const unsubTeam = CloudStorageEngine.subscribeToTeam(setTeam);
    const unsubPlayers = CloudStorageEngine.subscribeToPlayers(setPlayers);
    const unsubActivities = CloudStorageEngine.subscribeToActivities(setActivities);
    const unsubMatches = CloudStorageEngine.subscribeToMatches(setMatches);
    const unsubFocuses = CloudStorageEngine.subscribeToDevelopmentFocuses(role, setFocuses);
    const unsubObs = CloudStorageEngine.subscribeToObservations(role, setObservations);
    const unsubClubTeams = CloudStorageEngine.subscribeToClubTeams(setClubTeams);
    const unsubResources = CloudStorageEngine.subscribeToTrainingResources(setTrainingResources);
    const unsubClubSessions = CloudStorageEngine.subscribeToClubSessions(sessions => {
      setClubSessions(sessions);
      setCurrentClubSessionId(current => current && sessions.some(session => session.id === current && session.status !== 'completed') ? current : sessions.find(session => session.status !== 'completed')?.id);
    });
    const unsubFairness = CloudStorageEngine.subscribeToFairnessLedger(setFairnessLedger);
    const unsubTemplates = CloudStorageEngine.subscribeToSavedClubTemplates(setSavedClubTemplates);
    const unsubFieldSettings = CloudStorageEngine.subscribeToSavedFieldSettings(setSavedFieldSettings);

    return () => {
      unsubTeam();
      unsubPlayers();
      unsubActivities();
      unsubMatches();
      unsubFocuses();
      unsubObs();
      unsubClubTeams();
      unsubResources();
      unsubClubSessions();
      unsubFairness();
      unsubTemplates();
      unsubFieldSettings();
    };
  }, [authUser, coachProfile, isTestMode]);

  const currentClubSession = useMemo(
    () => selectCurrentClubSession(clubSessions, currentClubSessionId),
    [clubSessions, currentClubSessionId]
  );

  // Compute current active match for HomeView and default MatchView selection
  const activeMatch = useMemo<MatchRecord>(() => {
    if (selectedMatchId) {
      const target = matches.find(m => m.id === selectedMatchId);
      if (target) return target;
    }
    return getActiveMatch(matches) || matches[0];
  }, [matches, selectedMatchId]);

  // Save Handlers (Persisted to Firestore via CloudStorageEngine, or kept local-only in Test Access mode)
  const handleSaveObservation = (observation: Observation) => {
    if (isTestMode) {
      setObservations(prev => [...prev, observation]);
    } else {
      CloudStorageEngine.addObservation(observation);
    }
  };

  const handleAddMatch = (newMatch: MatchRecord) => {
    if (isTestMode) {
      setMatches(prev => [...prev, newMatch]);
    } else {
      CloudStorageEngine.addMatch(newMatch);
    }
    setSelectedMatchId(newMatch.id);
  };

  const handleUpdateMatch = (updatedMatch: MatchRecord) => {
    if (isTestMode) {
      setMatches(prev => prev.map(m => (m.id === updatedMatch.id ? updatedMatch : m)));
    } else {
      CloudStorageEngine.updateMatch(updatedMatch);
    }
  };

  const handleAddDevelopmentFocus = (focus: DevelopmentFocus) => {
    if (isTestMode) {
      setFocuses(prev => [...prev, focus]);
    } else {
      CloudStorageEngine.addDevelopmentFocus(focus);
    }
  };

  const handleUpdateDevelopmentFocusState = (focusId: string, newState: FocusLifecycleState) => {
    const target = focuses.find(f => f.id === focusId);
    if (target) {
      const updated = { ...target, state: newState };
      if (isTestMode) {
        setFocuses(prev => prev.map(f => (f.id === focusId ? updated : f)));
      } else {
        CloudStorageEngine.updateDevelopmentFocus(updated);
      }
    }
  };

  const handleAddPlayer = (newPlayer: Player) => {
    if (isTestMode) {
      setPlayers(prev => [...prev, newPlayer]);
    } else {
      CloudStorageEngine.addPlayer(newPlayer);
    }
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    if (isTestMode) {
      setPlayers(prev => prev.map(p => (p.id === updatedPlayer.id ? updatedPlayer : p)));
    } else {
      CloudStorageEngine.updatePlayer(updatedPlayer);
    }
  };

  const handleSaveClubSession = (updatedSession: ClubTrainingSession) => {
    setClubSessions(prev => [updatedSession, ...prev.filter(item => item.id !== updatedSession.id)]);
    setCurrentClubSessionId(updatedSession.id);
    if (!isTestMode) void CloudStorageEngine.saveClubSession(updatedSession);
  };

  const handleSaveClubTemplate = (template: SavedClubTemplate) => {
    setSavedClubTemplates(prev => [...prev.filter(item => item.id !== template.id), template]);
    if (!isTestMode) void CloudStorageEngine.saveClubTemplate(template);
  };

  const handleDeleteClubTemplate = (templateId: string) => {
    setSavedClubTemplates(previous => previous.filter(template => template.id !== templateId));
    if (!isTestMode) void CloudStorageEngine.deleteClubTemplate(templateId);
  };

  const handleSaveFieldSetting = (setting: SavedFieldSetting) => {
    setSavedFieldSettings(previous => [setting, ...previous.filter(item => item.id !== setting.id)]);
    if (!isTestMode) void CloudStorageEngine.saveFieldSetting(setting);
  };

  const handleDeleteFieldSetting = (settingId: string) => {
    setSavedFieldSettings(previous => previous.filter(item => item.id !== settingId));
    if (!isTestMode) void CloudStorageEngine.deleteFieldSetting(settingId);
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
        if (!isTestMode) void CloudStorageEngine.saveFairnessLedger(completed.ledger);
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
      onSignOut={handleSignOut}
    >
      {activeTab === 'home' && (
        <HomeView
          session={currentClubSession}
          match={activeMatch}
          matches={matches}
          sessions={clubSessions}
          players={players}
          focuses={focuses}
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
          players={players}
          clubTeams={clubTeams}
          activeScope={activeScope}
          focuses={focuses}
          observations={observations}
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
          matches={matches}
          players={players}
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
          players={players}
          sessions={clubSessions}
          focuses={focuses}
          observations={observations}
          onClose={() => setIsCoachAssistantOpen(false)}
        />
      )}
    </AppShell>
  );
}

export default App;
