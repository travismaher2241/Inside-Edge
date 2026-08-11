// Inside Edge Main Application Component

import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import './styles/designTokens.css';
import { StorageEngine } from './storage/db';
import type { Team, Facility, Player, Activity, TrainingSession, MatchRecord, DevelopmentFocus, Observation, FocusState } from './types/cricket';
import { getActiveMatch } from './modules/cricket/matchHelpers';
import { AppShell } from './components/layout/AppShell';
import type { TabType } from './components/layout/AppShell';
import { HomeView } from './views/HomeView';
import { TrainView } from './views/TrainView';
import { TeamView } from './views/TeamView';
import { MatchView } from './views/MatchView';
import { LibraryView } from './views/LibraryView';
import { QuickObservationDrawer } from './components/cricket/QuickObservationDrawer';

const LiveModeView = lazy(() => import('./views/LiveModeView').then(m => ({ default: m.LiveModeView })));
const PublicCaptainReportView = lazy(() => import('./views/PublicCaptainReportView').then(m => ({ default: m.PublicCaptainReportView })));
const FieldBoardModal = lazy(() => import('./components/cricket/FieldBoardModal').then(m => ({ default: m.FieldBoardModal })));


export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [isFieldBoardOpen, setIsFieldBoardOpen] = useState<boolean>(false);

  // App Data State loaded from Storage Engine
  const [team] = useState<Team>(StorageEngine.getTeam());
  const [facility] = useState<Facility>(StorageEngine.getFacility());
  const [players, setPlayers] = useState<Player[]>(StorageEngine.getPlayers());
  const [activities] = useState<Activity[]>(StorageEngine.getActivities());
  const [session, setSession] = useState<TrainingSession>(StorageEngine.getSession());
  const [matches, setMatches] = useState<MatchRecord[]>(StorageEngine.getMatches());
  const [selectedMatchId, setSelectedMatchId] = useState<string | undefined>(undefined);
  const [focuses, setFocuses] = useState<DevelopmentFocus[]>(StorageEngine.getDevelopmentFocuses());
  const [observations, setObservations] = useState<Observation[]>(StorageEngine.getObservations());

  // Quick Observation Drawer State
  const [observedPlayer, setObservedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    StorageEngine.init();
    setMatches(StorageEngine.getMatches());
  }, []);

  // Compute current active match for HomeView and default MatchView selection
  const activeMatch = useMemo<MatchRecord>(() => {
    if (selectedMatchId) {
      const target = matches.find(m => m.id === selectedMatchId);
      if (target) return target;
    }
    return getActiveMatch(matches) || matches[0];
  }, [matches, selectedMatchId]);

  // Save Handlers
  const handleSaveObservation = (obsData: Omit<Observation, 'id' | 'timestamp'>) => {
    const newObs: Observation = {
      ...obsData,
      id: `obs-${Date.now()}`,
      timestamp: new Date().toISOString(),
      coachName: team.headCoachName
    };
    StorageEngine.addObservation(newObs);
    setObservations(StorageEngine.getObservations());
  };

  const handleUpdateSession = (updatedSession: TrainingSession) => {
    StorageEngine.saveSession(updatedSession);
    setSession(updatedSession);
  };

  const handleAddMatch = (newMatch: MatchRecord) => {
    StorageEngine.addMatch(newMatch);
    const updated = StorageEngine.getMatches();
    setMatches(updated);
    setSelectedMatchId(newMatch.id);
  };

  const handleUpdateMatch = (updatedMatch: MatchRecord) => {
    StorageEngine.updateMatch(updatedMatch);
    setMatches(StorageEngine.getMatches());
  };

  const handleAddDevelopmentFocus = (focus: DevelopmentFocus) => {
    StorageEngine.addDevelopmentFocus(focus);
    setFocuses(StorageEngine.getDevelopmentFocuses());
  };

  const handleUpdateDevelopmentFocusState = (focusId: string, newState: FocusState) => {
    const target = focuses.find(f => f.id === focusId);
    if (target) {
      const updated = { ...target, state: newState };
      StorageEngine.updateDevelopmentFocus(updated);
      setFocuses(StorageEngine.getDevelopmentFocuses());
    }
  };

  const handleAddPlayer = (newPlayer: Player) => {
    StorageEngine.addPlayer(newPlayer);
    setPlayers(StorageEngine.getPlayers());
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

  // Route check for Public Captain Submission Page (/report/:token)
  const pathname = window.location.pathname;
  if (pathname.startsWith('/report/')) {
    const token = pathname.replace('/report/', '').trim();
    return (
      <Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-main)', textAlign: 'center' }}>Loading Report Form...</div>}>
        <PublicCaptainReportView token={token} />
      </Suspense>
    );
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

  return (
    <AppShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      team={team}
      onOpenFieldBoard={() => setIsFieldBoardOpen(true)}
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
        />
      )}

      {activeTab === 'match' && (
        <MatchView
          matches={matches}
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
    </AppShell>
  );
}

export default App;

