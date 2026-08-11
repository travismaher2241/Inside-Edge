// Firestore-Backed Real-Time Data Storage Engine for Inside Edge

import {
  doc,
  setDoc,
  collection,
  onSnapshot,
  getDocs,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type {
  Team,
  Facility,
  Player,
  Activity,
  MatchRecord,
  DevelopmentFocus,
  Observation,
  CoachRole,
  ClubTeam,
  TrainingResource,
  ClubTrainingSession,
  RollingFairnessLedger,
  SavedClubTemplate,
  SavedFieldSetting
} from '../../types/cricket';
import {
  SEED_TEAM,
  SEED_FACILITY,
  SEED_PLAYERS,
  SEED_ACTIVITIES,
  SEED_MATCH_RECORD,
  SEED_DEVELOPMENT_FOCUSES,
  SEED_OBSERVATIONS,
  SEED_CLUB_TEAMS,
  SEED_TRAINING_RESOURCES,
  SEED_FAIRNESS_LEDGER,
  SEED_SAVED_TEMPLATES
} from './seedData';

// Document & Collection IDs
const SINGLE_DOCS = {
  TEAM: doc(db, 'coachTeam', 'main_team'),
  FACILITY: doc(db, 'facility', 'main_facility')
};

/**
 * Seed Firestore with clean initial squad data if empty upon first sign-in
 */
export async function seedDefaultFirestoreIfEmpty(): Promise<void> {
  try {
    const playersSnap = await getDocs(collection(db, 'players'));
    if (!playersSnap.empty) {
      return; // Already initialized
    }

    console.log('Initializing blank Firestore instance with clean squad defaults...');
    const batch = writeBatch(db);

    batch.set(SINGLE_DOCS.TEAM, SEED_TEAM);
    batch.set(SINGLE_DOCS.FACILITY, SEED_FACILITY);

    SEED_PLAYERS.forEach(p => {
      batch.set(doc(db, 'players', p.id), p);
    });

    SEED_ACTIVITIES.forEach(a => {
      batch.set(doc(db, 'activities', a.id), a);
    });

    batch.set(doc(db, 'matches', SEED_MATCH_RECORD.id), SEED_MATCH_RECORD);

    SEED_DEVELOPMENT_FOCUSES.forEach(f => {
      batch.set(doc(db, 'developmentFocuses', f.id), { ...f, visibility: f.visibility || 'all_coaches' });
    });

    SEED_OBSERVATIONS.forEach(o => {
      batch.set(doc(db, 'observations', o.id), { ...o, visibility: o.visibility || 'all_coaches' });
    });

    SEED_CLUB_TEAMS.forEach(team => batch.set(doc(db, 'clubTeams', team.id), team));
    SEED_TRAINING_RESOURCES.forEach(resource => batch.set(doc(db, 'trainingResources', resource.id), resource));
    SEED_FAIRNESS_LEDGER.forEach(entry => batch.set(doc(db, 'fairnessLedger', entry.playerId), entry));
    SEED_SAVED_TEMPLATES.forEach(template => batch.set(doc(db, 'savedClubTemplates', template.id), template));

    await batch.commit();
  } catch (err) {
    console.error('Error seeding Firestore initial dataset:', err);
  }
}

// ----------------------------------------------------
// Real-time Subscriptions & CRUD Methods
// ----------------------------------------------------

export const CloudStorageEngine = {
  // Team
  subscribeToTeam: (callback: (team: Team) => void): (() => void) => {
    return onSnapshot(SINGLE_DOCS.TEAM, snap => {
      if (snap.exists()) {
        callback(snap.data() as Team);
      } else {
        callback(SEED_TEAM);
      }
    });
  },
  saveTeam: async (team: Team): Promise<void> => {
    await setDoc(SINGLE_DOCS.TEAM, team);
  },

  // Facility
  subscribeToFacility: (callback: (facility: Facility) => void): (() => void) => {
    return onSnapshot(SINGLE_DOCS.FACILITY, snap => {
      if (snap.exists()) {
        callback(snap.data() as Facility);
      } else {
        callback(SEED_FACILITY);
      }
    });
  },
  saveFacility: async (facility: Facility): Promise<void> => {
    await setDoc(SINGLE_DOCS.FACILITY, facility);
  },

  // Players
  subscribeToPlayers: (callback: (players: Player[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'players'), snap => {
      const list = snap.docs.map(d => d.data() as Player);
      callback(list.length > 0 ? list : SEED_PLAYERS);
    });
  },
  savePlayers: async (players: Player[]): Promise<void> => {
    const batch = writeBatch(db);
    players.forEach(p => {
      batch.set(doc(db, 'players', p.id), p);
    });
    await batch.commit();
  },
  addPlayer: async (player: Player): Promise<void> => {
    await setDoc(doc(db, 'players', player.id), player);
  },
  updatePlayer: async (player: Player): Promise<void> => {
    await setDoc(doc(db, 'players', player.id), player);
  },

  // Activities
  subscribeToActivities: (callback: (activities: Activity[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'activities'), snap => {
      const list = snap.docs.map(d => d.data() as Activity);
      callback(list.length > 0 ? list : SEED_ACTIVITIES);
    });
  },
  saveActivities: async (activities: Activity[]): Promise<void> => {
    const batch = writeBatch(db);
    activities.forEach(a => {
      batch.set(doc(db, 'activities', a.id), a);
    });
    await batch.commit();
  },
  addActivity: async (activity: Activity): Promise<void> => {
    await setDoc(doc(db, 'activities', activity.id), activity);
  },

  // Matches
  subscribeToMatches: (callback: (matches: MatchRecord[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'matches'), snap => {
      const list = snap.docs.map(d => d.data() as MatchRecord);
      callback(list.length > 0 ? list : [SEED_MATCH_RECORD]);
    });
  },
  saveMatches: async (matches: MatchRecord[]): Promise<void> => {
    const batch = writeBatch(db);
    matches.forEach(m => {
      batch.set(doc(db, 'matches', m.id), m);
    });
    await batch.commit();
  },
  addMatch: async (match: MatchRecord): Promise<void> => {
    await setDoc(doc(db, 'matches', match.id), match);
  },
  updateMatch: async (match: MatchRecord): Promise<void> => {
    await setDoc(doc(db, 'matches', match.id), match);
  },

  // Development Focuses (Role-sensitive filtering for assistant_coach)
  subscribeToDevelopmentFocuses: (role: CoachRole, callback: (focuses: DevelopmentFocus[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'developmentFocuses'), snap => {
      let list = snap.docs.map(d => d.data() as DevelopmentFocus);
      if (role === 'assistant_coach') {
        list = list.filter(f => f.visibility !== 'head_coach_only');
      }
      callback(list);
    });
  },
  saveDevelopmentFocuses: async (focuses: DevelopmentFocus[]): Promise<void> => {
    const batch = writeBatch(db);
    focuses.forEach(f => {
      batch.set(doc(db, 'developmentFocuses', f.id), { ...f, visibility: f.visibility || 'all_coaches' });
    });
    await batch.commit();
  },
  addDevelopmentFocus: async (focus: DevelopmentFocus): Promise<void> => {
    await setDoc(doc(db, 'developmentFocuses', focus.id), { ...focus, visibility: focus.visibility || 'all_coaches' });
  },
  updateDevelopmentFocus: async (focus: DevelopmentFocus): Promise<void> => {
    await setDoc(doc(db, 'developmentFocuses', focus.id), { ...focus, visibility: focus.visibility || 'all_coaches' });
  },

  // Observations (Role-sensitive filtering for assistant_coach)
  subscribeToObservations: (role: CoachRole, callback: (observations: Observation[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'observations'), snap => {
      let list = snap.docs.map(d => d.data() as Observation);
      if (role === 'assistant_coach') {
        list = list.filter(o => o.visibility !== 'head_coach_only');
      }
      callback(list);
    });
  },
  saveObservations: async (observations: Observation[]): Promise<void> => {
    const batch = writeBatch(db);
    observations.forEach(o => {
      batch.set(doc(db, 'observations', o.id), { ...o, visibility: o.visibility || 'all_coaches' });
    });
    await batch.commit();
  },
  addObservation: async (obs: Observation): Promise<void> => {
    await setDoc(doc(db, 'observations', obs.id), { ...obs, visibility: obs.visibility || 'all_coaches' });
  },

  subscribeToClubTeams: (callback: (teams: ClubTeam[]) => void): (() => void) =>
    onSnapshot(collection(db, 'clubTeams'), snap => callback(snap.empty ? SEED_CLUB_TEAMS : snap.docs.map(item => item.data() as ClubTeam))),
  saveClubTeam: async (team: ClubTeam): Promise<void> => {
    await setDoc(doc(db, 'clubTeams', team.id), team);
  },

  subscribeToTrainingResources: (callback: (resources: TrainingResource[]) => void): (() => void) =>
    onSnapshot(collection(db, 'trainingResources'), snap => callback(snap.empty ? SEED_TRAINING_RESOURCES : snap.docs.map(item => item.data() as TrainingResource))),
  saveTrainingResource: async (resource: TrainingResource): Promise<void> => {
    await setDoc(doc(db, 'trainingResources', resource.id), resource);
  },

  subscribeToClubSessions: (callback: (sessions: ClubTrainingSession[]) => void): (() => void) =>
    onSnapshot(collection(db, 'clubTrainingSessions'), snap => callback(snap.docs.map(item => item.data() as ClubTrainingSession))),
  saveClubSession: async (session: ClubTrainingSession): Promise<void> => {
    await setDoc(doc(db, 'clubTrainingSessions', session.id), session);
  },

  subscribeToFairnessLedger: (callback: (ledger: RollingFairnessLedger[]) => void): (() => void) =>
    onSnapshot(collection(db, 'fairnessLedger'), snap => callback(snap.empty ? SEED_FAIRNESS_LEDGER : snap.docs.map(item => item.data() as RollingFairnessLedger))),
  saveFairnessLedger: async (ledger: RollingFairnessLedger[]): Promise<void> => {
    const batch = writeBatch(db);
    ledger.forEach(entry => batch.set(doc(db, 'fairnessLedger', entry.playerId), entry));
    await batch.commit();
  },

  subscribeToSavedClubTemplates: (callback: (templates: SavedClubTemplate[]) => void): (() => void) =>
    onSnapshot(collection(db, 'savedClubTemplates'), snap => callback(snap.empty ? SEED_SAVED_TEMPLATES : snap.docs.map(item => item.data() as SavedClubTemplate))),
  saveClubTemplate: async (template: SavedClubTemplate): Promise<void> => {
    await setDoc(doc(db, 'savedClubTemplates', template.id), template);
  },
  deleteClubTemplate: async (templateId: string): Promise<void> => {
    await deleteDoc(doc(db, 'savedClubTemplates', templateId));
  },
  subscribeToSavedFieldSettings: (callback: (settings: SavedFieldSetting[]) => void): (() => void) =>
    onSnapshot(collection(db, 'savedFieldSettings'), snap => callback(snap.docs.map(item => item.data() as SavedFieldSetting))),
  saveFieldSetting: async (setting: SavedFieldSetting): Promise<void> => {
    await setDoc(doc(db, 'savedFieldSettings', setting.id), setting);
  },
  deleteFieldSetting: async (settingId: string): Promise<void> => {
    await deleteDoc(doc(db, 'savedFieldSettings', settingId));
  }
};
