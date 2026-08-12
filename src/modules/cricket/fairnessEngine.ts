import type {
  PlayerSessionOpportunityRecord,
  PlayerOpportunityProfile,
  FairnessCategoryBalance,
  FairnessCategoryResult,
  FairnessFlag,
  PlayerFairnessAssessment,
  ClubTrainingSession
} from '../../types/cricket';

const FAIRNESS_CONFIG = {
  rollingAttendedSessions: 5,
  minimumSessionsForAssessment: 2,
  deficitThreshold: 0.85,
  surplusThreshold: 1.15
};

export const FairnessEngine = {
  /**
   * Generates PlayerSessionOpportunityRecords when a session is completed.
   */
  generateSessionOpportunityRecords(session: ClubTrainingSession): PlayerSessionOpportunityRecord[] {
    const completedAt = session.completedAt || new Date().toISOString();
    const teamId = session.includedTeamIds[0] || 'default_team';

    // Calculate total block durations by context & discipline
    let totalBattingMins = 0;
    let totalBowlingMins = 0;
    let totalFieldingMins = 0;
    let totalNetMins = 0;
    let totalCentreWicketMins = 0;
    let totalScenarioMins = 0;

    session.blocks.forEach(b => {
      const dur = b.durationMinutes || 15;
      if (b.type === 'rotation') {
        totalNetMins += dur;
        totalBattingMins += Math.floor(dur / 2);
        totalBowlingMins += Math.floor(dur / 2);
      } else if (b.type === 'centre_wicket') {
        totalCentreWicketMins += dur;
        totalScenarioMins += dur;
        totalBattingMins += Math.floor(dur / 3);
        totalBowlingMins += Math.floor(dur / 3);
      } else if (b.type === 'activity' || b.type === 'warmup') {
        totalFieldingMins += dur;
      }
    });

    const records: PlayerSessionOpportunityRecord[] = session.expectedPlayerIds.map(playerId => {
      const attended = session.confirmedAttendingPlayerIds.includes(playerId);
      return {
        id: `opp_${session.id}_${playerId}`,
        sessionId: session.id,
        teamId,
        playerId,
        completedAt,
        attended,
        totalActiveMinutes: attended ? totalBattingMins + totalBowlingMins + totalFieldingMins : 0,
        battingMinutes: attended ? totalBattingMins : 0,
        bowlingMinutes: attended ? totalBowlingMins : 0,
        fieldingMinutes: attended ? totalFieldingMins : 0,
        netMinutes: attended ? totalNetMins : 0,
        centreWicketMinutes: attended ? totalCentreWicketMins : 0,
        scenarioMinutes: attended ? totalScenarioMins : 0,
        source: 'live_blocks'
      };
    });

    return records;
  },

  /**
   * Assesses player fairness over rolling attended sessions.
   */
  assessPlayerFairness(
    playerId: string,
    teamId: string,
    opportunityProfile: PlayerOpportunityProfile,
    allOpportunityRecords: PlayerSessionOpportunityRecord[]
  ): PlayerFairnessAssessment {
    // 1. Get player's attended sessions for team (up to rolling window limit)
    const playerAttendedRecords = allOpportunityRecords
      .filter(r => r.playerId === playerId && r.teamId === teamId && r.attended)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, FAIRNESS_CONFIG.rollingAttendedSessions);

    const attendedSessionCount = playerAttendedRecords.length;
    const hasInsufficientHistory = attendedSessionCount < FAIRNESS_CONFIG.minimumSessionsForAssessment;

    // Helper for category calculation
    const calcCategory = (
      eligible: boolean,
      targetWeight: number,
      getValue: (r: PlayerSessionOpportunityRecord) => number
    ): FairnessCategoryResult => {
      if (!eligible || targetWeight <= 0) {
        return { ratio: null, status: 'not_applicable', evidenceSessionsCount: 0 };
      }

      let evidenceSessionsCount = 0;
      let sumActual = 0;
      let sumExpected = 0;

      playerAttendedRecords.forEach(playerRecord => {
        // Find peers from same team who attended same session
        const sessionPeers = allOpportunityRecords.filter(
          r => r.sessionId === playerRecord.sessionId && r.teamId === teamId && r.attended
        );

        const peerValues = sessionPeers.map(getValue).sort((a, b) => a - b);
        let peerMedian = 0;
        if (peerValues.length > 0) {
          const mid = Math.floor(peerValues.length / 2);
          peerMedian = peerValues.length % 2 !== 0 ? peerValues[mid] : (peerValues[mid - 1] + peerValues[mid]) / 2;
        }

        if (peerMedian > 0) {
          evidenceSessionsCount++;
          sumActual += getValue(playerRecord);
          sumExpected += peerMedian * targetWeight;
        }
      });

      if (evidenceSessionsCount < FAIRNESS_CONFIG.minimumSessionsForAssessment) {
        return { ratio: null, status: 'insufficient_evidence', evidenceSessionsCount };
      }

      const ratio = sumExpected > 0 ? Number((sumActual / sumExpected).toFixed(2)) : 1.0;
      let status: 'healthy' | 'deficit' | 'surplus' = 'healthy';
      if (ratio < FAIRNESS_CONFIG.deficitThreshold) {
        status = 'deficit';
      } else if (ratio > FAIRNESS_CONFIG.surplusThreshold) {
        status = 'surplus';
      }

      return { ratio, status, evidenceSessionsCount };
    };

    const balance: FairnessCategoryBalance = {
      batting: calcCategory(opportunityProfile.battingEligible, opportunityProfile.battingTargetWeight, r => r.battingMinutes),
      bowling: calcCategory(opportunityProfile.bowlingEligible, opportunityProfile.bowlingTargetWeight, r => r.bowlingMinutes),
      fielding: calcCategory(opportunityProfile.fieldingEligible, opportunityProfile.fieldingTargetWeight, r => r.fieldingMinutes),
      centreWicket: calcCategory(true, opportunityProfile.centreWicketTargetWeight, r => r.centreWicketMinutes),
      scenario: calcCategory(true, opportunityProfile.scenarioTargetWeight, r => r.scenarioMinutes)
    };

    // Evaluate explicit flags
    const flags: FairnessFlag[] = [];

    if (hasInsufficientHistory) {
      flags.push('insufficient_history');
    } else {
      if (balance.batting.status === 'deficit') flags.push('needs_batting');
      if (balance.bowling.status === 'deficit') flags.push('needs_bowling');
      if (balance.fielding.status === 'deficit') flags.push('needs_fielding');
      if (balance.centreWicket.status === 'deficit') flags.push('low_centre_wicket');

      if (
        balance.scenario.status === 'surplus' &&
        (balance.batting.status === 'deficit' || balance.bowling.status === 'deficit')
      ) {
        flags.push('high_scenario');
      }
    }

    const isBalanced = flags.length === 0;

    return {
      playerId,
      isBalanced,
      hasInsufficientHistory,
      flags,
      balance,
      opportunityProfile
    };
  }
};
