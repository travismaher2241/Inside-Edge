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
import { useToast } from '../../common/Toast';
import { AlertTriangle, ChevronDown, ChevronUp, X, Link, Copy, Play } from 'lucide-react';

interface ClubSessionWizardProps {
  teams: ClubTeam[];
  resources: TrainingResource[];
  players: Player[];
  savedTemplates: SavedClubTemplate[];
  rollingLedger: RollingFairnessLedger[];
  selectedTemplate?: SavedClubTemplate;
  currentSession?: ClubTrainingSession;
  onPersistDraft: (session: ClubTrainingSession) => void | Promise<void>;
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
  currentSession,
  onPersistDraft,
  onFinalise,
  onSaveTemplate: _onSaveTemplate,
  onClose
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const { showToast } = useToast();

  // Step 1: Session Setup
  const [sessionId] = useState<string>(() => currentSession?.id || `csess-${Date.now()}`);
  const [title, setTitle] = useState<string>(() => currentSession?.title ?? 'Thursday Training Session');
  const [date, setDate] = useState<string>(() => currentSession?.date ?? new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>(() => currentSession?.startTime ?? '18:00');
  const [finishTime, setFinishTime] = useState<string>(() => currentSession?.finishTime ?? '19:30');
  const [venueFacilityId, setVenueFacilityId] = useState<string>(() => currentSession?.venueFacilityId ?? resources.find(r => r.active)?.facilityId ?? 'fac-1');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() => currentSession?.includedTeamIds ?? teams.filter(t => t.active !== false).map(t => t.id));
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>(() => currentSession?.availableResourceIds ?? resources.filter(r => r.active).map(r => r.id));
  const [rotationBlockMins, setRotationBlockMins] = useState<number>(() => currentSession?.rotationDurationMinutes ?? 12);
  const defaultGroupingStrategy: GroupingStrategy = selectedTemplate?.groupingStrategy ?? currentSession?.defaultGroupingStrategy ?? 'graded';

  // Junior teams default to shorter rotation blocks (blueprint §14.2)
  const includesJuniorTeam = useMemo(
    () => teams.some(t => selectedTeamIds.includes(t.id) && t.juniorMode),
    [teams, selectedTeamIds]
  );
  useEffect(() => {
    if (currentSession || selectedTemplate) return;
    setRotationBlockMins(includesJuniorTeam ? 8 : 12);
  }, [currentSession, includesJuniorTeam, selectedTemplate]);

