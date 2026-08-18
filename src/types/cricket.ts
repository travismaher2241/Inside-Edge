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

export interface PlayerProgressAccessGrant {
  id: string;
  playerId: string;
  tokenHash: string; // SHA256(publicToken)
  tokenVersion: number;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
  publishedSummaryId?: string;
}

export interface ObservationAccess {
  staffVisibility: 'all_coaches' | 'head_coach_only';
  shareWithPlayerGuardian: boolean; // default false
}

export interface ObservationAttachment {
  id: string;
  observationId: string;
  type: 'image' | 'video' | 'audio';
  storagePath: string;
  createdAt: string;
  uploadedByUserId: string;
  durationSeconds?: number;
  mimeType?: string;
  sizeBytes?: number;
}

export interface Observation {
  id: string;
  operationId: string;
  playerId: string;
  source: 'training' | 'match';
  sessionId?: string;
  matchId?: string;
  tags: ObservationTag[];
  textNote: string;
  linkedFocusIds: string[];
  access: ObservationAccess;
  attachments?: ObservationAttachment[];
  createdAt: string;
  createdByUserId: string;
  updatedAt?: string;
  baseRevision: number;
  revision: number;
  syncStatus?: 'synced' | 'pending';
}

export type FocusLifecycleState = 'CURRENT' | 'DEVELOPING' | 'CONSISTENT' | 'STRENGTH' | 'ARCHIVED';

export interface FocusStateHistoryEntry {
  fromState: FocusLifecycleState | null;
  toState: FocusLifecycleState;
  changedAt: string;
  changedByUserId: string;
  reason?: string;
}

export interface DevelopmentFocus {
  id: string;
  playerId: string;
  domain: DevelopmentDomain;
  focusStatement: string;
  objectiveId?: CoachingObjectiveId;
  state: FocusLifecycleState;
  why: string;
  startDate: string;
  reviewDate?: string;
  achievedDate?: string;
  archivedDate?: string;
  history: FocusStateHistoryEntry[];
  coachSummary: string;
  access: ObservationAccess;
}

export interface InternalPlayerDevelopmentSummary {
  playerId: string;
  generatedAt: string;
  attendanceSummary: {
    totalSessionsAttended: number;
    battingMinutes: number;
    bowlingMinutes: number;
    fieldingMinutes: number;
    centreWicketMinutes: number;
  };
  fairnessAssessment: PlayerFairnessAssessment;
  allFocuses: DevelopmentFocus[];
  allObservations: Observation[];
  headCoachNotes?: string;
}

export interface PublishedFocusSummary {
  focusStatement: string;
  domain: DevelopmentDomain;
  state: FocusLifecycleState;
  evidenceCount: number;
  summary: string;
}

export interface PublishedObservationExcerpt {
  date: string;
  tags: ObservationTag[];
  excerpt: string;
}

export interface PublishedMediaReference {
  attachmentId: string;
  type: 'image' | 'video';
}

