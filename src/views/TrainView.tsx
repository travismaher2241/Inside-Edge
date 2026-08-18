import React, { lazy, Suspense } from 'react';
import type { ClubTeam, TrainingResource, ClubTrainingSession, Player, RollingFairnessLedger, SavedClubTemplate, ActiveScope } from '../types/cricket';

const ClubTrainingPlanner = lazy(() => import('../components/cricket/planner/ClubTrainingPlanner').then(module => ({ default: module.ClubTrainingPlanner })));

interface TrainViewProps {
  players: Player[];
  clubTeams: ClubTeam[];
  activeScope?: ActiveScope;
  trainingResources: TrainingResource[];
  currentSession?: ClubTrainingSession;
  fairnessLedger: RollingFairnessLedger[];
  savedClubTemplates: SavedClubTemplate[];
  onSaveClubSession: (session: ClubTrainingSession) => void | Promise<void>;
  onSaveClubTemplate: (template: SavedClubTemplate) => void;
  onDeleteClubTemplate: (templateId: string) => void;
  onStartLiveSession: (session: ClubTrainingSession) => void;
}

export const TrainView: React.FC<TrainViewProps> = ({
  players,
  clubTeams,
  activeScope = { mode: 'team', teamId: 'ct-1' },
  trainingResources,
  currentSession,
  fairnessLedger,
  savedClubTemplates,
  onSaveClubSession,
  onSaveClubTemplate,
  onDeleteClubTemplate,
  onStartLiveSession
}) => (
  <Suspense fallback={<div className="card" style={{ padding: '24px', textAlign: 'center' }}>Loading training planner…</div>}>
    <ClubTrainingPlanner
      teams={clubTeams}
      activeScope={activeScope}
      resources={trainingResources}
      players={players}
      savedTemplates={savedClubTemplates}
      rollingLedger={fairnessLedger}
      currentSession={currentSession}
      onSaveSession={onSaveClubSession}
      onSaveTemplate={onSaveClubTemplate}
      onDeleteTemplate={onDeleteClubTemplate}
      onStartLive={onStartLiveSession}
    />
  </Suspense>
);
