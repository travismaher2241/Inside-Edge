// Core Types for Inside Edge Cricket Coaching App

export type PrimaryRole = 
  | 'top_order_batter'
  | 'middle_order_batter'
  | 'all_rounder'
  | 'pace_bowler'
  | 'spin_bowler'
  | 'wicketkeeper';

export type SecondaryRole = PrimaryRole | 'none';

export type BattingHand = 'right' | 'left';

export type BowlingStyle = 
  | 'right_arm_fast'
  | 'right_arm_fast_medium'
  | 'right_arm_off_spin'
  | 'right_arm_leg_spin'
  | 'left_arm_fast_medium'
  | 'left_arm_orthodox'
  | 'left_arm_unorthodox'
  | 'does_not_bowl';

export type WicketkeepingCapability = 'primary' | 'backup' | 'none';

export type DevelopmentDomain = 
  | 'Batting' 
  | 'Bowling' 
  | 'Fielding' 
  | 'Wicketkeeping' 
  | 'Tactical' 
  | 'Physical' 
  | 'Team';

export type FocusState = 'Current Focus' | 'Developing' | 'Consistent' | 'Strength' | 'Archived';

import type { BowlerCapability, BatterObservation, TacticalPhase, FieldSpot } from '../modules/cricket/tactics/types';

export type ActiveScopeMode = 'team' | 'club';

export interface ActiveScope {
  mode: ActiveScopeMode;
  teamId?: string; // Present when mode === 'team'
}

export interface WorkloadRestriction {
  maxDeliveries?: number;
  restrictedBowler: boolean;
  notes?: string;
}

export interface Player {
  id: string;
  name: string;
  photoUrl?: string;
  preferredName?: string;
  ageGroup?: string;
  primaryTeamId?: string; // Team ID the player primarily belongs to (e.g., 't1')
  eligibleTeamIds?: string[]; // Optional secondary/eligible team IDs
  primaryRole: PrimaryRole;
  secondaryRole: SecondaryRole;
  battingHand: BattingHand;
  bowlingStyle: BowlingStyle;
  wicketkeepingCapability: WicketkeepingCapability;
  trainingAvailability: boolean;
  workloadRestriction?: WorkloadRestriction;
  activeDevelopmentFocusIds: string[];
  // Bowling Profile Extensions
  capabilities?: BowlerCapability[];
  controlRating?: 1 | 2 | 3 | 4 | 5;
  availableVariations?: string[];
  preferredPhases?: TacticalPhase[];
  tacticalNotes?: string;
}

export type LaneType = 'standard' | 'machine' | 'spin' | 'centre_strip' | 'indoor';

export interface NetLane {
  id: string;
  name: string; // e.g. "Lane 1 - New Ball"
  laneType: LaneType;
  laneObjective: string; // e.g. "New-ball decision making"
  maxBatters: number;
  maxBowlers: number;
  maxFeeders?: number;
  assignedCoach?: string;
}

export interface Facility {
  id: string;
  name: string;
  netLanes: NetLane[];
  outfieldAvailable: boolean;
  centreWicketAvailable: boolean;
}

export type ObservationTag = 
  | 'Good execution' 
  | 'Needs work' 
  | 'Decision' 
  | 'Technique' 
  | 'Intent' 
  | 'Workload' 
  | 'Custom Note';

export interface Observation {
  id: string;
  playerId: string;
  timestamp: string; // ISO String
  source: 'training' | 'match';
  tag: ObservationTag;
  textNote: string;
  focusId?: string; // Linked development focus
  sessionId?: string;
  coachName?: string;
  visibility?: 'all_coaches' | 'head_coach_only';
}

export interface DevelopmentFocus {
  id: string;
  playerId: string;
  domain: DevelopmentDomain;
  focusStatement: string; // e.g. "Decision-making outside off stump"
  state: FocusState;
  why: string; // e.g. "3 dismissals driving away from body in last match"
  startDate: string; // ISO date
  reviewDate: string; // ISO date
  evidenceObservationIds: string[];
  coachSummary: string;
  visibility?: 'all_coaches' | 'head_coach_only';
}

export type CoachRole = 'head_coach' | 'assistant_coach';

export interface CoachUser {
  uid: string;
  email: string;
  displayName: string;
  role: CoachRole;
  inviteId?: string;
  createdAt: string;
}

export interface CoachInvite {
  id: string;
  token: string;
  role: CoachRole;
  createdByUid: string;
  createdByName: string;
  createdAt: string;
  used: boolean;
  usedByEmail?: string;
  usedByUid?: string;
}


