import type { Team, Facility, Player, Activity, TrainingSession, MatchRecord, DevelopmentFocus, Observation, MatchSquad, OppositionBatter, CompetitionRulesProfile, SavedTacticalPlan, ClubTeam, TrainingResource, ClubTrainingSession, RollingFairnessLedger, SavedClubTemplate } from '../types/cricket';
import { SEED_TEAM, SEED_FACILITY, SEED_PLAYERS, SEED_ACTIVITIES, SEED_SESSION, SEED_MATCH_RECORD, SEED_DEVELOPMENT_FOCUSES, SEED_OBSERVATIONS, SEED_RULES_PROFILES, SEED_CLUB_TEAMS, SEED_TRAINING_RESOURCES, SEED_SAVED_TEMPLATES, SEED_FAIRNESS_LEDGER } from '../modules/cricket/seedData';

const STORAGE_KEYS = {
  TEAM: 'inside_edge_team_v1',
  FACILITY: 'inside_edge_facility_v1',
  PLAYERS: 'inside_edge_players_v1',
  ACTIVITIES: 'inside_edge_activities_v1',
  SESSION: 'inside_edge_session_v1',
  MATCHES: 'inside_edge_matches_v1',
  DEVELOPMENT_FOCUSES: 'inside_edge_focuses_v1',
  OBSERVATIONS: 'inside_edge_observations_v1',
  MATCH_SQUADS: 'inside_edge_match_squads_v1',
  OPPOSITION_BATTERS: 'inside_edge_opposition_batters_v1',
  RULES_PROFILES: 'inside_edge_rules_profiles_v1',
  SAVED_PLANS: 'inside_edge_saved_plans_v1',
  CLUB_TEAMS: 'inside_edge_club_teams_v2',
  TRAINING_RESOURCES: 'inside_edge_training_resources_v1',
  CLUB_SESSIONS: 'inside_edge_club_sessions_v1',
  FAIRNESS_LEDGER: 'inside_edge_fairness_ledger_v1',
  SAVED_TEMPLATES: 'inside_edge_saved_templates_v1',
};

const memoryStore: Record<string, string> = {};

function getItem<T>(key: string, fallback: T): T {
  try {
    const data = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : memoryStore[key];
    if (!data) return fallback;
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    const str = JSON.stringify(value);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, str);
    }
    memoryStore[key] = str;
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

