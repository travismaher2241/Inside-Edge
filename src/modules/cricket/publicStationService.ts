import { collection, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from 'firebase/firestore';
import type {
  AllocationResourceAssignment,
  ClubTrainingSession,
  LiveTimerState,
  Player,
  RotationBlockPlan,
  TrainingResource
} from '../../types/cricket';
import { auth, db, isFirebaseConfigured } from '../../lib/firebase';
import { CloudStorageEngine } from './cloudStorageEngine';
import { StorageEngine } from '../../storage/db';
import { computeStationTokenHash, generateStationToken } from './stationTokenCrypto';

const INVITATION_COLLECTION = 'stationInvitations';
const LOCAL_STORAGE_KEY = 'inside_edge_station_invitations_v2';
const INVITATION_LIFETIME_DAYS = 14;

export interface PublicStationData {
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  sessionTime: string;
  sessionStatus: ClubTrainingSession['status'];
  resource: TrainingResource;
  leaderPlayer?: PublicStationPlayer;
  activeBlockIndex: number;
  totalBlocks: number;
  rotationDurationMinutes: number;
  currentBlock: RotationBlockPlan;
  currentAssignment: AllocationResourceAssignment;
  allBlocks: RotationBlockPlan[];
  allPlayers: PublicStationPlayer[];
  sessionObjectives: string[];
  liveTimerState?: LiveTimerState;
}

export type PublicStationPlayer = Pick<Player, 'id' | 'name' | 'primaryRole' | 'battingHand' | 'bowlingStyle'> & {
  workloadRestriction?: Pick<NonNullable<Player['workloadRestriction']>, 'restrictedBowler' | 'maxDeliveries'>;
};

interface StationInvitationRecord {
  tokenHash: string;
  sessionId: string;
  resourceId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  projection: PublicStationData;
}

export interface StationShareContext {
  session: ClubTrainingSession;
  players: Player[];
  resources: TrainingResource[];
}

const memoryInvitations = new Map<string, StationInvitationRecord>();

function readLocalInvitations(): Record<string, StationInvitationRecord> {
  if (typeof localStorage === 'undefined') {
    return Object.fromEntries(memoryInvitations);
  }
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}') as Record<string, StationInvitationRecord>;
  } catch {
    return {};
  }
}

function saveLocalInvitation(record: StationInvitationRecord): void {
  memoryInvitations.set(record.tokenHash, record);
  if (typeof localStorage === 'undefined') return;
  const invitations = readLocalInvitations();
  invitations[record.tokenHash] = record;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(invitations));
}

function assignmentPlayerIds(assignment: AllocationResourceAssignment): string[] {
  return [
    assignment.leaderId,
    ...assignment.batterPlayerIds,
    ...assignment.bowlerPodPlayerIds,
    ...assignment.wicketkeeperPlayerIds,
    ...assignment.feederPlayerIds,
    ...assignment.fieldingPlayerIds,
    ...assignment.restPlayerIds
  ].filter((id): id is string => Boolean(id));
}

function buildProjection(context: StationShareContext, resourceId: string): PublicStationData {
  const { session, players, resources } = context;
  if (!session.availableResourceIds.includes(resourceId)) {
    throw new Error('This station is not available in the training session.');
  }

  const resource = resources.find(item => item.id === resourceId);
  if (!resource) throw new Error('The selected station could not be found.');

  const stationBlocks = session.rotationPlan.map(block => ({
    ...block,
    resourceAssignments: block.resourceAssignments.filter(assignment => assignment.resourceId === resourceId)
  }));
  if (!stationBlocks.some(block => block.resourceAssignments.length > 0)) {
    throw new Error('This station has no rotation assignments to delegate.');
  }

  const requestedIndex = session.currentLiveState?.activeRotationIndex ?? session.activeRotationIndex ?? 0;
  const activeBlockIndex = Math.min(Math.max(requestedIndex, 0), Math.max(stationBlocks.length - 1, 0));
  const currentBlock = stationBlocks[activeBlockIndex] ?? stationBlocks[0];
  const currentAssignment = currentBlock.resourceAssignments[0] ?? {
    resourceId,
    resourceName: resource.name,
    batterPlayerIds: [],
    bowlerPodPlayerIds: [],
    wicketkeeperPlayerIds: [],
    feederPlayerIds: [],
    fieldingPlayerIds: [],
    restPlayerIds: []
  };
  const visiblePlayerIds = new Set(stationBlocks.flatMap(block =>
    block.resourceAssignments.flatMap(assignmentPlayerIds)
  ));
  const visiblePlayers: PublicStationPlayer[] = players
    .filter(player => visiblePlayerIds.has(player.id))
    .map(player => ({
      id: player.id,
      name: player.name,
      primaryRole: player.primaryRole,
      battingHand: player.battingHand,
      bowlingStyle: player.bowlingStyle,
      workloadRestriction: player.workloadRestriction ? {
        restrictedBowler: player.workloadRestriction.restrictedBowler,
        maxDeliveries: player.workloadRestriction.maxDeliveries
      } : undefined
    }));
  const leaderPlayer = currentAssignment.leaderId
    ? visiblePlayers.find(player => player.id === currentAssignment.leaderId)
    : undefined;

  return {
    sessionId: session.id,
    sessionTitle: session.title,
    sessionDate: session.date,
    sessionTime: `${session.startTime}–${session.finishTime}`,
    sessionStatus: session.status,
    resource,
    leaderPlayer,
    activeBlockIndex,
    totalBlocks: stationBlocks.length,
    rotationDurationMinutes: currentBlock.durationMinutes || session.rotationDurationMinutes || 12,
    currentBlock,
    currentAssignment,
    allBlocks: stationBlocks,
    allPlayers: visiblePlayers,
    sessionObjectives: session.sessionObjectives || [],
    liveTimerState: session.currentLiveState
  };
}

