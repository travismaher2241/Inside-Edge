import React, { useState } from 'react';
import type {
  ClubTrainingSession,
  ClubTeam,
  TrainingResource,
  Player,
  SavedClubTemplate,
  RollingFairnessLedger
} from '../../../types/cricket';
import { ClubSessionWizard } from './ClubSessionWizard';
import { FairnessReviewPanel } from './FairnessReviewPanel';
import { TrainingTemplateManager } from './TrainingTemplateManager';
import { Plus, Play, Layers } from 'lucide-react';

interface ClubTrainingPlannerProps {
  teams: ClubTeam[];
  resources: TrainingResource[];
  players: Player[];
  savedTemplates: SavedClubTemplate[];
  rollingLedger: RollingFairnessLedger[];
  currentSession?: ClubTrainingSession;
  onSaveSession: (session: ClubTrainingSession) => void;
  onStartLive: (session: ClubTrainingSession) => void;
  onSaveTemplate: (template: SavedClubTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export const ClubTrainingPlanner: React.FC<ClubTrainingPlannerProps> = ({
  teams,
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
      {/* Header & Main Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>DYNAMIC CLUB SYSTEM</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Club Training Planner</h1>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn btn-secondary" onClick={() => setIsWizardOpen(true)} style={{ width: 'auto', padding: '0 10px', height: '36px', fontSize: '0.75rem' }}>
            <Plus size={14} /> NEW SESSION WIZARD
          </button>
          {currentSession && (
            <button className="btn btn-live" onClick={() => onStartLive(currentSession)} style={{ width: 'auto', padding: '0 12px', height: '36px' }}>
              <Play size={16} /> LIVE MODE
            </button>
          )}
        </div>
      </div>

      {/* Tab Selector */}
      <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: '10px', padding: '4px' }}>
        <button
          onClick={() => selectTab('schedule')}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'schedule' ? 'var(--primary-green)' : 'transparent',
            color: activeTab === 'schedule' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          SESSION PLANNER
        </button>
        <button
          onClick={() => selectTab('templates')}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'templates' ? 'var(--primary-green)' : 'transparent',
            color: activeTab === 'templates' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          CLUB TEMPLATES ({savedTemplates.length})
        </button>
        <button
          onClick={() => selectTab('fairness')}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'fairness' ? 'var(--primary-green)' : 'transparent',
            color: activeTab === 'fairness' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          FAIRNESS LEDGER
        </button>
      </div>

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentSession ? (
            <div className="card" style={{ padding: '16px', borderLeft: '4px solid var(--accent-gold)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>ACTIVE SESSION</span>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px' }}>{currentSession.title}</h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    📅 {currentSession.date} ({currentSession.startTime} - {currentSession.finishTime})
                  </div>
                </div>

                <button className="btn btn-live" onClick={() => onStartLive(currentSession)} style={{ width: 'auto', padding: '0 12px', height: '36px' }}>
                  <Play size={16} /> START LIVE
                </button>
              </div>

              {/* Objectives Pill Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                {currentSession.sessionObjectives.map((obj, i) => (
                  <span key={i} className="badge badge-green">🎯 {obj}</span>
                ))}
              </div>

              {activityBlocks.length > 0 && (
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                    SESSION ACTIVITIES ({activityBlocks.length})
                  </div>
                  {activityBlocks.map(block => (
                    <div key={block.id} style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '8px', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontWeight: 700 }}>
                        <span>{block.title}</span>
                        <span style={{ color: 'var(--accent-gold)', whiteSpace: 'nowrap' }}>{block.durationMinutes} mins</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {block.location ? `${block.location} · ` : ''}{block.objective}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Rotation Block Summary */}
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                  ROTATION BLOCKS ({currentSession.rotationPlan.length})
                </div>
                {currentSession.rotationPlan.map(block => (
                  <div key={block.blockId} style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '8px', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>Block {block.blockIndex + 1} ({block.startTime} - {block.endTime})</span>
                      <span style={{ color: 'var(--accent-gold)' }}>{block.durationMinutes} Mins</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {block.resourceAssignments.length} active resources allocated.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
              <Layers size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>No Active Club Session Planned</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px', marginBottom: '16px' }}>
                Create a dynamic schedule for any number of teams and active resources.
              </p>
              <button className="btn btn-gold" onClick={() => setIsWizardOpen(true)} style={{ width: 'auto', padding: '0 16px' }}>
                <Plus size={16} /> LAUNCH PLANNING WIZARD
              </button>
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
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

      {/* Fairness Ledger Tab */}
      {activeTab === 'fairness' && (
        <FairnessReviewPanel
          players={players}
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
          onFinalise={(session, action) => {
            onSaveSession(session);
            if (action === 'launch') onStartLive(session);
          }}
          onSaveTemplate={onSaveTemplate}
          onClose={() => setIsWizardOpen(false)}
        />
      )}
    </div>
  );
};
