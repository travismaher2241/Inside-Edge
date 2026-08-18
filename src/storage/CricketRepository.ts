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
// Reads of cloud-synced data are live: subscribeAll() opens every Firestore
// listener at once and hands back a single unsubscribe.
//
// Views never import StorageEngine or CloudStorageEngine directly; they take a
// repository from useRepository() and the mode is chosen once, in App.tsx.
import type {
  Team,
  Activity,
  TrainingResource,
  CoachRole,
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

/** Live cloud-synced collections, delivered as whole-collection snapshots. */
export interface RepositorySubscriptionHandlers {
  onTeam: (team: Team) => void;
  onPlayers: (players: Player[]) => void;
  onActivities: (activities: Activity[]) => void;
  onMatches: (matches: MatchRecord[]) => void;
  onDevelopmentFocuses: (focuses: DevelopmentFocus[]) => void;
  onObservations: (observations: Observation[]) => void;
  onClubTeams: (teams: ClubTeam[]) => void;
  onTrainingResources: (resources: TrainingResource[]) => void;
  onClubSessions: (sessions: ClubTrainingSession[]) => void;
  onFairnessLedger: (ledger: RollingFairnessLedger[]) => void;
  onTemplates: (templates: SavedClubTemplate[]) => void;
  onFieldSettings: (settings: SavedFieldSetting[]) => void;
}

export interface ICricketRepository {
  /** Opens every cloud listener. Returns one unsubscribe for all of them. */
  subscribeAll(role: CoachRole, handlers: RepositorySubscriptionHandlers): () => void;

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
  savePlayers(players: Player[]): Promise<void>;
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
  completeSessionWithFairness(session: ClubTrainingSession, ledger: RollingFairnessLedger[]): Promise<void>;
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
 * most records in React state for the life of the session. Session drafts are
 * local-only so RSVP links created during a demo can be opened and tested.
 */
export class LocalCricketRepository extends BaseCricketRepository implements ICricketRepository {
  subscribeAll(_role: CoachRole, _handlers: RepositorySubscriptionHandlers): () => void {
    return () => {};
  }

  async addPlayer(_player: Player): Promise<void> {}
  async updatePlayer(_player: Player): Promise<void> {}
  async savePlayers(_players: Player[]): Promise<void> {}
  async addMatch(_match: MatchRecord): Promise<void> {}
  async updateMatch(_match: MatchRecord): Promise<void> {}
  async addObservation(_observation: Observation): Promise<void> {}
  async addDevelopmentFocus(_focus: DevelopmentFocus): Promise<void> {}
  async updateDevelopmentFocus(_focus: DevelopmentFocus): Promise<void> {}
  async saveClubTeam(_team: ClubTeam): Promise<void> {}
  async saveSession(session: ClubTrainingSession): Promise<void> {
    // Keep demo plans local so RSVP links generated in Test Access can resolve.
    StorageEngine.saveClubSession(session);
  }
  async saveTemplate(_template: SavedClubTemplate): Promise<void> {}
  async deleteTemplate(_templateId: string): Promise<void> {}
  async saveFieldSetting(_setting: SavedFieldSetting): Promise<void> {}
  async deleteFieldSetting(_settingId: string): Promise<void> {}
  async saveFairnessLedger(ledger: RollingFairnessLedger[]): Promise<void> {
    StorageEngine.saveFairnessLedger(ledger);
  }
  async completeSessionWithFairness(session: ClubTrainingSession, ledger: RollingFairnessLedger[]): Promise<void> {
    StorageEngine.saveClubSession(session);
    StorageEngine.saveFairnessLedger(ledger);
  }
}

/** Signed-in mode. Cloud-synced writes go to Firestore. */
export class CloudCricketRepository extends BaseCricketRepository implements ICricketRepository {
  subscribeAll(role: CoachRole, handlers: RepositorySubscriptionHandlers): () => void {
    const unsubscribes = [
      CloudStorageEngine.subscribeToTeam(handlers.onTeam),
      CloudStorageEngine.subscribeToPlayers(handlers.onPlayers),
      CloudStorageEngine.subscribeToActivities(handlers.onActivities),
      CloudStorageEngine.subscribeToMatches(handlers.onMatches),
      CloudStorageEngine.subscribeToDevelopmentFocuses(role, handlers.onDevelopmentFocuses),
      CloudStorageEngine.subscribeToObservations(role, handlers.onObservations),
      CloudStorageEngine.subscribeToClubTeams(handlers.onClubTeams),
      CloudStorageEngine.subscribeToTrainingResources(handlers.onTrainingResources),
      CloudStorageEngine.subscribeToClubSessions(handlers.onClubSessions),
      CloudStorageEngine.subscribeToFairnessLedger(handlers.onFairnessLedger),
      CloudStorageEngine.subscribeToSavedClubTemplates(handlers.onTemplates),
      CloudStorageEngine.subscribeToSavedFieldSettings(handlers.onFieldSettings)
    ];
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }

  async addPlayer(player: Player): Promise<void> {
    await CloudStorageEngine.addPlayer(player);
  }
  async updatePlayer(player: Player): Promise<void> {
    await CloudStorageEngine.updatePlayer(player);
  }
  async savePlayers(players: Player[]): Promise<void> {
    await CloudStorageEngine.savePlayers(players);
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
  async completeSessionWithFairness(session: ClubTrainingSession, ledger: RollingFairnessLedger[]): Promise<void> {
    await CloudStorageEngine.completeClubSessionWithFairness(session, ledger);
  }
}

export function createCricketRepository(isTestMode: boolean): ICricketRepository {
  return isTestMode ? new LocalCricketRepository() : new CloudCricketRepository();
}
