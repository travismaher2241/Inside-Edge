import type {
  Player,
  PrimaryRole,
  BattingHand,
  BowlingStyle,
  WicketkeepingCapability,
  ClubTeam
} from '../../types/cricket';

export interface ParsedRosterRow {
  tempId: string;
  name: string;
  primaryTeamId?: string;
  teamNameDetected?: string;
  primaryRole: PrimaryRole;
  battingHand: BattingHand;
  bowlingStyle: BowlingStyle;
  wicketkeepingCapability: WicketkeepingCapability;
  trainingAvailability: boolean;
  attendanceRate: number;
  contactEmail?: string;
  contactPhone?: string;
  isValid: boolean;
  validationWarnings: string[];
}

export interface RosterImportResult {
  parsedPlayers: ParsedRosterRow[];
  totalRows: number;
  validCount: number;
  warningCount: number;
  detectedHeaders: string[];
}

/**
 * Robust CSV Line Tokenizer that handles quotes, commas, tabs, and multiline escapes.
 */
export function tokenizeCsvLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Detect delimiter (comma vs tab vs semicolon).
 */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;

  if (tabCount > commaCount && tabCount > semiCount) return '\t';
  if (semiCount > commaCount && semiCount > tabCount) return ';';
  return ',';
}

/**
 * Normalizes fuzzy role strings into standard PrimaryRole
 */
export function normalizePrimaryRole(raw: string): PrimaryRole {
  const lower = (raw || '').toLowerCase().trim().replace(/[-_]/g, ' ');
  if (!lower) return 'top_order_batter';

  if (lower.includes('wicket') || lower.includes('keeper') || lower.includes('wk') || lower.includes('glove')) {
    return 'wicketkeeper';
  }
  if (lower.includes('all round') || lower.includes('allrounder') || lower.includes('ar')) {
    return 'all_rounder';
  }
  if (lower.includes('top') || lower.includes('open') || lower.includes('bat 1') || lower.includes('bat 2') || lower.includes('bat 3')) {
    return 'top_order_batter';
  }
  if (lower.includes('mid') || lower.includes('middle') || lower.includes('order')) {
    return 'middle_order_batter';
  }
  if (lower.includes('spin') || lower.includes('offie') || lower.includes('leggie') || lower.includes('sla') || lower.includes('orthodox') || lower.includes('slow')) {
    return 'spin_bowler';
  }
  if (lower.includes('pace') || lower.includes('fast') || lower.includes('seam') || lower.includes('quick') || lower.includes('med')) {
    return 'pace_bowler';
  }
  if (lower.includes('bat')) {
    return 'top_order_batter';
  }
  if (lower.includes('bowl')) {
    return 'pace_bowler';
  }

  return 'top_order_batter';
}

/**
 * Column headings a club spreadsheet actually uses. Both the singular and the plural
 * matter: "Bats" and "Bowls" read naturally down a column and are as common as the
 * longer forms. A heading we fail to recognise is silently dropped, which turns every
 * left-hander right-handed and every bowler into a non-bowler, so keep these generous.
 */
const BATTING_HEADERS = new Set([
  'batting_hand', 'batting', 'batting_style', 'batting_arm', 'bat', 'bats',
  'bat_hand', 'bats_hand', 'hand', 'handedness'
]);

const BOWLING_HEADERS = new Set([
  'bowling_style', 'bowling', 'bowler_type', 'bowling_arm', 'bowl', 'bowls',
  'bowl_style', 'bowler', 'style'
]);

/**
 * Normalizes batting hand
 */
export function normalizeBattingHand(raw: string): BattingHand {
  const lower = (raw || '').toLowerCase().trim();
  if (lower.includes('left') || lower === 'lhb' || lower === 'l') return 'left';
  return 'right';
}

/** Standard scorebook codes, as they come out of association exports. */
const SCOREBOOK_BOWLING_CODES: Record<string, BowlingStyle> = {
  sla: 'left_arm_orthodox',
  slo: 'left_arm_orthodox',
  'slow left arm': 'left_arm_orthodox',
  slc: 'left_arm_unorthodox',
  slu: 'left_arm_unorthodox',
  ob: 'right_arm_off_spin',
  lb: 'right_arm_leg_spin',
  ls: 'right_arm_leg_spin',
  rf: 'right_arm_fast',
  rfm: 'right_arm_fast_medium',
  rmf: 'right_arm_fast_medium',
  rm: 'right_arm_fast_medium',
  lf: 'left_arm_fast_medium',
  lfm: 'left_arm_fast_medium',
  lmf: 'left_arm_fast_medium',
  lm: 'left_arm_fast_medium'
};

/**
 * Normalizes bowling style
 */
