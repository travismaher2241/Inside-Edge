import React, { useState, useMemo } from 'react';
import type {
  Player,
  ClubTeam,
  TrainingResource,
  ClubTrainingSession,
  PlayerAvailabilityRecord,
  StaffPlayerAssignment,
  SavedClubTemplate,
  RollingFairnessLedger,
  CentreWicketScenario
} from '../../../types/cricket';
import {
  calculateSessionFeasibility,
  generateClubRotationPlan,
  calculateSessionFairness
} from '../../../modules/cricket/clubRotationEngine';
import { FairnessReviewPanel } from './FairnessReviewPanel';
import { CentreWicketScenarioBuilder } from './CentreWicketScenarioBuilder';
import { TrainingTemplateManager } from './TrainingTemplateManager';
import { AlertTriangle, Check, ShieldAlert, Sparkles } from 'lucide-react';

interface ClubSessionWizardProps {
  teams: ClubTeam[];
  resources: TrainingResource[];
  players: Player[];
  savedTemplates: SavedClubTemplate[];
  rollingLedger: RollingFairnessLedger[];
  onSaveSession: (session: ClubTrainingSession) => void;
  onSaveTemplate: (template: SavedClubTemplate) => void;
  onClose: () => void;
}

export const ClubSessionWizard: React.FC<ClubSessionWizardProps> = ({
  teams,
  resources,
  players,
  savedTemplates,
  rollingLedger,
  onSaveSession,
  onSaveTemplate,
  onClose
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);

  // Step 1: Session Setup
  const [title, setTitle] = useState<string>('Club Thursday Training Session');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('18:00');
  const [finishTime, setFinishTime] = useState<string>('19:30');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() => teams.map(t => t.id));
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>(() => resources.map(r => r.id));
  const [rotationBlockMins, setRotationBlockMins] = useState<number>(12);
  const [sessionObjectives, setSessionObjectives] = useState<string[]>([
    'New-ball decision making',
    'T20 Middle overs scenario',
    'Death bowling & yorkers'
  ]);

  // Step 2: Player Availability Records (Player-controlled info only)
  const [availabilityRecords, setAvailabilityRecords] = useState<Record<string, PlayerAvailabilityRecord>>(() => {
    const initial: Record<string, PlayerAvailabilityRecord> = {};
    players.forEach(p => {
      initial[p.id] = {
        playerId: p.id,
        status: p.trainingAvailability ? 'attending' : 'not_attending',
        expectedArrivalTime: '18:00',
        expectedDepartureTime: '19:30',
        injurySorenessNotes: p.workloadRestriction?.notes || ''
      };
    });
    return initial;
  });

  // Step 3: Staff-Controlled Roles & Requests
  const [staffAssignments, setStaffAssignments] = useState<Record<string, StaffPlayerAssignment>>(() => {
    const initial: Record<string, StaffPlayerAssignment> = {};
    players.forEach(p => {
      let battingRole: StaffPlayerAssignment['trainingBattingRole'] = 'general_rotation';
      if (p.primaryRole === 'top_order_batter') battingRole = 'top_order_prep';
      else if (p.primaryRole === 'middle_order_batter') battingRole = 'middle_order_prep';

      let bowlingRole: StaffPlayerAssignment['trainingBowlingRole'] = 'general_rotation';
      if (p.primaryRole === 'pace_bowler') bowlingRole = 'pace_focus';
      else if (p.primaryRole === 'spin_bowler') bowlingRole = 'spin_focus';
      else if (p.bowlingStyle === 'does_not_bowl') bowlingRole = 'none';

      initial[p.id] = {
        playerId: p.id,
        trainingBattingRole: battingRole,
        trainingBowlingRole: bowlingRole,
        bowlingTrainingBand: p.workloadRestriction?.restrictedBowler ? 'restricted' : 'band_1_primary',
        workloadLimitDeliveries: p.workloadRestriction?.maxDeliveries
      };
    });
    return initial;
  });

  // Step 4: Manual Locks
  const [manualLocks] = useState<Record<string, boolean>>({});
  const [centreWicketScenario, setCentreWicketScenario] = useState<CentreWicketScenario | undefined>();

  // Error State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derived Active Attending Players
  const attendingPlayers = useMemo(() => {
    const selectedSquadIds = new Set(teams.filter(t => selectedTeamIds.includes(t.id)).flatMap(t => t.squadPlayerIds || []));
    const restrictToSquads = selectedSquadIds.size > 0;
    return players.filter(p => {
      if (restrictToSquads && !selectedSquadIds.has(p.id)) return false;
      const rec = availabilityRecords[p.id];
      return rec ? rec.status !== 'not_attending' : p.trainingAvailability !== false;
    });
  }, [players, teams, selectedTeamIds, availabilityRecords]);

  // Derived Selected Resources
  const activeResources = useMemo(() => {
    return resources.filter(r => selectedResourceIds.includes(r.id));
  }, [resources, selectedResourceIds]);

  // Calculated Session Feasibility
  const sessionDurationMins = useMemo(() => {
    const sMins = (Number(startTime.split(':')[0]) || 18) * 60 + (Number(startTime.split(':')[1]) || 0);
    const fMins = (Number(finishTime.split(':')[0]) || 19) * 60 + (Number(finishTime.split(':')[1]) || 30);
    return Math.max(15, fMins - sMins);
  }, [startTime, finishTime]);

  const feasibilityResult = useMemo(() => {
    return calculateSessionFeasibility({
      availableResources: activeResources,
      attendingPlayers,
      staffAssignments,
      availabilityRecords,
      sessionDurationMinutes: sessionDurationMins,
      rotationBlockDurationMinutes: rotationBlockMins
    });
  }, [activeResources, attendingPlayers, staffAssignments, availabilityRecords, sessionDurationMins, rotationBlockMins]);

  // Generated Rotation Plan Preview
  const engineOutput = useMemo(() => {
    if (attendingPlayers.length === 0 || activeResources.length === 0) return null;
    const output = generateClubRotationPlan({
      resources: activeResources,
      players: attendingPlayers,
      teams: teams.filter(t => selectedTeamIds.includes(t.id)),
      availability: availabilityRecords,
      staffAssignments,
      sessionObjectives,
      rotationBlockDurationMinutes: rotationBlockMins,
      sessionStartTime: startTime,
      sessionFinishTime: finishTime,
      manualLocks,
      rollingFairnessLedger: rollingLedger
    });
    if (!centreWicketScenario) return output;
    const centreResource = activeResources.find(resource => resource.supportsCentreWicket);
    if (!centreResource) return output;
    const scenarioIds = new Set(centreWicketScenario.assignments.map(assignment => assignment.playerId));
    const arrays = ['batterPlayerIds', 'bowlerPodPlayerIds', 'wicketkeeperPlayerIds', 'feederPlayerIds', 'fieldingPlayerIds', 'restPlayerIds'] as const;
    return {
      ...output,
      rotationBlocks: output.rotationBlocks.map(block => ({
        ...block,
        unassignedPlayerIds: block.unassignedPlayerIds.filter(id => !scenarioIds.has(id)),
        resourceAssignments: block.resourceAssignments.map(assignment => {
          if (assignment.resourceId !== centreResource.id) {
            const filtered = { ...assignment };
            arrays.forEach(key => { filtered[key] = filtered[key].filter(id => !scenarioIds.has(id)); });
            return filtered;
          }
          const roles = (roleNames: CentreWicketScenario['assignments'][number]['role'][]) => centreWicketScenario.assignments.filter(item => roleNames.includes(item.role)).map(item => item.playerId);
          return {
            ...assignment,
            leaderId: centreWicketScenario.namedLeaderId,
            batterPlayerIds: roles(['batter']),
            bowlerPodPlayerIds: roles(['bowler', 'next_bowler']),
            wicketkeeperPlayerIds: roles(['wicketkeeper']),
            feederPlayerIds: [],
            fieldingPlayerIds: roles(['close_fielder', 'ring_fielder', 'boundary_fielder']),
            restPlayerIds: roles(['next_batting_pair', 'rest']),
            centreWicketScenario
          };
        })
      }))
    };
  }, [activeResources, attendingPlayers, teams, selectedTeamIds, availabilityRecords, staffAssignments, sessionObjectives, rotationBlockMins, startTime, finishTime, manualLocks, rollingLedger, centreWicketScenario]);

  // Helper Toggles
  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeamIds(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  };

  const toggleResourceSelection = (resId: string) => {
    setSelectedResourceIds(prev =>
      prev.includes(resId) ? prev.filter(id => id !== resId) : [...prev, resId]
    );
  };

  const handleUpdateAvailability = (playerId: string, update: Partial<PlayerAvailabilityRecord>) => {
    setAvailabilityRecords(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        playerId,
        status: prev[playerId]?.status || 'attending',
        ...update
      }
    }));
  };

  const handleUpdateStaffAssignment = (playerId: string, update: Partial<StaffPlayerAssignment>) => {
    setStaffAssignments(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        playerId,
        trainingBattingRole: prev[playerId]?.trainingBattingRole || 'general_rotation',
        trainingBowlingRole: prev[playerId]?.trainingBowlingRole || 'general_rotation',
        bowlingTrainingBand: prev[playerId]?.bowlingTrainingBand || 'band_1_primary',
        ...update
      }
    }));
  };

  const handleFinalise = () => {
    if (selectedTeamIds.length === 0) {
      setErrorMessage('Please select at least 1 team for this training session.');
      return;
    }
    if (selectedResourceIds.length === 0) {
      setErrorMessage('Please select at least 1 active training resource.');
      return;
    }
    if (!engineOutput) {
      setErrorMessage('Unable to generate schedule. Check player attendance and resource inputs.');
      return;
    }

    const newSession: ClubTrainingSession = {
      id: `csess-${Date.now()}`,
      clubId: 'club-1',
      title: title.trim() || 'Club Training Session',
      date,
      startTime,
      finishTime,
      venueFacilityId: 'fac-1',
      includedTeamIds: selectedTeamIds,
      availableResourceIds: selectedResourceIds,
      expectedPlayerIds: attendingPlayers.map(p => p.id),
      confirmedAttendingPlayerIds: attendingPlayers.map(p => p.id),
      availabilityRecords,
      staffPlayerAssignments: staffAssignments,
      sessionObjectives,
      rotationDurationMinutes: rotationBlockMins,
      captainCoachAssignments: [],
      rotationPlan: engineOutput.rotationBlocks,
      manualLocks,
      fairnessSettings: { targetEqualBattingMinutes: feasibilityResult.fairBattingMinutesPerPlayer },
      status: 'planned',
      warnings: engineOutput.warnings
    };

    onSaveSession(newSession);
    onClose();
  };

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
              CLUB TRAINING PLANNER WIZARD
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Create Whole-Club Training Session</h2>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ width: 'auto', padding: '0 10px', height: '32px' }}>
            ✕
          </button>
        </div>

        {/* 7-Step Navigation Bar */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '16px', background: 'var(--bg-surface-elevated)', padding: '4px', borderRadius: '10px' }}>
          {[1, 2, 3, 4, 5, 6, 7].map(sNum => (
            <button
              key={sNum}
              type="button"
              onClick={() => setStep(sNum as any)}
              style={{
                flex: 1,
                minWidth: '70px',
                padding: '6px 2px',
                borderRadius: '6px',
                border: 'none',
                background: step === sNum ? 'var(--primary-green)' : 'transparent',
                color: step === sNum ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.7rem',
                cursor: 'pointer'
              }}
            >
              STEP {sNum}
            </button>
          ))}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{ background: 'var(--status-warning-bg)', border: '1px solid rgba(231, 111, 81, 0.4)', padding: '8px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.8rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} />
            <span style={{ flex: 1 }}>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Session Setup */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>SESSION TITLE</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '8px', marginTop: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>DATE</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>START TIME</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>FINISH TIME</label>
                <input
                  type="time"
                  value={finishTime}
                  onChange={e => setFinishTime(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
                />
              </div>
            </div>

            {/* Dynamic Team Selector */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '6px', display: 'block' }}>
                INCLUDED CLUB TEAMS ({selectedTeamIds.length}/{teams.length})
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {teams.map(t => {
                  const isSel = selectedTeamIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTeamSelection(t.id)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: isSel ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                        background: isSel ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                        color: isSel ? 'var(--accent-gold)' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      {isSel ? '✓ ' : '+ '}{t.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Facility / Resource Selector */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '6px', display: 'block' }}>
                AVAILABLE TRAINING RESOURCES NIGHT ({selectedResourceIds.length}/{resources.length})
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {resources.map(r => {
                  const isSel = selectedResourceIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleResourceSelection(r.id)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: isSel ? '2px solid var(--primary-green-light)' : '1px solid var(--border-light)',
                        background: isSel ? 'rgba(38, 107, 87, 0.2)' : 'var(--bg-surface-elevated)',
                        color: isSel ? 'var(--text-main)' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      {isSel ? '✓ ' : '+ '}{r.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => setStep(2)}>
              NEXT: ATTENDANCE & AVAILABILITY →
            </button>
          </div>
        )}

        {/* STEP 2: Attendance Board */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                  ATTENDANCE & PARTIAL AVAILABILITY
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {attendingPlayers.length} of {players.length} players attending tonight
                </div>
              </div>
            </div>

            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {players.map(p => {
                const rec = availabilityRecords[p.id] || { playerId: p.id, status: 'attending' };
                const isAttending = rec.status === 'attending';

                return (
                  <div key={p.id} style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Window: {rec.expectedArrivalTime || '18:00'} - {rec.expectedDepartureTime || '19:30'}
                        {rec.injurySorenessNotes && ` • Note: ${rec.injurySorenessNotes}`}
                      </div>

                      {/* Player Non-Binding Request Display */}
                      {rec.requestComment && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontStyle: 'italic', marginTop: '2px' }}>
                          💬 Player Request (Non-binding): "{rec.requestComment}"
                        </div>
                      )}
                    </div>

                    <select
                      value={rec.status}
                      onChange={e => handleUpdateAvailability(p.id, { status: e.target.value as any })}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface-card)',
                        border: isAttending ? '1px solid var(--primary-green-light)' : '1px solid var(--border-gold)',
                        color: isAttending ? '#4ade80' : '#f97316',
                        fontWeight: 700,
                        fontSize: '0.75rem'
                      }}
                    >
                      <option value="attending">Attending</option>
                      <option value="not_attending">Not Attending</option>
                      <option value="unsure">Unsure</option>
                    </select>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>← BACK</button>
              <button className="btn btn-primary" onClick={() => setStep(3)} style={{ flex: 1 }}>NEXT: STAFF ROLES →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Staff-Controlled Roles & Requests */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(229, 169, 60, 0.1)', border: '1px solid var(--border-gold)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--accent-gold)' }}>
              <ShieldAlert size={14} style={{ display: 'inline', marginRight: '4px' }} />
              <strong>CRITICAL PERMISSION RULE:</strong> Only captains and coaches assign training roles, bowling bands, priority preparation, and workload limits. Player requests are non-binding comments until staff approved.
            </div>

            <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {attendingPlayers.map(p => {
                const staff = staffAssignments[p.id] || {
                  playerId: p.id,
                  trainingBattingRole: 'general_rotation',
                  trainingBowlingRole: 'general_rotation',
                  bowlingTrainingBand: 'band_1_primary'
                };
                const rec = availabilityRecords[p.id];

                return (
                  <div key={p.id} style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{p.name}</span>
                      {rec?.requestComment && (
                        <button
                          type="button"
                          onClick={() => handleUpdateAvailability(p.id, { requestApprovedByStaff: !rec.requestApprovedByStaff })}
                          className={`badge ${rec.requestApprovedByStaff ? 'badge-green' : 'badge-gold'}`}
                          style={{ cursor: 'pointer' }}
                        >
                          {rec.requestApprovedByStaff ? '✓ Request Approved' : '+ Approve Request'}
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                      <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>BATTING ROLE</label>
                        <select
                          value={staff.trainingBattingRole}
                          onChange={e => handleUpdateStaffAssignment(p.id, { trainingBattingRole: e.target.value as any })}
                          style={{ width: '100%', padding: '4px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '4px', fontSize: '0.7rem' }}
                        >
                          <option value="new_ball_prep">New-Ball Prep</option>
                          <option value="top_order_prep">Top-Order Prep</option>
                          <option value="middle_order_prep">Middle-Order Prep</option>
                          <option value="finishing_practice">Finishing Practice</option>
                          <option value="general_rotation">General Rotation</option>
                          <option value="none">No Batting</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>BOWLING ROLE</label>
                        <select
                          value={staff.trainingBowlingRole}
                          onChange={e => handleUpdateStaffAssignment(p.id, { trainingBowlingRole: e.target.value as any })}
                          style={{ width: '100%', padding: '4px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '4px', fontSize: '0.7rem' }}
                        >
                          <option value="pace_focus">Pace Focus</option>
                          <option value="spin_focus">Spin Focus</option>
                          <option value="new_ball_focus">New-Ball Focus</option>
                          <option value="death_bowling_focus">Death Bowling</option>
                          <option value="general_rotation">General Rotation</option>
                          <option value="none">No Bowling</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>BOWLING BAND</label>
                        <select
                          value={staff.bowlingTrainingBand}
                          onChange={e => handleUpdateStaffAssignment(p.id, { bowlingTrainingBand: e.target.value as any })}
                          style={{ width: '100%', padding: '4px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '4px', fontSize: '0.7rem' }}
                        >
                          <option value="band_1_primary">Band 1 (Primary)</option>
                          <option value="band_2_support">Band 2 (Support)</option>
                          <option value="band_3_developing">Band 3 (Developing)</option>
                          <option value="restricted">Restricted</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ flex: 1 }}>← BACK</button>
              <button className="btn btn-primary" onClick={() => setStep(4)} style={{ flex: 1 }}>NEXT: ALLOCATION BOARD →</button>
            </div>
          </div>
        )}

        {/* STEP 4: Facility Allocation & Saved Templates */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <TrainingTemplateManager
              templates={savedTemplates}
              onApplyTemplate={tmpl => {
                setRotationBlockMins(tmpl.rotationDurationMinutes);
                setSessionObjectives(tmpl.sessionObjectives);
              }}
              onSaveTemplate={onSaveTemplate}
            />

            {activeResources.find(resource => resource.supportsCentreWicket) && (
              <CentreWicketScenarioBuilder
                attendingPlayers={attendingPlayers.filter(player => {
                  const record = availabilityRecords[player.id];
                  return (!record?.expectedArrivalTime || record.expectedArrivalTime <= startTime) && (!record?.expectedDepartureTime || record.expectedDepartureTime >= finishTime);
                }).slice(0, activeResources.find(resource => resource.supportsCentreWicket)!.maxTotalParticipants)}
                scenario={centreWicketScenario}
                onSaveScenario={setCentreWicketScenario}
              />
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(3)} style={{ flex: 1 }}>← BACK</button>
              <button className="btn btn-primary" onClick={() => setStep(5)} style={{ flex: 1 }}>NEXT: GENERATE ROTATIONS →</button>
            </div>
          </div>
        )}

        {/* STEP 5: Rotation Generation Preview */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
              GENERATED SCHEDULE PREVIEW ({engineOutput?.rotationBlocks.length || 0} ROTATION BLOCKS)
            </div>

            {engineOutput?.rotationBlocks.map(block => (
              <div key={block.blockId} className="card" style={{ padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                    BLOCK {block.blockIndex + 1} ({block.startTime} - {block.endTime})
                  </span>
                  <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{block.durationMinutes} MINS</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {block.resourceAssignments.map(res => (
                    <div key={res.resourceId} style={{ background: 'var(--bg-surface-elevated)', padding: '8px', borderRadius: '6px', fontSize: '0.75rem' }}>
                      <strong style={{ color: 'var(--accent-gold)' }}>{res.resourceName}:</strong> Batters: {res.batterPlayerIds.map(id => players.find(p => p.id === id)?.name).join(', ') || 'None'} | Bowlers: {res.bowlerPodPlayerIds.map(id => players.find(p => p.id === id)?.name).join(', ') || 'None'}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(4)} style={{ flex: 1 }}>← BACK</button>
              <button className="btn btn-primary" onClick={() => setStep(6)} style={{ flex: 1 }}>NEXT: REVIEW FEASIBILITY & FAIRNESS →</button>
            </div>
          </div>
        )}

        {/* STEP 6: Review Fairness & Feasibility */}
        {step === 6 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Feasibility Alert Card */}
            <div className="card" style={{ padding: '14px', borderLeft: feasibilityResult.isFeasible ? '4px solid #4ade80' : '4px solid #f97316' }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: feasibilityResult.isFeasible ? '#4ade80' : '#f97316', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} /> Capacity & Feasibility Audit
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '4px', lineHeight: 1.4 }}>
                {feasibilityResult.feasibilityMessage}
              </div>

              {feasibilityResult.warnings.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {feasibilityResult.warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: '#f97316' }}>⚠️ {w}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Fairness Audit Panel */}
            <FairnessReviewPanel
              players={players}
              sessionRecords={engineOutput ? calculateSessionFairness({
                id: 'preview',
                clubId: 'club-1',
                title,
                date,
                startTime,
                finishTime,
                venueFacilityId: 'fac-1',
                includedTeamIds: selectedTeamIds,
                availableResourceIds: selectedResourceIds,
                expectedPlayerIds: attendingPlayers.map(p => p.id),
                confirmedAttendingPlayerIds: attendingPlayers.map(p => p.id),
                availabilityRecords,
                staffPlayerAssignments: staffAssignments,
                sessionObjectives,
                rotationDurationMinutes: rotationBlockMins,
                captainCoachAssignments: [],
                rotationPlan: engineOutput.rotationBlocks,
                manualLocks,
                fairnessSettings: { targetEqualBattingMinutes: feasibilityResult.fairBattingMinutesPerPlayer },
                status: 'draft',
                warnings: engineOutput.warnings
              }, players) : []}
              rollingLedger={rollingLedger}
              fairnessScore={engineOutput?.explainablePlanScore || 90}
              unsatisfiedSoftConstraints={engineOutput?.unsatisfiedSoftConstraints}
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(5)} style={{ flex: 1 }}>← BACK</button>
              <button className="btn btn-gold" onClick={() => setStep(7)} style={{ flex: 1 }}>NEXT: FINALISE & LOCK →</button>
            </div>
          </div>
        )}

        {/* STEP 7: Finalise & Run */}
        {step === 7 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
            <div className="card" style={{ padding: '24px', borderLeft: '4px solid var(--accent-gold)' }}>
              <Check size={36} color="var(--accent-gold)" style={{ margin: '0 auto 10px auto' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Ready to Lock & Run Session</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Your training schedule for "{title}" ({attendingPlayers.length} players across {activeResources.length} resources) is calculated and ready.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(6)} style={{ flex: 1 }}>
                ← BACK TO AUDIT
              </button>
              <button className="btn btn-gold" onClick={handleFinalise} style={{ flex: 2 }}>
                <Check size={16} /> LOCK & LAUNCH LIVE MODE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
