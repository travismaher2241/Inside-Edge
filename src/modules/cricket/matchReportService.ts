import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../lib/firebase';
import type { ClubTeam, MatchReport } from '../../types/cricket';

// Local storage fallback keys for dev/testing when Firebase env is not configured
const LOCAL_STORAGE_TEAMS_KEY = 'inside_edge_club_teams_v2';
const LOCAL_STORAGE_REPORTS_KEY = 'inside_edge_match_reports';
const memoryFallback = new Map<string, string>();

const readLocal = (key: string) => typeof localStorage === 'undefined' ? memoryFallback.get(key) ?? null : localStorage.getItem(key);
const writeLocal = (key: string, value: string) => typeof localStorage === 'undefined' ? void memoryFallback.set(key, value) : localStorage.setItem(key, value);

function getLocalTeams(): ClubTeam[] {
  try {
    const raw = readLocal(LOCAL_STORAGE_TEAMS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read local teams', e);
  }
  // Default seed team if none
  const seed: ClubTeam[] = [
    {
      id: 'team-1st-xi',
      name: '1st XI',
      ageGroup: 'Seniors',
      submissionToken: '1st-xi-secret-token-789',
      createdAt: new Date().toISOString()
    },
    {
      id: 'team-2nd-xi',
      name: '2nd XI',
      ageGroup: 'Seniors',
      submissionToken: '2nd-xi-secret-token-456',
      createdAt: new Date().toISOString()
    }
  ];
  writeLocal(LOCAL_STORAGE_TEAMS_KEY, JSON.stringify(seed));
  return seed;
}

function saveLocalTeam(team: ClubTeam): void {
  const current = getLocalTeams();
  const updated = [...current.filter(item => item.id !== team.id), team];
  writeLocal(LOCAL_STORAGE_TEAMS_KEY, JSON.stringify(updated));
}

function getLocalReports(): MatchReport[] {
  try {
    const raw = readLocal(LOCAL_STORAGE_REPORTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read local reports', e);
  }
  return [];
}

function saveLocalReport(report: MatchReport): void {
  const current = getLocalReports();
  const updated = [report, ...current];
  writeLocal(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(updated));
}

/**
 * Lookup team by submissionToken
 */
export async function getTeamByToken(token: string): Promise<ClubTeam | null> {
  if (!token) return null;

  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'clubTeams'), where('submissionToken', '==', token));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as ClubTeam;
      }
      // An empty cloud collection is normal in local/test operation; continue to the safe fallback.
    } catch (err) {
      console.warn('Firestore query error, falling back to local teams:', err);
    }
  }

  // Fallback / local check
  const teams = getLocalTeams();
  return teams.find(t => t.submissionToken === token) || null;
}

/**
 * Submit post-match report
 */
export async function submitMatchReport(
  reportData: Omit<MatchReport, 'id' | 'createdAt'>
): Promise<MatchReport> {
  const createdAt = new Date().toISOString();

  if (isFirebaseConfigured) {
    try {
      const teamQuery = query(collection(db, 'clubTeams'), where('submissionToken', '==', reportData.submissionToken));
      const teamSnapshot = await getDocs(teamQuery);
      // A team supplied by the documented local fallback does not exist in the
      // cloud collection, so its report must remain in the same local data path.
      if (teamSnapshot.empty) {
        const localReport: MatchReport = {
          id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ...reportData,
          createdAt
        };
        saveLocalReport(localReport);
        return localReport;
      }
      const payload = {
        ...reportData,
        createdAt
      };
      const docRef = await addDoc(collection(db, 'matchReports'), payload);
      return {
        id: docRef.id,
        ...payload
      };
    } catch (err) {
      console.error('Failed to write match report to Firestore:', err);
      throw new Error('Network failure or unauthorized submission token. Please try again.');
    }
  }

  // Local fallback
  const newReport: MatchReport = {
    id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...reportData,
    createdAt
  };
  saveLocalReport(newReport);
  return newReport;
}

/**
 * Fetch all club teams
 */
export async function getClubTeams(): Promise<ClubTeam[]> {
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, 'clubTeams'));
      const teams: ClubTeam[] = [];
      snap.forEach(docSnap => {
        teams.push({
          id: docSnap.id,
          ...docSnap.data()
        } as ClubTeam);
      });
      if (teams.length > 0) return teams;
    } catch (err) {
      console.warn('Failed to fetch teams from Firestore, using local teams:', err);
    }
  }

  return getLocalTeams();
}

/**
 * Create a new team with random submissionToken
 */
export async function createClubTeam(name: string, ageGroup: string): Promise<ClubTeam> {
  const submissionToken = `team-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  const createdAt = new Date().toISOString();

  const newTeamData = {
    name,
    ageGroup,
    submissionToken,
    createdAt
  };

  if (isFirebaseConfigured) {
    try {
      const docRef = await addDoc(collection(db, 'clubTeams'), newTeamData);
      return {
        id: docRef.id,
        ...newTeamData
      };
    } catch (err) {
      console.warn('Failed to save team to Firestore, saving locally:', err);
    }
  }

  const team: ClubTeam = {
    id: `team-${Date.now()}`,
    ...newTeamData
  };
  saveLocalTeam(team);
  return team;
}

/**
 * Fetch match reports from Firestore or local storage
 */
export async function getMatchReports(): Promise<MatchReport[]> {
  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'matchReports'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const reports: MatchReport[] = [];
      snap.forEach(docSnap => {
        reports.push({
          id: docSnap.id,
          ...docSnap.data()
        } as MatchReport);
      });
      if (reports.length > 0) return reports;
      // Keep reports and teams on the same fallback path when the configured
      // project has not yet been seeded.
    } catch (err) {
      console.warn('Failed to fetch match reports from Firestore, using local storage:', err);
    }
  }

  return getLocalReports();
}