export function normalizeBowlingStyle(raw: string, role?: PrimaryRole): BowlingStyle {
  const lower = (raw || '').toLowerCase().trim().replace(/[-_]/g, ' ');

  if (!lower || lower.includes('none') || lower === 'does not bowl' || lower === 'dnb') {
    if (role === 'pace_bowler') return 'right_arm_fast_medium';
    if (role === 'spin_bowler') return 'right_arm_off_spin';
    return 'does_not_bowl';
  }

  // Scorebook shorthand, matched whole-string so it never fires inside a longer
  // description. SLA is slow left-arm orthodox — a spinner, not a seamer.
  const abbreviation = SCOREBOOK_BOWLING_CODES[lower];
  if (abbreviation) return abbreviation;

  const isLeft = lower.includes('left') || lower.includes('lh') || lower.includes('sla');

  if (lower.includes('fast') && !lower.includes('med')) {
    return isLeft ? 'left_arm_fast_medium' : 'right_arm_fast';
  }
  if (lower.includes('pace') || lower.includes('seam') || lower.includes('medium') || lower.includes('fast medium')) {
    return isLeft ? 'left_arm_fast_medium' : 'right_arm_fast_medium';
  }
  if (lower.includes('leg') || lower.includes('wrist') || lower.includes('chinaman') || lower.includes('unorthodox')) {
    return isLeft ? 'left_arm_unorthodox' : 'right_arm_leg_spin';
  }
  if (lower.includes('spin') || lower.includes('off') || lower.includes('orthodox') || lower.includes('finger')) {
    return isLeft ? 'left_arm_orthodox' : 'right_arm_off_spin';
  }

  return isLeft ? 'left_arm_fast_medium' : 'right_arm_fast_medium';
}

/**
 * Matches a raw team/grade string to an existing ClubTeam entity
 */
export function matchClubTeam(rawTeam: string, clubTeams: ClubTeam[]): ClubTeam | undefined {
  // A blank grade is unknown, not "the first grade". Silently filing those players in
  // the 1st XI is worse than leaving them for the coach to assign in the preview.
  if (!rawTeam || clubTeams.length === 0) return undefined;
  const clean = rawTeam.toLowerCase().trim().replace(/[-_]/g, ' ');

  // Direct ID match
  const byId = clubTeams.find(t => t.id.toLowerCase() === clean);
  if (byId) return byId;

  // Exact name match
  const byName = clubTeams.find(t => t.name.toLowerCase() === clean);
  if (byName) return byName;

  // Grade level detection: 1st, 2nd, 3rd, 4th, 5th, 1s, 2s, Grade 1, etc.
  const gradeMatches: Array<{ pattern: RegExp; grade: number }> = [
    { pattern: /(1st|first|1s|grade\s*1|div\s*1|\b1\b)/i, grade: 1 },
    { pattern: /(2nd|second|2s|grade\s*2|div\s*2|\b2\b)/i, grade: 2 },
    { pattern: /(3rd|third|3s|grade\s*3|div\s*3|\b3\b)/i, grade: 3 },
    { pattern: /(4th|fourth|4s|grade\s*4|div\s*4|\b4\b)/i, grade: 4 },
    { pattern: /(5th|fifth|5s|grade\s*5|div\s*5|\b5\b)/i, grade: 5 },
    { pattern: /(6th|sixth|6s|grade\s*6|div\s*6|\b6\b)/i, grade: 6 }
  ];

  for (const gm of gradeMatches) {
    if (gm.pattern.test(clean)) {
      const match = clubTeams.find(t => gm.pattern.test(t.name) || gm.pattern.test(t.gradeOrDivision || ''));
      if (match) return match;
    }
  }

  // Substring match
  const partial = clubTeams.find(t => clean.includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(clean));
  if (partial) return partial;

  // Unrecognised grade. Hand it back for the coach to resolve in the preview rather
  // than guessing — a wrong squad is harder to spot than a blank one.
  return undefined;
}

/**
 * Main CSV Roster Parser
 */
