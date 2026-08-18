import type { Player, ClubTeam, ActiveScope, ClubTrainingSession, MatchRecord } from '../../types/cricket';

export function getPlayersForScope(players: Player[], scope: ActiveScope): Player[] {
  if (scope.mode === 'club' || !scope.teamId) {
    return players;
  }
  const targetId = scope.teamId;
  return players.filter(p => {
    if (p.primaryTeamId === targetId) return true;
    if (p.eligibleTeamIds && p.eligibleTeamIds.includes(targetId)) return true;
    if (!p.primaryTeamId && (targetId === 'ct-1' || targetId === 'team-1')) return true;
    return false;
  });
}

export function groupPlayersByTeam(
  teams: ClubTeam[],
  players: Player[]
): Array<{ team: ClubTeam; players: Player[]; attentionCount: number }> {
  return teams.map(t => {
    const teamPlayers = players.filter(p => p.primaryTeamId === t.id || (!p.primaryTeamId && (t.id === 'ct-1' || t.id === 'team-1')));
    const attentionCount = teamPlayers.filter(p => p.workloadRestriction?.restrictedBowler || (p.activeDevelopmentFocusIds && p.activeDevelopmentFocusIds.length > 0)).length;
    return {
      team: t,
      players: teamPlayers,
      attentionCount
    };
  });
}

export function getScopeLabel(scope: ActiveScope, teams: ClubTeam[]): string {
  if (scope.mode === 'club') {
    return 'Club Overview';
  }
  const matched = teams.find(t => t.id === scope.teamId);
  return matched ? matched.name : 'Senior Men';
}

/**
 * A session belongs to every team it includes, so a combined session stays
 * visible from each of those teams. Sessions with no teams recorded are treated
 * as club-wide.
 */
export function getSessionsForScope(
  sessions: ClubTrainingSession[],
  scope: ActiveScope
): ClubTrainingSession[] {
  if (scope.mode !== 'team' || !scope.teamId) return sessions;
  const teamId = scope.teamId;
  return sessions.filter(session => !session.includedTeamIds?.length || session.includedTeamIds.includes(teamId));
}

/** Matches recorded before teams existed fall back to the founding team. */
export function getMatchesForScope(matches: MatchRecord[], scope: ActiveScope): MatchRecord[] {
  if (scope.mode !== 'team') return matches;
  return matches.filter(m => m.teamId === scope.teamId || (!m.teamId && scope.teamId === 'ct-1'));
}

/**
 * Focuses and observations carry no team of their own, so they follow the
 * player they belong to.
 */
export function getRecordsForPlayers<T extends { playerId: string }>(
  records: T[],
  players: Player[]
): T[] {
  const playerIds = new Set(players.map(player => player.id));
  return records.filter(record => playerIds.has(record.playerId));
}
