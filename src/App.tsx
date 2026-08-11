import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import './styles/designTokens.css';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  subscribeToCoachProfile,
  logoutCoach
} from './modules/cricket/authService';
import { CloudStorageEngine, seedDefaultFirestoreIfEmpty } from './modules/cricket/cloudStorageEngine';
import type { Team, Facility, Player, Activity, TrainingSession, MatchRecord, DevelopmentFocus, Observation, FocusState, CoachUser } from './types/cricket';
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
import { QuickObservationDrawer } from './components/cricket/QuickObservationDrawer';
import { SEED_TEAM, SEED_FACILITY, SEED_PLAYERS, SEED_ACTIVITIES, SEED_SESSION, SEED_MATCH_RECORD, SEED_DEVELOPMENT_FOCUSES, SEED_OBSERVATIONS } from './modules/cricket/seedData';

const LiveModeView = lazy(() => import('./views/LiveModeView').then(m => ({ default: m.LiveModeView })));
const PublicCaptainReportView = lazy(() => import('./views/PublicCaptainReportView').then(m => ({ default: m.PublicCaptainReportView })));
const FieldBoardModal = lazy(() => import('./components/cricket/FieldBoardModal').then(m => ({ default: m.FieldBoardModal })));

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
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isCoachManagerOpen, setIsCoachManagerOpen] = useState<boolean>(false);
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const effectiveCoachProfile = isTestMode ? TEST_ACCESS_COACH : coachProfile;

  // App Tab & View State
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [isFieldBoardOpen, setIsFieldBoardOpen] = useState<boolean>(false);

  // Firestore Real-Time Squad Data State
  const [team, setTeam] = useState<Team>(SEED_TEAM);
  const [facility, setFacility] = useState<Facility>(SEED_FACILITY);
  const [players, setPlayers] = useState<Player[]>(SEED_PLAYERS);
  const [activities, setActivities] = useState<Activity[]>(SEED_ACTIVITIES);
  const [session, setSession] = useState<TrainingSession>(SEED_SESSION);
  const [matches, setMatches] = useState<MatchRecord[]>([SEED_MATCH_RECORD]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | undefined>(undefined);
  const [focuses, setFocuses] = useState<DevelopmentFocus[]>(SEED_DEVELOPMENT_FOCUSES);
  const [observations, setObservations] = useState<Observation[]>(SEED_OBSERVATIONS);

  // Quick Observation Drawer State
  const [observedPlayer, setObservedPlayer] = useState<Player | null>(null);

  // 1. Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      setAuthUser(user);
      if (!user) {
        setCoachProfile(null);
        setIsAuthLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. Subscribe to Coach Profile document when authUser is present
  useEffect(() => {
    if (!authUser) return;
    setIsAuthLoading(true);

    const unsubProfile = subscribeToCoachProfile(authUser.uid, profile => {
      setCoachProfile(profile);
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
    const unsubFacility = CloudStorageEngine.subscribeToFacility(setFacility);
    const unsubPlayers = CloudStorageEngine.subscribeToPlayers(setPlayers);
    const unsubActivities = CloudStorageEngine.subscribeToActivities(setActivities);
    const unsubSession = CloudStorageEngine.subscribeToSession(setSession);
    const unsubMatches = CloudStorageEngine.subscribeToMatches(setMatches);
    const unsubFocuses = CloudStorageEngine.subscribeToDevelopmentFocuses(role, setFocuses);
    const unsubObs = CloudStorageEngine.subscribeToObservations(role, setObservations);

    return () => {
      unsubTeam();
      unsubFacility();
      unsubPlayers();
      unsubActivities();
      unsubSession();
      unsubMatches();
      unsubFocuses();
      unsubObs();
    };
  }, [authUser, coachProfile, isTestMode]);

  // Compute current active match for HomeView and default MatchView selection
  const activeMatch = useMemo<MatchRecord>(() => {
    if (selectedMatchId) {
      const target = matches.find(m => m.id === selectedMatchId);
      if (target) return target;
    }
    return getActiveMatch(matches) || matches[0];
  }, [matches, selectedMatchId]);

  // Save Handlers (Persisted to Firestore via CloudStorageEngine, or kept local-only in Test Access mode)
  const handleSaveObservation = (obsData: Omit<Observation, 'id' | 'timestamp'>) => {
    const newObs: Observation = {
      ...obsData,
      id: `obs-${Date.now()}`,
      timestamp: new Date().toISOString(),
      coachName: effectiveCoachProfile?.displayName || team.headCoachName
    };
    if (isTestMode) {
      setObservations(prev => [...prev, newObs]);
    } else {
      CloudStorageEngine.addObservation(newObs);
    }
  };

  const handleUpdateSession = (updatedSession: TrainingSession) => {
    if (isTestMode) {
      setSession(updatedSession);
    } else {
      CloudStorageEngine.saveSession(updatedSession);
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

  const handleUpdateDevelopmentFocusState = (focusId: string, newState: FocusState) => {
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


  const handleApplyMatchPrioritiesToSession = (priorities: string[]) => {
    const updated = {
      ...session,
      primaryObjectives: priorities
    };
    handleUpdateSession(updated);
    setActiveTab('train');
  };

  const handleAddActivityToSession = (act: Activity) => {
    const updatedBlocks = [
      ...session.blocks,
      {
        id: `b-${Date.now()}`,
        title: act.name,
        blockType: 'fielding' as const,
        durationMinutes: act.durationMinutes,
        activityId: act.id,
        location: act.spaceRequired === 'net' ? 'Nets' : 'Outfield',
        objective: act.purpose
      }
    ];

    const newDuration = session.durationMinutes + act.durationMinutes;
    handleUpdateSession({
      ...session,
      durationMinutes: newDuration,
      blocks: updatedBlocks
    });
  };

  const handleCompleteSession = () => {
    const completedSession = { ...session, status: 'completed' as const };
    handleUpdateSession(completedSession);
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

  // Auth Gate: Unauthenticated users are presented with LoginView
  if (isAuthLoading && !isTestMode) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Authenticating coach session...
      </div>
    );
  }

  if (!isTestMode && (!authUser || !coachProfile)) {
    return <LoginView onTestAccess={() => setIsTestMode(true)} />;
  }

  if (isLiveMode) {
    return (
      <div className="app-container" style={{ padding: '16px' }}>
        <Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-main)', textAlign: 'center' }}>Loading Live Mode...</div>}>
          <LiveModeView
            session={session}
            players={players}
            facility={facility}
            onExitLive={() => setIsLiveMode(false)}
            onOpenQuickObservation={p => setObservedPlayer(p)}
            onCompleteSession={handleCompleteSession}
          />
        </Suspense>
        <QuickObservationDrawer
          player={observedPlayer}
          developmentFocuses={focuses}
          onClose={() => setObservedPlayer(null)}
          onSaveObservation={handleSaveObservation}
        />
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
      onOpenFieldBoard={() => setIsFieldBoardOpen(true)}
      currentCoach={effectiveCoachProfile}
      onOpenCoachManager={isTestMode ? undefined : () => setIsCoachManagerOpen(true)}
      onSignOut={handleSignOut}
    >
      {activeTab === 'home' && (
        <HomeView
          session={session}
          match={activeMatch}
          players={players}
          focuses={focuses}
          onStartLiveSession={() => setIsLiveMode(true)}
          onNavigateToTrain={() => setActiveTab('train')}
          onNavigateToMatch={() => setActiveTab('match')}
          onNavigateToTeam={() => setActiveTab('team')}
        />
      )}

      {activeTab === 'train' && (
        <TrainView
          session={session}
          facility={facility}
          players={players}
          onUpdateSession={handleUpdateSession}
          onStartLiveSession={() => setIsLiveMode(true)}
          onOpenQuickObservation={p => setObservedPlayer(p)}
        />
      )}

      {activeTab === 'team' && (
        <TeamView
          players={players}
          focuses={focuses}
          observations={observations}
          session={session}
          onUpdateSession={handleUpdateSession}
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
        />
      )}

      <QuickObservationDrawer
        player={observedPlayer}
        developmentFocuses={focuses}
        onClose={() => setObservedPlayer(null)}
        onSaveObservation={handleSaveObservation}
      />

      {isFieldBoardOpen && (
        <Suspense fallback={null}>
          <FieldBoardModal onClose={() => setIsFieldBoardOpen(false)} />
        </Suspense>
      )}

      {isCoachManagerOpen && !isTestMode && coachProfile?.role === 'head_coach' && (
        <CoachManagerModal
          currentCoach={coachProfile}
          onClose={() => setIsCoachManagerOpen(false)}
        />
      )}
    </AppShell>
  );
}

export default App;


