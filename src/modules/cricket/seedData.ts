// Seed Data for Inside Edge Cricket Coaching App

import type { Team, Facility, Player, Activity, TrainingSession, MatchRecord, DevelopmentFocus, Observation } from '../../types/cricket';

export const SEED_TEAM: Team = {
  id: 'team-1',
  name: 'Richmond City CC - 1st XI',
  clubName: 'Richmond City Cricket Club',
  ageGroup: 'Senior Men',
  season: '2026/27',
  headCoachName: 'Coach Travis'
};

export const SEED_FACILITY: Facility = {
  id: 'fac-1',
  name: 'City Reserve Nets & Oval',
  outfieldAvailable: true,
  centreWicketAvailable: true,
  netLanes: [
    {
      id: 'lane-1',
      name: 'Net 1 - New Ball Seam',
      laneType: 'standard',
      laneObjective: 'New-ball defense & decision making outside off',
      maxBatters: 2,
      maxBowlers: 4,
      assignedCoach: 'Head Coach'
    },
    {
      id: 'lane-2',
      name: 'Net 2 - Spin & Strike Rotation',
      laneType: 'spin',
      laneObjective: 'Footwork & strike rotation against spin',
      maxBatters: 2,
      maxBowlers: 4,
      assignedCoach: 'Assistant Coach'
    },
    {
      id: 'lane-3',
      name: 'Net 3 - Death Bowling & Power',
      laneType: 'machine',
      laneObjective: 'Yorker execution & death boundary options',
      maxBatters: 2,
      maxBowlers: 3,
      maxFeeders: 2,
      assignedCoach: 'Bowling Specialist'
    }
  ]
};

