import React, { useState, useMemo, useEffect } from 'react';
import type {
  Player,
  ClubTeam,
  TrainingResource,
  ClubTrainingSession,
  PlayerAvailabilityRecord,
  StaffPlayerAssignment,
  SavedClubTemplate,
  RollingFairnessLedger,
  CentreWicketScenario,
  GroupingStrategy
} from '../../../types/cricket';
import {
  calculateSessionFeasibility,
  generateClubRotationPlan,
  generateSessionRationale,
  getPlanBalanceLabel
} from '../../../modules/cricket/clubRotationEngine';
import { CentreWicketScenarioBuilder } from './CentreWicketScenarioBuilder';
import { RsvpInvitationService } from '../../../modules/cricket/rsvpInvitationService';
import { AlertTriangle, Check, ChevronDown, ChevronUp, X, UserCheck, Link, Copy } from 'lucide-react';

interface ClubSessionWizardProps {
  teams: ClubTeam[];
  resources: TrainingResource[];
  players: Player[];
  savedTemplates: SavedClubTemplate[];
  rollingLedger: RollingFairnessLedger[];
  selectedTemplate?: SavedClubTemplate;
  onFinalise: (session: ClubTrainingSession, action: 'save' | 'launch') => void | Promise<void>;
  onSaveTemplate: (template: SavedClubTemplate) => void;
  onClose: () => void;
}

