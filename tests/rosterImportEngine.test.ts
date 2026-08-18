import { describe, it, expect } from 'vitest';
import {
  tokenizeCsvLine,
  detectDelimiter,
  normalizePrimaryRole,
  normalizeBattingHand,
  normalizeBowlingStyle,
  matchClubTeam,
  parseCsvRoster,
  convertParsedRowsToPlayers,
  generateSampleCsvTemplate
} from '../src/modules/cricket/rosterImportEngine';
import type { ClubTeam, Player } from '../src/types/cricket';

describe('Club Squad Roster Importer Engine Tests', () => {
  const mockTeams: ClubTeam[] = [
    { id: 'ct-1', name: '1st XI', ageGroup: 'Seniors', submissionToken: 'tok-1', createdAt: '2026-08-18', gradeOrDivision: '1st Grade' },
    { id: 'ct-2', name: '2nd XI', ageGroup: 'Seniors', submissionToken: 'tok-2', createdAt: '2026-08-18', gradeOrDivision: '2nd Grade' },
    { id: 'ct-3', name: '3rd XI', ageGroup: 'Seniors', submissionToken: 'tok-3', createdAt: '2026-08-18', gradeOrDivision: '3rd Grade' },
    { id: 'ct-4', name: '4th XI', ageGroup: 'Seniors', submissionToken: 'tok-4', createdAt: '2026-08-18', gradeOrDivision: '4th Grade' },
    { id: 'ct-5', name: '5th XI', ageGroup: 'Seniors', submissionToken: 'tok-5', createdAt: '2026-08-18', gradeOrDivision: '5th Grade' }
  ];

  it('correctly tokenizes CSV lines with commas, quotes, and whitespace', () => {
    const line = ' "Marcus Harris" , "1st XI", "Top-order batter, Left", "Right-arm off spin" ';
    const tokens = tokenizeCsvLine(line, ',');
    expect(tokens).toEqual(['Marcus Harris', '1st XI', 'Top-order batter, Left', 'Right-arm off spin']);
  });

  it('detects delimiters (comma vs tab vs semicolon)', () => {
    expect(detectDelimiter('Name,Team,Role\nJohn,1st XI,Batter')).toBe(',');
    expect(detectDelimiter('Name\tTeam\tRole\nJohn\t1st XI\tBatter')).toBe('\t');
    expect(detectDelimiter('Name;Team;Role\nJohn;1st XI;Batter')).toBe(';');
  });

  it('normalizes various role representations accurately', () => {
    expect(normalizePrimaryRole('Opener')).toBe('top_order_batter');
    expect(normalizePrimaryRole('Top order')).toBe('top_order_batter');
    expect(normalizePrimaryRole('Middle order batter')).toBe('middle_order_batter');
    expect(normalizePrimaryRole('All-rounder')).toBe('all_rounder');
    expect(normalizePrimaryRole('Fast Bowler')).toBe('pace_bowler');
    expect(normalizePrimaryRole('Seamer')).toBe('pace_bowler');
    expect(normalizePrimaryRole('Leg-spinner')).toBe('spin_bowler');
    expect(normalizePrimaryRole('Offie')).toBe('spin_bowler');
    expect(normalizePrimaryRole('Wicket keeper')).toBe('wicketkeeper');
    expect(normalizePrimaryRole('Gloveman')).toBe('wicketkeeper');
  });

  it('normalizes batting hands and bowling styles', () => {
    expect(normalizeBattingHand('LHB')).toBe('left');
    expect(normalizeBattingHand('Left Hand')).toBe('left');
    expect(normalizeBattingHand('Right')).toBe('right');
    expect(normalizeBattingHand('')).toBe('right');

    expect(normalizeBowlingStyle('Right Arm Fast', 'pace_bowler')).toBe('right_arm_fast');
    expect(normalizeBowlingStyle('Left arm orthodox', 'spin_bowler')).toBe('left_arm_orthodox');
    expect(normalizeBowlingStyle('Leg spin', 'spin_bowler')).toBe('right_arm_leg_spin');
    expect(normalizeBowlingStyle('Does not bowl', 'top_order_batter')).toBe('does_not_bowl');
  });

  it('matches teams by grade number, grade name, or alias', () => {
    expect(matchClubTeam('1st XI', mockTeams)?.id).toBe('ct-1');
    expect(matchClubTeam('Firsts', mockTeams)?.id).toBe('ct-1');
    expect(matchClubTeam('2s', mockTeams)?.id).toBe('ct-2');
    expect(matchClubTeam('3rd Grade', mockTeams)?.id).toBe('ct-3');
    expect(matchClubTeam('4th XI', mockTeams)?.id).toBe('ct-4');
    expect(matchClubTeam('5s', mockTeams)?.id).toBe('ct-5');
  });

  it('parses standard 5-team CSV roster with header correctly', () => {
    const csv = `Name,Team,Primary Role,Batting Hand,Bowling Style
Marcus Harris,1st XI,Top-order batter,Left,Does not bowl
Travis Maher,2nd XI,All-rounder,Right,Right-arm fast-medium
Peter Handscomb,1st XI,Wicketkeeper,Right,Does not bowl
Scott Boland,1st XI,Pace bowler,Right,Right-arm fast
Todd Murphy,1st XI,Spin bowler,Right,Right-arm off spin
Thomas Rogers,3rd XI,Middle-order batter,Right,Right-arm fast-medium
Harry Dixon,4th XI,Top-order batter,Left,Right-arm off spin
David Moody,5th XI,Pace bowler,Right,Right-arm fast`;

    const result = parseCsvRoster(csv, mockTeams, []);
    expect(result.totalRows).toBe(8);
    expect(result.validCount).toBe(8);

    const marcus = result.parsedPlayers.find(p => p.name === 'Marcus Harris');
    expect(marcus?.primaryTeamId).toBe('ct-1');
    expect(marcus?.primaryRole).toBe('top_order_batter');
    expect(marcus?.battingHand).toBe('left');

    const travis = result.parsedPlayers.find(p => p.name === 'Travis Maher');
    expect(travis?.primaryTeamId).toBe('ct-2');
    expect(travis?.primaryRole).toBe('all_rounder');

    const moody = result.parsedPlayers.find(p => p.name === 'David Moody');
    expect(moody?.primaryTeamId).toBe('ct-5');
    expect(moody?.primaryRole).toBe('pace_bowler');
  });

  it('parses PlayHQ export with separate First Name and Last Name columns', () => {
    const playHqCsv = `First Name,Last Name,Grade,Role,Batting,Bowling
Will,Pucovski,1st XI,Batter,Right,None
Sam,Harper,2nd XI,Wicketkeeper,Right,None
Xavier,Crone,3rd XI,Bowler,Right,Right Arm Fast
Rupert,Harbig,4th XI,All Rounder,Right,Off Spin
Cameron,McClure,5th XI,Bowler,Right,Pace`;

    const result = parseCsvRoster(playHqCsv, mockTeams, []);
    expect(result.totalRows).toBe(5);
    expect(result.parsedPlayers[0].name).toBe('Will Pucovski');
    expect(result.parsedPlayers[0].primaryTeamId).toBe('ct-1');
    expect(result.parsedPlayers[1].name).toBe('Sam Harper');
    expect(result.parsedPlayers[1].primaryRole).toBe('wicketkeeper');
  });

  it('flags duplicate player names and existing roster overlaps with warnings', () => {
    const existing: Player[] = [
      { id: 'p-1', name: 'Marcus Harris', primaryTeamId: 'ct-1', primaryRole: 'top_order_batter', secondaryRole: 'none', battingHand: 'left', bowlingStyle: 'does_not_bowl', wicketkeepingCapability: 'none', trainingAvailability: true, activeDevelopmentFocusIds: [] }
    ];

    const csvWithDups = `Name,Team,Role
Marcus Harris,1st XI,Batter
Marcus Harris,2nd XI,Batter
Will Pucovski,1st XI,Batter`;

    const result = parseCsvRoster(csvWithDups, mockTeams, existing);
    expect(result.totalRows).toBe(3);
    expect(result.warningCount).toBeGreaterThan(0);
    expect(result.parsedPlayers[0].validationWarnings.length).toBeGreaterThan(0);
  });

  it('converts parsed rows into database-ready Player entities', () => {
    const existing: Player[] = [
      { id: 'p-1', name: 'Marcus Harris', primaryTeamId: 'ct-1', primaryRole: 'top_order_batter', secondaryRole: 'none', battingHand: 'left', bowlingStyle: 'does_not_bowl', wicketkeepingCapability: 'none', trainingAvailability: true, activeDevelopmentFocusIds: [] }
    ];

    const csv = `Name,Team,Role,Batting,Bowling
Marcus Harris,1st XI,All-rounder,Left,Right-arm off spin
Glenn Maxwell,1st XI,All-rounder,Right,Right-arm off spin`;

    const result = parseCsvRoster(csv, mockTeams, existing);
    const { newPlayers, updatedPlayers, allPlayersToSave } = convertParsedRowsToPlayers(result.parsedPlayers, existing);

    expect(newPlayers).toHaveLength(1);
    expect(newPlayers[0].name).toBe('Glenn Maxwell');

    expect(updatedPlayers).toHaveLength(1);
    expect(updatedPlayers[0].id).toBe('p-1');
    expect(updatedPlayers[0].primaryRole).toBe('all_rounder');

    expect(allPlayersToSave).toHaveLength(2);
  });

  it('generates a valid CSV sample template', () => {
    const template = generateSampleCsvTemplate();
    expect(template).toContain('Marcus Harris');
    expect(template).toContain('1st XI');
    expect(template).toContain('5th XI');
    const parsed = parseCsvRoster(template, mockTeams, []);
    expect(parsed.totalRows).toBe(20);
    expect(parsed.validCount).toBe(20);
  });
});