export const StorageEngine = {
  init: () => {
    const hasKey = (key: string) => {
      if (typeof localStorage !== 'undefined') return !!localStorage.getItem(key);
      return !!memoryStore[key];
    };

    if (!hasKey(STORAGE_KEYS.TEAM)) {
      setItem(STORAGE_KEYS.TEAM, SEED_TEAM);
    }
    if (!hasKey(STORAGE_KEYS.FACILITY)) {
      setItem(STORAGE_KEYS.FACILITY, SEED_FACILITY);
    }
    if (!hasKey(STORAGE_KEYS.PLAYERS)) {
      setItem(STORAGE_KEYS.PLAYERS, SEED_PLAYERS);
    }
    if (!hasKey(STORAGE_KEYS.ACTIVITIES)) {
      setItem(STORAGE_KEYS.ACTIVITIES, SEED_ACTIVITIES);
    }
    if (!hasKey(STORAGE_KEYS.SESSION)) {
      setItem(STORAGE_KEYS.SESSION, SEED_SESSION);
    }
    if (!hasKey(STORAGE_KEYS.MATCHES)) {
      // Check legacy single match key if present
      const legacyMatch = typeof localStorage !== 'undefined' ? localStorage.getItem('inside_edge_match_v1') : memoryStore['inside_edge_match_v1'];
      if (legacyMatch) {
        try {
          const single = JSON.parse(legacyMatch);
          setItem(STORAGE_KEYS.MATCHES, [single]);
        } catch {
          setItem(STORAGE_KEYS.MATCHES, [SEED_MATCH_RECORD]);
        }
      } else {
        setItem(STORAGE_KEYS.MATCHES, [SEED_MATCH_RECORD]);
      }
    }
    if (!hasKey(STORAGE_KEYS.DEVELOPMENT_FOCUSES)) {
      setItem(STORAGE_KEYS.DEVELOPMENT_FOCUSES, SEED_DEVELOPMENT_FOCUSES);
    }
    if (!hasKey(STORAGE_KEYS.OBSERVATIONS)) {
      setItem(STORAGE_KEYS.OBSERVATIONS, SEED_OBSERVATIONS);
    }
    if (!hasKey(STORAGE_KEYS.RULES_PROFILES)) {
      setItem(STORAGE_KEYS.RULES_PROFILES, SEED_RULES_PROFILES);
    }
    if (!hasKey(STORAGE_KEYS.MATCH_SQUADS)) {
      setItem(STORAGE_KEYS.MATCH_SQUADS, []);
    }
    if (!hasKey(STORAGE_KEYS.OPPOSITION_BATTERS)) {
      setItem(STORAGE_KEYS.OPPOSITION_BATTERS, []);
    }
    if (!hasKey(STORAGE_KEYS.SAVED_PLANS)) {
      setItem(STORAGE_KEYS.SAVED_PLANS, []);
    }
    if (!hasKey(STORAGE_KEYS.CLUB_TEAMS)) {
      const legacyTeam = getItem(STORAGE_KEYS.TEAM, SEED_TEAM);
      setItem(STORAGE_KEYS.CLUB_TEAMS, [{
        id: legacyTeam.id,
        name: legacyTeam.name,
        ageGroup: legacyTeam.ageGroup,
        submissionToken: `migrated-${legacyTeam.id}`,
        createdAt: new Date().toISOString(),
        displayOrder: 1,
        active: true,
        squadPlayerIds: SEED_PLAYERS.map(player => player.id),
        coachIds: [],
        notes: `Migrated from legacy team (${legacyTeam.clubName}, ${legacyTeam.season}).`
      } satisfies ClubTeam]);
    }
    if (!hasKey(STORAGE_KEYS.TRAINING_RESOURCES)) {
      const legacyFacility = getItem(STORAGE_KEYS.FACILITY, SEED_FACILITY);
      const migratedResources: TrainingResource[] = legacyFacility.netLanes.map(lane => ({
        id: lane.id,
        facilityId: legacyFacility.id,
        name: lane.name,
        type: lane.laneType === 'spin' ? 'spin_net' : lane.laneType === 'machine' ? 'bowling_machine_net' : lane.laneType === 'centre_strip' ? 'centre_wicket_half' : 'standard_net',
        active: true,
        maxBatters: lane.maxBatters,
        minBowlers: 0,
        maxBowlers: lane.maxBowlers,
        maxTotalParticipants: lane.maxBatters + lane.maxBowlers + (lane.maxFeeders || 0),
        requiresCoachOrLeader: Boolean(lane.assignedCoach),
        supportsLiveBatting: true,
        supportsCentreWicket: lane.laneType === 'centre_strip'
      }));
      if (legacyFacility.centreWicketAvailable && !migratedResources.some(resource => resource.supportsCentreWicket)) {
        migratedResources.push({ id: `${legacyFacility.id}-centre`, facilityId: legacyFacility.id, name: 'Centre Wicket', type: 'centre_wicket', active: true, maxBatters: 2, minBowlers: 2, maxBowlers: 6, maxTotalParticipants: 16, requiresCoachOrLeader: true, supportsLiveBatting: true, supportsCentreWicket: true });
      }
      if (legacyFacility.outfieldAvailable) {
        migratedResources.push({ id: `${legacyFacility.id}-outfield`, facilityId: legacyFacility.id, name: 'Outfield', type: 'fielding_area', active: true, maxBatters: 0, minBowlers: 0, maxBowlers: 0, maxTotalParticipants: 30, requiresCoachOrLeader: false, supportsLiveBatting: false, supportsCentreWicket: false });
      }
      setItem(STORAGE_KEYS.TRAINING_RESOURCES, migratedResources.length > 0 ? migratedResources : SEED_TRAINING_RESOURCES);
    }
    if (!hasKey(STORAGE_KEYS.CLUB_SESSIONS)) {
      setItem(STORAGE_KEYS.CLUB_SESSIONS, []);
    }
    if (!hasKey(STORAGE_KEYS.SAVED_TEMPLATES)) {
      setItem(STORAGE_KEYS.SAVED_TEMPLATES, SEED_SAVED_TEMPLATES);
    }
    if (!hasKey(STORAGE_KEYS.FAIRNESS_LEDGER)) {
      setItem(STORAGE_KEYS.FAIRNESS_LEDGER, SEED_FAIRNESS_LEDGER);
    }
  },

  resetToSeed: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    for (const k in memoryStore) {
      delete memoryStore[k];
    }
    StorageEngine.init();
  },

  getTeam: (): Team => getItem(STORAGE_KEYS.TEAM, SEED_TEAM),
  saveTeam: (team: Team) => setItem(STORAGE_KEYS.TEAM, team),

  getFacility: (): Facility => getItem(STORAGE_KEYS.FACILITY, SEED_FACILITY),
  saveFacility: (facility: Facility) => setItem(STORAGE_KEYS.FACILITY, facility),

  getPlayers: (): Player[] => getItem(STORAGE_KEYS.PLAYERS, SEED_PLAYERS),
  savePlayers: (players: Player[]) => setItem(STORAGE_KEYS.PLAYERS, players),
  addPlayer: (player: Player) => {
    const players = StorageEngine.getPlayers();
    players.push(player);
    StorageEngine.savePlayers(players);
  },
  updatePlayer: (player: Player) => {
    const players = StorageEngine.getPlayers();
    const idx = players.findIndex(p => p.id === player.id);
    if (idx !== -1) {
      players[idx] = player;
      StorageEngine.savePlayers(players);
    }
  },

  getActivities: (): Activity[] => getItem(STORAGE_KEYS.ACTIVITIES, SEED_ACTIVITIES),
  saveActivities: (activities: Activity[]) => setItem(STORAGE_KEYS.ACTIVITIES, activities),
  addActivity: (activity: Activity) => {
    const list = StorageEngine.getActivities();
    list.unshift(activity);
    StorageEngine.saveActivities(list);
  },

  getSession: (): TrainingSession => getItem(STORAGE_KEYS.SESSION, SEED_SESSION),
  saveSession: (session: TrainingSession) => setItem(STORAGE_KEYS.SESSION, session),

  getMatches: (): MatchRecord[] => getItem(STORAGE_KEYS.MATCHES, [SEED_MATCH_RECORD]),
  saveMatches: (matches: MatchRecord[]) => setItem(STORAGE_KEYS.MATCHES, matches),
  addMatch: (match: MatchRecord) => {
    const list = StorageEngine.getMatches();
    list.unshift(match);
    StorageEngine.saveMatches(list);
  },
  updateMatch: (match: MatchRecord) => {
    const list = StorageEngine.getMatches();
    const idx = list.findIndex(m => m.id === match.id);
    if (idx !== -1) {
      list[idx] = match;
      StorageEngine.saveMatches(list);
    } else {
      list.unshift(match);
      StorageEngine.saveMatches(list);
    }
  },
  getMatch: (): MatchRecord => {
    const list = StorageEngine.getMatches();
    return list[0] || SEED_MATCH_RECORD;
  },

  getDevelopmentFocuses: (): DevelopmentFocus[] => getItem(STORAGE_KEYS.DEVELOPMENT_FOCUSES, SEED_DEVELOPMENT_FOCUSES),
  saveDevelopmentFocuses: (focuses: DevelopmentFocus[]) => setItem(STORAGE_KEYS.DEVELOPMENT_FOCUSES, focuses),
  addDevelopmentFocus: (focus: DevelopmentFocus) => {
    const list = StorageEngine.getDevelopmentFocuses();
    list.unshift(focus);
    StorageEngine.saveDevelopmentFocuses(list);
  },
  updateDevelopmentFocus: (focus: DevelopmentFocus) => {
    const list = StorageEngine.getDevelopmentFocuses();
    const idx = list.findIndex(f => f.id === focus.id);
    if (idx !== -1) {
      list[idx] = focus;
      StorageEngine.saveDevelopmentFocuses(list);
    }
  },

  getObservations: (): Observation[] => getItem(STORAGE_KEYS.OBSERVATIONS, SEED_OBSERVATIONS),
  saveObservations: (observations: Observation[]) => setItem(STORAGE_KEYS.OBSERVATIONS, observations),
  addObservation: (obs: Observation) => {
    const list = StorageEngine.getObservations();
    list.unshift(obs);
    StorageEngine.saveObservations(list);
  },

  // Match Squad CRUD
  getMatchSquads: (): MatchSquad[] => getItem(STORAGE_KEYS.MATCH_SQUADS, []),
  getMatchSquad: (matchId: string): MatchSquad | undefined => {
    const squads = StorageEngine.getMatchSquads();
    return squads.find(s => s.matchId === matchId);
  },
  saveMatchSquad: (squad: MatchSquad) => {
    const squads = StorageEngine.getMatchSquads();
    const idx = squads.findIndex(s => s.matchId === squad.matchId);
    if (idx !== -1) {
      squads[idx] = squad;
    } else {
      squads.push(squad);
    }
    setItem(STORAGE_KEYS.MATCH_SQUADS, squads);
  },

  // Opposition Batter CRUD
  getOppositionBatters: (matchId?: string): OppositionBatter[] => {
    const list = getItem<OppositionBatter[]>(STORAGE_KEYS.OPPOSITION_BATTERS, []);
    if (matchId) return list.filter(b => b.matchId === matchId);
    return list;
  },
  saveOppositionBatter: (batter: OppositionBatter) => {
    const list = getItem<OppositionBatter[]>(STORAGE_KEYS.OPPOSITION_BATTERS, []);
    const idx = list.findIndex(b => b.id === batter.id);
    if (idx !== -1) {
      list[idx] = batter;
    } else {
      list.push(batter);
    }
    setItem(STORAGE_KEYS.OPPOSITION_BATTERS, list);
  },
  deleteOppositionBatter: (id: string) => {
    const list = getItem<OppositionBatter[]>(STORAGE_KEYS.OPPOSITION_BATTERS, []);
    const filtered = list.filter(b => b.id !== id);
    setItem(STORAGE_KEYS.OPPOSITION_BATTERS, filtered);
  },

  // Competition Rules Profiles CRUD
  getRulesProfiles: (): CompetitionRulesProfile[] => getItem(STORAGE_KEYS.RULES_PROFILES, SEED_RULES_PROFILES),
  getRulesProfile: (id: string): CompetitionRulesProfile | undefined => {
    const list = StorageEngine.getRulesProfiles();
    return list.find(p => p.id === id);
  },
  saveRulesProfile: (profile: CompetitionRulesProfile) => {
    const list = StorageEngine.getRulesProfiles();
    const idx = list.findIndex(p => p.id === profile.id);
    if (idx !== -1) {
      list[idx] = profile;
    } else {
      list.push(profile);
    }
    setItem(STORAGE_KEYS.RULES_PROFILES, list);
  },

  // Saved Tactical Plans CRUD
  getSavedTacticalPlans: (matchId?: string): SavedTacticalPlan[] => {
    const list = getItem<SavedTacticalPlan[]>(STORAGE_KEYS.SAVED_PLANS, []);
    if (matchId) return list.filter(p => p.matchId === matchId);
    return list;
  },
  saveTacticalPlan: (plan: SavedTacticalPlan) => {
    const list = getItem<SavedTacticalPlan[]>(STORAGE_KEYS.SAVED_PLANS, []);
    const idx = list.findIndex(p => p.id === plan.id || (p.matchId === plan.matchId && p.batterId === plan.batterId && p.bowlerId === plan.bowlerId));
    if (idx !== -1) {
      list[idx] = plan;
    } else {
      list.push(plan);
    }
    setItem(STORAGE_KEYS.SAVED_PLANS, list);
  },
  deleteTacticalPlan: (id: string) => {
    const list = getItem<SavedTacticalPlan[]>(STORAGE_KEYS.SAVED_PLANS, []);
    const filtered = list.filter(p => p.id !== id);
    setItem(STORAGE_KEYS.SAVED_PLANS, filtered);
  },

  // Dynamic Club Teams CRUD
  getClubTeams: (): ClubTeam[] => getItem(STORAGE_KEYS.CLUB_TEAMS, SEED_CLUB_TEAMS),
  saveClubTeams: (teams: ClubTeam[]) => setItem(STORAGE_KEYS.CLUB_TEAMS, teams),
  saveClubTeam: (team: ClubTeam) => {
    const list = StorageEngine.getClubTeams();
    const idx = list.findIndex(t => t.id === team.id);
    if (idx !== -1) {
      list[idx] = team;
    } else {
      list.push(team);
    }
    StorageEngine.saveClubTeams(list);
  },
  deleteClubTeam: (id: string) => {
    const list = StorageEngine.getClubTeams();
    StorageEngine.saveClubTeams(list.filter(t => t.id !== id));
  },

  // Training Resources CRUD
  getTrainingResources: (): TrainingResource[] => getItem(STORAGE_KEYS.TRAINING_RESOURCES, SEED_TRAINING_RESOURCES),
  saveTrainingResources: (resources: TrainingResource[]) => setItem(STORAGE_KEYS.TRAINING_RESOURCES, resources),
  saveTrainingResource: (resource: TrainingResource) => {
    const list = StorageEngine.getTrainingResources();
    const idx = list.findIndex(r => r.id === resource.id);
    if (idx !== -1) {
      list[idx] = resource;
    } else {
      list.push(resource);
    }
    StorageEngine.saveTrainingResources(list);
  },
  deleteTrainingResource: (id: string) => {
    const list = StorageEngine.getTrainingResources();
    StorageEngine.saveTrainingResources(list.filter(r => r.id !== id));
  },

  // Club Training Sessions CRUD
  getClubSessions: (): ClubTrainingSession[] => getItem(STORAGE_KEYS.CLUB_SESSIONS, []),
  saveClubSessions: (sessions: ClubTrainingSession[]) => setItem(STORAGE_KEYS.CLUB_SESSIONS, sessions),
  saveClubSession: (session: ClubTrainingSession) => {
    const list = StorageEngine.getClubSessions();
    const idx = list.findIndex(s => s.id === session.id);
    if (idx !== -1) {
      list[idx] = session;
    } else {
      list.unshift(session);
    }
    StorageEngine.saveClubSessions(list);
  },
  getClubSession: (id: string): ClubTrainingSession | undefined => {
    const list = StorageEngine.getClubSessions();
    return list.find(s => s.id === id);
  },
  savePlayerAvailability: (sessionId: string, record: ClubTrainingSession['availabilityRecords'][string]) => {
    const session = StorageEngine.getClubSession(sessionId);
    if (!session) return;
    StorageEngine.saveClubSession({ ...session, availabilityRecords: { ...session.availabilityRecords, [record.playerId]: record } });
  },
  saveStaffPlayerAssignment: (sessionId: string, assignment: ClubTrainingSession['staffPlayerAssignments'][string]) => {
    const session = StorageEngine.getClubSession(sessionId);
    if (!session) return;
    StorageEngine.saveClubSession({ ...session, staffPlayerAssignments: { ...session.staffPlayerAssignments, [assignment.playerId]: assignment } });
  },

  // Rolling Fairness Ledger CRUD
  getFairnessLedger: (): RollingFairnessLedger[] => getItem(STORAGE_KEYS.FAIRNESS_LEDGER, SEED_FAIRNESS_LEDGER),
  saveFairnessLedger: (ledger: RollingFairnessLedger[]) => setItem(STORAGE_KEYS.FAIRNESS_LEDGER, ledger),
  updatePlayerFairness: (playerId: string, update: Partial<RollingFairnessLedger>) => {
    const list = StorageEngine.getFairnessLedger();
    const idx = list.findIndex(l => l.playerId === playerId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...update };
    } else {
      list.push({
        playerId,
        totalSessionsAttended: 1,
        totalBattingMinutes: 0,
        totalDeliveriesBowled: 0,
        totalCentreWicketOvers: 0,
        accumulatedFairnessCreditMinutes: 0,
        ...update
      });
    }
    StorageEngine.saveFairnessLedger(list);
  },

  // Saved Club Templates CRUD
  getSavedTemplates: (): SavedClubTemplate[] => getItem(STORAGE_KEYS.SAVED_TEMPLATES, SEED_SAVED_TEMPLATES),
  saveSavedTemplates: (templates: SavedClubTemplate[]) => setItem(STORAGE_KEYS.SAVED_TEMPLATES, templates),
  addSavedTemplate: (template: SavedClubTemplate) => {
    const list = StorageEngine.getSavedTemplates();
    list.push(template);
    StorageEngine.saveSavedTemplates(list);
  },
};

