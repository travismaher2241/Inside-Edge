// Local Storage Persistence Engine for Inside Edge

import type { Team, Facility, Player, Activity, TrainingSession, MatchRecord, DevelopmentFocus, Observation } from '../types/cricket';
import { SEED_TEAM, SEED_FACILITY, SEED_PLAYERS, SEED_ACTIVITIES, SEED_SESSION, SEED_MATCH_RECORD, SEED_DEVELOPMENT_FOCUSES, SEED_OBSERVATIONS } from '../modules/cricket/seedData';

const STORAGE_KEYS = {
  TEAM: 'inside_edge_team_v1',
  FACILITY: 'inside_edge_facility_v1',
  PLAYERS: 'inside_edge_players_v1',
  ACTIVITIES: 'inside_edge_activities_v1',
  SESSION: 'inside_edge_session_v1',
  MATCHES: 'inside_edge_matches_v1',
  DEVELOPMENT_FOCUSES: 'inside_edge_focuses_v1',
  OBSERVATIONS: 'inside_edge_observations_v1'
};

function getItem<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

export const StorageEngine = {
  init: () => {
    if (!localStorage.getItem(STORAGE_KEYS.TEAM)) {
      setItem(STORAGE_KEYS.TEAM, SEED_TEAM);
    }
    if (!localStorage.getItem(STORAGE_KEYS.FACILITY)) {
      setItem(STORAGE_KEYS.FACILITY, SEED_FACILITY);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PLAYERS)) {
      setItem(STORAGE_KEYS.PLAYERS, SEED_PLAYERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) {
      setItem(STORAGE_KEYS.ACTIVITIES, SEED_ACTIVITIES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SESSION)) {
      setItem(STORAGE_KEYS.SESSION, SEED_SESSION);
    }
    if (!localStorage.getItem(STORAGE_KEYS.MATCHES)) {
      // Check legacy single match key if present
      const legacyMatch = localStorage.getItem('inside_edge_match_v1');
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
    if (!localStorage.getItem(STORAGE_KEYS.DEVELOPMENT_FOCUSES)) {
      setItem(STORAGE_KEYS.DEVELOPMENT_FOCUSES, SEED_DEVELOPMENT_FOCUSES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.OBSERVATIONS)) {
      setItem(STORAGE_KEYS.OBSERVATIONS, SEED_OBSERVATIONS);
    }
  },

  resetToSeed: () => {
    localStorage.clear();
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
  }
};