export const SEED_PLAYERS: Player[] = [
  {
    id: 'p-1',
    name: 'Ben Harris',
    preferredName: 'Ben',
    primaryRole: 'top_order_batter',
    secondaryRole: 'none',
    battingHand: 'right',
    bowlingStyle: 'does_not_bowl',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    activeDevelopmentFocusIds: ['focus-1']
  },
  {
    id: 'p-2',
    name: 'Jack Davies',
    preferredName: 'Jack',
    primaryRole: 'pace_bowler',
    secondaryRole: 'middle_order_batter',
    battingHand: 'right',
    bowlingStyle: 'right_arm_fast_medium',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    workloadRestriction: { maxDeliveries: 36, restrictedBowler: true, notes: 'Managing shoulder strain - max 36 deliveries' },
    activeDevelopmentFocusIds: ['focus-2']
  },
  {
    id: 'p-3',
    name: 'Sam Miller',
    preferredName: 'Sam',
    primaryRole: 'all_rounder',
    secondaryRole: 'top_order_batter',
    battingHand: 'left',
    bowlingStyle: 'right_arm_off_spin',
    wicketkeepingCapability: 'backup',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  },
  {
    id: 'p-4',
    name: 'Mia Zhao',
    preferredName: 'Mia',
    primaryRole: 'top_order_batter',
    secondaryRole: 'none',
    battingHand: 'right',
    bowlingStyle: 'does_not_bowl',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    activeDevelopmentFocusIds: ['focus-3']
  },
  {
    id: 'p-5',
    name: 'Alex Turner',
    preferredName: 'Alex',
    primaryRole: 'middle_order_batter',
    secondaryRole: 'spin_bowler',
    battingHand: 'left',
    bowlingStyle: 'left_arm_orthodox',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  },
  {
    id: 'p-6',
    name: 'Luke Higgins',
    preferredName: 'Luke',
    primaryRole: 'pace_bowler',
    secondaryRole: 'none',
    battingHand: 'right',
    bowlingStyle: 'right_arm_fast',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  },
  {
    id: 'p-7',
    name: 'Tom Walker',
    preferredName: 'Tom',
    primaryRole: 'pace_bowler',
    secondaryRole: 'none',
    battingHand: 'right',
    bowlingStyle: 'right_arm_fast_medium',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  },
  {
    id: 'p-8',
    name: 'Priya Sharma',
    preferredName: 'Priya',
    primaryRole: 'spin_bowler',
    secondaryRole: 'middle_order_batter',
    battingHand: 'right',
    bowlingStyle: 'right_arm_leg_spin',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  },
  {
    id: 'p-9',
    name: 'Noah Campbell',
    preferredName: 'Noah',
    primaryRole: 'spin_bowler',
    secondaryRole: 'all_rounder',
    battingHand: 'left',
    bowlingStyle: 'left_arm_orthodox',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  },
  {
    id: 'p-10',
    name: 'Josh Williams',
    preferredName: 'Josh',
    primaryRole: 'middle_order_batter',
    secondaryRole: 'all_rounder',
    battingHand: 'right',
    bowlingStyle: 'right_arm_fast_medium',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  },
  {
    id: 'p-11',
    name: 'Ryan Cooper',
    preferredName: 'Ryan',
    primaryRole: 'pace_bowler',
    secondaryRole: 'none',
    battingHand: 'right',
    bowlingStyle: 'right_arm_fast_medium',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  },
  {
    id: 'p-12',
    name: 'Eli Santos',
    preferredName: 'Eli',
    primaryRole: 'wicketkeeper',
    secondaryRole: 'top_order_batter',
    battingHand: 'right',
    bowlingStyle: 'does_not_bowl',
    wicketkeepingCapability: 'primary',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  },
  {
    id: 'p-13',
    name: 'Liam Murphy',
    preferredName: 'Liam',
    primaryRole: 'all_rounder',
    secondaryRole: 'pace_bowler',
    battingHand: 'right',
    bowlingStyle: 'right_arm_fast_medium',
    wicketkeepingCapability: 'backup',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  },
  {
    id: 'p-14',
    name: 'Will Taylor',
    preferredName: 'Will',
    primaryRole: 'middle_order_batter',
    secondaryRole: 'none',
    battingHand: 'left',
    bowlingStyle: 'does_not_bowl',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  },
  {
    id: 'p-15',
    name: 'Chloe Bennett',
    preferredName: 'Chloe',
    primaryRole: 'top_order_batter',
    secondaryRole: 'wicketkeeper',
    battingHand: 'right',
    bowlingStyle: 'does_not_bowl',
    wicketkeepingCapability: 'backup',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  },
  {
    id: 'p-16',
    name: 'Mitch Watson',
    preferredName: 'Mitch',
    primaryRole: 'all_rounder',
    secondaryRole: 'spin_bowler',
    battingHand: 'right',
    bowlingStyle: 'right_arm_off_spin',
    wicketkeepingCapability: 'none',
    trainingAvailability: true,
    activeDevelopmentFocusIds: []
  }
];

export const SEED_DEVELOPMENT_FOCUSES: DevelopmentFocus[] = [
  {
    id: 'focus-1',
    playerId: 'p-1',
    domain: 'Batting',
    focusStatement: 'Decision-making outside off stump against full seam',
    state: 'Current Focus',
    why: '3 dismissals driving away from body in last 2 matches',
    startDate: '2026-08-04',
    reviewDate: '2026-08-25',
    evidenceObservationIds: ['obs-1', 'obs-2'],
    coachSummary: 'Leaving improving; still chases width early when fatigued.'
  },
  {
    id: 'focus-2',
    playerId: 'p-2',
    domain: 'Bowling',
    focusStatement: 'Consistent front-foot release height & landing seam control',
    state: 'Developing',
    why: 'Too many full tosses in final 2 overs against Glenferrie',
    startDate: '2026-07-28',
    reviewDate: '2026-08-18',
    evidenceObservationIds: ['obs-3'],
    coachSummary: 'Rhythm looks sharper. Keep workload under 36 balls per session.'
  },
  {
    id: 'focus-3',
    playerId: 'p-4',
    domain: 'Batting',
    focusStatement: 'Strike rotation against spin in middle overs',
    state: 'Current Focus',
    why: 'Dot ball percentage exceeded 65% in middle overs',
    startDate: '2026-08-01',
    reviewDate: '2026-08-22',
    evidenceObservationIds: [],
    coachSummary: 'Focus on soft hands drop-and-run into single zones.'
  }
];