async function resolveContext(sessionId: string): Promise<StationShareContext> {
  let session = StorageEngine.getClubSession(sessionId);
  let players = StorageEngine.getPlayers();
  let resources = StorageEngine.getTrainingResources();

  if (isFirebaseConfigured && auth.currentUser) {
    const [cloudSession, cloudPlayers, cloudResources] = await Promise.all([
      CloudStorageEngine.getClubSession(sessionId),
      CloudStorageEngine.getPlayers(),
      CloudStorageEngine.getTrainingResources()
    ]);
    session = cloudSession ?? session;
    players = cloudPlayers;
    resources = cloudResources;
  }
  if (!session) throw new Error('Save the training session before delegating a station.');
  return { session, players, resources };
}

function isUsable(record: StationInvitationRecord): boolean {
  return !record.revokedAt
    && Date.parse(record.expiresAt) > Date.now()
    && record.projection.sessionStatus !== 'completed';
}

export class PublicStationService {
  static async getShareableStationLink(
    sessionId: string,
    resourceId: string,
    suppliedContext?: StationShareContext
  ): Promise<string> {
    const context = suppliedContext ?? await resolveContext(sessionId);
    if (context.session.id !== sessionId) throw new Error('Station share context does not match the session.');
    if (context.session.status === 'completed') throw new Error('Completed sessions cannot be delegated.');

    const token = generateStationToken();
    const tokenHash = await computeStationTokenHash(token);
    const now = new Date();
    const sessionEnd = new Date(`${context.session.date}T${context.session.finishTime}:00`);
    const minimumExpiry = now.getTime() + INVITATION_LIFETIME_DAYS * 86_400_000;
    const afterSessionExpiry = Number.isNaN(sessionEnd.getTime())
      ? minimumExpiry
      : sessionEnd.getTime() + 86_400_000;
    const record: StationInvitationRecord = {
      tokenHash,
      sessionId,
      resourceId,
      createdAt: now.toISOString(),
      expiresAt: new Date(Math.max(minimumExpiry, afterSessionExpiry)).toISOString(),
      revokedAt: null,
      projection: buildProjection(context, resourceId)
    };

    saveLocalInvitation(record);
    if (isFirebaseConfigured && auth.currentUser) {
      await setDoc(doc(db, INVITATION_COLLECTION, tokenHash), record);
    }

    const origin = typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://insideedge.app';
    return `${origin}/station/${token}`;
  }

  static getStationWhatsAppBrief(options: {
    clubName?: string;
    sessionTitle: string;
    date: string;
    time: string;
    resourceName: string;
    leaderName?: string;
    objectives?: string[];
    scenarioDescription?: string;
    shareableLink: string;
  }): string {
    const { clubName, sessionTitle, date, time, resourceName, leaderName, objectives = [], scenarioDescription, shareableLink } = options;
    const clubPrefix = clubName ? `🏏 *${clubName}*` : '🏏 *Club Training*';
    const leaderLine = leaderName ? `\n👤 *Station Leader:* ${leaderName}` : '';
    const objectiveText = objectives.length > 0 ? `\n🎯 *Focus:* ${objectives.join(' · ')}` : '';
    const scenarioText = scenarioDescription ? `\n📋 *Scenario:* ${scenarioDescription}` : '';
    return `${clubPrefix}\n📅 *${sessionTitle}* — ${date} (${time})\n📍 *Station:* ${resourceName}${leaderLine}${objectiveText}${scenarioText}\n\n📲 *Your Live Station Rotations & Timer:*\n${shareableLink}\n\nOpen this link on your phone during training to run rotations for your lane.`;
  }

  static async resolveStationData(token: string): Promise<PublicStationData | null> {
    let tokenHash: string;
    try {
      tokenHash = await computeStationTokenHash(token);
    } catch {
      return null;
    }

    let record = memoryInvitations.get(tokenHash) ?? readLocalInvitations()[tokenHash];
    if (isFirebaseConfigured) {
      try {
        const snapshot = await getDoc(doc(db, INVITATION_COLLECTION, tokenHash));
        if (snapshot.exists()) record = snapshot.data() as StationInvitationRecord;
      } catch (error) {
        if (!record) console.warn('Unable to resolve station invitation.', error);
      }
    }
    return record && isUsable(record) ? record.projection : null;
  }

  /** Refreshes existing public projections after coach timer or plan changes. */
  static async syncSessionStations(context: StationShareContext): Promise<void> {
    const localRecords = Object.values(readLocalInvitations()).filter(record => record.sessionId === context.session.id);
    for (const record of localRecords) {
      const updated = { ...record, projection: buildProjection(context, record.resourceId) };
      saveLocalInvitation(updated);
    }

    if (!isFirebaseConfigured || !auth.currentUser) return;
    const snapshots = await getDocs(query(
      collection(db, INVITATION_COLLECTION),
      where('sessionId', '==', context.session.id)
    ));
    if (snapshots.empty) return;
    const batch = writeBatch(db);
    snapshots.docs.forEach(snapshot => {
      const record = snapshot.data() as StationInvitationRecord;
      batch.set(snapshot.ref, { ...record, projection: buildProjection(context, record.resourceId) });
    });
    await batch.commit();
  }
}
