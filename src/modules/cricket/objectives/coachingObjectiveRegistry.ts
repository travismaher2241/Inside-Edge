import type { CoachingObjective, CoachingObjectiveId, DevelopmentDomain } from '../../../types/cricket';

export const SEED_COACHING_OBJECTIVES: CoachingObjective[] = [
  // --- BATTING ---
  {
    id: 'batting.new_ball_decision_making',
    sport: 'cricket',
    domain: 'Batting',
    name: 'New-ball decision making',
    shortDescription: 'Leaving outside off, judgment of line/length, and front-foot defensive alignment vs new ball.',
    detailedDescription: 'Focuses on seam/swing movement against the new ball, disciplined off-stump judgment, and playing close to the body.',
    ageGroups: ['U14', 'U16', 'Senior'],
    formats: ['Two-Day', 'One-Day', 'T20'],
    relatedDevelopmentAreas: ['playing_seam_swing', 'leaving_outside_off'],
    relatedActivityIds: ['act_net_pair_rotation', 'act_new_ball_corridor'],
    relatedScenarioTypes: ['new_ball_defense'],
    matchIssueTriggers: ['Top order early wickets', 'Edges to slip corridor', 'Driving away from body'],
    facilityRequirements: ['Nets', 'Turf Pitch'],
    equipmentRequirements: ['New Leather Balls', 'Cones'],
    playerRoleRelevance: ['top_order_batter', 'all_rounder'],
    skillLevelRange: ['Intermediate', 'Advanced'],
    coachingPrinciples: ['Play late under eyes', 'Lead with front elbow', 'Identify off-stump line early'],
    successIndicators: ['Controlled leaves', 'Soft hands in slip corridor', 'Zero loose drives outside off'],
    tags: ['new-ball', 'defense', 'seam', 'top-order'],
    status: 'active',
    version: 1,
    aliases: ['playing_seam_swing', 'new_ball_swing_control']
  },
  {
    id: 'batting.playing_spin',
    sport: 'cricket',
    domain: 'Batting',
    name: 'Playing spin',
    shortDescription: 'Footwork forward/back, sweep variations, and strike rotation against spin.',
    detailedDescription: 'Teaches decisive footwork, reading flight and turn out of the hand/off pitch, and using soft hands to drop and run.',
    ageGroups: ['U12', 'U14', 'U16', 'Senior'],
    formats: ['T20', 'One-Day', 'Two-Day'],
    relatedDevelopmentAreas: ['playing_spin', 'facing_spin_strike_rotation', 'spin_footwork_defense'],
    relatedActivityIds: ['act_spin_lane_challenge', 'act_strike_rotation_grid'],
    relatedScenarioTypes: ['spin_middle_overs'],
    matchIssueTriggers: ['Stagnant middle overs', 'Stumped/Lbw to spin', 'Inability to rotate strike'],
    facilityRequirements: ['Nets', 'Spin Track'],
    equipmentRequirements: ['Spin Balls', 'Target Mats'],
    playerRoleRelevance: ['top_order_batter', 'middle_order_batter', 'all_rounder'],
    skillLevelRange: ['Beginner', 'Intermediate', 'Advanced'],
    coachingPrinciples: ['Decisive initial footwork', 'Play spin at pitch or after break', 'Use wrist for placement'],
    successIndicators: ['Single taken 4 out of 6 balls vs spin', 'No hesitation stepping out or back'],
    tags: ['spin', 'middle-overs', 'footwork', 'sweep'],
    status: 'active',
    version: 1,
    aliases: ['playing_spin', 'spin_footwork_defense']
  },
  {
    id: 'batting.strike_rotation',
    sport: 'cricket',
    domain: 'Batting',
    name: 'Strike rotation',
    shortDescription: 'Deflecting into gaps, soft-hand singles, and building partnerships.',
    detailedDescription: 'Focuses on low-risk scoring options, calling clearly, and keeping the scoreboard moving.',
    ageGroups: ['U12', 'U14', 'U16', 'Senior'],
    formats: ['T20', 'One-Day', 'Two-Day'],
    relatedDevelopmentAreas: ['running_between_wickets', 'facing_spin_strike_rotation'],
    relatedActivityIds: ['act_strike_rotation_grid'],
    relatedScenarioTypes: ['middle_over_builder'],
    matchIssueTriggers: ['Dot ball pressure', 'Batting collapse in middle overs'],
    facilityRequirements: ['Nets', 'Outfield', 'Indoor'],
    equipmentRequirements: ['Cones', 'Stumps'],
    playerRoleRelevance: ['top_order_batter', 'middle_order_batter', 'all_rounder', 'wicketkeeper'],
    skillLevelRange: ['Beginner', 'Intermediate', 'Advanced'],
    coachingPrinciples: ['Soft hands in ring', 'Look for single on defensive push', 'Early loud calling'],
    successIndicators: ['Dot ball percentage < 45%', 'Zero run-out miscommunications'],
    tags: ['singles', 'partnerships', 'rotation'],
    status: 'active',
    version: 1,
    aliases: ['facing_spin_strike_rotation', 'running_between_wickets']
  },
  {
    id: 'batting.short_ball_play',
    sport: 'cricket',
    domain: 'Batting',
    name: 'Short-ball play',
    shortDescription: 'Pulling, hooking, swaying, and ducking under short deliveries.',
    detailedDescription: 'Teaches body positioning, keeping eyes on the ball, rolling wrists on the pull shot, and controlled evasion.',
    ageGroups: ['U14', 'U16', 'Senior'],
    formats: ['T20', 'One-Day', 'Two-Day'],
    relatedDevelopmentAreas: ['short_pitch_defense'],
    relatedActivityIds: ['act_short_ball_drill'],
    relatedScenarioTypes: ['bouncer_enforcer'],
    matchIssueTriggers: ['Hurt by short pitch bowling', 'Top-edged pull shots'],
    facilityRequirements: ['Nets', 'Bowling Machine'],
    equipmentRequirements: ['Heavy Balls', 'Sidearm Feeder', 'Protective Gear'],
    playerRoleRelevance: ['top_order_batter', 'middle_order_batter', 'all_rounder'],
    skillLevelRange: ['Intermediate', 'Advanced'],
    coachingPrinciples: ['Quick back and across footwork', 'Keep hands above chest height', 'Roll wrists down'],
    successIndicators: ['Pull shot hit down into ground', 'Clean sways with head out of line'],
    tags: ['short-ball', 'pull', 'hook', 'evasion'],
    status: 'active',
    version: 1,
    aliases: ['short_pitch_defense']
  },
  {
    id: 'batting.power_hitting',
    sport: 'cricket',
    domain: 'Batting',
    name: 'Power hitting',
    shortDescription: 'Clearing the boundary, base stability, and lofted arc options in powerplay/death.',
    detailedDescription: 'Focuses on strong leg base, swing extension, head alignment, and targeting boundary zones.',
    ageGroups: ['U14', 'U16', 'Senior'],
    formats: ['T20', 'One-Day'],
    relatedDevelopmentAreas: ['t20_powerplay_batting', 't20_death_batting'],
    relatedActivityIds: ['act_range_hitting_zone'],
    relatedScenarioTypes: ['t20_death_finish', 'powerplay_chase'],
    matchIssueTriggers: ['Low boundary count in T20', 'Failure to accelerate late'],
    facilityRequirements: ['Nets', 'Outfield'],
    equipmentRequirements: ['Range Balls', 'Target Flags'],
    playerRoleRelevance: ['top_order_batter', 'middle_order_batter', 'all_rounder'],
    skillLevelRange: ['Intermediate', 'Advanced'],
    coachingPrinciples: ['Solid wide base', 'Full extension through line', 'Keep head still through contact'],
    successIndicators: ['Clean boundary strike > 15%', 'High exit speed with control'],
    tags: ['powerplay', 't20', 'six-hitting', 'death'],
    status: 'active',
    version: 1,
    aliases: ['t20_powerplay_batting', 't20_death_batting']
  },
  {
    id: 'batting.running_between_wickets',
    sport: 'cricket',
    domain: 'Batting',
    name: 'Running between wickets',
    shortDescription: 'Calling, turning tight, backing up, and converting 1s into 2s.',
    detailedDescription: 'Enhances communication between partners, sliding bat past crease, and aggressive turn execution.',
    ageGroups: ['U12', 'U14', 'U16', 'Senior'],
    formats: ['T20', 'One-Day', 'Two-Day'],
    relatedDevelopmentAreas: ['running_between_wickets'],
    relatedActivityIds: ['act_running_between_wickets'],
    relatedScenarioTypes: ['pressure_run_chase'],
    matchIssueTriggers: ['Run-out incidents', 'Hesitant calling'],
    facilityRequirements: ['Centre Wicket', 'Outfield', 'Nets'],
    equipmentRequirements: ['Crease Markers', 'Stumps'],
    playerRoleRelevance: ['top_order_batter', 'middle_order_batter', 'all_rounder', 'wicketkeeper', 'pace_bowler', 'spin_bowler'],
    skillLevelRange: ['Beginner', 'Intermediate', 'Advanced'],
    coachingPrinciples: ['Loud, decisive calls (YES/NO/WAIT)', 'Look for extra run on arm', 'Slide bat on flat side'],
    successIndicators: ['Zero mix-ups', 'Conversion of soft hits into double runs'],
    tags: ['running', 'calling', 'speed', 'fitness'],
    status: 'active',
    version: 1
  },
  {
    id: 'batting.batting_under_pressure',
    sport: 'cricket',
    domain: 'Batting',
    name: 'Batting under pressure',
    shortDescription: 'Target chasing, dot-ball recovery, and maintaining composure.',
    detailedDescription: 'Simulates match pressure scenarios to build tactical composure, clear routine focus, and controlled risk-taking.',
    ageGroups: ['U14', 'U16', 'Senior'],
    formats: ['T20', 'One-Day', 'Two-Day'],
    relatedDevelopmentAreas: ['t20_death_batting'],
    relatedActivityIds: ['act_centre_wicket_pressure'],
    relatedScenarioTypes: ['close_finish_scenario'],
    matchIssueTriggers: ['Panic when run rate rises', 'Wickets in clusters'],
    facilityRequirements: ['Nets', 'Centre Wicket'],
    equipmentRequirements: ['Scoreboard', 'Cones'],
    playerRoleRelevance: ['top_order_batter', 'middle_order_batter', 'all_rounder'],
    skillLevelRange: ['Intermediate', 'Advanced'],
    coachingPrinciples: ['Pre-ball breath routine', 'Focus on process over result', 'Target preferred scoring zones'],
    successIndicators: ['Execution of planned shot under field pressure', 'Stable heart-rate and clear focus'],
    tags: ['pressure', 'mental', 'chase', 'mindset'],
    status: 'active',
    version: 1
  },

  // --- BOWLING ---
  {
    id: 'bowling.new_ball_line_length',
    sport: 'cricket',
    domain: 'Bowling',
    name: 'New-ball line and length',
    shortDescription: 'Top-of-off consistency, seam upright, and opening overs discipline.',
    detailedDescription: 'Focuses on landing the ball repeatedly in the corridor of uncertainty with good seam presentation.',
    ageGroups: ['U12', 'U14', 'U16', 'Senior'],
    formats: ['Two-Day', 'One-Day', 'T20'],
    relatedDevelopmentAreas: ['new_ball_swing_control'],
    relatedActivityIds: ['act_corridor_target_bowling'],
    relatedScenarioTypes: ['new_ball_powerplay_bowling'],
    matchIssueTriggers: ['Top order early wickets', 'Too many short/wide balls early', 'High extras count in overs 1-5'],
    facilityRequirements: ['Nets', 'Turf Pitch'],
    equipmentRequirements: ['Target Cones', 'New Leather Balls'],
    playerRoleRelevance: ['pace_bowler', 'all_rounder'],
    skillLevelRange: ['Beginner', 'Intermediate', 'Advanced'],
    coachingPrinciples: ['Upright seam position', 'Repeatable release point', 'Target top of off stump'],
    successIndicators: ['70%+ deliveries in target corridor', 'Consistent wrist position'],
    tags: ['pace', 'new-ball', 'accuracy', 'length'],
    status: 'active',
    version: 1,
    aliases: ['new_ball_swing_control']
  },
  {
    id: 'bowling.swing_seam',
    sport: 'cricket',
    domain: 'Bowling',
    name: 'Swing/seam',
    shortDescription: 'Outswing, inswing, seam movement, and wrist position at release.',
    detailedDescription: 'Teaches conventional swing mechanics, shiny side maintenance, and seam orientation off the pitch.',
    ageGroups: ['U14', 'U16', 'Senior'],
    formats: ['Two-Day', 'One-Day', 'T20'],
    relatedDevelopmentAreas: ['new_ball_swing_control'],
    relatedActivityIds: ['act_swing_lane_drill'],
    relatedScenarioTypes: ['swing_conditions'],
    matchIssueTriggers: ['Lack of movement with new ball', 'Bowling flat without seam angle'],
    facilityRequirements: ['Nets', 'Turf Pitch'],
    equipmentRequirements: ['Swing Balls', 'Two-Tone Balls'],
    playerRoleRelevance: ['pace_bowler', 'all_rounder'],
    skillLevelRange: ['Intermediate', 'Advanced'],
    coachingPrinciples: ['Wrist behind ball', 'Angle seam towards 1st slip / fine leg', 'Drive through follow-through'],
    successIndicators: ['Consistent late movement', 'Edges generated in slip cordon'],
    tags: ['swing', 'seam', 'outswing', 'inswing'],
    status: 'active',
    version: 1
  },
  {
    id: 'bowling.spin_control',
    sport: 'cricket',
    domain: 'Bowling',
    name: 'Spin control',
    shortDescription: 'Revolutions, flight, drift, and landing off-spin/leg-spin consistently.',
    detailedDescription: 'Focuses on finger/wrist snap, landing line outside off, and controlling trajectory according to pitch speed.',
    ageGroups: ['U12', 'U14', 'U16', 'Senior'],
    formats: ['Two-Day', 'One-Day', 'T20'],
    relatedDevelopmentAreas: ['spin_flight_variation'],
    relatedActivityIds: ['act_spin_revolutions_target'],
    relatedScenarioTypes: ['middle_overs_spin_lock'],
    matchIssueTriggers: ['Short drag-downs by spinners', 'Lack of turn/drift'],
    facilityRequirements: ['Nets', 'Spin Track'],
    equipmentRequirements: ['Spin Target Mats'],
    playerRoleRelevance: ['spin_bowler', 'all_rounder'],
    skillLevelRange: ['Beginner', 'Intermediate', 'Advanced'],
    coachingPrinciples: ['Strong shape at bound', 'Rips through ball with fingers/wrist', 'Complete follow-through over front knee'],
    successIndicators: ['High revolutions', 'Consistent drop on good length'],
    tags: ['spin', 'off-spin', 'leg-spin', 'drift'],
    status: 'active',
    version: 1,
    aliases: ['spin_flight_variation']
  },
  {
    id: 'bowling.middle_over_control',
    sport: 'cricket',
    domain: 'Bowling',
    name: 'Middle-over control',
    shortDescription: 'Economy rate control, building pressure, and bowling to field settings.',
    detailedDescription: 'Teaches defensive lengths, subtle pace changes, and drying up boundaries in middle overs.',
    ageGroups: ['U14', 'U16', 'Senior'],
    formats: ['One-Day', 'T20'],
    relatedDevelopmentAreas: ['spin_flight_variation'],
    relatedActivityIds: ['act_middle_overs_restriction'],
    relatedScenarioTypes: ['middle_over_squeeze'],
    matchIssueTriggers: ['High economy rate overs 11-30', 'Leaking easy singles'],
    facilityRequirements: ['Nets', 'Centre Wicket'],
    equipmentRequirements: ['Field Cones'],
    playerRoleRelevance: ['spin_bowler', 'pace_bowler', 'all_rounder'],
    skillLevelRange: ['Intermediate', 'Advanced'],
    coachingPrinciples: ['Bowl to active field setting', 'Vary speed by 5-10km/h', 'Prevent straight boundary hits'],
    successIndicators: ['Economy rate < 5.0 in 40-over match', 'Multiple dot-ball sequences'],
    tags: ['middle-overs', 'economy', 'control'],
    status: 'active',
    version: 1
  },
  {
    id: 'bowling.death_bowling',
    sport: 'cricket',
    domain: 'Bowling',
    name: 'Death bowling',
    shortDescription: 'Yorker execution, wide yorkers, slower balls, and boundary restriction.',
    detailedDescription: 'Focuses on high-execution yorkers, change of pace under pressure, and restricting boundary hits in final overs.',
    ageGroups: ['U14', 'U16', 'Senior'],
    formats: ['T20', 'One-Day'],
    relatedDevelopmentAreas: ['t20_death_bowling'],
    relatedActivityIds: ['act_yorker_target_challenge'],
    relatedScenarioTypes: ['t20_death_defense'],
    matchIssueTriggers: ['Leaking 15+ runs in 19th/20th over', 'Missing yorker length into full tosses'],
    facilityRequirements: ['Nets', 'Turf Pitch'],
    equipmentRequirements: ['Crease Target Blocks', 'Radar Gun / Timer'],
    playerRoleRelevance: ['pace_bowler', 'all_rounder', 'spin_bowler'],
    skillLevelRange: ['Intermediate', 'Advanced'],
    coachingPrinciples: ['Eyes fixed on base of stumps/base of wide line', 'Decisive arm speed on slower ball', 'Clear bowling plan per batter'],
    successIndicators: ['Yorker accuracy > 60%', 'Boundary frequency < 1 per 6 balls'],
    tags: ['death', 'yorker', 'slower-ball', 't20'],
    status: 'active',
    version: 1,
    aliases: ['t20_death_bowling']
  },

  // --- FIELDING ---
  {
    id: 'fielding.catching',
    sport: 'cricket',
    domain: 'Fielding',
    name: 'Catching',
    shortDescription: 'High catches, flat catches, slip catching, and soft hands.',
    detailedDescription: 'Focuses on catching mechanics: cup formation, eyes tracking into hands, absorbing impact, and communication under high balls.',
    ageGroups: ['U12', 'U14', 'U16', 'Senior'],
    formats: ['T20', 'One-Day', 'Two-Day'],
    relatedDevelopmentAreas: ['high_catch_pressure'],
    relatedActivityIds: ['act_high_catch_skywire', 'act_slip_cradle_drill'],
    relatedScenarioTypes: ['high_pressure_fielding'],
    matchIssueTriggers: ['Dropped catches', 'Hesitation calling high balls'],
    facilityRequirements: ['Outfield'],
    equipmentRequirements: ['Katchet Board', 'Catching Bats', 'High-Vis Balls'],
    playerRoleRelevance: ['top_order_batter', 'middle_order_batter', 'all_rounder', 'pace_bowler', 'spin_bowler', 'wicketkeeper'],
    skillLevelRange: ['Beginner', 'Intermediate', 'Advanced'],
    coachingPrinciples: ['Form fingers up/down cup properly', 'Soft wrists absorb ball', 'Call early and loud'],
    successIndicators: ['90%+ catch retention rate', 'Zero dropped slip opportunities'],
    tags: ['catching', 'slips', 'high-catch', 'outfield'],
    status: 'active',
    version: 1,
    aliases: ['high_catch_pressure']
  },
  {
    id: 'fielding.ground_fielding',
    sport: 'cricket',
    domain: 'Fielding',
    name: 'Ground fielding',
    shortDescription: 'Attack the ball, long barrier, slide & pick up, and fast release.',
    detailedDescription: 'Enhances ground fielding technique: attacking ground balls, clean pick-up on the run, and accurate return throwing.',
    ageGroups: ['U12', 'U14', 'U16', 'Senior'],
    formats: ['T20', 'One-Day', 'Two-Day'],
    relatedDevelopmentAreas: ['ground_fielding_accuracy'],
    relatedActivityIds: ['act_ground_field_relay', 'act_target_throw_challenge'],
    relatedScenarioTypes: ['run_out_pressure'],
    matchIssueTriggers: ['Fumbles on boundary', 'Slow pickup allowing extra run'],
    facilityRequirements: ['Outfield'],
    equipmentRequirements: ['Target Stumps', 'Cones'],
    playerRoleRelevance: ['top_order_batter', 'middle_order_batter', 'all_rounder', 'pace_bowler', 'spin_bowler'],
    skillLevelRange: ['Beginner', 'Intermediate', 'Advanced'],
    coachingPrinciples: ['Attack ball with two hands', 'Stay low through pick-up', 'Fast transfer to throwing arm'],
    successIndicators: ['Clean pick-up under pressure', 'Direct hit run-out attempts'],
    tags: ['ground', 'throwing', 'pick-up', 'run-out'],
    status: 'active',
    version: 1,
    aliases: ['ground_fielding_accuracy']
  },

  // --- WICKETKEEPING ---
  {
    id: 'wicketkeeping.standing_back',
    sport: 'cricket',
    domain: 'Wicketkeeping',
    name: 'Standing back',
    shortDescription: 'Distance judgment, soft hands, footwork to seamers, and diving takes.',
    detailedDescription: 'Focuses on positioning behind pace bowlers, watching ball off edge into gloves, and lateral footwork.',
    ageGroups: ['U12', 'U14', 'U16', 'Senior'],
    formats: ['Two-Day', 'One-Day', 'T20'],
    relatedDevelopmentAreas: ['high_catch_pressure'],
    relatedActivityIds: ['act_keeper_pace_diving'],
    relatedScenarioTypes: ['new_ball_keeper'],
    matchIssueTriggers: ['Byes conceded to pace', 'Edges dropped behind stumps'],
    facilityRequirements: ['Nets', 'Turf Pitch'],
    equipmentRequirements: ['Keeper Gloves', 'Katchet Board'],
    playerRoleRelevance: ['wicketkeeper'],
    skillLevelRange: ['Beginner', 'Intermediate', 'Advanced'],
    coachingPrinciples: ['Rise with the bounce of ball', 'Soft hands gather behind body line', 'Stay balanced on balls of feet'],
    successIndicators: ['Zero dropped edge takes', 'Clean gathers on wide deliveries'],
    tags: ['keeper', 'pace', 'slips', 'byes'],
    status: 'active',
    version: 1
  },
  {
    id: 'wicketkeeping.standing_up',
    sport: 'cricket',
    domain: 'Wicketkeeping',
    name: 'Standing up',
    shortDescription: 'Stumpings, leg-side takes, rising with bounce, and fast glovework.',
    detailedDescription: 'Teaches standing up to spinners and medium pacers, clean stumping execution, and leg-side gathering.',
    ageGroups: ['U12', 'U14', 'U16', 'Senior'],
    formats: ['T20', 'One-Day', 'Two-Day'],
    relatedDevelopmentAreas: ['high_catch_pressure'],
    relatedActivityIds: ['act_keeper_stumping_speed'],
    relatedScenarioTypes: ['spin_keeper_pressure'],
    matchIssueTriggers: ['Missed stumping opportunities', 'Leg-side wide byes'],
    facilityRequirements: ['Nets', 'Spin Track'],
    equipmentRequirements: ['Stumping Target Stumps', 'Wicketkeeping Gloves'],
    playerRoleRelevance: ['wicketkeeper'],
    skillLevelRange: ['Intermediate', 'Advanced'],
    coachingPrinciples: ['Head still over stumps', 'Hands extend towards ball', 'Quick whip back to dislodge bails'],
    successIndicators: ['Sub-0.5s stumping execution', 'Clean gathers on leg-side turn'],
    tags: ['keeper', 'spin', 'stumping', 'glovework'],
    status: 'active',
    version: 1
  },

  // --- TACTICAL ---
  {
    id: 'tactical.powerplay_strategy',
    sport: 'cricket',
    domain: 'Tactical',
    name: 'Powerplay strategy',
    shortDescription: 'Fielding circle restrictions, aggressive scoring vs attacking bowling plans.',
    detailedDescription: 'Provides strategic clarity for batting and bowling units during fielding restriction overs.',
    ageGroups: ['U14', 'U16', 'Senior'],
    formats: ['T20', 'One-Day'],
    relatedDevelopmentAreas: ['t20_powerplay_batting', 'new_ball_swing_control'],
    relatedActivityIds: ['act_powerplay_scenario_net'],
    relatedScenarioTypes: ['powerplay_overs_1_6'],
    matchIssueTriggers: ['Poor powerplay run rate', 'Conceding 50+ runs in powerplay'],
    facilityRequirements: ['Centre Wicket', 'Nets'],
    equipmentRequirements: ['Circle Markers'],
    playerRoleRelevance: ['top_order_batter', 'pace_bowler', 'all_rounder'],
    skillLevelRange: ['Intermediate', 'Advanced'],
    coachingPrinciples: ['Exploit field gaps in 30-yard ring', 'Bowl tight stump-line in powerplay', 'Minimize boundary balls'],
    successIndicators: ['Favorable powerplay score ratio', 'Planned field execution'],
    tags: ['powerplay', 'tactics', 't20', 'one-day'],
    status: 'active',
    version: 1
  },
  {
    id: 'tactical.field_setting_plans',
    sport: 'cricket',
    domain: 'Tactical',
    name: 'Field setting plans',
    shortDescription: 'Bowler-field alignment, angle traps, and captaincy communication.',
    detailedDescription: 'Teaches bowlers and captains how to set fields according to batter strengths, pitch conditions, and bowling plans.',
    ageGroups: ['U14', 'U16', 'Senior'],
    formats: ['T20', 'One-Day', 'Two-Day'],
    relatedDevelopmentAreas: ['ground_fielding_accuracy'],
    relatedActivityIds: ['act_field_board_workshop'],
    relatedScenarioTypes: ['field_restriction_plan'],
    matchIssueTriggers: ['Bowlers bowling opposite to field', 'Fielders out of position'],
    facilityRequirements: ['Centre Wicket', 'Classroom/Whiteboard'],
    equipmentRequirements: ['Field Setting Board App', 'Cones'],
    playerRoleRelevance: ['top_order_batter', 'middle_order_batter', 'all_rounder', 'pace_bowler', 'spin_bowler', 'wicketkeeper'],
    skillLevelRange: ['Intermediate', 'Advanced'],
    coachingPrinciples: ['Never bowl outside your field', 'Communicate field changes before ball', 'Cut off batter primary scoring shot'],
    successIndicators: ['Zero balls bowled contrary to set field', 'Wickets caught in planned field traps'],
    tags: ['fielding', 'captaincy', 'tactics', 'angles'],
    status: 'active',
    version: 1
  },

  // --- TEAM ---
  {
    id: 'team.communication_role_clarity',
    sport: 'cricket',
    domain: 'Team',
    name: 'Communication & role clarity',
    shortDescription: 'On-field encouragement, clear role expectations, and squad unity.',
    detailedDescription: 'Fosters clear role assignments for every player, high energy on the field, and clear captain/bowler communication.',
    ageGroups: ['U12', 'U14', 'U16', 'Senior'],
    formats: ['T20', 'One-Day', 'Two-Day'],
    relatedDevelopmentAreas: ['running_between_wickets'],
    relatedActivityIds: ['act_team_match_simulation'],
    relatedScenarioTypes: ['team_pressure_test'],
    matchIssueTriggers: ['Flat team energy on field', 'Role confusion in pressure overs'],
    facilityRequirements: ['Centre Wicket', 'Outfield'],
    equipmentRequirements: ['Team Gear'],
    playerRoleRelevance: ['top_order_batter', 'middle_order_batter', 'all_rounder', 'pace_bowler', 'spin_bowler', 'wicketkeeper'],
    skillLevelRange: ['Beginner', 'Intermediate', 'Advanced'],
    coachingPrinciples: ['Every player knows their exact job', 'Loud positive energy between balls', 'Support bowler after boundaries'],
    successIndicators: ['High team talk volume', 'Zero role confusion during match changes'],
    tags: ['team', 'culture', 'communication', 'leadership'],
    status: 'active',
    version: 1
  },

  // --- PHYSICAL ---
  {
    id: 'physical.cricket_fitness_agility',
    sport: 'cricket',
    domain: 'Physical',
    name: 'Cricket fitness & agility',
    shortDescription: 'Repeat sprint ability, change of direction, and injury prevention.',
    detailedDescription: 'Develops cricket-specific stamina for long spells, rapid acceleration between wickets, and fielding agility.',
    ageGroups: ['U14', 'U16', 'Senior'],
    formats: ['T20', 'One-Day', 'Two-Day'],
    relatedDevelopmentAreas: ['running_between_wickets'],
    relatedActivityIds: ['act_shuttle_sprint_grid'],
    relatedScenarioTypes: ['fitness_burnout_prevention'],
    matchIssueTriggers: ['Fatigue in late overs', 'Slow sprint speed between wickets'],
    facilityRequirements: ['Outfield', 'Indoor'],
    equipmentRequirements: ['Agility Ladders', 'Cones', 'Stopwatch'],
    playerRoleRelevance: ['top_order_batter', 'middle_order_batter', 'all_rounder', 'pace_bowler', 'spin_bowler', 'wicketkeeper'],
    skillLevelRange: ['Beginner', 'Intermediate', 'Advanced'],
    coachingPrinciples: ['Low athletic stance', 'Explosive first step', 'Maintain pace in 3rd spell / late innings'],
    successIndicators: ['Improved shuttle times', 'Zero fatigue-related fielding errors'],
    tags: ['fitness', 'agility', 'stamina', 'sprints'],
    status: 'active',
    version: 1
  }
];

