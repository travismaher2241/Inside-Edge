// Unified data-access layer for Inside Edge.
//
// Two kinds of data sit behind this interface:
//
//   * Cloud-synced entities — players, matches, focuses, observations, sessions,
//     templates, field settings, club teams, the fairness ledger. Written to
//     Firestore when a coach is signed in. In Test Access mode they are NOT
//     persisted at all: the demo runs entirely from React state, so a tester
//     poking at seeded data can never overwrite a real club's cached records.
//
//   * Local-only entities — match squads, opposition batters, rules profiles,
//     tactical plans. These have no Firestore counterpart, so both
//     implementations read and write localStorage via StorageEngine.
//
// Views never import StorageEngine or CloudStorageEngine directly; they take a
// repository from useRepository() and the mode is chosen once, in App.tsx.
import type {
  Player,
  MatchRecord,
  DevelopmentFocus,
  Observation,
  ClubTeam,
  ClubTrainingSession,
  RollingFairnessLedger,
  SavedClubTemplate,
  SavedFieldSetting,
  MatchSquad,
  OppositionBatter,
  CompetitionRulesProfile,
  SavedTacticalPlan
} from '../types/cricket';
import { StorageEngine } from './db';
import { CloudStorageEngine } from '../modules/cricket/cloudStorageEngine';

export interface ICricketRepository {
  // Local-only reads
  getMatchSquad(matchId: string): MatchSquad | undefined;
  getOppositionBatters(matchId: string): OppositionBatter[];
  getRulesProfiles(): CompetitionRulesProfile[];
  getSavedTacticalPlans(matchId: string): SavedTacticalPlan[];

  // Local-only writes
  saveMatchSquad(squad: MatchSquad): void;
  saveOppositionBatter(batter: OppositionBatter): void;
  deleteOppositionBatter(id: string): void;
  saveTacticalPlan(plan: SavedTacticalPlan): void;

  // Cloud-synced writes
  addPlayer(player: Player): Promise<void>;
  updatePlayer(player: Player): Promise<void>;
  addMatch(match: MatchRecord): Promise<void>;
  updateMatch(match: MatchRecord): Promise<void>;
  addObservation(observation: Observation): Promise<void>;
  addDevelopmentFocus(focus: DevelopmentFocus): Promise<void>;
  updateDevelopmentFocus(focus: DevelopmentFocus): Promise<void>;
  saveClubTeam(team: ClubTeam): Promise<void>;
  saveSession(session: ClubTrainingSession): Promise<void>;
  saveTemplate(template: SavedClubTemplate): Promise<void>;
  deleteTemplate(templateId: string): Promise<void>;
  saveFieldSetting(setting: SavedFieldSetting): Promise<void>;
  deleteFieldSetting(settingId: string): Promise<void>;
  saveFairnessLedger(ledger: RollingFairnessLedger[]): Promise<void>;
}

/** Local-only entities behave identically in both modes. */
abstract class BaseCricketRepository {
  getMatchSquad(matchId: string): MatchSquad | undefined {
    return StorageEngine.getMatchSquad(matchId);
  }
  getOppositionBatters(matchId: string): OppositionBatter[] {
    return StorageEngine.getOppositionBatters(matchId);
  }
  getRulesProfiles(): CompetitionRulesProfile[] {
    return StorageEngine.getRulesProfiles();
  }
  getSavedTacticalPlans(matchId: string): SavedTacticalPlan[] {
    return StorageEngine.getSavedTacticalPlans(matchId);
  }

  saveMatchSquad(squad: MatchSquad): void {
    StorageEngine.saveMatchSquad(squad);
  }
  saveOppositionBatter(batter: OppositionBatter): void {
    StorageEngine.saveOppositionBatter(batter);
  }
  deleteOppositionBatter(id: string): void {
    StorageEngine.deleteOppositionBatter(id);
  }
  saveTacticalPlan(plan: SavedTacticalPlan): void {
    StorageEngine.saveTacticalPlan(plan);
  }
}

/**
 * Test Access mode. Cloud-synced writes are deliberate no-ops — App.tsx keeps
 * those records in React state for the life of the session and drops them on
 * sign-out, which is what "test access" means here.
 */
export class LocalCricketRepository extends BaseCricketRepository implements ICricketRepository {
  async addPlayer(_player: Player): Promise<void> {}
  async updatePlayer(_player: Player): Promise<void> {}
  async addMatch(_match: MatchRecord): Promise<void> {}
  async updateMatch(_match: MatchRecord): Promise<void> {}
  async addObservation(_observation: Observation): Promise<void> {}
  async addDevelopmentFocus(_focus: DevelopmentFocus): Promise<void> {}
  async updateDevelopmentFocus(_focus: DevelopmentFocus): Promise<void> {}
  async saveClubTeam(_team: ClubTeam): Promise<void> {}
  async saveSession(_session: ClubTrainingSession): Promise<void> {}
  async saveTemplate(_template: SavedClubTemplate): Promise<void> {}
  async deleteTemplate(_templateId: string): Promise<void> {}
  async saveFieldSetting(_setting: SavedFieldSetting): Promise<void> {}
  async deleteFieldSetting(_settingId: string): Promise<void> {}
  async saveFairnessLedger(_ledger: RollingFairnessLedger[]): Promise<void> {}
}

/** Signed-in mode. Cloud-synced writes go to Firestore. */
export class CloudCricketRepository extends BaseCricketRepository implements ICricketRepository {
  async addPlayer(player: Player): Promise<void> {
    await CloudStorageEngine.addPlayer(player);
  }
  async updatePlayer(player: Player): Promise<void> {
    await CloudStorageEngine.updatePlayer(player);
  }
  async addMatch(match: MatchRecord): Promise<void> {
    await CloudStorageEngine.addMatch(match);
  }
  async updateMatch(match: MatchRecord): Promise<void> {
    await CloudStorageEngine.updateMatch(match);
  }
  async addObservation(observation: Observation): Promise<void> {
    await CloudStorageEngine.addObservation(observation);
  }
  async addDevelopmentFocus(focus: DevelopmentFocus): Promise<void> {
    await CloudStorageEngine.addDevelopmentFocus(focus);
  }
  async updateDevelopmentFocus(focus: DevelopmentFocus): Promise<void> {
    await CloudStorageEngine.updateDevelopmentFocus(focus);
  }
  async saveClubTeam(team: ClubTeam): Promise<void> {
    await CloudStorageEngine.saveClubTeam(team);
  }
  async saveSession(session: ClubTrainingSession): Promise<void> {
    await CloudStorageEngine.saveClubSession(session);
  }
  async saveTemplate(template: SavedClubTemplate): Promise<void> {
    await CloudStorageEngine.saveClubTemplate(template);
  }
  async deleteTemplate(templateId: string): Promise<void> {
    await CloudStorageEngine.deleteClubTemplate(templateId);
  }
  async saveFieldSetting(setting: SavedFieldSetting): Promise<void> {
    await CloudStorageEngine.saveFieldSetting(setting);
  }
  async deleteFieldSetting(settingId: string): Promise<void> {
    await CloudStorageEngine.deleteFieldSetting(settingId);
  }
  async saveFairnessLedger(ledger: RollingFairnessLedger[]): Promise<void> {
    await CloudStorageEngine.saveFairnessLedger(ledger);
  }
}

export function createCricketRepository(isTestMode: boolean): ICricketRepository {
  return isTestMode ? new LocalCricketRepository() : new CloudCricketRepository();
}