export const SEED_OBSERVATIONS: Observation[] = [
  {
    id: 'obs-1',
    playerId: 'p-1',
    timestamp: '2026-08-08T18:40:00Z',
    source: 'match',
    tag: 'Decision',
    textNote: 'Feathered edge to keeper driving at 4th stump line without moving feet.',
    focusId: 'focus-1',
    coachName: 'Coach Travis'
  },
  {
    id: 'obs-2',
    playerId: 'p-1',
    timestamp: '2026-08-11T18:30:00Z',
    source: 'training',
    tag: 'Good execution',
    textNote: 'Left 4 consecutive out-swingers cleanly in Net 1.',
    focusId: 'focus-1',
    coachName: 'Coach Travis'
  },
  {
    id: 'obs-3',
    playerId: 'p-2',
    timestamp: '2026-08-08T19:15:00Z',
    source: 'match',
    tag: 'Needs work',
    textNote: 'Yorker length missed full in 19th over, hit for 2 boundaries.',
    focusId: 'focus-2',
    coachName: 'Coach Travis'
  }
];

export const SEED_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    name: 'New-Ball Defense & Leave Corridor',
    purpose: 'Train top-order decision making outside off stump against swinging full seam',
    category: 'Batting',
    minPlayers: 3,
    maxPlayers: 6,
    durationMinutes: 15,
    spaceRequired: 'net',
    equipment: ['Stumps', '2 Leather Balls', 'Cones for Leave Corridor'],
    setupSteps: [
      'Set two yellow cones 30cm outside off stump to demarcate the leaving zone.',
      'Bowlers deliver full length at 4th/5th stump line.',
      'Batter receives 6-ball overs: 4 must be left cleanly, 2 punished if short/wide.'
    ],
    coachingPoints: [
      'Shoulders aligned to target ball line.',
      'Hands drawn back inside line of body.',
      'Decisive late leave, let the ball pass high.'
    ],
    constraints: ['Batter loses a point for played shot at ball outside cone.'],
    progressions: ['Add a slip fielder for live catching off edges.'],
    safetyNotes: 'Helmets mandatory for all batters in nets.',
    participationDensity: 'High',
    tags: ['New ball', 'Batting', 'Decision making', 'Seam']
  },
  {
    id: 'act-2',
    name: 'Spin Strike Rotation Pods',
    purpose: 'Reduce dot ball percentage against spin by training single-drop footwork',
    category: 'Batting',
    minPlayers: 4,
    maxPlayers: 8,
    durationMinutes: 15,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Spin Cones', 'Single Target Markers'],
    setupSteps: [
      'Place single markers at cover, point and mid-wicket.',
      'Spinners bowl in 4-ball sets.',
      'Batter must score a single off at least 3 out of 4 deliveries.'
    ],
    coachingPoints: [
      'Early foot movement (either fully forward or back).',
      'Soft hands at point of contact.',
      'Eyes level over contact point.'
    ],
    constraints: ['No boundary shots permitted - single placement only.'],
    progressions: ['Add fielder at short cover who can run out batter.'],
    participationDensity: 'High',
    tags: ['Spin', 'Strike rotation', 'Middle overs', 'Batting']
  },
  {
    id: 'act-3',
    name: 'Death Yorker & Boundary Options',
    purpose: 'Develop Yorker execution under pressure and boundary option responses',
    category: 'Bowling',
    minPlayers: 3,
    maxPlayers: 6,
    durationMinutes: 15,
    spaceRequired: 'net',
    equipment: ['Target Mat / Cones', 'Machine or Feeders'],
    setupSteps: [
      'Place target mat 30cm in front of crease.',
      'Bowlers get 2 points for hitting mat, 0 for full toss, -1 for length.',
      'Batter chases 12 off 6 balls.'
    ],
    coachingPoints: [
      'Keep eyes locked on base of stumps.',
      'High front arm extension at release.',
      'Strong drive through front foot.'
    ],
    constraints: ['Bowler must nominate yorker or slower ball before run-up.'],
    progressions: ['Add target board for wide yorker line.'],
    participationDensity: 'High',
    tags: ['Death bowling', 'Yorkers', 'Pressure', 'Bowling']
  },
  {
    id: 'act-4',
    name: 'Pressure High Catching Pods',
    purpose: 'Improve high catching judgment under fatigue and communication',
    category: 'Fielding',
    minPlayers: 6,
    maxPlayers: 16,
    durationMinutes: 15,
    spaceRequired: 'outfield',
    equipment: ['Catching Bat / Katcet', 'Soft & Hard Balls'],
    setupSteps: [
      'Split squad into 4 pods around outfield perimeter.',
      'Coach hits high skyers into changing wind directions.',
      'Fielders call loudly ("MINE!") before ball reaches apex.'
    ],
    coachingPoints: [
      'Get under ball early; do not catch while running.',
      'Fingers pointing up for high catches above chest.',
      'Soft hands absorbing impact into body.'
    ],
    constraints: ['Drop results in 5 team sprint reps.'],
    progressions: ['Combine two pods for cross-over high catches.'],
    participationDensity: 'High',
    tags: ['Catching', 'Fielding', 'Pressure', 'Outfield']
  },
  {
    id: 'act-5',
    name: 'Middle Overs Chase Scenario (24 off 18)',
    purpose: 'Replicate match pressure chasing 24 runs off 18 balls with 5 wickets in hand',
    category: 'Tactical',
    minPlayers: 10,
    maxPlayers: 16,
    durationMinutes: 20,
    spaceRequired: 'pitch',
    equipment: ['Cones for boundary lines', 'Scoreboard flip card'],
    setupSteps: [
      'Batting pair starts with target 24 off 18 balls.',
      'Fielding team sets custom T20 field with 4 fielders inside ring.',
      'Coach tracks score and dot ball ratio.'
    ],
    coachingPoints: [
      'Calculate required rate per over.',
      'Target non-boundary singles on dot balls.',
      'Communication on turn for 2nd run.'
    ],
    constraints: ['Batting side loses 5 runs for every wicket lost.'],
    progressions: ['Reduce wickets in hand to 3.'],
    participationDensity: 'High',
    tags: ['Scenario', 'Tactical', 'Match pressure', 'Chase']
  }
];