  const [sessionObjectives, setSessionObjectives] = useState<string[]>(() => currentSession?.sessionObjectives ?? [
    'New-ball decision making',
    'T20 Middle overs scenario',
    'Death bowling & yorkers'
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Step 2: Player Availability Records (Default to last session or player preference)
  const [availabilityRecords, setAvailabilityRecords] = useState<Record<string, PlayerAvailabilityRecord>>(() => {
    const initial: Record<string, PlayerAvailabilityRecord> = {};
    const lastSessionAttendeeIds = new Set(currentSession?.confirmedAttendingPlayerIds || []);
    const hasLastSession = lastSessionAttendeeIds.size > 0;

    players.forEach(p => {
      const isAttending = hasLastSession ? lastSessionAttendeeIds.has(p.id) : (p.trainingAvailability !== false);
      initial[p.id] = {
        playerId: p.id,
        status: isAttending ? 'attending' : 'not_attending',
        expectedArrivalTime: '18:00',
        expectedDepartureTime: '19:30',
        injurySorenessNotes: p.workloadRestriction?.notes || ''
      };
    });
    return initial;
  });

  // Derived Staff Assignments from Player profiles
  const staffAssignments = useMemo<Record<string, StaffPlayerAssignment>>(() => {
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
  }, [players]);

  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [showRationale, setShowRationale] = useState<boolean>(false);
  const [manualLocks] = useState<Record<string, boolean>>({});
  const [centreWicketScenario, setCentreWicketScenario] = useState<CentreWicketScenario | undefined>(() =>
    currentSession?.rotationPlan.flatMap(block => block.resourceAssignments).find(assignment => assignment.centreWicketScenario)?.centreWicketScenario
  );
  const [acknowledgedWarningCodes, setAcknowledgedWarningCodes] = useState<string[]>(() => currentSession?.acknowledgedWarningCodes ?? []);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTemplate) return;
    setRotationBlockMins(selectedTemplate.rotationDurationMinutes);
    setSessionObjectives(selectedTemplate.sessionObjectives);
    if (selectedTemplate.includedTeamIds?.length) setSelectedTeamIds(selectedTemplate.includedTeamIds);

    const isNetType = (type: string) => ['standard_net', 'spin_net', 'pace_new_ball_net', 'bowling_machine_net'].includes(type);
    const ruleTypes = selectedTemplate.resourceTypeRules ?? selectedTemplate.teamGroupRules.map(r => r.allocatedResourceType);
    const matchingIds = resources.filter(r => r.active && (
      ruleTypes.includes(r.type) ||
      (ruleTypes.some(rt => isNetType(rt)) && isNetType(r.type))
    )).map(r => r.id);

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
    return generateClubRotationPlan({
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
      rollingFairnessLedger: rollingLedger,
      groupingStrategy: defaultGroupingStrategy,
      templateGroupRules: selectedTemplate?.teamGroupRules,
      centreWicketScenario
    });
  }, [activeResources, attendingPlayers, teams, selectedTeamIds, availabilityRecords, staffAssignments, sessionObjectives, rotationBlockMins, startTime, finishTime, manualLocks, rollingLedger, defaultGroupingStrategy, selectedTemplate, centreWicketScenario]);

  // Plain-English "Why this plan?" explanation
  const rationale = useMemo(() => {
    if (!engineOutput) return '';
    return generateSessionRationale(engineOutput, sessionObjectives, {
      players: attendingPlayers,
      fairnessLedger: rollingLedger,
      manualLocks
    });
  }, [engineOutput, sessionObjectives, attendingPlayers, rollingLedger, manualLocks]);

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

  const acknowledgementWarnings = engineOutput?.validationResult?.warnings.filter(warning => warning.requiresAcknowledgement) ?? [];
  const hasUnacknowledgedWarnings = acknowledgementWarnings.some(warning => !acknowledgedWarningCodes.includes(warning.code));

  const buildSession = (status: ClubTrainingSession['status']): ClubTrainingSession => {
    if (!engineOutput) throw new Error('Unable to generate schedule. Check player attendance and resource inputs.');
    const rotationBlocks = engineOutput.rotationBlocks.map(block => ({
      id: block.blockId,
      title: `Rotation ${block.blockIndex + 1}`,
      type: 'rotation' as const,
      durationMinutes: block.durationMinutes,
      objective: sessionObjectives.join(', '),
      location: block.resourceAssignments.map(item => item.resourceName).join(', '),
      rotation: block
    }));
    const retainedActivityBlocks = currentSession?.blocks.filter(block => block.type !== 'rotation') ?? [];

    return {
      ...currentSession,
      id: sessionId,
      clubId: currentSession?.clubId ?? 'club-1',
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
      captainCoachAssignments: currentSession?.captainCoachAssignments ?? [],
      rotationPlan: engineOutput.rotationBlocks,
      manualLocks,
      fairnessSettings: { targetEqualBattingMinutes: feasibilityResult.fairBattingMinutesPerPlayer },
      defaultGroupingStrategy,
      planningVersion: (currentSession?.planningVersion ?? 0) + 1,
      rsvps: currentSession?.rsvps ?? {},
      liveAttendance: currentSession?.liveAttendance ?? {},
      blocks: [...retainedActivityBlocks, ...rotationBlocks],
      activeBlockIndex: currentSession?.activeBlockIndex ?? 0,
      activeRotationIndex: currentSession?.activeRotationIndex ?? 0,
      status,
      warnings: engineOutput.warnings,
      acknowledgedWarningCodes,
      rationale
    };
  };

  const persistDraftForInvitation = async (): Promise<ClubTrainingSession> => {
    if (!engineOutput) throw new Error('Generate a valid plan before sharing invitations.');
    const draft = buildSession('planned');
    await onPersistDraft(draft);
    return draft;
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

    const validation = engineOutput.validationResult;
    if (action === 'launch' && validation && !validation.canLaunch) {
      setErrorMessage(`Cannot launch live session: ${validation.hardErrors.map(e => e.message).join(' ')}`);
      return;
    }
    if (action === 'launch' && hasUnacknowledgedWarnings) {
      setErrorMessage('Review and acknowledge the highlighted safety warnings before launching.');
      return;
    }

    setIsSubmitting(true);
    const newSession = buildSession(action === 'launch' ? 'live' : 'planned');
    try {
      await onFinalise(newSession, action);
      showToast(action === 'launch' ? 'Live session launched!' : 'Session plan saved successfully.', 'success');
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save session.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div
        className="bottom-sheet-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="club-session-wizard-title"
        style={{ maxWidth: '960px', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: '14px' }}>
          <div>
            <div className="section-label-gold">
              CLUB TRAINING PLANNER
            </div>
            <div id="club-session-wizard-title" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              {selectedTemplate ? selectedTemplate.name : 'Create Training Session'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {scopeLabel}
            </div>
          </div>
          <button aria-label="Close training planner" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {errorMessage && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step Tabs Indicator */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          <button
            className={`btn ${step === 1 ? 'btn-gold' : 'btn-secondary'}`}
            onClick={() => setStep(1)}
            style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
          >
            1. Setup & Scope
          </button>
          <button
            className={`btn ${step === 2 ? 'btn-gold' : 'btn-secondary'}`}
            onClick={() => setStep(2)}
            style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
          >
            2. Attendance & Preview
          </button>
        </div>

        {/* STEP 1: Teams, Facilities, Timings */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Title & Date */}
            <div className="card card-compact">
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Session Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Thursday Club Practice"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Start Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Finish Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={finishTime}
                    onChange={e => setFinishTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '10px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Venue / Facility</label>
                <input
                  type="text"
                  className="form-input"
                  value={venueFacilityId}
                  onChange={e => setVenueFacilityId(e.target.value)}
                  placeholder="e.g. Main Oval"
                />
              </div>
            </div>

            <div className="card card-compact">
              <div className="section-label-gold">SESSION OBJECTIVES</div>
              <textarea
                className="form-input"
                rows={3}
                value={sessionObjectives.join('\n')}
                onChange={e => setSessionObjectives(e.target.value.split('\n').map(value => value.trim()).filter(Boolean))}
                placeholder="One objective per line"
                aria-label="Session objectives, one per line"
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Enter one objective per line so captains understand the purpose of each rotation.
              </div>
            </div>

            {/* Included Teams Multi-Select */}
            <div className="card card-compact">
              <div className="section-label-gold">
                INCLUDED SQUADS
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
                      {isSel ? '✓ ' : '+ '}{t.name}
                    </button>
                  );
                })}
              </div>
              {selectedTeamIds.length === 0 && (
                <div style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '6px' }}>
                  Please select at least 1 squad.
                </div>
              )}
            </div>

            {/* Rotation Length Settings */}
            <div className="card card-compact">
              <div className="flex-between">
                <div>
                  <div className="section-label-gold">
                    ROTATION INTERVAL
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Cadence per batting/bowling block
                  </div>
                </div>
                <select
                  value={rotationBlockMins}
                  onChange={e => setRotationBlockMins(Number(e.target.value))}
                  className="form-select"
                  style={{ width: 'auto', minWidth: '100px', fontSize: '0.85rem' }}
                >
                  <option value={8}>8 mins (Short)</option>
                  <option value={10}>10 mins</option>
                  <option value={12}>12 mins (Standard)</option>
                  <option value={15}>15 mins (Extended)</option>
                  <option value={20}>20 mins</option>
                </select>
              </div>

              {/* Feasibility Alert */}
              {!feasibilityResult.isFeasible && (
                <div style={{ marginTop: '10px', background: 'rgba(234, 179, 8, 0.12)', border: '1px solid #eab308', padding: '10px 12px', borderRadius: '6px', fontSize: '0.78rem', color: '#fde047' }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} /> Capacity Notice
                  </div>
                  <div>{feasibilityResult.feasibilityMessage}</div>
                </div>
              )}
            </div>

            {/* Training Areas Selection */}
            <div className="card card-compact">
              <div className="section-label-gold">
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
              Continue to Attendance & Plan Preview →
            </button>
          </div>
        )}

        {/* STEP 2: Attendance + Live Plan Preview + Start */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Attendance Bar */}
            <div className="card card-compact">
              <div className="flex-between" style={{ marginBottom: '10px' }}>
                <div>
                  <div className="section-label-gold">
                    WHO'S HERE
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {attendingPlayers.length} of {players.length} attending ({currentSession ? 'Defaulted to last session' : 'Defaulted to available'})
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={async () => {
                      try {
                        const savedDraft = await persistDraftForInvitation();
                        const msg = RsvpInvitationService.getGenericGroupAnnouncement(
                          savedDraft,
                          teams.find(t => selectedTeamIds.includes(t.id))
                        );
                        if (navigator.clipboard) await navigator.clipboard.writeText(msg);
                        showToast('Saved the plan and copied the WhatsApp announcement!', 'success');
                      } catch (error) {
                        showToast(error instanceof Error ? error.message : 'Unable to prepare the announcement.', 'error');
                      }
                    }}
                    style={{ width: 'auto', padding: '0 8px', height: '28px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Copy size={12} /> WhatsApp Notice
                  </button>
                  <button className="btn btn-secondary" onClick={markAllAttending} style={{ width: 'auto', padding: '0 8px', height: '28px', fontSize: '0.72rem' }}>
                    Mark All
                  </button>
                  <button className="btn btn-secondary" onClick={clearAllAttendance} style={{ width: 'auto', padding: '0 8px', height: '28px', fontSize: '0.72rem' }}>
                    Clear
                  </button>
                </div>
              </div>

              {/* Compact Attendance List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                {players.map(p => {
                  const rec = availabilityRecords[p.id] || { playerId: p.id, status: 'attending' };
                  const isPartial = rec.status === 'unsure';
                  const isAttending = rec.status === 'attending';

                  return (
                    <div key={p.id} className="attendance-compact-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-surface-elevated)', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {p.primaryRole.replace(/_/g, ' ')}
                        </span>
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
                              await persistDraftForInvitation();
                              const link = await RsvpInvitationService.getShareableLink(sessionId, p.id);
                              if (navigator.clipboard) await navigator.clipboard.writeText(link);
                              showToast(`Copied RSVP link for ${p.name}!`, 'success');
                            } catch (err: any) {
                              showToast(err.message || 'Error generating link.', 'error');
                            }
                          }}
                          style={{ width: 'auto', padding: '0 6px', height: '26px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title={`Generate 1-on-1 RSVP link for ${p.name}`}
                        >
                          <Link size={12} /> Link
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const nextStatus = isAttending ? 'not_attending' : rec.status === 'not_attending' ? 'unsure' : 'attending';
                            handleUpdateAvailability(p.id, { status: nextStatus });
                          }}
                          className={`badge ${isAttending ? 'badge-green' : isPartial ? 'badge-gold' : 'badge-warning'}`}
                          style={{ cursor: 'pointer', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 800 }}
                        >
                          {isAttending ? 'Attending' : isPartial ? 'Partial' : 'Unavailable'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Validation Hard Errors Alert */}
            {engineOutput?.validationResult && !engineOutput.validationResult.canLaunch && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', color: '#fca5a5', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <AlertTriangle size={16} /> Cannot Launch Live Session ({engineOutput.validationResult.hardErrors.length} Hard Issues)
                </div>
                <ul style={{ margin: '0 0 0 16px', padding: 0 }}>
                  {engineOutput.validationResult.hardErrors.map((err, idx) => (
                    <li key={idx} style={{ marginTop: '2px' }}>{err.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {engineOutput?.validationResult && engineOutput.validationResult.warnings.length > 0 && (
              <div style={{ background: 'rgba(234, 179, 8, 0.12)', border: '1px solid #eab308', borderRadius: '8px', padding: '12px', color: '#fde047', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <AlertTriangle size={16} /> Review Plan Warnings
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {engineOutput.validationResult.warnings.map((warning, warningIndex) => (
                    <label key={`${warning.code}-${warningIndex}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.35 }}>
                      {warning.requiresAcknowledgement ? (
                        <input
                          type="checkbox"
                          checked={acknowledgedWarningCodes.includes(warning.code)}
                          onChange={event => setAcknowledgedWarningCodes(previous => event.target.checked
                            ? [...new Set([...previous, warning.code])]
                            : previous.filter(code => code !== warning.code))}
                          aria-label={`Acknowledge warning: ${warning.message}`}
                        />
                      ) : <span aria-hidden="true">•</span>}
                      <span>{warning.message}{warning.requiresAcknowledgement ? ' Acknowledgement is required to launch.' : ''}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Live Generated Plan Preview */}
            <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-card)', borderLeft: '4px solid var(--accent-gold)' }}>
              <div className="flex-between">
                <div>
                  <div className="section-label-gold">
                    GENERATED PLAN PREVIEW
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                    {engineOutput?.rotationBlocks.length || 0} Rotations · {sessionDurationMins} Mins · {getPlanBalanceLabel(feasibilityResult.fairBattingMinutesPerPlayer)}
                  </div>
                </div>
                <span className={`badge ${feasibilityResult.isFeasible ? 'badge-green' : 'badge-warning'}`}>
                  {feasibilityResult.isFeasible ? 'Feasible' : 'Tight Capacity'}
                </span>
              </div>

              {/* Opportunity metrics pill row */}
              {engineOutput?.validationResult && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>Batting min: <strong>{engineOutput.validationResult.metrics.minBattingMinutes}m</strong></span>
                  <span>Median: <strong>{engineOutput.validationResult.metrics.medianBattingMinutes}m</strong></span>
                  <span>Max: <strong>{engineOutput.validationResult.metrics.maxBattingMinutes}m</strong></span>
                  <span>Gap: <strong>{engineOutput.validationResult.metrics.battingOpportunityGapMinutes}m</strong></span>
                </div>
              )}

              {/* Plain-English Rationale Collapsible */}
              {rationale && (
                <div style={{ marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowRationale(prev => !prev)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: 0 }}
                  >
                    {showRationale ? '▼ Hide Plan Rationale' : '▶ Why this plan?'}
                  </button>
                  {showRationale && (
                    <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                      {rationale}
                    </div>
                  )}
                </div>
              )}
            </div>

            {activeResources.find(r => r.supportsCentreWicket) && (
              <CentreWicketScenarioBuilder
                attendingPlayers={attendingPlayers.slice(0, 11)}
                scenario={centreWicketScenario}
                onSaveScenario={setCentreWicketScenario}
              />
            )}

            {/* Collapsible Rotation Blocks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {engineOutput?.rotationBlocks.map(block => {
                const isExp = expandedBlockId === block.blockId;

                return (
                  <div key={block.blockId} className="card" style={{ padding: '10px 12px', background: 'var(--bg-surface-card)' }}>
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setExpandedBlockId(isExp ? null : block.blockId)}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                          BLOCK {block.blockIndex + 1} ({block.startTime}–{block.endTime})
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {block.resourceAssignments.length} areas · {block.durationMinutes} min
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="btn btn-secondary" style={{ width: 'auto', padding: '0 8px', height: '24px', fontSize: '0.7rem' }}>
                          {isExp ? 'Hide' : 'View'}
                        </span>
                        {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>

                    {isExp && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {block.resourceAssignments.map(res => (
                          <div key={res.resourceId} style={{ background: 'var(--bg-surface-elevated)', padding: '6px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>
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

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>
                ← Back to Setup
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleFinalise('save')}
                disabled={isSubmitting || !engineOutput}
                style={{ flex: 1 }}
              >
                Save Draft Plan
              </button>
              <button
                className="btn btn-live"
                onClick={() => handleFinalise('launch')}
                disabled={isSubmitting || !engineOutput || hasUnacknowledgedWarnings || (engineOutput.validationResult != null && !engineOutput.validationResult.canLaunch)}
                style={{ flex: 2 }}
              >
                <Play size={16} /> Launch Live Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