export interface Activity {
  id: string;
  name: string;
  purpose: string; // Problem it addresses, e.g. "Playing seam bowling under pressure"
  category: DevelopmentDomain;
  minPlayers: number;
  maxPlayers: number;
  durationMinutes: number;
  spaceRequired: 'net' | 'pitch' | 'outfield' | 'small_grid' | 'indoor';
  equipment: string[];
  setupSteps: string[];
  coachingPoints: string[];
  constraints: string[];
  progressions: string[];
  safetyNotes?: string;
  participationDensity: 'High' | 'Medium' | 'Low';
  tags: string[];
}

export interface LaneAssignment {
  laneId: string;
  laneObjective: string;
  batterPlayerIds: string[];
  bowlerPlayerIds: string[];
  keeperPlayerIds: string[];
  feederPlayerIds: string[];
  coachAssigned?: string;
  lockedAssignment?: boolean;
}

export interface RotationPlan {
  id: string;
  rotationIndex: number;
  durationMinutes: number;
  lanes: LaneAssignment[];
  outfieldPlayerIds: string[];
  unassignedPlayerIds: string[];
  alerts: string[];
}

export type BlockType = 'warmup' | 'fielding' | 'rotation' | 'scenario' | 'review';

export interface SessionBlock {
  id: string;
  title: string;
  blockType: BlockType;
  durationMinutes: number;
  activityId?: string;
  location: string; // e.g. "Outfield", "Nets 1-3", "Centre Pitch"
  assignedCoach?: string;
  objective: string;
  rotationPlan?: RotationPlan;
}

export type SessionStatus = 'draft' | 'planned' | 'live' | 'completed';

export interface TrainingSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  status: SessionStatus;
  expectedPlayerIds: string[];
  facilityId: string;
  primaryObjectives: string[];
  secondaryObjectives?: string[];
  blocks: SessionBlock[];
  activeBlockIndex: number;
  activeRotationIndex: number;
  notes?: string;
  rationale?: string;
}

export interface MatchObservation {
  id: string;
  area: 'Batting' | 'Bowling' | 'Fielding' | 'Team / Tactical';
  observationText: string;
  suggestedPriority?: string;
}

export interface MatchRecord {
  id: string;
  opponent: string;
  date: string;
  venue: string;
  format: 'T20' | 'One Day (40/50 Overs)' | 'Two Day' | 'Junior 20 Overs';
  result?: string;
  preMatchPlan: {
    teamObjectives: string[];
    battingNotes: string;
    bowlingNotes: string;
    fieldingFocus: string;
  };
  postMatchReview?: {
    observations: MatchObservation[];
    trainingPrioritiesDerived: string[];
    reviewedDate: string;
  };
}

export interface Team {
  id: string;
  name: string;
  clubName: string;
  ageGroup: string;
  season: string;
  headCoachName: string;
}

export interface FieldPosition {
  id: string;
  name: string;
  x: number; // percentage 0-100 from left
  y: number; // percentage 0-100 from top
  assignedPlayerName?: string;
}

export interface FieldPreset {
  id: string;
  name: string;
  batterHand: BattingHand;
  bowlerType: 'pace' | 'spin';
  positions: FieldPosition[];
}