export interface PublishedPlayerProgressSummary {
  id: string;
  playerId: string;
  version: number;
  generatedAt: string;
  publishedAt: string;
  publishedByUserId: string;
  supersedesSummaryId?: string;
  reportingPeriod: {
    startDate: string;
    endDate: string;
  };
  fairnessWindowLabel?: string;
  attendanceSummary: {
    totalSessionsAttended: number;
    battingMinutes: number;
    bowlingMinutes: number;
    fieldingMinutes: number;
  };
  fairnessSummary: {
    isBalanced: boolean;
    battingStatus: string;
    bowlingStatus: string;
    fieldingStatus: string;
  };
  focuses: PublishedFocusSummary[];
  selectedEvidence: PublishedObservationExcerpt[];
  mediaReferences?: PublishedMediaReference[];
  nextSteps: string[];
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


export type SkillTier = 'developing' | 'competent' | 'advanced' | 'performance';

export interface TrainingSafetyProfile {
  playerId: string;
  canFacePace: boolean;
  canFaceAdvancedPace: boolean;
  canFaceSpin: boolean;
  maxCompatiblePaceTier?: SkillTier;
  coachRestrictions?: string[];
}

export interface PlayerTrainingProfile {
  battingTier?: SkillTier;
  paceBowlingTier?: SkillTier;
  spinBowlingTier?: SkillTier;
  primaryRole: 'batter' | 'bowler' | 'all_rounder' | 'wicketkeeper';
  ageGroup?: string;
  safetyProfile: TrainingSafetyProfile;
}

export interface PlayerSessionOpportunityRecord {
  id: string;
  sessionId: string;
  teamId: string;
  playerId: string;
  completedAt: string;
  attended: boolean;
  totalActiveMinutes: number;
  // Discipline Axis
  battingMinutes: number;
  bowlingMinutes: number;
  fieldingMinutes: number;
  // Context Axis
  netMinutes: number;
  centreWicketMinutes: number;
  scenarioMinutes: number;
  estimatedDeliveriesBowled?: number;
  source: 'live_blocks' | 'manual_adjustment';
}

export type CategoryStatus =
  | 'healthy'
  | 'deficit'
  | 'surplus'
  | 'not_applicable'
  | 'insufficient_evidence';

export interface FairnessCategoryResult {
  ratio: number | null; // null if not_applicable or insufficient_evidence
  status: CategoryStatus;
  evidenceSessionsCount: number;
}

export interface PlayerOpportunityProfile {
  battingEligible: boolean;
  bowlingEligible: boolean;
  fieldingEligible: boolean;
  wicketkeepingEligible: boolean;
  battingTargetWeight: number;       // default 1.0
  bowlingTargetWeight: number;       // default 1.0 (0.0 for keepers/non-bowlers)
  fieldingTargetWeight: number;      // default 1.0
  centreWicketTargetWeight: number;  // default 1.0
  scenarioTargetWeight: number;      // default 1.0
}

export interface FairnessCategoryBalance {
  batting: FairnessCategoryResult;
  bowling: FairnessCategoryResult;
  fielding: FairnessCategoryResult;
  centreWicket: FairnessCategoryResult;
  scenario: FairnessCategoryResult;
}

export type FairnessFlag =
  | 'needs_batting'
  | 'needs_bowling'
  | 'needs_fielding'
  | 'low_centre_wicket'
  | 'high_scenario'
  | 'insufficient_history';

export interface PlayerFairnessAssessment {
  playerId: string;
  isBalanced: boolean;
  hasInsufficientHistory: boolean;
  flags: FairnessFlag[];
  balance: FairnessCategoryBalance;
  opportunityProfile: PlayerOpportunityProfile;
}

export interface ActivityUsageRecord {
  id: string;
  activityId: string;
  teamId: string;
  seasonId: string;
  sessionId: string;
  plannedAt?: string;
  completedAt: string;
  actualDurationMinutes?: number;
  selectedProgressionStage?: ActivityProgressionStage;
}

export type CoachingObjectiveId = string;

export interface CoachingObjective {
  id: CoachingObjectiveId;
  sport: 'cricket';
  domain: DevelopmentDomain;
  name: string;
  shortDescription: string;
  detailedDescription?: string;

  ageGroups: string[];
  formats: string[];

  relatedDevelopmentAreas: string[];
  relatedActivityIds: string[];
  relatedScenarioTypes: string[];
  matchIssueTriggers: string[];

  facilityRequirements: string[];
  equipmentRequirements: string[];

  playerRoleRelevance: string[];
  skillLevelRange?: ('Beginner' | 'Intermediate' | 'Advanced')[];

  coachingPrinciples: string[];
  successIndicators: string[];

  tags: string[];

  status: 'active' | 'draft' | 'deprecated';
  version: number;

  parentObjectiveId?: CoachingObjectiveId;
  applicableRoles?: string[];
  aliases?: string[];
}

export type RecommendationType =
  | 'smart_planner'
  | 'match_to_training'
  | 'player_development'
  | 'coach_assistant'
  | 'league_rule';

export type RecommendationDecisionStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'edited';

export interface RecommendationRecord {
  id: string;
  type: RecommendationType;

  clubId: string;
  teamId: string;

  playerIds?: string[];

  createdAt: string;
  createdBy: string;

  inputContext: Record<string, unknown>;

  recommendation: Record<string, unknown>;

  rationale: {
    teamRationale?: string;
    activityRationale?: string;

    playerRationale?: Array<{
      playerId: string;
      reason: string;
    }>;

    ruleTraceability?: Array<{
      ruleId: string;
      citation: string;
    }>;
  };

  sourceIds: string[];
  ruleIds: string[];

  decisionStatus: RecommendationDecisionStatus;

  originalRecommendation: Record<string, unknown>;
  finalCoachDecision?: Record<string, unknown>;

