import React, { useState } from 'react';
import type {
  ClubTrainingSession,
  ClubTeam,
  TrainingResource,
  Player,
  SavedClubTemplate,
  RollingFairnessLedger,
  ActiveScope
} from '../../../types/cricket';
import { ClubSessionWizard } from './ClubSessionWizard';
import { FairnessReviewPanel } from './FairnessReviewPanel';
import { TrainingTemplateManager } from './TrainingTemplateManager';
import { Play, Dumbbell } from 'lucide-react';

interface ClubTrainingPlannerProps {
  teams: ClubTeam[];
  activeScope?: ActiveScope;
  resources: TrainingResource[];
  players: Player[];
  savedTemplates: SavedClubTemplate[];
  rollingLedger: RollingFairnessLedger[];
  currentSession?: ClubTrainingSession;
  onSaveSession: (session: ClubTrainingSession) => void | Promise<void>;
  onStartLive: (session: ClubTrainingSession) => void;
  onSaveTemplate: (template: SavedClubTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export const ClubTrainingPlanner: React.FC<ClubTrainingPlannerProps> = ({
  teams,
  activeScope = { mode: 'team', teamId: 'ct-1' },
  resources,
  players,
  savedTemplates,
  rollingLedger,
  currentSession,
  onSaveSession,
  onStartLive,
  onSaveTemplate,
  onDeleteTemplate
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'templates' | 'fairness'>(() => {
    const saved = typeof localStorage === 'undefined' ? null : localStorage.getItem('inside_edge_training_tab');
    return saved === 'templates' || saved === 'fairness' ? saved : 'schedule';
  });
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SavedClubTemplate | undefined>();
  
  const activityBlocks = currentSession?.blocks.filter(block => block.type !== 'rotation') ?? [];

  const selectTab = (tab: 'schedule' | 'templates' | 'fairness') => {
    setActiveTab(tab);
    if (typeof localStorage !== 'undefined') localStorage.setItem('inside_edge_training_tab', tab);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Tab Selector */}
      <div className="train-tab-selector">
        <button
          className={`train-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => selectTab('schedule')}
        >
          SESSION
        </button>
        <button
          className={`train-tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => selectTab('templates')}
        >
          TEMPLATES
        </button>
        <button
          className={`train-tab-btn ${activeTab === 'fairness' ? 'active' : ''}`}
          onClick={() => selectTab('fairness')}
        >
          SQUAD BALANCE
        </button>
      </div>

      {/* 1. SESSION PLANNER TAB */}
      {activeTab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {currentSession ? (
            <div className="home-primary-card">
              <div className="home-primary-badge-row">
                <span className={`badge ${currentSession.status === 'live' ? 'badge-live' : 'badge-gold'}`}>
                  {currentSession.status === 'live' ? 'LIVE SESSION' : 'NEXT TRAINING'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {currentSession.date}
                </span>
              </div>

              <h2 className="home-primary-title">{currentSession.title}</h2>
              <div className="home-primary-meta">
                <span>{currentSession.startTime} - {currentSession.finishTime}</span>
                <span>·</span>
                <span>{currentSession.confirmedAttendingPlayerIds.length} players</span>
              </div>

              {/* Objectives Pill Bar */}
              {currentSession.sessionObjectives.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                  {currentSession.sessionObjectives.map((obj, i) => (
                    <span key={i} className="badge badge-green">🎯 {obj}</span>
                  ))}
                </div>
              )}

              {/* Session Activities Overview */}
              {activityBlocks.length > 0 && (
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="section-label-gold">
                    Activities ({activityBlocks.length})
                  </div>
                  {activityBlocks.slice(0, 3).map(block => (
                    <div key={block.id} style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>{block.title}</span>
                        <span style={{ color: 'var(--accent-gold)' }}>{block.durationMinutes} mins</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="home-primary-actions">
                <button className="btn btn-live" onClick={() => onStartLive(currentSession)}>
                  <Play size={18} /> OPEN SESSION
                </button>
                <button className="btn btn-secondary" onClick={() => setIsWizardOpen(true)}>
                  Edit Plan
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--bg-surface-card)' }}>
              <div className="section-label-gold">
                TRAINING
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>No training planned</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '20px' }}>
                Create your next session, assign activities and organise your groups.
              </p>
              
              <button 
                className="btn btn-gold" 
                onClick={() => setIsWizardOpen(true)}
                style={{ width: '100%', maxWidth: '280px', margin: '0 auto' }}
              >
                <Dumbbell size={18} /> Plan Training
              </button>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '14px' }}>
                Use a club template or start from scratch
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. TEMPLATES TAB */}
      {activeTab === 'templates' && (
        <TrainingTemplateManager
          templates={savedTemplates}
          teams={teams}
          resources={resources}
          currentSession={currentSession}
          onApplyTemplate={(template) => {
            setSelectedTemplate(template);
            setIsWizardOpen(true);
          }}
          onSaveTemplate={onSaveTemplate}
          onDeleteTemplate={onDeleteTemplate}
        />
      )}

      {/* 3. SQUAD BALANCE TAB */}
      {activeTab === 'fairness' && (
        <FairnessReviewPanel
          players={players}
          teams={teams}
          activeScope={activeScope}
          rollingLedger={rollingLedger}
        />
      )}

      {/* Wizard Modal */}
      {isWizardOpen && (
        <ClubSessionWizard
          teams={teams}
          resources={resources}
          players={players}
          savedTemplates={savedTemplates}
          rollingLedger={rollingLedger}
          selectedTemplate={selectedTemplate}
          currentSession={currentSession}
          onPersistDraft={onSaveSession}
          onFinalise={(session, action) => {
            return Promise.resolve(onSaveSession(session)).then(() => {
              if (action === 'launch') onStartLive(session);
            });
          }}
          onSaveTemplate={onSaveTemplate}
          onClose={() => setIsWizardOpen(false)}
        />
      )}
    </div>
  );
};