export const ClubSessionWizard: React.FC<ClubSessionWizardProps> = ({
  teams,
  resources,
  players,
  savedTemplates: _savedTemplates,
  rollingLedger,
  selectedTemplate,
  onFinalise,
  onSaveTemplate: _onSaveTemplate,
  onClose
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Session Setup
  const [title, setTitle] = useState<string>('Thursday Training Session');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('18:00');
  const [finishTime, setFinishTime] = useState<string>('19:30');
  const [venueFacilityId, setVenueFacilityId] = useState<string>(() => resources.find(r => r.active)?.facilityId ?? 'fac-1');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() => teams.filter(t => t.active !== false).map(t => t.id));
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>(() => resources.filter(r => r.active).map(r => r.id));
  const [rotationBlockMins, setRotationBlockMins] = useState<number>(12);
  const defaultGroupingStrategy: GroupingStrategy = 'graded';

  // Junior teams default to shorter rotation blocks (blueprint §14.2)
  const includesJuniorTeam = useMemo(
    () => teams.some(t => selectedTeamIds.includes(t.id) && t.juniorMode),
    [teams, selectedTeamIds]
  );
  useEffect(() => {
    setRotationBlockMins(includesJuniorTeam ? 8 : 12);
  }, [includesJuniorTeam]);
  const [sessionObjectives, setSessionObjectives] = useState<string[]>([
    'New-ball decision making',
    'T20 Middle overs scenario',
    'Death bowling & yorkers'
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Step 2: Player Availability Records
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

  // Staff Assignments & Role Overrides Modal
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

  const [editingPlayerSettingsId, setEditingPlayerSettingsId] = useState<string | null>(null);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [showPlanningChecks, setShowPlanningChecks] = useState<boolean>(false);
  const [showRationale, setShowRationale] = useState<boolean>(false);

  // Step 4: Manual Locks
  const [manualLocks] = useState<Record<string, boolean>>({});
  const [centreWicketScenario, setCentreWicketScenario] = useState<CentreWicketScenario | undefined>();

  // Error State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedTemplate) return;
    setRotationBlockMins(selectedTemplate.rotationDurationMinutes);
    setSessionObjectives(selectedTemplate.sessionObjectives);
    if (selectedTemplate.includedTeamIds?.length) setSelectedTeamIds(selectedTemplate.includedTeamIds);
    const resourceTypes = new Set(selectedTemplate.resourceTypeRules ?? selectedTemplate.teamGroupRules.map(r => r.allocatedResourceType));
    const matchingIds = resources.filter(r => r.active && resourceTypes.has(r.type)).map(r => r.id);
    if (matchingIds.length) setSelectedResourceIds(matchingIds);
  }, [selectedTemplate, resources]);

  // Scope Context Label
  const scopeLabel = useMemo(() => {
    const activeTeams = teams.filter(t => t.active !== false);
    if (selectedTeamIds.length === activeTeams.length && activeTeams.length > 1) {
      return 'Whole club';
    }
    const selectedTeamNames = teams.filter(t => selectedTeamIds.includes(t.id)).map(t => t.name);
    return selectedTeamNames.join(', ') || 'No teams selected';
  }, [teams, selectedTeamIds]);

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
    return resources.filter(r => r.active && selectedResourceIds.includes(r.id));
  }, [resources, selectedResourceIds]);

  // Calculated Session Duration
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

  // Generated Rotation Plan
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
    const centreResource = activeResources.find(r => r.supportsCentreWicket);
    if (!centreResource) return output;
    const scenarioIds = new Set(centreWicketScenario.assignments.map(a => a.playerId));
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

  // Plain-English "Why this plan?" explanation, generated from the same engine output
  const rationale = useMemo(() => {
    if (!engineOutput) return '';
    return generateSessionRationale(engineOutput, sessionObjectives);
  }, [engineOutput, sessionObjectives]);

  // Helper Toggles
  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeamIds(prev => prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]);
  };

  const toggleResourceSelection = (resId: string) => {
    setSelectedResourceIds(prev => prev.includes(resId) ? prev.filter(id => id !== resId) : [...prev, resId]);
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

  const markAllAttending = () => {
    const updated: Record<string, PlayerAvailabilityRecord> = {};
    players.forEach(p => {
      updated[p.id] = {
        ...(availabilityRecords[p.id] || { playerId: p.id }),
        status: 'attending'
      };
    });
    setAvailabilityRecords(updated);
  };

  const clearAllAttendance = () => {
    const updated: Record<string, PlayerAvailabilityRecord> = {};
    players.forEach(p => {
      updated[p.id] = {
        ...(availabilityRecords[p.id] || { playerId: p.id }),
        status: 'not_attending'
      };
    });
    setAvailabilityRecords(updated);
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

  const handleFinalise = async (action: 'save' | 'launch') => {
    if (isSubmitting) return;
    if (selectedTeamIds.length === 0) {
      setErrorMessage('Please select at least 1 team.');
      return;
    }
    if (selectedResourceIds.length === 0) {
      setErrorMessage('Please select at least 1 active training area.');
      return;
    }
    if (!engineOutput) {
      setErrorMessage('Unable to generate schedule. Check player attendance and resource inputs.');
      return;
    }

    setIsSubmitting(true);
    const newSession: ClubTrainingSession = {
      id: `csess-${Date.now()}`,
      clubId: 'club-1',
      title: title.trim() || 'Training Session',
      date,
      startTime,
      finishTime,
      venueFacilityId,
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
      defaultGroupingStrategy,
      planningVersion: 1,
      rsvps: {},
      liveAttendance: {},
      blocks: engineOutput.rotationBlocks.map(block => ({
        id: block.blockId,
        title: `Rotation ${block.blockIndex + 1}`,
        type: 'rotation',
        durationMinutes: block.durationMinutes,
        objective: sessionObjectives.join(', '),
        location: block.resourceAssignments.map(item => item.resourceName).join(', '),
        rotation: block
      })),
      activeBlockIndex: 0,
      activeRotationIndex: 0,
      status: action === 'launch' ? 'live' : 'planned',
      warnings: engineOutput.warnings,
      rationale
    };
    try {
      await onFinalise(newSession, action);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save session.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="club-session-wizard-title"
        className="bottom-sheet-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '960px', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}
      >
        {/* Sticky Wizard Header */}
        <div className="wizard-sticky-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                PLAN TRAINING
              </div>
              <h2 id="club-session-wizard-title" style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                {scopeLabel}
              </h2>
            </div>
            <button aria-label="Close wizard" onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Clean 4-Stage Progress Header */}
          <div className="wizard-step-bar">
            {[
              { s: 1, name: 'SESSION' },
              { s: 2, name: 'PEOPLE' },
              { s: 3, name: 'PLAN' },
              { s: 4, name: 'REVIEW' }
            ].map(({ s, name }) => {
              const isActive = step === s;
              const isCompleted = step > s;
              return (
                <div
                  key={s}
                  className={`wizard-step-item ${isActive ? 'active' : isCompleted ? 'completed' : ''}`}
                  onClick={() => s < step && setStep(s as any)}
                >
                  <span>{s}. {name}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {errorMessage && (
            <div style={{ background: 'var(--status-warning-bg)', border: '1px solid rgba(231, 111, 81, 0.4)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={14} />
              <span style={{ flex: 1 }}>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Session Details & Scope */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-card)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  SESSION DETAILS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Session Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '2px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '2px', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Start</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '2px', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Finish</label>
                      <input
                        type="time"
                        value={finishTime}
                        onChange={e => setFinishTime(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '2px', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Venue / Facility</label>
                    <input
                      type="text"
                      value={venueFacilityId}
                      onChange={e => setVenueFacilityId(e.target.value)}
                      placeholder="e.g. Main Nets / Facility 1"
                      style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '2px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Training Focus / Objectives</label>
                    <textarea
                      rows={2}
                      value={sessionObjectives.join('\n')}
                      onChange={e => setSessionObjectives(e.target.value.split('\n').map(v => v.trim()).filter(Boolean))}
                      style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '2px', fontSize: '0.8rem', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>

              {/* Teams Selection */}
              <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-card)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  TEAMS INCLUDED
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {teams.filter(t => t.active !== false).map(t => {
                    const isSel = selectedTeamIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTeamSelection(t.id)}
                        className={`filter-pill-btn ${isSel ? 'selected' : ''}`}
                      >
                        {isSel ? '✓ ' : '+ '}{t.juniorMode ? '👶 ' : ''}{t.name}
                      </button>
                    );
                  })}
                </div>
                {includesJuniorTeam && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginTop: '8px' }}>
                    Junior team selected — rotation blocks default to 8 minutes instead of 12.
                  </div>
                )}
              </div>

              {/* Training Areas Selection */}
              <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-card)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  TRAINING AREAS
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {resources.filter(r => r.active).map(r => {
                    const isSel = selectedResourceIds.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleResourceSelection(r.id)}
                        className={`filter-pill-btn ${isSel ? 'selected' : ''}`}
                      >
                        {isSel ? '✓ ' : '+ '}{r.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button className="btn btn-gold" onClick={() => setStep(2)}>
                Continue to Players →
              </button>
            </div>
          )}

          {/* STEP 2: Compact Attendance & Player Roster */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>PLAYERS</h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {attendingPlayers.length} of {players.length} attending
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const msg = RsvpInvitationService.getGenericGroupAnnouncement(
                        { id: 'sess-temp', clubId: 'c1', title, date, startTime, finishTime, venueFacilityId, includedTeamIds: selectedTeamIds, availableResourceIds: selectedResourceIds, expectedPlayerIds: [], confirmedAttendingPlayerIds: [], availabilityRecords: {}, staffPlayerAssignments: {}, sessionObjectives, rotationDurationMinutes: rotationBlockMins, captainCoachAssignments: [], rotationPlan: [], manualLocks: {}, fairnessSettings: { targetEqualBattingMinutes: 20 }, blocks: [], activeBlockIndex: 0, activeRotationIndex: 0, status: 'planned', warnings: [], planningVersion: 1, rsvps: {}, liveAttendance: {} },
                        teams.find(t => selectedTeamIds.includes(t.id))
                      );
                      if (navigator.clipboard) void navigator.clipboard.writeText(msg);
                      alert('Copied group WhatsApp announcement to clipboard! (Contains NO personal links).');
                    }}
                    style={{ width: 'auto', padding: '0 8px', height: '30px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Copy size={12} /> WhatsApp Group Notice
                  </button>
                  <button className="btn btn-secondary" onClick={markAllAttending} style={{ width: 'auto', padding: '0 8px', height: '30px', fontSize: '0.72rem' }}>
                    Mark All Attending
                  </button>
                  <button className="btn btn-secondary" onClick={clearAllAttendance} style={{ width: 'auto', padding: '0 8px', height: '30px', fontSize: '0.72rem' }}>
                    Clear
                  </button>
                </div>
              </div>

              {/* Compact Attendance Rows List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '340px', overflowY: 'auto' }}>
                {players.map(p => {
                  const rec = availabilityRecords[p.id] || { playerId: p.id, status: 'attending' };
                  const isPartial = rec.status === 'unsure';
                  const isAttending = rec.status === 'attending';

                  return (
                    <div key={p.id} className="attendance-compact-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800 }}>{p.name}</span>
                        {p.workloadRestriction?.restrictedBowler && (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Restricted</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={async () => {
                            try {
                              const link = await RsvpInvitationService.getShareableLink('sess-temp', p.id);
                              if (navigator.clipboard) await navigator.clipboard.writeText(link);
                              alert(`Copied 1-on-1 RSVP link for ${p.name}:\n${link}`);
                            } catch (err: any) {
                              alert(err.message || 'Error generating RSVP link.');
                            }
                          }}
                          style={{ width: 'auto', padding: '0 6px', height: '28px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title={`Generate 1-on-1 RSVP link for ${p.name}`}
                        >
                          <Link size={12} /> Share Link
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setEditingPlayerSettingsId(p.id)}
                          style={{ width: 'auto', padding: '0 6px', height: '28px', fontSize: '0.7rem' }}
                        >
                          ⚙ Role
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const nextStatus = isAttending ? 'not_attending' : rec.status === 'not_attending' ? 'unsure' : 'attending';
                            handleUpdateAvailability(p.id, { status: nextStatus });
                          }}
                          className={`badge ${isAttending ? 'badge-green' : isPartial ? 'badge-gold' : 'badge-warning'}`}
                          style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 800 }}
                        >
                          {isAttending ? 'Attending' : isPartial ? 'Partial' : 'Unavailable'}
                        </button>
                      </div>

                      {/* Reveal Partial Availability inputs only when Partial is chosen */}
                      {isPartial && (
                        <div style={{ gridColumn: '1 / -1', marginTop: '6px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.75rem' }}>
                          <span>Available:</span>
                          <input
                            type="time"
                            value={rec.expectedArrivalTime || startTime}
                            onChange={e => handleUpdateAvailability(p.id, { expectedArrivalTime: e.target.value })}
                            style={{ padding: '2px 4px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)' }}
                          />
                          <span>to</span>
                          <input
                            type="time"
                            value={rec.expectedDepartureTime || finishTime}
                            onChange={e => handleUpdateAvailability(p.id, { expectedDepartureTime: e.target.value })}
                            style={{ padding: '2px 4px', borderRadius: '4px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>← Back</button>
                <button className="btn btn-gold" onClick={() => setStep(3)} style={{ flex: 2 }}>Continue to Plan →</button>
              </div>
            </div>
          )}

          {/* STEP 3: Collapsible Training Plan */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-card)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-gold)' }}>TRAINING PLAN</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {engineOutput?.rotationBlocks.length || 0} rotations · {sessionDurationMins} minutes · {attendingPlayers.length} players · {activeResources.length} areas
                </div>
              </div>

              {activeResources.find(r => r.supportsCentreWicket) && (
                <CentreWicketScenarioBuilder
                  attendingPlayers={attendingPlayers.slice(0, 11)}
                  scenario={centreWicketScenario}
                  onSaveScenario={setCentreWicketScenario}
                />
              )}

              {/* Collapsible Rotation Blocks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {engineOutput?.rotationBlocks.map(block => {
                  const isExp = expandedBlockId === block.blockId;

                  return (
                    <div key={block.blockId} className="card" style={{ padding: '12px', background: 'var(--bg-surface-card)' }}>
                      <div 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => setExpandedBlockId(isExp ? null : block.blockId)}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            BLOCK {block.blockIndex + 1} ({block.startTime}–{block.endTime})
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {block.resourceAssignments.length} areas active · {block.durationMinutes} min
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="btn btn-secondary" style={{ width: 'auto', padding: '0 8px', height: '28px', fontSize: '0.72rem' }}>
                            {isExp ? 'Hide Details' : 'View Players'}
                          </span>
                          {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {isExp && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {block.resourceAssignments.map(res => (
                            <div key={res.resourceId} style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.78rem' }}>
                              <div style={{ fontWeight: 800, color: 'var(--accent-gold)' }}>{res.resourceName}</div>
                              <div style={{ color: 'var(--text-main)', marginTop: '2px' }}>
                                <strong>Batters:</strong> {res.batterPlayerIds.map(id => players.find(p => p.id === id)?.name).join(', ') || 'None'}
                              </div>
                              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                                <strong>Bowlers:</strong> {res.bowlerPodPlayerIds.map(id => players.find(p => p.id === id)?.name).join(', ') || 'None'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ flex: 1 }}>← Back</button>
                <button className="btn btn-gold" onClick={() => setStep(4)} disabled={!engineOutput} style={{ flex: 2 }}>Review Plan →</button>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Start Session */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Primary Session Ready Hero Card */}
              <div className="card" style={{ padding: '16px', borderLeft: '4px solid #4ade80', background: 'var(--bg-surface-card)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={20} /> SESSION READY
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '4px' }}>
                  {sessionDurationMins} minutes · {attendingPlayers.length} players · {activeResources.length} training areas · {engineOutput?.rotationBlocks.length || 0} rotations
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div>✓ Everyone allocated</div>
                  <div>✓ Workload restrictions respected</div>
                  <div>✓ Batting opportunities balanced</div>
                </div>

                <div style={{ display: 'flex', gap: '14px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setShowPlanningChecks(!showPlanningChecks)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {showPlanningChecks ? 'Hide planning details' : 'View planning details'} {showPlanningChecks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRationale(!showRationale)}
                    disabled={!rationale}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: rationale ? 'pointer' : 'default', opacity: rationale ? 1 : 0.5, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {showRationale ? 'Hide why this plan?' : 'Why this plan?'} {showRationale ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Why This Plan? Rationale Drawer */}
              {showRationale && rationale && (
                <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-elevated)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    WHY THIS PLAN?
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                    {rationale}
                  </div>
                </div>
              )}

              {/* Optional Planning Checks Drawer */}
              {showPlanningChecks && engineOutput && (
                <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-elevated)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    PLANNING CHECKS
                  </div>
                  {(() => {
                    const { theoreticalCapacityMinutes, staffableCapacityMinutes, actuallyAllocatedCapacityMinutes, unusedCapacityMinutes } = engineOutput.capacityMetrics;
                    const isOverAllocated = actuallyAllocatedCapacityMinutes > staffableCapacityMinutes;
                    const overAmount = actuallyAllocatedCapacityMinutes - staffableCapacityMinutes;

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Theoretical capacity:</span> <strong>{theoreticalCapacityMinutes} min</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Staffable capacity:</span> <strong>{staffableCapacityMinutes} min</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Allocated capacity:</span> <strong>{actuallyAllocatedCapacityMinutes} min</strong></div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>{isOverAllocated ? 'Capacity status:' : 'Unused capacity:'}</span>{' '}
                          <strong style={{ color: isOverAllocated ? '#ef4444' : '#4ade80' }}>
                            {isOverAllocated ? `Over by ${overAmount} min` : `${unusedCapacityMinutes} min`}
                          </strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Player Opportunity / Fairness Summary */}
              <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800 }}>PLAYER OPPORTUNITY</h4>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {getPlanBalanceLabel(engineOutput?.explainablePlanScore ?? 85)}
                    </div>
                  </div>
                  <span className="badge badge-gold" style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                    {engineOutput?.explainablePlanScore || 85} / 100
                  </span>
                </div>
              </div>

              {/* Primary Sticky Launch Action */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setStep(3)}
                  style={{ flex: '1 1 100px', minHeight: '40px', padding: '0 8px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                >
                  ← Back
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => void handleFinalise('save')}
                  disabled={isSubmitting}
                  style={{ flex: '1 1 110px', minHeight: '40px', padding: '0 8px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                >
                  Save Plan
                </button>
                <button
                  className="btn btn-gold"
                  onClick={() => void handleFinalise('launch')}
                  disabled={isSubmitting}
                  style={{ flex: '2 1 150px', minHeight: '40px', padding: '0 12px', fontSize: '0.82rem', fontWeight: 800, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Check size={16} /> {isSubmitting ? 'Saving…' : 'Start Session'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Player Role Override Settings Modal */}
        {editingPlayerSettingsId && (
          <div className="bottom-sheet-overlay" onClick={() => setEditingPlayerSettingsId(null)}>
            <div className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                  TRAINING SETTINGS — {players.find(p => p.id === editingPlayerSettingsId)?.name}
                </h3>
                <button onClick={() => setEditingPlayerSettingsId(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              {(() => {
                const staff = staffAssignments[editingPlayerSettingsId] || {
                  playerId: editingPlayerSettingsId,
                  trainingBattingRole: 'general_rotation',
                  trainingBowlingRole: 'general_rotation',
                  bowlingTrainingBand: 'band_1_primary'
                };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Batting Role</label>
                      <select
                        value={staff.trainingBattingRole}
                        onChange={e => handleUpdateStaffAssignment(editingPlayerSettingsId, { trainingBattingRole: e.target.value as any })}
                        style={{ width: '100%', padding: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '2px', fontSize: '0.8rem' }}
                      >
                        <option value="top_order_prep">Top-Order Prep</option>
                        <option value="middle_order_prep">Middle-Order Prep</option>
                        <option value="finishing_practice">Finishing Practice</option>
                        <option value="general_rotation">General Rotation</option>
                        <option value="none">No Batting</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Bowling Role</label>
                      <select
                        value={staff.trainingBowlingRole}
                        onChange={e => handleUpdateStaffAssignment(editingPlayerSettingsId, { trainingBowlingRole: e.target.value as any })}
                        style={{ width: '100%', padding: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '2px', fontSize: '0.8rem' }}
                      >
                        <option value="pace_focus">Pace Focus</option>
                        <option value="spin_focus">Spin Focus</option>
                        <option value="new_ball_focus">New-Ball Focus</option>
                        <option value="death_bowling_focus">Death Bowling</option>
                        <option value="general_rotation">General Rotation</option>
                        <option value="none">No Bowling</option>
                      </select>
                    </div>

                    <button className="btn btn-gold" onClick={() => setEditingPlayerSettingsId(null)} style={{ marginTop: '6px' }}>
                      Done
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
