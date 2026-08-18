import { describe, it, expect } from 'vitest';
import {
  parseCsvRoster,
  convertParsedRowsToPlayers,
  normalizeBowlingStyle
} from '../src/modules/cricket/rosterImportEngine';
import type { ClubTeam } from '../src/types/cricket';

/**
 * The importer is only worth having if it survives the spreadsheet a club actually
 * sends. These use headings and shorthand the engine was NOT written against — the
 * previous suite passed while every left-hander was being imported right-handed,
 * because it only ever tested the column names the parser already knew.
 */

const teams: ClubTeam[] = [1, 2, 3, 4, 5].map(n => ({
  id: `ct-${n}`,
  name: `${n}${['st', 'nd', 'rd', 'th', 'th'][n - 1]} XI Senior Men`,
  ageGroup: 'Senior',
  submissionToken: `tok-${n}`,
  createdAt: '2026-01-01',
  active: true,
  displayOrder: n
}));

describe('roster import against a real club spreadsheet', () => {
  describe.each([
    { label: 'plural headings', header: 'Player Name,Grade,Role,Bats,Bowls' },
    { label: 'singular headings', header: 'Name,Team,Role,Bat,Bowl' },
    { label: 'long headings', header: 'Full Name,Squad,Primary Role,Batting Hand,Bowling Style' }
  ])('$label', ({ header }) => {
    const csv = [
      header,
      'Sam Miller,1st XI,All-rounder,LHB,Left-arm orthodox',
      'Ben Harris,2nd XI,Opener,RHB,None',
      'Liam Murphy,4s,All-rounder,Left,Right-arm medium'
    ].join('\n');

    it('reads the batting hand column', () => {
      const { parsedPlayers } = parseCsvRoster(csv, teams);
      expect(parsedPlayers.map(p => p.battingHand)).toEqual(['left', 'right', 'left']);
    });

    it('reads the bowling style column', () => {
      const { parsedPlayers } = parseCsvRoster(csv, teams);
      expect(parsedPlayers.map(p => p.bowlingStyle)).toEqual([
        'left_arm_orthodox', 'does_not_bowl', 'right_arm_fast_medium'
      ]);
    });
  });

  it('reads scorebook shorthand as the discipline it actually is', () => {
    // SLA is slow left-arm orthodox. Classifying a spinner as fast-medium changes which
    // net they are sent to and which batters the safety check will pair them with.
    expect(normalizeBowlingStyle('SLA')).toBe('left_arm_orthodox');
    expect(normalizeBowlingStyle('slo')).toBe('left_arm_orthodox');
    expect(normalizeBowlingStyle('OB')).toBe('right_arm_off_spin');
    expect(normalizeBowlingStyle('LB')).toBe('right_arm_leg_spin');
    expect(normalizeBowlingStyle('RFM')).toBe('right_arm_fast_medium');
    expect(normalizeBowlingStyle('RF')).toBe('right_arm_fast');
  });

  it('does not confuse leg spin with off spin', () => {
    expect(normalizeBowlingStyle('Right arm leg spin')).toBe('right_arm_leg_spin');
    expect(normalizeBowlingStyle('Right-arm off-spin')).toBe('right_arm_off_spin');
  });

  it('leaves a player with no grade unassigned rather than filing them in the 1st XI', () => {
    const csv = [
      'Name,Grade,Role',
      'Mitch Watson,,All-rounder',
      'Unknown Grade,Colts B,All-rounder',
      'Tom Walker,3rd XI,Seamer'
    ].join('\n');

    const { parsedPlayers } = parseCsvRoster(csv, teams);
    expect(parsedPlayers[0].primaryTeamId).toBeUndefined();
    expect(parsedPlayers[0].validationWarnings.join(' ')).toMatch(/no squad/i);
    expect(parsedPlayers[1].primaryTeamId).toBeUndefined();
    expect(parsedPlayers[2].primaryTeamId).toBe('ct-3');

    // And they must not reach the database as a 1st XI player either.
    const { newPlayers } = convertParsedRowsToPlayers(parsedPlayers);
    expect(newPlayers.find(p => p.name === 'Mitch Watson')?.primaryTeamId).toBeUndefined();
  });

  it('imports a player listed twice only once', () => {
    const csv = [
      'Name,Grade,Role',
      'Ben Harris,1st XI,Opener',
      'Tom Walker,3rd XI,Seamer',
      'Ben Harris,1st XI,Opener'
    ].join('\n');

    const { parsedPlayers, validCount } = parseCsvRoster(csv, teams);
    expect(parsedPlayers).toHaveLength(3);
    expect(validCount).toBe(2);
    expect(parsedPlayers[2].isValid).toBe(false);
    expect(parsedPlayers[2].validationWarnings.join(' ')).toMatch(/duplicate/i);

    const { newPlayers } = convertParsedRowsToPlayers(parsedPlayers);
    expect(newPlayers.filter(p => p.name === 'Ben Harris')).toHaveLength(1);
    expect(newPlayers).toHaveLength(2);
  });

  it('loads the whole five-grade club without losing anyone', () => {
    const grades = ['1st XI', '2s', 'Grade 3', '4th Grade', 'Fifths'];
    const roles = ['Opener', 'Middle order', 'Seamer', 'Leggie', 'All-rounder', 'Keeper'];
    const hands = ['RHB', 'LHB'];
    const rows = ['Player Name,Grade,Role,Bats,Bowls'];
    let n = 0;
    grades.forEach((grade, gi) => {
      for (let i = 0; i < 11; i++) {
        n++;
        rows.push(`Player ${n},${grade},${roles[(gi + i) % roles.length]},${hands[n % 2]},${n % 3 === 0 ? 'SLA' : 'RFM'}`);
      }
    });

    const { parsedPlayers, validCount } = parseCsvRoster(rows.join('\n'), teams);
    expect(parsedPlayers).toHaveLength(55);
    expect(validCount).toBe(55);
    expect(parsedPlayers.every(p => p.primaryTeamId)).toBe(true);

    // Every grade should be recognised, including "2s", "Grade 3" and "Fifths".
    const perTeam = teams.map(t => parsedPlayers.filter(p => p.primaryTeamId === t.id).length);
    expect(perTeam).toEqual([11, 11, 11, 11, 11]);

    // Left-handers and spinners must survive the round trip.
    expect(parsedPlayers.filter(p => p.battingHand === 'left').length).toBeGreaterThan(20);
    expect(parsedPlayers.filter(p => p.bowlingStyle === 'left_arm_orthodox').length).toBeGreaterThan(15);

    const { newPlayers } = convertParsedRowsToPlayers(parsedPlayers);
    expect(newPlayers).toHaveLength(55);
    expect(new Set(newPlayers.map(p => p.id)).size).toBe(55);
  });
});
