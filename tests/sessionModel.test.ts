import { describe, expect, it } from 'vitest';
import type { Activity, ClubTeam, ClubTrainingSession, SavedClubTemplate, TrainingResource, TrainingSession } from '../src/types/cricket';
import { activityToClubBlock, applyTemplateToSession, buildBlockDurations, calculateSessionReadiness, migrateTrainingSession, selectCurrentClubSession } from '../src/modules/cricket/sessionModel';

const legacy: TrainingSession = {
  id: 'legacy-1', title: 'Legacy training', date: '2026-08-11', startTime: '18:00', durationMinutes: 90,
  status: 'planned', expectedPlayerIds: ['p1'], facilityId: 'fac-1', primaryObjectives: ['Decision making'],
  blocks: [{ id: 'warmup', title: 'Warm up', blockType: 'warmup', durationMinutes: 10, location: 'Outfield', objective: 'Prepare' }],
  activeBlockIndex: 0, activeRotationIndex: 0
};

describe('canonical session model', () => {
  it('migrates legacy data without changing its identity or core fields', () => {
    const migrated = migrateTrainingSession(legacy, 'club-1', ['team-1']);
    expect(migrated).toMatchObject({ id: 'legacy-1', title: 'Legacy training', finishTime: '19:30', includedTeamIds: ['team-1'], status: 'planned' });
    expect(migrated.blocks[0]).toMatchObject({ id: 'warmup', type: 'warmup', durationMinutes: 10 });
  });

  it('creates an explicit short final block', () => {
    expect(buildBlockDurations(90, 12)).toEqual([12, 12, 12, 12, 12, 12, 12, 6]);
  });

  it('maps an activity using its real duration, location and id', () => {
    const activity = { id: 'a1', name: 'Scenario', purpose: 'Pressure', category: 'Tactical', minPlayers: 2, maxPlayers: 12, durationMinutes: 17, spaceRequired: 'pitch', equipment: [], setupSteps: [], coachingPoints: [], constraints: [], progressions: [], participationDensity: 'High', tags: [] } satisfies Activity;
    expect(activityToClubBlock(activity)).toMatchObject({ activityId: 'a1', durationMinutes: 17, location: 'Centre wicket', type: 'centre_wicket' });
  });

  it('reports missing readiness requirements', () => {
    const session = { ...migrateTrainingSession(legacy), includedTeamIds: [], availableResourceIds: [], confirmedAttendingPlayerIds: [], status: 'draft' } satisfies ClubTrainingSession;
    expect(calculateSessionReadiness(session, [] )).toMatchObject({ score: 40 });
    expect(calculateSessionReadiness(session, []).missing).toContain('Select at least one team');
  });

  it('does not count inactive resources as readiness inputs', () => {
    const resource = { id: 'r1', facilityId: 'f', name: 'Net', type: 'standard_net', active: false, maxBatters: 2, minBowlers: 1, maxBowlers: 4, maxTotalParticipants: 6, requiresCoachOrLeader: false, supportsLiveBatting: true, supportsCentreWicket: false } satisfies TrainingResource;
    const session = { ...migrateTrainingSession(legacy), includedTeamIds: ['t'], availableResourceIds: [resource.id] };
    expect(calculateSessionReadiness(session, [resource]).score).toBeLessThan(100);
  });

  it('applies explicit template teams, resource types, objectives and duration', () => {
    const session = migrateTrainingSession(legacy);
    const team = { id: 'team-1', name: 'First XI', ageGroup: 'Senior', submissionToken: 'token', createdAt: '2026-01-01' } satisfies ClubTeam;
    const resource = { id: 'r1', facilityId: 'f', name: 'Spin net', type: 'spin_net', active: true, maxBatters: 2, minBowlers: 1, maxBowlers: 4, maxTotalParticipants: 6, requiresCoachOrLeader: false, supportsLiveBatting: true, supportsCentreWicket: false } satisfies TrainingResource;
    const template = { id: 't1', name: 'Spin', description: 'Spin session', includedTeamIds: [team.id], resourceTypeRules: ['spin_net'], teamGroupRules: [], rotationDurationMinutes: 15, sessionObjectives: ['Play spin'] } satisfies SavedClubTemplate;
    expect(applyTemplateToSession(session, template, [team], [resource])).toMatchObject({ includedTeamIds: ['team-1'], availableResourceIds: ['r1'], rotationDurationMinutes: 15, sessionObjectives: ['Play spin'] });
  });

  it('never treats a completed session as the current actionable session', () => {
    const completed = { ...migrateTrainingSession(legacy), id: 'done', status: 'completed' as const };
    const draft = { ...migrateTrainingSession(legacy), id: 'next', status: 'draft' as const };
    expect(selectCurrentClubSession([completed], completed.id)).toBeUndefined();
    expect(selectCurrentClubSession([completed, draft], completed.id)?.id).toBe('next');
  });
});
