// Seed Data for Inside Edge Cricket Coaching App

import type { Team, Facility, Player, Activity, TrainingSession, MatchRecord, DevelopmentFocus, Observation, CompetitionRulesProfile, ClubTeam, TrainingResource, SavedClubTemplate, RollingFairnessLedger } from '../../types/cricket';

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
    primaryTeamId: 'ct-1',
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
    activeDevelopmentFocusIds: ['focus-2'],
    capabilities: ['outswing', 'accurate_fourth_stump', 'wobble_seam'],
    controlRating: 4,
    availableVariations: ['Outswing', 'Off-Cutter', 'Bouncer'],
    preferredPhases: ['new_ball', 'powerplay'],
    tacticalNotes: 'Reliable fourth stump accuracy with new ball'
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
    activeDevelopmentFocusIds: [],
    capabilities: ['stock_spin_control', 'turns_into_batter', 'turns_away_from_batter', 'flight_and_dip'],
    controlRating: 4,
    availableVariations: ['Off-break', 'Arm Ball', 'Top Spinner'],
    preferredPhases: ['middle_overs'],
    tacticalNotes: 'Controls middle overs well against right-handers'
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
    activeDevelopmentFocusIds: [],
    capabilities: ['turns_away_from_batter', 'flight_and_dip', 'arm_ball_or_slider', 'change_of_pace'],
    controlRating: 3,
    availableVariations: ['Stock Spin', 'Arm Ball'],
    preferredPhases: ['middle_overs', 'run_defence']
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
    activeDevelopmentFocusIds: [],
    capabilities: ['high_pace', 'steep_bounce', 'bouncer_control', 'straight_yorker'],
    controlRating: 4,
    availableVariations: ['Bouncer', 'Yorker', 'Slower Ball'],
    preferredPhases: ['new_ball', 'death']
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
    state: 'CURRENT',
    why: '3 dismissals driving away from body in last 2 matches',
    startDate: '2026-08-04',
    reviewDate: '2026-08-25',
    history: [
      { fromState: null, toState: 'CURRENT', changedAt: '2026-08-04T00:00:00Z', changedByUserId: 'coach_head_1' }
    ],
    coachSummary: 'Leaving improving; still chases width early when fatigued.',
    access: { staffVisibility: 'all_coaches', shareWithPlayerGuardian: true }
  },
  {
    id: 'focus-2',
    playerId: 'p-2',
    domain: 'Bowling',
    focusStatement: 'Consistent front-foot release height & landing seam control',
    state: 'DEVELOPING',
    why: 'Too many full tosses in final 2 overs against Glenferrie',
    startDate: '2026-07-28',
    reviewDate: '2026-08-18',
    history: [
      { fromState: null, toState: 'CURRENT', changedAt: '2026-07-28T00:00:00Z', changedByUserId: 'coach_head_1' },
      { fromState: 'CURRENT', toState: 'DEVELOPING', changedAt: '2026-08-05T00:00:00Z', changedByUserId: 'coach_head_1' }
    ],
    coachSummary: 'Rhythm looks sharper. Keep workload under 36 balls per session.',
    access: { staffVisibility: 'all_coaches', shareWithPlayerGuardian: true }
  },
  {
    id: 'focus-3',
    playerId: 'p-4',
    domain: 'Batting',
    focusStatement: 'Strike rotation against spin in middle overs',
    state: 'CURRENT',
    why: 'Dot ball percentage exceeded 65% in middle overs',
    startDate: '2026-08-01',
    reviewDate: '2026-08-22',
    history: [
      { fromState: null, toState: 'CURRENT', changedAt: '2026-08-01T00:00:00Z', changedByUserId: 'coach_head_1' }
    ],
    coachSummary: 'Focus on soft hands drop-and-run into single zones.',
    access: { staffVisibility: 'all_coaches', shareWithPlayerGuardian: true }
  }
];

export const SEED_OBSERVATIONS: Observation[] = [
  {
    id: 'obs-1',
    operationId: 'op-seed-obs-1',
    playerId: 'p-1',
    source: 'match',
    tags: ['Decision'],
    textNote: 'Feathered edge to keeper driving at 4th stump line without moving feet.',
    linkedFocusIds: ['focus-1'],
    access: { staffVisibility: 'all_coaches', shareWithPlayerGuardian: true },
    createdAt: '2026-08-08T18:40:00Z',
    createdByUserId: 'coach_head_1',
    baseRevision: 0,
    revision: 1,
    syncStatus: 'synced'
  },
  {
    id: 'obs-2',
    operationId: 'op-seed-obs-2',
    playerId: 'p-1',
    source: 'training',
    tags: ['Good execution'],
    textNote: 'Left 4 consecutive out-swingers cleanly in Net 1.',
    linkedFocusIds: ['focus-1'],
    access: { staffVisibility: 'all_coaches', shareWithPlayerGuardian: true },
    createdAt: '2026-08-11T18:30:00Z',
    createdByUserId: 'coach_head_1',
    baseRevision: 0,
    revision: 1,
    syncStatus: 'synced'
  },
  {
    id: 'obs-3',
    operationId: 'op-seed-obs-3',
    playerId: 'p-2',
    source: 'match',
    tags: ['Needs work'],
    textNote: 'Yorker length missed full in 19th over, hit for 2 boundaries.',
    linkedFocusIds: ['focus-2'],
    access: { staffVisibility: 'all_coaches', shareWithPlayerGuardian: true },
    createdAt: '2026-08-08T19:15:00Z',
    createdByUserId: 'coach_head_1',
    baseRevision: 0,
    revision: 1,
    syncStatus: 'synced'
  }
];