export const SEED_MATCH_RECORD: MatchRecord = {
  id: 'match-1',
  opponent: 'Glenferrie CC',
  date: '2026-08-08',
  venue: 'Glenferrie Oval',
  format: 'T20',
  result: 'Lost by 14 runs',
  preMatchPlan: {
    teamObjectives: ['Hold line outside off stump early', 'Zero dropped catches in inner ring'],
    battingNotes: 'Target their left-arm spinner down the ground; respect new ball seam.',
    bowlingNotes: 'Bowl stump to stump in Powerplay; use slower ball bouncers in death.',
    fieldingFocus: 'Aggressive inner-ring positioning; clean relay throws to keeper.'
  },
  postMatchReview: {
    observations: [
      {
        id: 'mobs-1',
        area: 'Batting',
        observationText: 'Lost 3 early wickets in first 4 overs driving away from body against full seam.',
        suggestedPriority: 'New-ball batting decision making'
      },
      {
        id: 'mobs-2',
        area: 'Fielding',
        observationText: '4 dropped catching opportunities in inner ring under high pressure.',
        suggestedPriority: 'Catching under pressure'
      },
      {
        id: 'mobs-3',
        area: 'Bowling',
        observationText: 'Conceded 42 runs in final 3 overs due to missed yorker length.',
        suggestedPriority: 'Death bowling & yorkers'
      }
    ],
    trainingPrioritiesDerived: [
      'New-ball decision making',
      'Catching under pressure',
      'Death bowling & yorker execution'
    ],
    reviewedDate: '2026-08-09'
  }
};

