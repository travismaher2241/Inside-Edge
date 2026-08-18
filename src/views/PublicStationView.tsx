import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PublicStationService, type PublicStationData, type PublicStationPlayer } from '../modules/cricket/publicStationService';
import {
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Shield,
  Target,
  Users,
  AlertTriangle,
  Flame,
  MessageSquare,
  Check,
  X,
  Sparkles
} from 'lucide-react';

interface PublicStationViewProps {
  token: string;
}

export const PublicStationView: React.FC<PublicStationViewProps> = ({ token }) => {
  const [stationData, setStationData] = useState<PublicStationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBlockIdx, setSelectedBlockIdx] = useState<number>(0);
  const [isFollowingLive, setIsFollowingLive] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(12 * 60);
  const warnedAt = useRef<Set<number>>(new Set());

  // Quick Observation State
  const [observedPlayer, setObservedPlayer] = useState<PublicStationPlayer | null>(null);
  const [selectedTag, setSelectedTag] = useState<'Good execution' | 'Needs work' | 'Decision' | 'Technique' | 'Intent' | 'Workload'>('Good execution');
  const [noteText, setNoteText] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);

  // Load once, then poll the station-scoped public projection for coach changes.
  useEffect(() => {
    let cancelled = false;
    async function loadData(initialLoad: boolean) {
      if (initialLoad) setLoading(true);
      try {
        const data = await PublicStationService.resolveStationData(token);
        if (cancelled) return;
        if (!data) {
          setError('Invalid or expired station link. Please ask your Head Coach for an updated link.');
        } else {
          setError(null);
          setStationData(data);
          setSelectedBlockIdx(previous => initialLoad ? data.activeBlockIndex : previous);
        }
      } catch (err: unknown) {
        if (!cancelled && initialLoad) {
          setError(err instanceof Error ? err.message : 'Unable to load station schedule.');
        }
      } finally {
        if (!cancelled && initialLoad) setLoading(false);
      }
    }
    void loadData(true);
    const pollId = window.setInterval(() => void loadData(false), 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, [token]);

  useEffect(() => {
    if (stationData && isFollowingLive) setSelectedBlockIdx(stationData.activeBlockIndex);
  }, [stationData, isFollowingLive]);

  useEffect(() => {
    warnedAt.current.clear();
  }, [stationData?.activeBlockIndex]);

  // Player Map for Fast Lookup
  const playerMap = useMemo(() => {
    if (!stationData) return new Map<string, PublicStationPlayer>();
    return new Map(stationData.allPlayers.map(p => [p.id, p]));
  }, [stationData]);

  // Active Block for Viewing
  const viewedBlock = stationData?.allBlocks[selectedBlockIdx] || stationData?.currentBlock;
  const viewedAssignment = viewedBlock?.resourceAssignments.find(
    a => a.resourceId === stationData?.resource.id
  ) || stationData?.currentAssignment;

  const nextBlock = stationData?.allBlocks[selectedBlockIdx + 1];
  const nextAssignment = nextBlock?.resourceAssignments.find(
    a => a.resourceId === stationData?.resource.id
  );

  // Reconstruct the coach-controlled timer from persisted timestamps.
  useEffect(() => {
    if (!stationData || !viewedBlock) return;
    const isLive = selectedBlockIdx === stationData.activeBlockIndex;
    const timerState = isLive ? stationData.liveTimerState : undefined;
    const durationSeconds = timerState?.rotationDurationSeconds ?? (viewedBlock.durationMinutes || 12) * 60;
    const updateRemaining = () => {
      if (!timerState?.rotationStartedAt) {
        setSecondsRemaining(durationSeconds);
        return;
      }
      const endPoint = timerState.isPaused && timerState.pausedAt
        ? Date.parse(timerState.pausedAt)
        : Date.now();
      const elapsed = Math.max(0, Math.floor((endPoint - Date.parse(timerState.rotationStartedAt)) / 1000)
        - timerState.accumulatedPausedSeconds);
      setSecondsRemaining(Math.max(0, durationSeconds - elapsed));
    };
    updateRemaining();
    if (!timerState || timerState.isPaused) return;
    const intervalId = window.setInterval(updateRemaining, 1_000);
    return () => window.clearInterval(intervalId);
  }, [selectedBlockIdx, stationData, viewedBlock]);

  // Audio Alerts on 60s and 0s
  useEffect(() => {
    if (![60, 0].includes(secondsRemaining) || warnedAt.current.has(secondsRemaining)) return;
    warnedAt.current.add(secondsRemaining);
    if (soundEnabled) {
      try {
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const context = new AudioContextClass();
          const oscillator = context.createOscillator();
          oscillator.connect(context.destination);
          oscillator.frequency.value = secondsRemaining === 0 ? 880 : 660;
          oscillator.onended = () => { void context.close(); };
          oscillator.start();
          oscillator.stop(context.currentTime + 0.2);
        }
      } catch { /* AudioContext fallback */ }
    }
  }, [secondsRemaining, soundEnabled]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>🏏</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-gold, #f59e0b)' }}>Loading Station Run Plan...</div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Connecting to live session</div>
      </div>
    );
  }

  if (error || !stationData) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f19', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '16px', borderRadius: '12px', maxWidth: '400px' }}>
          <AlertTriangle size={32} style={{ color: '#ef4444', marginBottom: '8px' }} />
          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '4px' }}>Station Link Notice</div>
          <div style={{ fontSize: '0.85rem' }}>{error}</div>
        </div>
      </div>
    );
  }

  const isLiveBlock = selectedBlockIdx === stationData.activeBlockIndex;
  const isCentreWicket = stationData.resource.supportsCentreWicket || stationData.resource.type === 'centre_wicket';

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', padding: '14px', maxWidth: '580px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Station Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '14px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-gold, #f59e0b)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              STATION LEADER RUN MODE
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '2px 0 0 0', color: '#fff' }}>
              {stationData.resource.name}
            </h1>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
              {stationData.sessionTitle} · {stationData.sessionTime}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(prev => !prev)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={soundEnabled ? 'Mute buzzer' : 'Enable buzzer'}
            aria-label={soundEnabled ? 'Mute buzzer' : 'Enable buzzer'}
          >
            {soundEnabled ? <Volume2 size={16} color="#4ade80" /> : <VolumeX size={16} color="#94a3b8" />}
          </button>
        </div>

        {stationData.leaderPlayer && (
          <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, color: '#fef08a' }}>
            <Shield size={12} />
            Leader: {stationData.leaderPlayer.name}
          </div>
        )}
      </div>

      {/* Synchronized Hero Timer Card */}
      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '16px', textAlign: 'center', borderTop: isLiveBlock ? '4px solid #f59e0b' : '4px solid #4b5563' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={() => { setIsFollowingLive(false); setSelectedBlockIdx(prev => Math.max(0, prev - 1)); }}
            disabled={selectedBlockIdx === 0}
            style={{ background: 'none', border: 'none', color: selectedBlockIdx === 0 ? '#4b5563' : '#f59e0b', cursor: selectedBlockIdx === 0 ? 'default' : 'pointer', padding: '4px 8px' }}
          >
            <span className="sr-only">Previous block</span>
            <ChevronLeft size={20} />
          </button>

          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>BLOCK {selectedBlockIdx + 1} OF {stationData.totalBlocks}</span>
            {isLiveBlock && <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 900, padding: '2px 6px', borderRadius: '4px' }}>LIVE</span>}
          </div>

          <button
            type="button"
            onClick={() => { setIsFollowingLive(false); setSelectedBlockIdx(prev => Math.min(stationData.totalBlocks - 1, prev + 1)); }}
            disabled={selectedBlockIdx >= stationData.totalBlocks - 1}
            style={{ background: 'none', border: 'none', color: selectedBlockIdx >= stationData.totalBlocks - 1 ? '#4b5563' : '#f59e0b', cursor: selectedBlockIdx >= stationData.totalBlocks - 1 ? 'default' : 'pointer', padding: '4px 8px' }}
          >
            <span className="sr-only">Next block</span>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Timer Digits */}
        <div style={{ fontSize: '3.2rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.03em', color: secondsRemaining <= 60 ? '#ef4444' : '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          {formatTimer(secondsRemaining)}
        </div>

        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
          {viewedBlock?.startTime} – {viewedBlock?.endTime} ({viewedBlock?.durationMinutes || 12} mins)
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '0.75rem', color: '#94a3b8' }}>
          {isLiveBlock
            ? (stationData.liveTimerState?.isPaused ? 'Paused by head coach' : 'Synchronized with head coach')
            : 'Preview — timer is not running'}
          {!isFollowingLive && (
            <button
              type="button"
              onClick={() => setIsFollowingLive(true)}
              style={{ background: '#f59e0b', color: '#111827', border: 'none', padding: '5px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
            >
              Return to live block
            </button>
          )}
        </div>
      </div>

      {/* Scenario / Objectives Card */}
      {viewedAssignment?.centreWicketScenario && (
        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
            <Flame size={14} /> {viewedAssignment.centreWicketScenario.name || 'Match Simulation Scenario'}
          </div>
          <div style={{ marginTop: '6px', fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
            {viewedAssignment.centreWicketScenario.targetRuns ? `Chase ${viewedAssignment.centreWicketScenario.targetRuns} runs off ${viewedAssignment.centreWicketScenario.targetOversOrBalls || 24} balls` : 'Live Scenario'}
            {viewedAssignment.centreWicketScenario.wicketsRemaining ? ` (${viewedAssignment.centreWicketScenario.wicketsRemaining} wickets in hand)` : ''}
          </div>
          {stationData.sessionObjectives.length > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
              Focus: {stationData.sessionObjectives.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Active Roles in Station */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* Batters */}
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold, #f59e0b)', marginBottom: '8px' }}>
            <Target size={14} /> BATTERS IN LANE ({viewedAssignment?.batterPlayerIds.length || 0})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {viewedAssignment?.batterPlayerIds.map((pId, idx) => {
              const p = playerMap.get(pId);
              return (
                <div key={pId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#f59e0b', color: '#000', fontWeight: 900, width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem' }}>
                      {idx + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>{p?.name || pId}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {p?.primaryRole.replace(/_/g, ' ') || 'Batter'}{p?.battingHand ? ` · ${p.battingHand} hand` : ''}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', background: '#1e293b', padding: '2px 8px', borderRadius: '4px', color: '#cbd5e1' }}>
                    Batting
                  </span>
                </div>
              );
            })}
            {(!viewedAssignment || viewedAssignment.batterPlayerIds.length === 0) && (
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', padding: '4px 0' }}>
                No batters allocated to this block.
              </div>
            )}
          </div>
        </div>

        {/* Bowlers */}
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', marginBottom: '8px' }}>
            <Users size={14} /> BOWLING POD ({viewedAssignment?.bowlerPodPlayerIds.length || 0})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {viewedAssignment?.bowlerPodPlayerIds.map((pId) => {
              const p = playerMap.get(pId);
              return (
                <div key={pId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>{p?.name || pId}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {p?.bowlingStyle.replace(/_/g, ' ') || 'Bowler'}
                    </div>
                  </div>
                  {p?.workloadRestriction?.restrictedBowler && (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px' }}>
                      Restricted ({p.workloadRestriction.maxDeliveries || 24} balls)
                    </span>
                  )}
                </div>
              );
            })}
            {(!viewedAssignment || viewedAssignment.bowlerPodPlayerIds.length === 0) && (
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', padding: '4px 0' }}>
                {stationData.resource.type === 'bowling_machine_net' ? 'Bowling Machine Feeder' : 'No bowlers allocated.'}
              </div>
            )}
          </div>
        </div>

        {/* Wicketkeeper & Fielders (Centre Wicket) */}
        {isCentreWicket && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800, color: '#4ade80', marginBottom: '8px' }}>
              <Users size={14} /> FIELDING & WICKETKEEPER
            </div>

            {viewedAssignment?.wicketkeeperPlayerIds && viewedAssignment.wicketkeeperPlayerIds.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>🧤 Wicketkeeper:</div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#fff', marginTop: '2px' }}>
                  {viewedAssignment.wicketkeeperPlayerIds.map(id => playerMap.get(id)?.name).join(', ')}
                </div>
              </div>
            )}

            {viewedAssignment?.fieldingPlayerIds && viewedAssignment.fieldingPlayerIds.length > 0 && (
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>Fielders:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {viewedAssignment.fieldingPlayerIds.map(id => (
                    <span key={id} style={{ background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#e2e8f0' }}>
                      {playerMap.get(id)?.name || id}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Next Block On-Deck Preview */}
        {nextAssignment && (
          <div style={{ background: '#0f172a', border: '1px dashed #334155', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
              ON DECK (NEXT BLOCK {selectedBlockIdx + 2})
            </div>
            <div style={{ marginTop: '4px', fontSize: '0.82rem', color: '#cbd5e1' }}>
              <strong>Batters:</strong> {nextAssignment.batterPlayerIds.map(id => playerMap.get(id)?.name).join(' + ') || 'None'}
            </div>
            <div style={{ marginTop: '2px', fontSize: '0.75rem', color: '#64748b' }}>
              Tell batters to pad up now!
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding & Direct Link */}
      <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#64748b', marginTop: '12px', padding: '8px 0' }}>
        Inside Edge Cricket Coaching App · Station Delegation Mode
      </div>
    </div>
  );
};
