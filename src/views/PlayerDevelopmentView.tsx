import React, { useState } from 'react';
import type {
  Player,
  DevelopmentFocus,
  Observation,
  FocusLifecycleState
} from '../types/cricket';
import { PlayerProgressService } from '../modules/cricket/playerProgressService';
import { CoachAuthorizationService, type UserContext } from '../modules/cricket/coachAuthorizationService';
import { CheckCircle, Share2 } from 'lucide-react';

interface PlayerDevelopmentViewProps {
  player: Player;
  currentUser: UserContext;
  focuses: DevelopmentFocus[];
  observations: Observation[];
  onUpdateFocusState?: (focusId: string, newState: FocusLifecycleState) => void;
}

export const PlayerDevelopmentView: React.FC<PlayerDevelopmentViewProps> = ({
  player,
  currentUser,
  focuses,
  observations,
  onUpdateFocusState
}) => {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  const canPublish = CoachAuthorizationService.canPublishPlayerReport(currentUser, player);

  // Filter observations accessible to this coach
  const accessibleObservations = observations.filter(obs =>
    CoachAuthorizationService.canViewObservation(currentUser, obs, player)
  );

  const activeFocuses = focuses.filter(f => f.state !== 'ARCHIVED');

  const handlePublishReport = async () => {
    setIsPublishing(true);

    const internalSummary = {
      playerId: player.id,
      generatedAt: new Date().toISOString(),
      attendanceSummary: {
        totalSessionsAttended: 5,
        battingMinutes: 85,
        bowlingMinutes: 60,
        fieldingMinutes: 45,
        centreWicketMinutes: 30
      },
      fairnessAssessment: {
        playerId: player.id,
        isBalanced: true,
        hasInsufficientHistory: false,
        flags: [],
        balance: {
          batting: { ratio: 1.0, status: 'healthy' as const, evidenceSessionsCount: 5 },
          bowling: { ratio: 1.0, status: 'healthy' as const, evidenceSessionsCount: 5 },
          fielding: { ratio: 1.0, status: 'healthy' as const, evidenceSessionsCount: 5 },
          centreWicket: { ratio: 1.0, status: 'healthy' as const, evidenceSessionsCount: 5 },
          scenario: { ratio: 1.0, status: 'healthy' as const, evidenceSessionsCount: 5 }
        },
        opportunityProfile: {
          battingEligible: true,
          bowlingEligible: true,
          fieldingEligible: true,
          wicketkeepingEligible: false,
          battingTargetWeight: 1.0,
          bowlingTargetWeight: 1.0,
          fieldingTargetWeight: 1.0,
          centreWicketTargetWeight: 1.0,
          scenarioTargetWeight: 1.0
        }
      },
      allFocuses: focuses,
      allObservations: accessibleObservations
    };

    const eligibleObsIds = accessibleObservations
      .filter(o => o.access.shareWithPlayerGuardian)
      .map(o => o.id);

    PlayerProgressService.publishProgressReport(
      player.id,
      currentUser.uid,
      internalSummary,
      eligibleObsIds,
      ['Continue spin strike rotation drills', 'Work on back-foot defensive alignment']
    );

    const link = await PlayerProgressService.getShareableProgressLink(player.id);
    setShareUrl(link);
    setPublishedSuccess(true);
    setIsPublishing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Action Bar */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>🎯 Player Development: {player.name}</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Role: {currentUser.role === 'head_coach' ? 'Head Coach (Full Access)' : 'Assistant Coach (Scoped Access)'}
          </span>
        </div>
        {canPublish && (
          <button
            className="btn btn-gold"
            onClick={handlePublishReport}
            disabled={isPublishing}
            style={{ fontSize: '0.8rem', padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Share2 size={16} /> Publish Progress Snapshot
          </button>
        )}
      </div>

      {publishedSuccess && (
        <div className="card" style={{ border: '1px solid #4ade80', background: 'rgba(74, 222, 128, 0.1)', padding: '12px 16px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={18} /> Published Report Snapshot V1 Created
          </div>
          <div style={{ fontSize: '0.8rem', marginTop: '4px', wordBreak: 'break-all' }}>
            Share Link: <a href={shareUrl || '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-gold)' }}>{shareUrl}</a>
          </div>
        </div>
      )}

      {/* Active Development Focuses */}
      <div className="card" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>Current Development Focuses</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activeFocuses.map(focus => {
            const evidenceCount = accessibleObservations.filter(o => o.linkedFocusIds.includes(focus.id)).length;
            return (
              <div
                key={focus.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  padding: '12px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>{focus.focusStatement}</span>
                    <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>{focus.state}</span>
                    {focus.access.staffVisibility === 'head_coach_only' && (
                      <span className="badge" style={{ fontSize: '0.65rem', background: '#ef4444', color: '#fff' }}>
                        🔒 Head Coach Only
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Why: {focus.why}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginTop: '4px' }}>
                    Linked Evidence: {evidenceCount} observation{evidenceCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* State Transition Action Chips */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {focus.state !== 'STRENGTH' && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.7rem', padding: '0 8px', height: '28px' }}
                      onClick={() => onUpdateFocusState?.(focus.id, 'STRENGTH')}
                    >
                      Mark as Strength
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Accessible Coaching Observation Timeline */}
      <div className="card" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>
          Coaching Observations ({accessibleObservations.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {accessibleObservations.map(obs => (
            <div
              key={obs.id}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '0.82rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {obs.createdAt.split('T')[0]} · {obs.tags.join(', ')}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {obs.access.staffVisibility === 'head_coach_only' && (
                    <span className="badge" style={{ fontSize: '0.62rem', background: '#ef4444', color: '#fff' }}>
                      Head Coach Only
                    </span>
                  )}
                  {obs.access.shareWithPlayerGuardian && (
                    <span className="badge" style={{ fontSize: '0.62rem', background: '#4ade80', color: '#000' }}>
                      Parent Eligible
                    </span>
                  )}
                </div>
              </div>
              <div style={{ color: 'var(--text-main)' }}>{obs.textNote}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