export interface SavedFieldSetting {
  id: string;
  name: string;
  batterHand: BattingHand;
  bowlerStyle: 'pace' | 'spin';
  tacticalPhase: TacticalPhase;
  competitionRulesProfileId?: string;
  positions: FieldSpot[];
  matchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClubTeam {
  id: string;
  name: string;
  ageGroup: string;
  submissionToken: string;
  createdAt: string;
  gradeOrDivision?: string;
  squadPlayerIds?: string[];
  displayOrder?: number;
  active?: boolean;
  captainIds?: string[];
  coachIds?: string[];
  defaultTrainingWindow?: { startTime: string; endTime: string };
  preferredFacilityGroupId?: string;
  notes?: string;
}

// -------------------------------------------------------------------
// Club Training Planner Types (Dynamic Multi-Team & Multi-Facility)
// -------------------------------------------------------------------

export type TrainingResourceType =
  | 'standard_net'
  | 'spin_net'
  | 'pace_new_ball_net'
  | 'bowling_machine_net'
  | 'centre_wicket'
  | 'centre_wicket_half'
  | 'fielding_area'
  | 'wicketkeeping_station'
  | 'fitness_area'
  | 'custom';

export interface TrainingResource {
  id: string;
  facilityId: string;
  name: string;
  type: TrainingResourceType;
  active: boolean;
  maxBatters: number;
  minBowlers: number;
  maxBowlers: number;
  maxTotalParticipants: number;
  requiresCoachOrLeader: boolean;
  supportsLiveBatting: boolean;
  supportsCentreWicket: boolean;
  safetyNotes?: string;
  equipmentRequirements?: string[];
  availabilityWindow?: { startTime: string; endTime: string };
}

export type AvailabilityStatus = 'attending' | 'not_attending' | 'unsure';

export interface PlayerAvailabilityRecord {
  playerId: string;
  status: AvailabilityStatus;
  expectedArrivalTime?: string; // e.g. "18:00"
  expectedDepartureTime?: string; // e.g. "19:30"
  injurySorenessNotes?: string;
  unableToTrainFully?: boolean;
  leaveEarly?: boolean;
  requestComment?: string; // Player-facing request e.g. "I would like to practise opening against swing"
  requestApprovedByStaff?: boolean; // Staff approval flag
}

export type StaffTrainingBattingRole =
  | 'new_ball_prep'
  | 'top_order_prep'
  | 'middle_order_prep'
  | 'finishing_practice'
  | 'lower_order_dev'
  | 'general_rotation'
  | 'return_to_play'
  | 'limited_participation'
  | 'none'
  | 'custom';

export type StaffTrainingBowlingRole =
  | 'pace_focus'
  | 'spin_focus'
  | 'new_ball_focus'
  | 'death_bowling_focus'
  | 'general_rotation'
  | 'none';

export type BowlingTrainingBand = 'band_1_primary' | 'band_2_support' | 'band_3_developing' | 'restricted';

export interface StaffPlayerAssignment {
  playerId: string;
  teamId?: string;
  trainingBattingRole: StaffTrainingBattingRole;
  trainingBowlingRole: StaffTrainingBowlingRole;
  bowlingTrainingBand: BowlingTrainingBand;
  wicketkeepingFocus?: boolean;
  priorityBattingPrep?: boolean;
  priorityBowlingPrep?: boolean;
  matchupRequirements?: string[];
  extraBattingAllocation?: boolean;
  extraBattingReason?: string;
  reducedBattingAllocation?: boolean;
  workloadLimitDeliveries?: number;
  developmentNotes?: string;
  returnToPlayRestrictions?: string;
}

export interface CentreWicketRoleAssignment {
  playerId: string;
  role: 'batter' | 'bowler' | 'wicketkeeper' | 'close_fielder' | 'ring_fielder' | 'boundary_fielder' | 'next_bowler' | 'next_batting_pair' | 'rest';
}

export interface CentreWicketScenario {
  scenarioId: string;
  name: string;
  targetRuns: number;
  targetOversOrBalls: number;
  wicketsRemaining: number;
  battingPairs: Array<{ pairPlayerIds: [string, string]; allocatedOversOrBalls: number }>;
  bowlingSpells: Array<{ bowlerPlayerId: string; oversOrDeliveries: number }>;
  wicketkeeperId?: string;
  namedLeaderId?: string;
  assignments: CentreWicketRoleAssignment[];
}

export interface PriorityMatchup {
  id: string;
  batterPlayerId: string;
  targetBowlerStyleOrId: string;
  durationMinutes: number;
  notes?: string;
}

export interface AllocationResourceAssignment {
  resourceId: string;
  resourceName: string;
  leaderId?: string;
  batterPlayerIds: string[];
  bowlerPodPlayerIds: string[];
  wicketkeeperPlayerIds: string[];
  feederPlayerIds: string[];
  fieldingPlayerIds: string[];
  restPlayerIds: string[];
  priorityMatchups?: PriorityMatchup[];
  centreWicketScenario?: CentreWicketScenario;
}

export interface RotationBlockPlan {
  blockId: string;
  blockIndex: number;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  resourceAssignments: AllocationResourceAssignment[];
  unassignedPlayerIds: string[];
  alerts: string[];
}

export type ClubSessionBlockType = 'warmup' | 'activity' | 'rotation' | 'centre_wicket' | 'review';

export interface ClubSessionBlock {
  id: string;
  title: string;
  type: ClubSessionBlockType;
  durationMinutes: number;
  objective: string;
  location?: string;
  activityId?: string;
  rotation?: RotationBlockPlan;
}

export interface LiveSessionState {
  activeBlockIndex: number;
  activeRotationIndex: number;
  secondsRemaining: number;
  isPaused: boolean;
  updatedAt: string;
}

export interface ClubTrainingSession {
  id: string;
  clubId: string;
  title: string;
  date: string;
  startTime: string;
  finishTime: string;
  venueFacilityId: string;
  includedTeamIds: string[];
  availableResourceIds: string[];
  expectedPlayerIds: string[];
  confirmedAttendingPlayerIds: string[];
  availabilityRecords: Record<string, PlayerAvailabilityRecord>;
  staffPlayerAssignments: Record<string, StaffPlayerAssignment>;
  sessionObjectives: string[];
  rotationDurationMinutes: number;
  captainCoachAssignments: Array<{ staffId: string; role: string; assignedResourceId?: string }>;
  rotationPlan: RotationBlockPlan[];
  manualLocks: Record<string, boolean>; // e.g. `${blockIndex}_${resourceId}_${playerId}`
  fairnessSettings: { targetEqualBattingMinutes: number };
  blocks: ClubSessionBlock[];
  activeBlockIndex: number;
  activeRotationIndex: number;
  status: 'draft' | 'planned' | 'live' | 'completed';
  warnings: string[];
  rationale?: string;
  completedAt?: string;
  fairnessAppliedAt?: string;
  currentLiveState?: LiveSessionState;
  actualParticipationOutcomes?: Record<string, { battingMinutes: number; deliveriesBowled: number; centreWicketOvers: number }>;
}

export interface SessionFairnessRecord {
  sessionId: string;
  date: string;
  playerId: string;
  plannedBattingMinutes: number;
  actualBattingMinutes: number;
  extraBattingMinutesGranted: number;
  extraBattingReason?: string;
  deliveriesBowled: number;
  centreWicketOvers: number;
  missedOrShortenedMinutes: number;
}

export interface RollingFairnessLedger {
  playerId: string;
  totalSessionsAttended: number;
  totalBattingMinutes: number;
  totalDeliveriesBowled: number;
  totalCentreWicketOvers: number;
  accumulatedFairnessCreditMinutes: number;
}

export interface SavedClubTemplate {
  id: string;
  name: string;
  description: string;
  teamGroupRules: Array<{
    teamQuery: 'all' | 'first_seconds' | 'remaining' | 'juniors' | 'seniors';
    allocatedResourceType: TrainingResourceType;
  }>;
  rotationDurationMinutes: number;
  sessionObjectives: string[];
  includedTeamIds?: string[];
  resourceTypeRules?: TrainingResourceType[];
  centreWicketSettings?: Partial<CentreWicketScenario>;
  defaultStaffAllocation?: Array<{ staffId: string; role: string; assignedResourceId?: string }>;
}


export interface MatchReport {
  id: string;
  teamId: string;
  teamName?: string;
  submissionToken: string;
  matchDate: string;
  opponent?: string;
  submittedBy: string;
  freeTextNotes: string;
  taggedIssues: string[];
  createdAt: string;
}

export interface MatchSquad {
  matchId: string;
  selectedPlayerIds: string[]; // exactly 11 player IDs
  wicketkeeperId: string;
}

export interface OppositionBatter {
  id: string;
  matchId: string;
  name: string;
  battingHand: BattingHand;
  battingOrderPosition?: number;
  observations: BatterObservation[];
}

export interface CompetitionRulesPhaseLimit {
  phase: TacticalPhase;
  oversRange: [number, number];
  maxOutsideCircle: number;
}

export interface CompetitionRulesProfile {
  id: string;
  name: string;
  format: 't20' | 'one_day_40' | 'one_day_50' | 'two_day' | 'custom';
  inningsOvers: number;
  phases: CompetitionRulesPhaseLimit[];
  maxBehindSquareLeg: number; // default 2
  maxTotalLegSide?: number;
  shortBallRulesNotes?: string;
  wideInterpretationNotes?: string;
  juniorSafetySettings?: {
    allowShortBall: boolean;
    maxControlRequiredForShortBall?: number;
  };
  effectiveDate: string;
  sourceNote: string;
}

export interface SavedTacticalPlan {
  id: string;
  matchId: string;
  batterId: string;
  bowlerId: string;
  planId: string;
  fieldPresetId: string;
  positions: FieldSpot[];
  captainNotes?: string;
  status: 'suggested' | 'accepted' | 'edited' | 'working' | 'adjust' | 'abandon';
  updatedAt: string;
  warnings: string[];
}