export const SEED_SESSION: TrainingSession = {
  id: 'sess-1',
  title: 'Thursday Pre-Match Practice',
  date: '2026-08-13',
  startTime: '18:00',
  durationMinutes: 75,
  status: 'planned',
  expectedPlayerIds: SEED_PLAYERS.map(p => p.id),
  facilityId: 'fac-1',
  primaryObjectives: [
    'New-ball decision making',
    'Death bowling yorkers',
    'Catching under pressure'
  ],
  secondaryObjectives: ['Strike rotation against spin'],
  activeBlockIndex: 1,
  activeRotationIndex: 0,
  rationale: 'Last match review identified 3 early wickets driving against full seam and 4 missed catching opportunities. The plan allocates Net 1 to new-ball leave corridor, Net 2 to spin rotation, and Net 3 to death bowling.',
  blocks: [
    {
      id: 'b-1',
      title: 'Movement & Throwing Activation',
      blockType: 'warmup',
      durationMinutes: 8,
      location: 'Outfield',
      assignedCoach: 'Head Coach',
      objective: 'Prepare shoulders, throwing rhythm and lateral movement.'
    },
    {
      id: 'b-2',
      title: 'Pressure Catching & Ground Fielding',
      blockType: 'fielding',
      durationMinutes: 15,
      location: 'Outfield',
      activityId: 'act-4',
      assignedCoach: 'Assistant Coach',
      objective: 'High catching under pressure and quick clean pickups.'
    },
    {
      id: 'b-3',
      title: 'Net Rotations (New Ball, Spin, Death)',
      blockType: 'rotation',
      durationMinutes: 36,
      location: 'Nets 1-3',
      objective: 'Specialist net rotations: New ball defense, Spin footwork, Death yorkers.',
      rotationPlan: {
        id: 'rot-plan-1',
        rotationIndex: 0,
        durationMinutes: 12,
        lanes: [
          {
            laneId: 'lane-1',
            laneObjective: 'New-ball leave corridor & seam defense',
            batterPlayerIds: ['p-1', 'p-4'],
            bowlerPlayerIds: ['p-2', 'p-6', 'p-7'],
            keeperPlayerIds: [],
            feederPlayerIds: [],
            coachAssigned: 'Head Coach'
          },
          {
            laneId: 'lane-2',
            laneObjective: 'Spin rotation & soft hands singles',
            batterPlayerIds: ['p-3', 'p-5'],
            bowlerPlayerIds: ['p-8', 'p-9'],
            keeperPlayerIds: ['p-12'],
            feederPlayerIds: [],
            coachAssigned: 'Assistant Coach'
          },
          {
            laneId: 'lane-3',
            laneObjective: 'Death bowling yorkers & boundary options',
            batterPlayerIds: ['p-10'],
            bowlerPlayerIds: ['p-11', 'p-13'],
            keeperPlayerIds: [],
            feederPlayerIds: ['p-16'],
            coachAssigned: 'Bowling Specialist'
          }
        ],
        outfieldPlayerIds: ['p-14', 'p-15'],
        unassignedPlayerIds: [],
        alerts: ['Jack Davies: Bowled 12 deliveries in Net 1. Max 36 deliveries.']
      }
    },
    {
      id: 'b-4',
      title: 'Middle Overs Chase Scenario',
      blockType: 'scenario',
      durationMinutes: 12,
      location: 'Centre Pitch',
      activityId: 'act-5',
      assignedCoach: 'Head Coach',
      objective: 'Defend 24 off 18 balls / Chase equivalent.'
    },
    {
      id: 'b-5',
      title: 'Session Debrief & Match Priorities',
      blockType: 'review',
      durationMinutes: 4,
      location: 'Outfield',
      assignedCoach: 'Head Coach',
      objective: 'Review key player observations and confirm match roles.'
    }
  ]
};