export function parseCsvRoster(
  csvText: string,
  clubTeams: ClubTeam[] = [],
  existingPlayers: Player[] = []
): RosterImportResult {
  if (!csvText || !csvText.trim()) {
    return { parsedPlayers: [], totalRows: 0, validCount: 0, warningCount: 0, detectedHeaders: [] };
  }

  const delimiter = detectDelimiter(csvText);
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { parsedPlayers: [], totalRows: 0, validCount: 0, warningCount: 0, detectedHeaders: [] };
  }

  const headerTokens = tokenizeCsvLine(lines[0], delimiter).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));

  // Header index resolution
  let nameColIdx = -1;
  let firstNameColIdx = -1;
  let lastNameColIdx = -1;
  let teamColIdx = -1;
  let roleColIdx = -1;
  let batColIdx = -1;
  let bowlColIdx = -1;
  let keeperColIdx = -1;
  let emailColIdx = -1;
  let phoneColIdx = -1;

  headerTokens.forEach((header, idx) => {
    if (header === 'name' || header === 'player_name' || header === 'player' || header === 'full_name') {
      nameColIdx = idx;
    } else if (header === 'first_name' || header === 'given_name' || header === 'first') {
      firstNameColIdx = idx;
    } else if (header === 'last_name' || header === 'family_name' || header === 'surname' || header === 'last') {
      lastNameColIdx = idx;
    } else if (header === 'team' || header === 'grade' || header === 'squad' || header === 'team_name' || header === 'grade_name' || header === 'xi') {
      teamColIdx = idx;
    } else if (header === 'role' || header === 'primary_role' || header === 'player_role' || header === 'type' || header === 'specialism') {
      roleColIdx = idx;
    } else if (BATTING_HEADERS.has(header)) {
      batColIdx = idx;
    } else if (BOWLING_HEADERS.has(header)) {
      bowlColIdx = idx;
    } else if (header === 'wicketkeeping' || header === 'keeper' || header === 'wk') {
      keeperColIdx = idx;
    } else if (header === 'email' || header === 'contact_email') {
      emailColIdx = idx;
    } else if (header === 'phone' || header === 'mobile' || header === 'contact_number') {
      phoneColIdx = idx;
    }
  });

  // If no explicit header detected, assume standard column order: Name, Team, Role, Batting, Bowling
  const hasHeaderRow = nameColIdx !== -1 || firstNameColIdx !== -1 || teamColIdx !== -1 || roleColIdx !== -1;
  const startRowIdx = hasHeaderRow ? 1 : 0;

  if (!hasHeaderRow) {
    nameColIdx = 0;
    teamColIdx = 1;
    roleColIdx = 2;
    batColIdx = 3;
    bowlColIdx = 4;
  }

  const existingNameSet = new Set(existingPlayers.map(p => p.name.toLowerCase().trim()));
  const seenImportNames = new Set<string>();
  const parsedPlayers: ParsedRosterRow[] = [];

  for (let i = startRowIdx; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;

    const cols = tokenizeCsvLine(rawLine, delimiter);
    let resolvedName = '';

    if (nameColIdx !== -1 && cols[nameColIdx]) {
      resolvedName = cols[nameColIdx].trim();
    } else if (firstNameColIdx !== -1) {
      const first = cols[firstNameColIdx] || '';
      const last = (lastNameColIdx !== -1 ? cols[lastNameColIdx] : '') || '';
      resolvedName = `${first} ${last}`.trim();
    } else if (cols[0]) {
      resolvedName = cols[0].trim();
    }

    if (!resolvedName) continue; // Skip blank rows

    const warnings: string[] = [];
    const normalizedNameKey = resolvedName.toLowerCase();

    // A name repeated in the file is one player listed twice, not two players. Flag the
    // repeat and leave it out of the commit rather than creating a second record.
    const isDuplicateInFile = seenImportNames.has(normalizedNameKey);
    if (isDuplicateInFile) {
      warnings.push(`Duplicate player name in import file: '${resolvedName}' — this row will be skipped.`);
    }
    seenImportNames.add(normalizedNameKey);

    if (existingNameSet.has(normalizedNameKey)) {
      warnings.push(`Player already exists in club roster: '${resolvedName}' (will update profile)`);
    }

    const rawTeam = teamColIdx !== -1 && cols[teamColIdx] ? cols[teamColIdx].trim() : '';
    const matchedTeam = matchClubTeam(rawTeam, clubTeams);
    if (!matchedTeam) {
      warnings.push(rawTeam
        ? `Could not match '${rawTeam}' to a squad — choose one before importing.`
        : 'No squad listed — choose one before importing.');
    }

    const rawRole = roleColIdx !== -1 && cols[roleColIdx] ? cols[roleColIdx].trim() : '';
    const primaryRole = normalizePrimaryRole(rawRole);

    const rawBat = batColIdx !== -1 && cols[batColIdx] ? cols[batColIdx].trim() : '';
    const battingHand = normalizeBattingHand(rawBat);

    const rawBowl = bowlColIdx !== -1 && cols[bowlColIdx] ? cols[bowlColIdx].trim() : '';
    const bowlingStyle = normalizeBowlingStyle(rawBowl, primaryRole);

    let wicketkeepingCapability: WicketkeepingCapability = 'none';
    if (primaryRole === 'wicketkeeper') {
      wicketkeepingCapability = 'primary';
    } else if (keeperColIdx !== -1 && cols[keeperColIdx]) {
      const kw = cols[keeperColIdx].toLowerCase();
      if (kw.includes('yes') || kw.includes('primary') || kw.includes('main')) wicketkeepingCapability = 'primary';
      else if (kw.includes('backup') || kw.includes('part') || kw.includes('sec')) wicketkeepingCapability = 'backup';
    }

    parsedPlayers.push({
      tempId: `import-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name: resolvedName,
      primaryTeamId: matchedTeam?.id,
      teamNameDetected: rawTeam || matchedTeam?.name,
      primaryRole,
      battingHand,
      bowlingStyle,
      wicketkeepingCapability,
      trainingAvailability: true,
      attendanceRate: 90,
      contactEmail: emailColIdx !== -1 ? cols[emailColIdx]?.trim() : undefined,
      contactPhone: phoneColIdx !== -1 ? cols[phoneColIdx]?.trim() : undefined,
      isValid: !isDuplicateInFile,
      validationWarnings: warnings
    });
  }

  const validCount = parsedPlayers.filter(p => p.isValid).length;
  const warningCount = parsedPlayers.reduce((sum, p) => sum + p.validationWarnings.length, 0);

  return {
    parsedPlayers,
    totalRows: parsedPlayers.length,
    validCount,
    warningCount,
    detectedHeaders: hasHeaderRow ? headerTokens : []
  };
}

/**
 * Converts validated ParsedRosterRows into full Player entities ready for repository persistence.
 */
export function convertParsedRowsToPlayers(
  rows: ParsedRosterRow[],
  existingPlayers: Player[] = []
): { newPlayers: Player[]; updatedPlayers: Player[]; allPlayersToSave: Player[] } {
  const existingMap = new Map(existingPlayers.map(p => [p.name.toLowerCase().trim(), p]));
  const newPlayers: Player[] = [];
  const updatedPlayers: Player[] = [];

  rows.filter(row => row.isValid !== false).forEach((row, idx) => {
    const existing = existingMap.get(row.name.toLowerCase().trim());
    if (existing) {
      const updated: Player = {
        ...existing,
        primaryTeamId: row.primaryTeamId || existing.primaryTeamId,
        primaryRole: row.primaryRole,
        battingHand: row.battingHand,
        bowlingStyle: row.bowlingStyle,
        wicketkeepingCapability: row.wicketkeepingCapability
      };
      updatedPlayers.push(updated);
    } else {
      const created: Player = {
        id: `p-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        name: row.name,
        primaryTeamId: row.primaryTeamId,
        primaryRole: row.primaryRole,
        secondaryRole: 'none',
        battingHand: row.battingHand,
        bowlingStyle: row.bowlingStyle,
        wicketkeepingCapability: row.wicketkeepingCapability,
        trainingAvailability: true,
        activeDevelopmentFocusIds: []
      };
      newPlayers.push(created);
    }
  });

  const allPlayersToSave = [
    ...existingPlayers.map(ep => {
      const up = updatedPlayers.find(u => u.id === ep.id);
      return up || ep;
    }),
    ...newPlayers
  ];

  return { newPlayers, updatedPlayers, allPlayersToSave };
}