export const CoachingObjectiveRegistry = {
  getAll(): CoachingObjective[] {
    return SEED_COACHING_OBJECTIVES;
  },

  getById(id: CoachingObjectiveId): CoachingObjective | undefined {
    if (!id) return undefined;
    const direct = SEED_COACHING_OBJECTIVES.find(o => o.id === id);
    if (direct) return direct;

    // Search by alias if legacy ID used
    return SEED_COACHING_OBJECTIVES.find(o => o.aliases && o.aliases.includes(id));
  },

  getByDomain(domain: DevelopmentDomain): CoachingObjective[] {
    return SEED_COACHING_OBJECTIVES.filter(o => o.domain === domain);
  },

  /**
   * Adapter: Maps legacy string identifiers (e.g. 'playing_spin', 'new_ball_swing_control') to canonical objective ID.
   */
  mapLegacyTaxonomyToObjectiveId(legacyId: string): string {
    if (!legacyId) return 'batting.strike_rotation';

    const obj = CoachingObjectiveRegistry.getById(legacyId);
    if (obj) return obj.id;

    // Legacy string fallback mappings
    const lower = legacyId.toLowerCase();
    if (lower.includes('spin')) return 'batting.playing_spin';
    if (lower.includes('seam') || lower.includes('swing') || lower.includes('new_ball')) return 'batting.new_ball_decision_making';
    if (lower.includes('short') || lower.includes('bouncer')) return 'batting.short_ball_play';
    if (lower.includes('power') || lower.includes('boundary') || lower.includes('death_batting')) return 'batting.power_hitting';
    if (lower.includes('run') || lower.includes('singles')) return 'batting.strike_rotation';
    if (lower.includes('catch')) return 'fielding.catching';
    if (lower.includes('ground') || lower.includes('throw')) return 'fielding.ground_fielding';
    if (lower.includes('keeper') || lower.includes('stump')) return 'wicketkeeping.standing_up';
    if (lower.includes('bowling') && lower.includes('death')) return 'bowling.death_bowling';
    if (lower.includes('bowling')) return 'bowling.new_ball_line_length';

    return SEED_COACHING_OBJECTIVES[0].id;
  },

  /**
   * Suggests relevant CoachingObjectives based on a text string or Match Review issue.
   */
  suggestObjectivesForMatchIssue(issueText: string): CoachingObjective[] {
    if (!issueText) return [SEED_COACHING_OBJECTIVES[0]];
    const lower = issueText.toLowerCase();

    const matches = SEED_COACHING_OBJECTIVES.filter(obj => {
      const matchTrigger = obj.matchIssueTriggers.some(t => lower.includes(t.toLowerCase()) || t.toLowerCase().includes(lower));
      const nameMatch = obj.name.toLowerCase().includes(lower) || lower.includes(obj.name.toLowerCase());
      const tagMatch = obj.tags.some(tag => lower.includes(tag));
      return matchTrigger || nameMatch || tagMatch;
    });

    return matches.length > 0 ? matches : [CoachingObjectiveRegistry.getById('batting.new_ball_decision_making')!];
  }
};