export const SEED_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    name: 'New-Ball Defense & Leave Corridor',
    purpose: 'Train top-order decision making outside off stump against swinging full seam',
    objectiveIds: ['batting.new_ball_decision_making'],
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
    objectiveIds: ['batting.playing_spin', 'batting.strike_rotation'],
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
    objectiveIds: ['bowling.death_bowling', 'batting.power_hitting'],
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
    tags: ['Death bowling', 'Yorkers', 'Pressure', 'Bowling'],
    ageSuitability: 'senior'
  },
  {
    id: 'act-4',
    name: 'Pressure High Catching Pods',
    purpose: 'Improve high catching judgment under fatigue and communication',
    objectiveIds: ['fielding.catching'],
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
    objectiveIds: ['tactical.powerplay_strategy', 'batting.batting_under_pressure'],
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
  },

  // --- BATTING ---
  {
    id: 'act-6',
    name: 'Stance & Trigger Movement Check',
    purpose: 'Correct setup and trigger movement so weight transfer is balanced at point of contact',
    category: 'Batting',
    minPlayers: 2,
    maxPlayers: 6,
    durationMinutes: 12,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Mirror or Phone Camera', 'Cones'],
    setupSteps: [
      'Batter takes stance in front of a phone camera set side-on.',
      'Coach feeds gentle underarm/half-pace deliveries.',
      'Review trigger movement on playback after every 3 balls.'
    ],
    coachingPoints: [
      'Head still and level at point of release.',
      'Trigger movement finishes before the ball is bowled.',
      'Weight balanced between both feet at completion of trigger.'
    ],
    constraints: ['No shot is played until the trigger movement is checked and approved.'],
    progressions: ['Increase to full-pace bowling once trigger is repeatable.'],
    structuredProgressions: {
      simplification: ['Remove the camera review and use verbal coach feedback only.'],
      advancement: ['Add a random cue (coach call) to trigger movement start earlier or later.'],
      decisionMaking: ['Batter must select stance width based on stated bowler pace before each ball.'],
      gameScenarios: []
    },
    participationDensity: 'Medium',
    tags: ['Setup', 'Technique', 'Batting', 'Trigger movement']
  },
  {
    id: 'act-7',
    name: 'Front Foot Drive Ladder',
    purpose: 'Build front foot driving consistency through a progressive full-length ladder',
    category: 'Batting',
    minPlayers: 2,
    maxPlayers: 6,
    durationMinutes: 15,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Cones', 'Feeder Balls'],
    setupSteps: [
      'Mark 3 length zones (full, half-volley, over-pitched) with cones.',
      'Feeder calls the zone before each delivery.',
      'Batter must drive along the ground through the corresponding V.'
    ],
    coachingPoints: [
      'Front elbow high through the point of contact.',
      'Head over the front knee at impact.',
      'Full extension through the shot, no jab.'
    ],
    constraints: ['Aerial shots do not count — ground shots only.'],
    progressions: ['Add a mid-off/mid-on fielder to reward placement into gaps.'],
    participationDensity: 'High',
    tags: ['Batting', 'Front foot', 'Driving', 'Seam']
  },
  {
    id: 'act-8',
    name: 'Back Foot Punch & Pull Response',
    purpose: 'Sharpen back foot judgment between the punch and the pull off back-of-length bowling',
    category: 'Batting',
    minPlayers: 2,
    maxPlayers: 6,
    durationMinutes: 15,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Bowling Machine or Feeders', 'Soft Balls (optional)'],
    setupSteps: [
      'Feeder alternates back-of-length balls at stump height and rib height without warning.',
      'Batter must punch stump-height balls and pull/sway rib-height balls.',
      'Run in sets of 6, tally correct shot selections.'
    ],
    coachingPoints: [
      'Weight fully back before committing to a shot.',
      'Head kept still to track length early.',
      'Pull shot played square, not in the air over midwicket.'
    ],
    constraints: ['A wrong shot selection (punch on a rib-height ball) ends that set early.'],
    progressions: ['Increase pace or reduce reaction time between deliveries.'],
    safetyNotes: 'Helmets mandatory; use soft balls for junior or inexperienced groups.',
    participationDensity: 'High',
    tags: ['Batting', 'Back foot', 'Short ball', 'Decision making'],
    ageSuitability: 'senior'
  },
  {
    id: 'act-9',
    name: 'Swinging Ball Judgment Gate',
    purpose: 'Improve early judgment of away-swing and in-swing to reduce edges and lbw dismissals',
    category: 'Batting',
    minPlayers: 3,
    maxPlayers: 6,
    durationMinutes: 15,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Swing Balls', 'Two Gates (cones)'],
    setupSteps: [
      'Set an off-stump gate and a leg-stump gate roughly a bat-length apart.',
      'Bowlers deliver full seam-up balls, mixing away and in-swing.',
      'Batter calls "leave" or "play" out loud before the ball passes the gate.'
    ],
    coachingPoints: [
      'Watch the seam position out of the hand, not just the ball.',
      'Play the ball as late as possible under the eyes.',
      'Commit fully once the decision is made — no half shots.'
    ],
    constraints: ['A late or incorrect call costs a point; correct leaves and clean strikes both score.'],
    progressions: ['Bowl from wider angles to simulate different release points.'],
    participationDensity: 'High',
    tags: ['Batting', 'Swing', 'Seam', 'Decision making']
  },
  {
    id: 'act-10',
    name: 'Boundary Zone Power Hitting',
    purpose: 'Develop controlled power hitting into specific boundary zones under fatigue',
    category: 'Batting',
    minPlayers: 3,
    maxPlayers: 8,
    durationMinutes: 15,
    spaceRequired: 'outfield',
    equipment: ['Cones for Zones', 'Machine or Feeders', 'Boundary Markers'],
    setupSteps: [
      'Divide the boundary into 4 scoring zones with cones.',
      'Coach nominates a target zone before each delivery.',
      'Batter scores double points for clearing the rope in the nominated zone.'
    ],
    coachingPoints: [
      'Full extension through the ball, don’t just muscle it.',
      'Base stays balanced — avoid falling away on the shot.',
      'Head steady through contact even at high effort.'
    ],
    constraints: ['Mis-hits into the wrong zone score zero, even if it clears the rope.'],
    progressions: ['Add fatigue by requiring 2 burpees between each delivery.'],
    safetyNotes: 'Ensure clear space beyond the boundary rope for ball retrieval.',
    participationDensity: 'Medium',
    tags: ['Batting', 'Power hitting', 'Boundary options', 'Death overs']
  },
  {
    id: 'act-11',
    name: 'Quick Singles & Call Communication',
    purpose: 'Sharpen running between wickets, calling clarity and turning for twos',
    category: 'Batting',
    minPlayers: 4,
    maxPlayers: 10,
    durationMinutes: 12,
    spaceRequired: 'pitch',
    equipment: ['Stumps at Both Ends', 'Cones for Fielder Positions'],
    setupSteps: [
      'Pair batters run genuine singles off throw-downs, calling loudly.',
      'Fielder cones placed at cover and midwicket to simulate pressure.',
      'Award a bonus run for a clean turn into a second.'
    ],
    coachingPoints: [
      'Caller has final say — non-striker backs up and reacts on call.',
      'Bat is grounded, not the body, on the turn.',
      'Eyes up scanning the field while running, not down at the crease.'
    ],
    constraints: ['A mixed call (both call at once) results in the run being cancelled.'],
    progressions: ['Add a fielder who can actively attempt a run-out.'],
    participationDensity: 'High',
    tags: ['Batting', 'Running', 'Communication', 'Strike rotation']
  },

  // --- BOWLING ---
  {
    id: 'act-12',
    name: 'Run-up Rhythm & Repeatability Ladder',
    purpose: 'Build a consistent, repeatable run-up rhythm that holds under fatigue',
    category: 'Bowling',
    minPlayers: 1,
    maxPlayers: 6,
    durationMinutes: 12,
    spaceRequired: 'outfield',
    equipment: ['Marker Cones', 'Stopwatch'],
    setupSteps: [
      'Mark the bowler’s run-up start point and delivery stride with cones.',
      'Bowler runs in and delivers without a ball, focusing purely on rhythm.',
      'Coach times run-up duration and checks landing point consistency over 6 reps.'
    ],
    coachingPoints: [
      'Gradual acceleration into the crease, not a sprint start.',
      'Consistent number of strides every time.',
      'Tall, balanced position at the crease before the delivery stride.'
    ],
    constraints: ['Any rep landing more than a bat-length outside the crease mark is repeated.'],
    progressions: ['Add a ball once run-up lands consistently within the mark 5/6 times.'],
    participationDensity: 'Medium',
    tags: ['Bowling', 'Run-up', 'Rhythm', 'Consistency']
  },
  {
    id: 'act-13',
    name: 'Release Point Consistency Target',
    purpose: 'Tighten release point consistency to reduce width and full tosses',
    category: 'Bowling',
    minPlayers: 1,
    maxPlayers: 6,
    durationMinutes: 15,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Target Mat', 'Chalk or Tape for Release Marker'],
    setupSteps: [
      'Place a target mat on a good length in line with off stump.',
      'Bowler delivers 6-ball overs aiming to land on the mat.',
      'Mark release point on the popping crease with tape after each ball.'
    ],
    coachingPoints: [
      'Same release height every ball — check high front arm.',
      'Front foot lands inside the crease consistently.',
      'Follow-through finishes balanced, not falling away.'
    ],
    constraints: ['A release point more than 30cm from the cluster average voids that delivery.'],
    progressions: ['Reduce target mat size as accuracy improves.'],
    participationDensity: 'Medium',
    tags: ['Bowling', 'Line and length', 'Consistency', 'Accuracy']
  },
  {
    id: 'act-14',
    name: 'New-Ball Corridor Control',
    purpose: 'Build new-ball line and length discipline in the fourth/fifth stump corridor',
    category: 'Bowling',
    minPlayers: 1,
    maxPlayers: 6,
    durationMinutes: 15,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Cones for Corridor', 'New/Semi-New Balls'],
    setupSteps: [
      'Mark the fourth/fifth stump corridor with two cones on a good length.',
      'Bowler delivers new-ball-style overs targeting the corridor.',
      'Track percentage of balls landing inside the corridor over 2 overs.'
    ],
    coachingPoints: [
      'Seam presented upright toward the corridor.',
      'Full commitment through the crease, no dragging the length back.',
      'Consistent pace through the crease, no change in effort ball to ball.'
    ],
    constraints: ['Balls landing on leg stump or short are scored as a miss.'],
    progressions: ['Add a batter who leaves/plays to create real decision pressure for the bowler.'],
    participationDensity: 'Medium',
    tags: ['Bowling', 'New ball', 'Line and length', 'Seam']
  },
  {
    id: 'act-15',
    name: 'Seam Presentation & Swing Shape',
    purpose: 'Improve seam presentation to generate consistent away or in-swing shape',
    category: 'Bowling',
    minPlayers: 1,
    maxPlayers: 6,
    durationMinutes: 15,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Swing Balls', 'Slow-Motion Camera (optional)'],
    setupSteps: [
      'Bowler delivers 6-ball sets focusing purely on seam position at release.',
      'Coach or camera checks seam angle immediately after release.',
      'Batter/keeper notes visible swing direction and amount for each ball.'
    ],
    coachingPoints: [
      'Seam angled toward desired swing direction, not wobbling.',
      'Wrist position stays behind the ball through release.',
      'Consistent grip pressure across all fingers.'
    ],
    constraints: ['A wobble-seam delivery (no visible swing) does not count toward the target of 4 swinging deliveries.'],
    progressions: ['Bowl to a specific batter stance (RHB/LHB) to apply swing tactically.'],
    participationDensity: 'Medium',
    tags: ['Bowling', 'Swing', 'Seam', 'Technique']
  },
  {
    id: 'act-16',
    name: 'Spin Revs & Drift Target Bowling',
    purpose: 'Increase revolutions and drift while maintaining control of length for spin bowlers',
    category: 'Bowling',
    minPlayers: 1,
    maxPlayers: 6,
    durationMinutes: 15,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Target Mat', 'Chalk Ball (optional, for rev visibility)'],
    setupSteps: [
      'Place a target mat on a good-length, turning line.',
      'Bowler delivers overs aiming for maximum revs while hitting the mat.',
      'Coach/keeper calls out visible drift and turn after each delivery.'
    ],
    coachingPoints: [
      'Full rip through the ball with the fingers, not just arm speed.',
      'Loop and dip generated through wrist position, not just pace reduction.',
      'Consistent release height for repeatable turn.'
    ],
    constraints: ['A flat, low-rev delivery that still hits the mat only scores half points.'],
    progressions: ['Add a sweeping batter to test control under attacking intent.'],
    participationDensity: 'Medium',
    tags: ['Bowling', 'Spin', 'Control', 'Revolutions']
  },
  {
    id: 'act-17',
    name: 'Change-up Sequencing Under Pressure',
    purpose: 'Practise sequencing slower balls and pace variations believably within an over',
    category: 'Bowling',
    minPlayers: 2,
    maxPlayers: 6,
    durationMinutes: 15,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Grip Cards (slower ball variations)', 'Scoreboard'],
    setupSteps: [
      'Bowler is dealt a hidden sequence of 6 deliveries (pace/slower ball mix) via cards.',
      'Batter chases a death-over target, unaware of the sequence.',
      'Coach tracks how many variations were disguised successfully (same arm speed/action).'
    ],
    coachingPoints: [
      'Identical run-up and arm speed regardless of the variation bowled.',
      'Grip change happens in the hand, not visible in the load-up.',
      'Commit fully to the changed pace — no half-hearted slower balls.'
    ],
    constraints: ['Any variation the batter picks early (arm speed give-away) is called out and does not score.'],
    progressions: ['Batter is told 1 of the 6 balls will be a slower ball, sharpening the disguise requirement.'],
    participationDensity: 'Medium',
    tags: ['Bowling', 'Death bowling', 'Variations', 'Pressure'],
    ageSuitability: 'senior'
  },
  {
    id: 'act-18',
    name: 'Wicket-Taking Plan Execution',
    purpose: 'Execute a pre-agreed wicket-taking plan against a specific batter profile within a limited number of balls',
    category: 'Bowling',
    minPlayers: 2,
    maxPlayers: 8,
    durationMinutes: 15,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Field Cones (optional)', 'Plan Card'],
    setupSteps: [
      'Coach and bowler agree a 3-ball plan targeting a stated weakness (e.g. width outside off).',
      'Bowler has 18 balls (3 overs) to execute the plan and create a genuine chance.',
      'Track how many deliveries matched the intended plan versus were reactive.'
    ],
    coachingPoints: [
      'Bowl to the plan even if the first balls don’t bring immediate reward.',
      'Adjust the plan only with the coach’s input, not impulsively.',
      'Build pressure across the sequence rather than one isolated ball.'
    ],
    constraints: ['A ball that doesn’t match the agreed plan does not count toward the 18.'],
    progressions: ['Reduce the ball count to 12 to increase pressure and precision required.'],
    structuredProgressions: {
      simplification: ['Reduce the plan to a single, simple line/length target rather than a 3-ball sequence.'],
      advancement: ['Add a specific field to reward the planned dismissal type.'],
      decisionMaking: ['Bowler must call which ball of the plan is coming next before each delivery.'],
      gameScenarios: [
        { id: 'scn-wicket-plan-1', title: '18 Balls to a Wicket', targetBalls: 18, description: 'Execute the agreed plan and create at least one clear chance inside 18 balls.' }
      ]
    },
    participationDensity: 'Medium',
    tags: ['Bowling', 'Tactical', 'Wicket-taking', 'Plans']
  },

  // --- FIELDING ---
  {
    id: 'act-19',
    name: 'Slip Cradle Reaction Catching',
    purpose: 'Sharpen slip cordon reactions and soft hands on fast edges',
    category: 'Fielding',
    minPlayers: 2,
    maxPlayers: 6,
    durationMinutes: 12,
    spaceRequired: 'small_grid',
    equipment: ['Catching Cradle', 'Hard Balls'],
    setupSteps: [
      'Slip fielders set up in a line 1m apart facing the cradle.',
      'Coach or feeder rebounds the ball at varying angles and pace.',
      'Fielders react and call for the catch, rotating position after each set.'
    ],
    coachingPoints: [
      'Hands soft and give with the ball on contact.',
      'Stay low and balanced between deliveries, weight forward on toes.',
      'Clear, early call to avoid a collision with the neighbouring slip.'
    ],
    constraints: ['A dropped catch means that fielder starts the set again from zero.'],
    progressions: ['Increase cradle rebound pace as reactions sharpen.'],
    safetyNotes: 'Use appropriately sized hard balls and ensure adequate spacing between fielders.',
    participationDensity: 'Medium',
    tags: ['Fielding', 'Close catching', 'Slips', 'Reaction']
  },
  {
    id: 'act-20',
    name: 'Clean Pickup & Release Circuit',
    purpose: 'Build clean ground fielding technique and a fast, accurate release under time pressure',
    category: 'Fielding',
    minPlayers: 4,
    maxPlayers: 12,
    durationMinutes: 15,
    spaceRequired: 'outfield',
    equipment: ['Cones', 'Stumps as Target', 'Stopwatch'],
    setupSteps: [
      'Set up a circuit of 4 ground-fielding stations feeding toward a single stump target.',
      'Fielders rotate through the circuit, one ball at a time, timed as a group.',
      'Coach records total circuit time and clean-pickup percentage.'
    ],
    coachingPoints: [
      'Low base with head over the ball on the approach.',
      'Gather in front of the body, not across it.',
      'Transfer to release in one fluid motion, no double gather.'
    ],
    constraints: ['A fumbled pickup adds a 3-second penalty to the team’s circuit time.'],
    progressions: ['Increase feed pace or reduce spacing between stations.'],
    participationDensity: 'High',
    tags: ['Fielding', 'Ground fielding', 'Clean pickups', 'Throwing']
  },
  {
    id: 'act-21',
    name: 'Relay Race Accuracy Challenge',
    purpose: 'Improve outfield relay accuracy and decision-making on a running relay throw',
    category: 'Fielding',
    minPlayers: 6,
    maxPlayers: 16,
    durationMinutes: 15,
    spaceRequired: 'outfield',
    equipment: ['Cones', 'Stumps at Both Ends', 'Balls'],
    setupSteps: [
      'Split into pairs — a deep fielder and a relay fielder positioned mid-outfield.',
      'Coach hits/throws to the boundary; deep fielder retrieves and relays.',
      'Relay fielder must redirect the throw cleanly to the stumps in one motion.'
    ],
    coachingPoints: [
      'Relay fielder calls early to position for the incoming throw.',
      'One-motion transfer — no unnecessary extra steps before releasing.',
      'Flat, hard throw over the top of the stumps, not a lob.'
    ],
    constraints: ['A relay that bounces more than twice before the stumps does not score.'],
    progressions: ['Add a runner attempting the second run to create genuine time pressure.'],
    participationDensity: 'High',
    tags: ['Fielding', 'Relay', 'Throwing', 'Boundary']
  },
  {
    id: 'act-22',
    name: 'Boundary Sprint & Save Drill',
    purpose: 'Train boundary riders to close down the ball quickly and prevent the extra run',
    category: 'Fielding',
    minPlayers: 4,
    maxPlayers: 10,
    durationMinutes: 12,
    spaceRequired: 'outfield',
    equipment: ['Cones for Boundary Line', 'Balls'],
    setupSteps: [
      'Boundary fielders start 10m inside the rope facing the hitter.',
      'Coach hits balls toward the rope at varying angles.',
      'Fielder sprints, saves the boundary, and delivers a controlled return throw.'
    ],
    coachingPoints: [
      'Angle the run to cut off the ball, not chase it in a straight line.',
      'Slide or one-knee stop only when needed to guarantee the save.',
      'Quick recovery to feet and accurate return throw after the stop.'
    ],
    constraints: ['A save that results in an overthrow (wild return) does not count as a success.'],
    progressions: ['Add a batting pair attempting to run the extra run to increase pressure.'],
    safetyNotes: 'Check ground surface for hazards before sliding stops.',
    participationDensity: 'High',
    tags: ['Fielding', 'Boundary', 'Ground fielding', 'Pressure']
  },
  {
    id: 'act-23',
    name: 'Reaction Ball Sharpness',
    purpose: 'Sharpen close-in reflexes and hand-eye coordination using unpredictable ball bounce',
    category: 'Fielding',
    minPlayers: 2,
    maxPlayers: 8,
    durationMinutes: 10,
    spaceRequired: 'small_grid',
    equipment: ['Reaction Balls (irregular bounce)', 'Cones'],
    setupSteps: [
      'Pairs stand 3m apart and throw a reaction ball to bounce once between them.',
      'Fielder must react to the unpredictable bounce and cleanly field it.',
      'Rotate partners every 2 minutes to vary bounce patterns.'
    ],
    coachingPoints: [
      'Stay light on the feet, ready to move in any direction.',
      'Watch the ball all the way into the hands.',
      'Soft hands to absorb the unpredictable bounce.'
    ],
    constraints: ['Balls fielded cleanly on the first attempt count double.'],
    progressions: ['Reduce the distance between partners to increase reaction speed demand.'],
    participationDensity: 'High',
    tags: ['Fielding', 'Reaction', 'Warm-up', 'Close catching'],
    ageSuitability: 'junior'
  },

  // --- WICKETKEEPING ---
  {
    id: 'act-24',
    name: 'Standing Back Glove Presentation',
    purpose: 'Improve glove presentation and footwork for a keeper standing back to pace bowling',
    category: 'Wicketkeeping',
    minPlayers: 1,
    maxPlayers: 3,
    durationMinutes: 12,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Gloves', 'Bowling Machine or Feeders'],
    setupSteps: [
      'Keeper stands back at a normal pace-bowling distance.',
      'Feeder delivers a mix of good length balls, edges and byes down leg.',
      'Coach checks glove presentation and footwork after every 6 balls.'
    ],
    coachingPoints: [
      'Soft hands with fingers pointing down, presenting early.',
      'Small controlled steps to stay side-on to the ball.',
      'Watch the ball into the gloves, head still on the take.'
    ],
    constraints: ['A take with hard/rigid hands (ball pops out) is repeated.'],
    progressions: ['Increase pace or add genuine seam movement off the pitch.'],
    safetyNotes: 'Full keeping kit (gloves, pads) mandatory.',
    participationDensity: 'Low',
    tags: ['Wicketkeeping', 'Standing back', 'Technique', 'Take quality']
  },
  {
    id: 'act-25',
    name: 'Standing Up Spin Takes',
    purpose: 'Sharpen standing-up technique and footwork against spin bowling',
    category: 'Wicketkeeping',
    minPlayers: 2,
    maxPlayers: 4,
    durationMinutes: 15,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Gloves', 'Spin Bowlers'],
    setupSteps: [
      'Keeper stands up close behind the stumps to a spin bowler.',
      'Bowler mixes turn, arm balls and flighted deliveries.',
      'Coach tracks clean takes and stumping opportunities created.'
    ],
    coachingPoints: [
      'Head still and low, tracking the ball off the pitch.',
      'Quick, quiet feet to adjust to turn and bounce.',
      'Whip the bails off in one motion on a stumping chance.'
    ],
    constraints: ['A take that requires the keeper to step back does not count as clean.'],
    progressions: ['Add a batter using their feet to increase stumping decision speed.'],
    safetyNotes: 'Full keeping kit mandatory; helmet recommended when standing up.',
    participationDensity: 'Low',
    tags: ['Wicketkeeping', 'Standing up', 'Spin', 'Stumpings']
  },
  {
    id: 'act-26',
    name: 'Keeper Lateral Shuffle & Take',
    purpose: 'Build lateral footwork speed for keeping to balls down the leg side and wide outside off',
    category: 'Wicketkeeping',
    minPlayers: 1,
    maxPlayers: 3,
    durationMinutes: 12,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Gloves', 'Cones for Lateral Markers'],
    setupSteps: [
      'Mark lateral zones either side of off/leg stump with cones.',
      'Feeder calls or throws to a random zone before each ball.',
      'Keeper shuffles laterally and takes the ball cleanly within the zone.'
    ],
    coachingPoints: [
      'Shuffle steps, not crossing feet, to stay balanced.',
      'Stay down through the take rather than standing up early.',
      'Glove positioned to lead the movement toward the ball.'
    ],
    constraints: ['Any take taken outside the marked zone is not counted, regardless of cleanliness.'],
    progressions: ['Increase the width of the lateral zones to extend the reach required.'],
    participationDensity: 'Low',
    tags: ['Wicketkeeping', 'Footwork', 'Lateral movement', 'Technique']
  },
  {
    id: 'act-27',
    name: 'Clean Hands Under Fatigue',
    purpose: 'Maintain take quality and concentration in the closing stages of a long keeping spell',
    category: 'Wicketkeeping',
    minPlayers: 1,
    maxPlayers: 3,
    durationMinutes: 15,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Gloves', 'Bowling Machine or Multiple Feeders'],
    setupSteps: [
      'Keeper completes a short fitness burst (e.g. 30 seconds of squats) before each 6-ball set.',
      'Immediately faces a set of deliveries at match intensity.',
      'Coach tracks take quality across sets 1 through 4 to monitor fade.'
    ],
    coachingPoints: [
      'Reset breathing before the first ball of each set.',
      'Maintain the same low, ready position regardless of fatigue.',
      'Communicate clearly with the bowler even when tired.'
    ],
    constraints: ['A dropped take in set 3 or 4 is flagged specifically as a fatigue-related error for review.'],
    progressions: ['Extend to 6 sets to simulate a full innings behind the stumps.'],
    safetyNotes: 'Monitor for genuine fatigue/heat stress and stop if a player is struggling.',
    participationDensity: 'Low',
    tags: ['Wicketkeeping', 'Fitness', 'Concentration', 'Take quality']
  },
  {
    id: 'act-28',
    name: 'Leg-Side Take & Stumping Speed',
    purpose: 'Improve reaction speed and glove-to-bail execution on leg-side takes and stumping chances',
    category: 'Wicketkeeping',
    minPlayers: 2,
    maxPlayers: 4,
    durationMinutes: 12,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Gloves', 'Stopwatch'],
    setupSteps: [
      'Feeder or bowler delivers balls angled down the leg side.',
      'Keeper takes and, on the coach’s call, executes a stumping as fast as possible.',
      'Coach times glove-to-bail speed on each stumping attempt.'
    ],
    coachingPoints: [
      'Take first, remove the bails second — no rushing the take itself.',
      'Bails removed with the ball in the glove, not the hand alone.',
      'Balance maintained through the movement, not overreaching.'
    ],
    constraints: ['A stumping attempt that dislodges only one bail is recorded as incomplete.'],
    progressions: ['Add a batter who may or may not overbalance, requiring a genuine read.'],
    safetyNotes: 'Full keeping kit mandatory.',
    participationDensity: 'Low',
    tags: ['Wicketkeeping', 'Stumpings', 'Leg-side', 'Reaction']
  },

  // --- TACTICAL ---
  {
    id: 'act-29',
    name: 'Powerplay Field & Intent Simulation',
    purpose: 'Practise powerplay batting intent and bowling containment under fielding restrictions',
    category: 'Tactical',
    minPlayers: 8,
    maxPlayers: 14,
    durationMinutes: 20,
    spaceRequired: 'pitch',
    equipment: ['Cones for Field Restrictions', 'Scoreboard'],
    setupSteps: [
      'Set a powerplay field with only 2 fielders outside the ring.',
      'Batting pair faces 6 overs aiming to maximise the powerplay scoring rate.',
      'Bowling team must adjust lines to combat the restricted field.'
    ],
    coachingPoints: [
      'Batters look to hit into the gaps created by the restricted field, not just over the top.',
      'Bowlers use width and angle changes to counter aggressive intent.',
      'Communicate field adjustments verbally as the over progresses.'
    ],
    constraints: ['Fielders cannot move outside the ring until the over restriction lifts.'],
    progressions: ['Reduce to 4 overs to intensify decision-making speed.'],
    participationDensity: 'High',
    tags: ['Tactical', 'Powerplay', 'Field setting', 'Intent']
  },
  {
    id: 'act-30',
    name: 'Death Over Defend-the-Total',
    purpose: 'Simulate the pressure of defending a tight total in the final overs',
    category: 'Tactical',
    minPlayers: 10,
    maxPlayers: 16,
    durationMinutes: 20,
    spaceRequired: 'pitch',
    equipment: ['Cones for Field', 'Scoreboard'],
    setupSteps: [
      'Set a target requiring the batting side to score 12+ off the final over.',
      'Bowling captain sets the field and nominates the bowler and plan.',
      'Coach tracks whether the plan was executed regardless of outcome.'
    ],
    coachingPoints: [
      'Field placed to protect the specific plan (e.g. wide yorker needs deep point/third).',
      'Bowler commits fully to the agreed plan under pressure.',
      'Captain communicates the plan clearly to every fielder before the over.'
    ],
    constraints: ['A change of plan mid-over must be called out loud to the whole field.'],
    progressions: ['Reduce the defended target to increase pressure further.'],
    participationDensity: 'High',
    tags: ['Tactical', 'Death overs', 'Field setting', 'Pressure'],
    ageSuitability: 'senior'
  },
  {
    id: 'act-31',
    name: 'Field Setting Communication Drill',
    purpose: 'Build captain and bowler communication when constructing and adjusting a field',
    category: 'Tactical',
    minPlayers: 9,
    maxPlayers: 12,
    durationMinutes: 15,
    spaceRequired: 'pitch',
    equipment: ['Cones', 'Field Position Cards'],
    setupSteps: [
      'Captain is given a batter scouting card (e.g. "strong off side, weak leg glance").',
      'Captain sets the field verbally, fielders move without a physical diagram.',
      'Coach checks the field matches the stated plan within 30 seconds.'
    ],
    coachingPoints: [
      'Clear, specific position names used, not vague pointing.',
      'Fielders confirm their position back to the captain.',
      'Field adjusted after each over based on what actually happened.'
    ],
    constraints: ['Any fielder in the wrong position after 30 seconds is called out and corrected.'],
    progressions: ['Add a live batter to test whether the field holds under real shots.'],
    participationDensity: 'High',
    tags: ['Tactical', 'Field setting', 'Communication', 'Captaincy']
  },
  {
    id: 'act-32',
    name: 'Partnership Building Under Tempo Pressure',
    purpose: 'Practise building a partnership while managing required run rate and rotating strike',
    category: 'Tactical',
    minPlayers: 4,
    maxPlayers: 10,
    durationMinutes: 20,
    spaceRequired: 'pitch',
    equipment: ['Scoreboard', 'Cones for Field'],
    setupSteps: [
      'Batting pair starts a chase with a rising required rate tracked on the scoreboard.',
      'Pair must talk between deliveries to agree tempo and risk.',
      'Coach reviews communication and shot selection against the required rate.'
    ],
    coachingPoints: [
      'Rotate strike on any ball not requiring a boundary.',
      'Communicate clearly after every over about the state of the chase.',
      'Take calculated risks only, not panic shots, as the rate climbs.'
    ],
    constraints: ['Losing a wicket resets the required rate calculation and adds pressure for the incoming batter.'],
    progressions: ['Introduce two wickets down at the start to simulate a rebuild scenario.'],
    participationDensity: 'Medium',
    tags: ['Tactical', 'Partnerships', 'Strike rotation', 'Match pressure']
  },
  {
    id: 'act-33',
    name: 'Last-Wicket Stand Scenario',
    purpose: 'Practise decision-making and communication for a last-wicket partnership defending or chasing',
    category: 'Tactical',
    minPlayers: 4,
    maxPlayers: 10,
    durationMinutes: 15,
    spaceRequired: 'pitch',
    equipment: ['Scoreboard', 'Cones for Field'],
    setupSteps: [
      'Set a scenario with the last pair needing a specific total from a fixed number of balls.',
      'Non-striker must manage strike carefully to protect a weaker partner where relevant.',
      'Coach reviews running decisions and communication after the scenario ends.'
    ],
    coachingPoints: [
      'Clear, loud calling on every run given the high stakes.',
      'Protect the strike proactively rather than reactively.',
      'Stay calm and decisive under pressure rather than rushing shots.'
    ],
    constraints: ['A run-out ends the scenario immediately, regardless of the score at that point.'],
    progressions: ['Reduce the ball count remaining to increase pressure.'],
    participationDensity: 'Medium',
    tags: ['Tactical', 'Match scenario', 'Decision making', 'Pressure'],
    ageSuitability: 'senior'
  },

  // --- PHYSICAL ---
  {
    id: 'act-34',
    name: 'Shoulder Activation & Throwing Prep',
    purpose: 'Prepare the shoulder and throwing arm for a full session of fielding and bowling',
    category: 'Physical',
    minPlayers: 2,
    maxPlayers: 20,
    durationMinutes: 10,
    spaceRequired: 'outfield',
    equipment: ['Resistance Bands (optional)', 'Balls'],
    setupSteps: [
      'Pairs begin with band-resisted shoulder rotations for 60 seconds each direction.',
      'Progress to gentle underarm throws at close range, increasing distance gradually.',
      'Finish with full-effort flat throws once the group is fully warmed up.'
    ],
    coachingPoints: [
      'Build up intensity gradually — no full-effort throws in the first 5 minutes.',
      'Full arm circle range of motion, not just a small warm-up flick.',
      'Stop immediately and report any shoulder discomfort to the coach.'
    ],
    constraints: ['No full-pace bowling or throwing permitted until this activation is complete.'],
    progressions: ['Add rotational medicine ball throws for advanced squads.'],
    safetyNotes: 'Mandatory before any bowling or hard throwing session, especially early season or after a break.',
    participationDensity: 'High',
    tags: ['Physical', 'Warm-up', 'Injury prevention', 'Throwing'],
    ageSuitability: 'junior'
  },
  {
    id: 'act-35',
    name: 'Lateral Agility Ladder & Reaction',
    purpose: 'Improve lateral change-of-direction speed relevant to fielding movement',
    category: 'Physical',
    minPlayers: 2,
    maxPlayers: 16,
    durationMinutes: 10,
    spaceRequired: 'outfield',
    equipment: ['Agility Ladder', 'Cones'],
    setupSteps: [
      'Set up a standard agility ladder with cones at each end.',
      'Players complete lateral in-out footwork through the ladder.',
      'Finish each rep with an explosive lateral sprint to a cone on a random call.'
    ],
    coachingPoints: [
      'Quick, light feet through the ladder — minimal ground contact time.',
      'Stay low and balanced through direction changes.',
      'React to the call, don’t anticipate the direction.'
    ],
    constraints: ['A missed or double-stepped ladder rung means that rep is repeated.'],
    progressions: ['Add a ball catch at the end of the sprint to combine agility with hands.'],
    safetyNotes: 'Ensure firm, even ground surface before running this drill.',
    participationDensity: 'High',
    tags: ['Physical', 'Agility', 'Fielding', 'Movement'],
    ageSuitability: 'junior'
  },
  {
    id: 'act-36',
    name: 'Bowling Workload Monitoring Set',
    purpose: 'Deliver a controlled bowling set that respects individual workload limits while maintaining intensity',
    category: 'Physical',
    minPlayers: 1,
    maxPlayers: 6,
    durationMinutes: 15,
    spaceRequired: 'net',
    equipment: ['Stumps', 'Delivery Counter'],
    setupSteps: [
      'Confirm each bowler’s delivery limit for the session before starting.',
      'Bowlers work in rotation, with deliveries tallied against their individual limit.',
      'Coach stops any bowler who reaches their limit, regardless of how they are performing.'
    ],
    coachingPoints: [
      'Quality over quantity — every delivery bowled at genuine session intensity.',
      'Report any soreness or change in action immediately.',
      'Recovery walk-back used consciously between deliveries, not rushed.'
    ],
    constraints: ['No bowler exceeds their pre-agreed delivery count under any circumstance.'],
    progressions: ['Not applicable — this activity is a safety ceiling, not a progression ladder.'],
    safetyNotes: 'Workload limits should follow club/competition fast-bowling guidelines and any individual restrictions on file.',
    participationDensity: 'Medium',
    tags: ['Physical', 'Workload', 'Bowling', 'Safety']
  },
  {
    id: 'act-37',
    name: 'Fielding Fitness Shuttle Circuit',
    purpose: 'Build match-realistic fielding fitness combining sprinting, changes of direction and ball skills',
    category: 'Physical',
    minPlayers: 4,
    maxPlayers: 16,
    durationMinutes: 15,
    spaceRequired: 'outfield',
    equipment: ['Cones', 'Balls', 'Stopwatch'],
    setupSteps: [
      'Set up a shuttle circuit combining a sprint, a ground fielding pickup and a throw at the stumps.',
      'Players complete the circuit in pairs, resting while their partner goes.',
      'Track completion time and accuracy of the final throw.'
    ],
    coachingPoints: [
      'Maintain fielding technique even at high sprint effort.',
      'Accelerate hard out of the pickup toward the target.',
      'Controlled, accurate throw prioritised over pure speed.'
    ],
    constraints: ['A missed stump target on the throw adds a time penalty to that player’s circuit.'],
    progressions: ['Increase circuit distance or add a second fielding pickup.'],
    safetyNotes: 'Build volume gradually across a pre-season block before running at full intensity.',
    participationDensity: 'High',
    tags: ['Physical', 'Fitness', 'Fielding', 'Conditioning']
  },

  // --- TEAM ---
  {
    id: 'act-38',
    name: 'Communication Callouts Circuit',
    purpose: 'Build the habit of clear, loud, early communication across fielding positions',
    category: 'Team',
    minPlayers: 8,
    maxPlayers: 16,
    durationMinutes: 10,
    spaceRequired: 'outfield',
    equipment: ['Balls', 'Cones for Fielding Positions'],
    setupSteps: [
      'Set fielders in realistic match positions.',
      'Coach hits balls into gaps between fielders requiring a call.',
      'Any ball fielded without a clear, early call is flagged and repeated.'
    ],
    coachingPoints: [
      'Call early and loud — "mine" or a teammate’s name, not silence.',
      'Only one fielder calls; others back off immediately once called.',
      'Communication continues after the play, confirming the next action.'
    ],
    constraints: ['Two fielders converging without a call counts as a team error, not an individual one.'],
    progressions: ['Add a batter hitting live to increase unpredictability.'],
    participationDensity: 'High',
    tags: ['Team', 'Communication', 'Fielding', 'Culture'],
    ageSuitability: 'junior'
  },
  {
    id: 'act-39',
    name: 'Intent & Body Language Standards Session',
    purpose: 'Set and reinforce visible team standards for intent and positive body language',
    category: 'Team',
    minPlayers: 6,
    maxPlayers: 20,
    durationMinutes: 10,
    spaceRequired: 'outfield',
    equipment: ['None required'],
    setupSteps: [
      'Group discusses 3 visible standards for body language (e.g. sprint to every ball, clap every good effort).',
      'Standards are practised deliberately during a short fielding or batting drill.',
      'Coach and peers give feedback specifically on standards, not just skill execution.'
    ],
    coachingPoints: [
      'Effort visible even after a mistake, not just after success.',
      'Peer encouragement given specifically and immediately.',
      'Standards apply to every player regardless of role or ability.'
    ],
    constraints: ['A lapse in an agreed standard (e.g. jogging to a ball) is addressed on the spot, not ignored.'],
    progressions: ['Nominate a player leader to enforce standards without coach intervention.'],
    participationDensity: 'High',
    tags: ['Team', 'Intent', 'Culture', 'Body language'],
    ageSuitability: 'junior'
  },
  {
    id: 'act-40',
    name: 'Structured Warm-Up Routine',
    purpose: 'Establish a consistent, efficient warm-up routine players can lead themselves',
    category: 'Team',
    minPlayers: 6,
    maxPlayers: 20,
    durationMinutes: 10,
    spaceRequired: 'outfield',
    equipment: ['Cones', 'Balls'],
    setupSteps: [
      'Group runs a fixed sequence: light jog, dynamic stretches, throwing activation, ball skills.',
      'A nominated player leads the routine and keeps time.',
      'Coach observes and only intervenes if technique or effort drops.'
    ],
    coachingPoints: [
      'Routine run at genuine warm-up intensity, not walked through.',
      'Player leader keeps the group on time without needing coach prompts.',
      'Consistency week to week builds pre-match habits that transfer to match day.'
    ],
    constraints: ['Full-intensity bowling or hard hitting is not permitted until the full routine is complete.'],
    progressions: ['Rotate the player leader role each week to build shared ownership.'],
    safetyNotes: 'Ensures adequate physical preparation before higher-intensity training or matches.',
    participationDensity: 'High',
    tags: ['Team', 'Warm-up', 'Preparation', 'Culture'],
    ageSuitability: 'junior'
  },
  {
    id: 'act-41',
    name: 'Pre-Match Focus & Visualization',
    purpose: 'Build a simple pre-match routine to settle nerves and sharpen focus on role clarity',
    category: 'Team',
    minPlayers: 1,
    maxPlayers: 20,
    durationMinutes: 10,
    spaceRequired: 'indoor',
    equipment: ['None required'],
    setupSteps: [
      'Players sit quietly and are guided through their role and one key focus for the match.',
      'Each player states their focus out loud to a partner.',
      'Group reconvenes with a brief, positive team message before taking the field.'
    ],
    coachingPoints: [
      'Focus statements are specific and personal, not generic ("bowl a good line" not "play well").',
      'Tone stays calm and controlled, not hyped or rushed.',
      'Every player, including those not in the starting XI, is included in the routine.'
    ],
    constraints: ['Keep the session brief — this is focus, not a long team talk.'],
    progressions: ['Encourage senior players to run the session themselves over time.'],
    participationDensity: 'Low',
    tags: ['Team', 'Match preparation', 'Focus', 'Mental skills'],
    ageSuitability: 'junior'
  }
];

