import type { Player, ClubTeam, ActiveScope } from '../../types/cricket';

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