  relatedSessionId?: string;
  relatedMatchId?: string;
}


export type ActivityProgressionStage =
  | 'base'
  | 'simplified'
  | 'progressed'
  | 'decision_making'
  | 'game_transfer';

export interface ActivityGameScenario {
  id: string;
  title: string;
  targetRuns?: number;
  targetBalls?: number;
  wickets?: number;
  description: string;
}

export interface ActivityProgressionDetails {
  simplification: string[];
  advancement: string[];
  decisionMaking: string[];
  gameScenarios: ActivityGameScenario[];
}

export interface Activity {
  id: string;
  name: string;
  purpose: string; // Problem it addresses, e.g. "Playing seam bowling under pressure"
  objectiveIds?: CoachingObjectiveId[];
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
  structuredProgressions?: ActivityProgressionDetails;
  safetyNotes?: string;
  participationDensity: 'High' | 'Medium' | 'Low';
  tags: string[];
  /** Absent/'all' means suitable for any age group. */
  ageSuitability?: 'junior' | 'senior' | 'all';
}

export type GroupingStrategy = 'graded' | 'mixed';

export interface ClubTrainingGroup {
  id: string;
  name: string;
  teamIds: string[];
  resourceIds: string[];
  leaderId?: string;
  groupingStrategy?: GroupingStrategy;
}

export interface PlanValidationError {
  code: string;
  message: string;
  blockIndex?: number;
  resourceId?: string;
  playerId?: string;
}

export interface PlanValidationWarning {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  requiresAcknowledgement?: boolean;
}

export interface PlanValidationMetrics {
  totalAttendingPlayers: number;
  totalBlocks: number;
  minBattingMinutes: number;
  medianBattingMinutes: number;
  maxBattingMinutes: number;
  battingOpportunityGapMinutes: number;
  unassignedPlayerCount: number;
  zeroBattingPlayerCount: number;
  emptyAreaCount: number;
}

export interface RotationPlanValidationResult {
  isValid: boolean;
  canLaunch: boolean;
  hardErrors: PlanValidationError[];
  warnings: PlanValidationWarning[];
  metrics: PlanValidationMetrics;
}

export interface SessionActivityInstance {
  activityId: string;
  selectedProgressionStage: ActivityProgressionStage;
  durationMinutes: number;
  coachNotes?: string;
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
  teamId?: string;
  opponent: string;
  date: string;
  venue: string;
  format: 'T20' | 'One Day (40/50 Overs)' | 'Two Day' | 'Junior 20 Overs';
  result?: string;
  ruleSetId?: string;
  ruleSetVersion?: number;
  appliedRulesSnapshot?: {
    capturedAt: string;
    rules: Array<{
      ruleId: string;
      category: string;
      title: string;
      approvedInterpretation: string;
      sourceDocumentName: string;
      sourcePage: number;
      sourceSection?: string;
    }>;
  };
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
  /** When true, sessions/activities/observations for this team default to junior-appropriate behaviour. */
  juniorMode?: boolean;
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
  /** Blocks this scenario should occupy. Defaults to the opening block only. */
  blockIndexes?: number[];
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
  activityInstance?: SessionActivityInstance;
  groupingStrategyOverride?: GroupingStrategy;
  rotation?: RotationBlockPlan;
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
  defaultGroupingStrategy?: GroupingStrategy;
  blocks: ClubSessionBlock[];
  activeBlockIndex: number;
  activeRotationIndex: number;
  status: 'draft' | 'planned' | 'live' | 'completed';
  warnings: string[];
  acknowledgedWarningCodes?: string[];
  rationale?: string;
  completedAt?: string;
  fairnessAppliedAt?: string;
  planningVersion: number;
  rsvpOpenAt?: string;
  rsvpDeadline?: string;
  rsvpClosedAt?: string;
  rsvps: Record<string, PlayerRsvp>;
  liveAttendance: Record<string, PlayerLiveAttendance>;
  currentLiveState?: LiveTimerState;
  actualParticipationOutcomes?: Record<string, { battingMinutes: number; deliveriesBowled: number; centreWicketOvers: number }>;
  opportunityRecords?: PlayerSessionOpportunityRecord[];
}

export interface RsvpInvitation {
  id: string;
  sessionId: string;
  playerId: string;
  tokenVersion: number;
  tokenHash: string; // SHA256(publicToken)
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  lastUsedAt?: string;
}

export type RsvpStatus = 'confirmed' | 'unavailable' | 'late' | 'leaving_early' | 'partial' | 'unknown';
export type LiveAttendanceStatus = 'expected' | 'present' | 'live_absent' | 'injured' | 'left_early';

export interface PlayerRsvp {
  playerId: string;
  status: RsvpStatus;
  availableFrom?: string; // e.g. "17:30"
  availableUntil?: string; // e.g. "18:15"
  parentNote?: string;
  submittedAt?: string;
  updatedAt?: string;
  revision: number;
}

export interface PlayerRsvpSubmissionPayload {
  playerId: string;
  status: RsvpStatus;
  availableFrom?: string;
  availableUntil?: string;
  parentNote?: string;
  baseRevision: number;
  submissionId: string;
}

export interface PlayerLiveAttendance {
  playerId: string;
  status: LiveAttendanceStatus;
  actualArrivedAt?: string;
  actualLeftAt?: string;
  injuryNotes?: string;
  changedBy?: string;
  changedAt?: string;
}

export interface LiveTimerState {
  rotationStartedAt: string | null;
  rotationDurationSeconds: number;
  pausedAt: string | null;
  accumulatedPausedSeconds: number;
  isPaused: boolean;
  activeBlockIndex: number;
  activeRotationIndex: number;
  updatedAt: string;
}

export interface LiveOperationLog {
  operationId: string;
  type: 'PLAYER_MARKED_ABSENT' | 'PLAYER_INJURED' | 'PLAYER_SWAPPED' | 'ROTATION_ADVANCED' | 'RECALCULATION_APPLIED' | 'OBSERVATION_CREATED';
  playerId?: string;
  details?: Record<string, any>;
  occurredAt: string;
  deviceId: string;
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
  groupingStrategy?: GroupingStrategy;
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