export const SEED_MATCH_RECORD: MatchRecord = {
  id: 'match-1',
  teamId: 'ct-1',
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

export const SEED_RULES_PROFILES: CompetitionRulesProfile[] = [
  {
    id: 'rules-t20-default',
    name: 'T20 Playing Conditions (Default)',
    format: 't20',
    inningsOvers: 20,
    phases: [
      { phase: 'powerplay', oversRange: [1, 6], maxOutsideCircle: 2 },
      { phase: 'middle_overs', oversRange: [7, 15], maxOutsideCircle: 5 },
      { phase: 'death', oversRange: [16, 20], maxOutsideCircle: 5 },
    ],
    maxBehindSquareLeg: 2,
    shortBallRulesNotes: 'Max 1 short-pitched delivery above shoulder height per over (Law 41.6 / ICC T20I). Confirm local competition rules.',
    wideInterpretationNotes: 'Strict wide interpretation on leg side; off-side wide guideline applies outside target line.',
    juniorSafetySettings: { allowShortBall: false, maxControlRequiredForShortBall: 3 },
    effectiveDate: '2026-08-01',
    sourceNote: 'Default T20 preset. Must be checked against local competition playing conditions.',
  },
  {
    id: 'rules-40over-default',
    name: '40-Over Playing Conditions (Default)',
    format: 'one_day_40',
    inningsOvers: 40,
    phases: [
      { phase: 'powerplay', oversRange: [1, 8], maxOutsideCircle: 2 },
      { phase: 'middle_overs', oversRange: [9, 32], maxOutsideCircle: 4 },
      { phase: 'death', oversRange: [33, 40], maxOutsideCircle: 5 },
    ],
    maxBehindSquareLeg: 2,
    shortBallRulesNotes: 'Max 1 bouncer per over. Confirm local grade/junior limits.',
    wideInterpretationNotes: 'Standard one-day wide guidelines apply.',
    juniorSafetySettings: { allowShortBall: false, maxControlRequiredForShortBall: 4 },
    effectiveDate: '2026-08-01',
    sourceNote: 'Default 40-Over preset. Must be checked against local competition playing conditions.',
  },
  {
    id: 'rules-50over-default',
    name: '50-Over Playing Conditions (Default)',
    format: 'one_day_50',
    inningsOvers: 50,
    phases: [
      { phase: 'powerplay', oversRange: [1, 10], maxOutsideCircle: 2 },
      { phase: 'middle_overs', oversRange: [11, 40], maxOutsideCircle: 4 },
      { phase: 'death', oversRange: [41, 50], maxOutsideCircle: 5 },
    ],
    maxBehindSquareLeg: 2,
    maxTotalLegSide: 5,
    shortBallRulesNotes: 'Max 2 bouncers per over (ICC ODI rules). Confirm local limits.',
    wideInterpretationNotes: 'Standard ODI wide guidelines apply.',
    juniorSafetySettings: { allowShortBall: false, maxControlRequiredForShortBall: 4 },
    effectiveDate: '2026-08-01',
    sourceNote: 'Default 50-Over preset. Must be checked against local competition playing conditions.',
  },
  {
    id: 'rules-twoday-default',
    name: 'Two-Day / Multi-Day Playing Conditions (Default)',
    format: 'two_day',
    inningsOvers: 90,
    phases: [
      { phase: 'new_ball', oversRange: [1, 20], maxOutsideCircle: 9 },
      { phase: 'middle_overs', oversRange: [21, 70], maxOutsideCircle: 9 },
      { phase: 'old_ball', oversRange: [71, 90], maxOutsideCircle: 9 },
    ],
    maxBehindSquareLeg: 2,
    shortBallRulesNotes: 'Max 2 bouncers per over under MCC Law 41.6. Umpire determines danger.',
    wideInterpretationNotes: 'Traditional red-ball wide interpretation applies.',
    juniorSafetySettings: { allowShortBall: false, maxControlRequiredForShortBall: 4 },
    effectiveDate: '2026-08-01',
    sourceNote: 'Default Two-Day preset. Must be checked against local competition playing conditions.',
  },
];

export const SEED_CLUB_TEAMS: ClubTeam[] = [
  {
    id: 'ct-1',
    name: '1st XI Senior Men',
    ageGroup: 'Seniors',
    gradeOrDivision: '1st Grade Premier',
    submissionToken: '1st-xi-token-2026',
    createdAt: '2026-08-01T00:00:00Z',
    displayOrder: 1,
    active: true,
    squadPlayerIds: ['p-1', 'p-2', 'p-3', 'p-6'],
    captainIds: ['p-1'],
    defaultTrainingWindow: { startTime: '18:00', endTime: '20:00' }
  },
  {
    id: 'ct-2',
    name: '2nd XI Senior Men',
    ageGroup: 'Seniors',
    gradeOrDivision: '2nd Grade',
    submissionToken: '2nd-xi-token-2026',
    createdAt: '2026-08-01T00:00:00Z',
    displayOrder: 2,
    active: true,
    squadPlayerIds: ['p-4', 'p-5', 'p-7', 'p-8'],
    captainIds: ['p-4'],
    defaultTrainingWindow: { startTime: '18:00', endTime: '20:00' }
  },
  {
    id: 'ct-3',
    name: '3rd XI Senior Men',
    ageGroup: 'Seniors',
    gradeOrDivision: '3rd Grade',
    submissionToken: '3rd-xi-token-2026',
    createdAt: '2026-08-01T00:00:00Z',
    displayOrder: 3,
    active: true,
    squadPlayerIds: ['p-9', 'p-10', 'p-11'],
    captainIds: ['p-10'],
    defaultTrainingWindow: { startTime: '18:00', endTime: '20:00' }
  },
  {
    id: 'ct-4',
    name: '4th XI Senior Men',
    ageGroup: 'Seniors',
    gradeOrDivision: '4th Grade',
    submissionToken: '4th-xi-token-2026',
    createdAt: '2026-08-01T00:00:00Z',
    displayOrder: 4,
    active: true,
    squadPlayerIds: ['p-12', 'p-13', 'p-14'],
    defaultTrainingWindow: { startTime: '18:00', endTime: '20:00' }
  },
  {
    id: 'ct-5',
    name: '5th XI Senior Men',
    ageGroup: 'Seniors',
    gradeOrDivision: '5th Grade',
    submissionToken: '5th-xi-token-2026',
    createdAt: '2026-08-01T00:00:00Z',
    displayOrder: 5,
    active: true,
    squadPlayerIds: ['p-15', 'p-16'],
    defaultTrainingWindow: { startTime: '18:00', endTime: '20:00' }
  }
];

export const SEED_TRAINING_RESOURCES: TrainingResource[] = [
  {
    id: 'res-1',
    facilityId: 'fac-1',
    name: 'Net 1 - New Ball Seam',
    type: 'pace_new_ball_net',
    active: true,
    maxBatters: 2,
    minBowlers: 2,
    maxBowlers: 4,
    maxTotalParticipants: 8,
    requiresCoachOrLeader: true,
    supportsLiveBatting: true,
    supportsCentreWicket: false,
    safetyNotes: 'Helmets mandatory. High pace seam bowling.',
    equipmentRequirements: ['Leather Balls', 'Leave Zone Cones']
  },
  {
    id: 'res-2',
    facilityId: 'fac-1',
    name: 'Net 2 - Spin & Strike Rotation',
    type: 'spin_net',
    active: true,
    maxBatters: 2,
    minBowlers: 2,
    maxBowlers: 4,
    maxTotalParticipants: 8,
    requiresCoachOrLeader: false,
    supportsLiveBatting: true,
    supportsCentreWicket: false,
    safetyNotes: 'Keepers must wear face protection standing up.',
    equipmentRequirements: ['Spin Target Cones']
  },
  {
    id: 'res-3',
    facilityId: 'fac-1',
    name: 'Net 3 - Death Bowling & Machine',
    type: 'bowling_machine_net',
    active: true,
    maxBatters: 2,
    minBowlers: 1,
    maxBowlers: 3,
    maxTotalParticipants: 6,
    requiresCoachOrLeader: true,
    supportsLiveBatting: true,
    supportsCentreWicket: false,
    safetyNotes: 'Machine operator must wear helmet.',
    equipmentRequirements: ['Bowling Machine', 'Dimple Balls', 'Yorker Mat']
  },
  {
    id: 'res-4',
    facilityId: 'fac-1',
    name: 'Centre Wicket - Main Oval',
    type: 'centre_wicket',
    active: true,
    maxBatters: 4,
    minBowlers: 2,
    maxBowlers: 6,
    maxTotalParticipants: 16,
    requiresCoachOrLeader: true,
    supportsLiveBatting: true,
    supportsCentreWicket: true,
    safetyNotes: 'Ensure inner-ring fielders wear abdominal guards.',
    equipmentRequirements: ['Match Balls', 'Field Boundary Cones', 'Scoreboard']
  },
  {
    id: 'res-5',
    facilityId: 'fac-1',
    name: 'Outfield Fielding Area',
    type: 'fielding_area',
    active: true,
    maxBatters: 0,
    minBowlers: 0,
    maxBowlers: 0,
    maxTotalParticipants: 20,
    requiresCoachOrLeader: false,
    supportsLiveBatting: false,
    supportsCentreWicket: false,
    equipmentRequirements: ['Catching Bats', 'Katchet Boards', 'Soft Balls']
  }
];

export const SEED_SAVED_TEMPLATES: SavedClubTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Seniors Nets / Lower Grades Centre Wicket',
    description: '1st XI & 2nd XI use Nets 1-3 for match prep. 3rd-5th XI use Centre Wicket scenario and Fielding.',
    teamGroupRules: [
      { teamQuery: 'first_seconds', allocatedResourceType: 'pace_new_ball_net' },
      { teamQuery: 'remaining', allocatedResourceType: 'centre_wicket' }
    ],
    includedTeamIds: ['ct-1', 'ct-2', 'ct-3', 'ct-4', 'ct-5'],
    resourceTypeRules: ['pace_new_ball_net', 'spin_net', 'bowling_machine_net', 'centre_wicket', 'fielding_area'],
    rotationDurationMinutes: 12,
    sessionObjectives: ['New-ball decision making', 'Centre-wicket chase scenario']
  },
  {
    id: 'tmpl-2',
    name: '1st & 2nd XI Centre Wicket / Other Teams Nets',
    description: 'Top two grades take centre wicket for T20 scenario. Lower grades rotate through nets 1-3 and Fielding.',
    teamGroupRules: [
      { teamQuery: 'first_seconds', allocatedResourceType: 'centre_wicket' },
      { teamQuery: 'remaining', allocatedResourceType: 'standard_net' }
    ],
    includedTeamIds: ['ct-1', 'ct-2', 'ct-3', 'ct-4', 'ct-5'],
    resourceTypeRules: ['centre_wicket', 'pace_new_ball_net', 'spin_net', 'bowling_machine_net', 'fielding_area'],
    rotationDurationMinutes: 15,
    sessionObjectives: ['T20 Middle overs scenario', 'Net technical repetition']
  },
  {
    id: 'tmpl-3',
    name: 'All-Club Mixed Net Rotations',
    description: 'Whole club combined net rotations focusing on skill groups across teams.',
    groupingStrategy: 'mixed',
    teamGroupRules: [
      { teamQuery: 'all', allocatedResourceType: 'standard_net' }
    ],
    includedTeamIds: ['ct-1', 'ct-2', 'ct-3', 'ct-4', 'ct-5'],
    resourceTypeRules: ['pace_new_ball_net', 'spin_net', 'bowling_machine_net', 'centre_wicket', 'fielding_area'],
    rotationDurationMinutes: 12,
    sessionObjectives: ['Cross-squad integration', 'Skill pod rotation']
  }
];

export const SEED_FAIRNESS_LEDGER: RollingFairnessLedger[] = SEED_PLAYERS.map(p => ({
  playerId: p.id,
  totalSessionsAttended: 4,
  totalBattingMinutes: 48,
  totalDeliveriesBowled: 72,
  totalCentreWicketOvers: 2,
  accumulatedFairnessCreditMinutes: 0
}));
