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
  primaryRole: PrimaryRole;
  secondaryRole: SecondaryRole;
  battingHand: BattingHand;
  bowlingStyle: BowlingStyle;
  wicketkeepingCapability: WicketkeepingCapability;
  trainingAvailability: boolean;
  workloadRestriction?: WorkloadRestriction;
  activeDevelopmentFocusIds: string[];
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

export interface ClubTeam {
  id: string;
  name: string;
  ageGroup: string;
  submissionToken: string;
  createdAt: string;
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