/**
 * Generates a starter CSV template with example cricket squad data.
 */
export function generateSampleCsvTemplate(): string {
  return `Name,Team,Primary Role,Batting Hand,Bowling Style
Marcus Harris,1st XI,Top-order batter,Left,Does not bowl
Will Pucovski,1st XI,Top-order batter,Right,Does not bowl
Peter Handscomb,1st XI,Wicketkeeper,Right,Does not bowl
Glenn Maxwell,1st XI,All-rounder,Right,Right-arm off spin
Scott Boland,1st XI,Pace bowler,Right,Right-arm fast
Todd Murphy,1st XI,Spin bowler,Right,Right-arm off spin
Travis Maher,2nd XI,All-rounder,Right,Right-arm fast-medium
Campbell Kellaway,2nd XI,Top-order batter,Left,Does not bowl
Sam Harper,2nd XI,Wicketkeeper,Right,Does not bowl
Mitchell Perry,2nd XI,Pace bowler,Right,Right-arm fast-medium
Wil Parker,2nd XI,Spin bowler,Right,Right-arm leg spin
Ashley Chandrasinghe,3rd XI,Top-order batter,Left,Does not bowl
Thomas Rogers,3rd XI,Middle-order batter,Right,Right-arm fast-medium
Xavier Crone,3rd XI,Pace bowler,Right,Right-arm fast
Rupert Harbig,4th XI,All-rounder,Right,Right-arm off spin
Harry Dixon,4th XI,Top-order batter,Left,Right-arm off spin
Liam Blackford,4th XI,Wicketkeeper,Left,Does not bowl
David Moody,5th XI,Pace bowler,Right,Right-arm fast
Cameron McClure,5th XI,Pace bowler,Right,Right-arm fast-medium
Doug Warren,5th XI,Spin bowler,Left,Left-arm orthodox`;
}
