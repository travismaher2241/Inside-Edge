import type {
  PlayerSessionOpportunityRecord,
  PlayerOpportunityProfile,
  FairnessCategoryBalance,
  FairnessCategoryResult,
  FairnessFlag,
  PlayerFairnessAssessment,
  ClubTrainingSession,
  Player
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
   * Reads the actual rotationPlan to compute exact minutes per player.
   */
  generateSessionOpportunityRecords(
    session: ClubTrainingSession,
    players?: Player[]
  ): PlayerSessionOpportunityRecord[] {
    const completedAt = session.completedAt || new Date().toISOString();
    const defaultTeamId = session.includedTeamIds[0] || 'default_team';
    const playerMap = new Map<string, Player>((players || []).map(p => [p.id, p]));

    const hasRotationPlan = session.rotationPlan && session.rotationPlan.length > 0;

    // Maps for actual player participation
    const playerBattingMinutes = new Map<string, number>();
    const playerBowlingMinutes = new Map<string, number>();
    const playerFieldingMinutes = new Map<string, number>();
    const playerNetMinutes = new Map<string, number>();
    const playerCentreWicketMinutes = new Map<string, number>();
    const playerScenarioMinutes = new Map<string, number>();

    if (hasRotationPlan) {
      session.rotationPlan.forEach(block => {
        const dur = block.durationMinutes;
        block.resourceAssignments.forEach(res => {
          const isCw = res.centreWicketScenario != null ||
            res.resourceName.toLowerCase().includes('centre') ||
            res.resourceName.toLowerCase().includes('center');
          const isNet = !isCw && (
            res.resourceName.toLowerCase().includes('net') ||
            ['standard_net', 'spin_net', 'pace_new_ball_net', 'bowling_machine_net'].some(t => res.resourceId.includes(t))
          );

          res.batterPlayerIds.forEach(id => {
            playerBattingMinutes.set(id, (playerBattingMinutes.get(id) || 0) + dur);
            if (isNet) playerNetMinutes.set(id, (playerNetMinutes.get(id) || 0) + dur);
            if (isCw) {
              playerCentreWicketMinutes.set(id, (playerCentreWicketMinutes.get(id) || 0) + dur);
              playerScenarioMinutes.set(id, (playerScenarioMinutes.get(id) || 0) + dur);
            }
          });

          res.bowlerPodPlayerIds.forEach(id => {
            playerBowlingMinutes.set(id, (playerBowlingMinutes.get(id) || 0) + dur);
            if (isNet) playerNetMinutes.set(id, (playerNetMinutes.get(id) || 0) + dur);
            if (isCw) {
              playerCentreWicketMinutes.set(id, (playerCentreWicketMinutes.get(id) || 0) + dur);
              playerScenarioMinutes.set(id, (playerScenarioMinutes.get(id) || 0) + dur);
            }
          });

          res.wicketkeeperPlayerIds.forEach(id => {
            if (isNet) playerNetMinutes.set(id, (playerNetMinutes.get(id) || 0) + dur);
            if (isCw) {
              playerCentreWicketMinutes.set(id, (playerCentreWicketMinutes.get(id) || 0) + dur);
            }
          });

          res.fieldingPlayerIds.forEach(id => {
            playerFieldingMinutes.set(id, (playerFieldingMinutes.get(id) || 0) + dur);
            if (isCw) {
              playerCentreWicketMinutes.set(id, (playerCentreWicketMinutes.get(id) || 0) + dur);
            }
          });
        });
      });
    } else {
      // Fallback if no rotationPlan exists
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

      session.expectedPlayerIds.forEach(id => {
        playerBattingMinutes.set(id, totalBattingMins);
        playerBowlingMinutes.set(id, totalBowlingMins);
        playerFieldingMinutes.set(id, totalFieldingMins);
        playerNetMinutes.set(id, totalNetMins);
        playerCentreWicketMinutes.set(id, totalCentreWicketMins);
        playerScenarioMinutes.set(id, totalScenarioMins);
      });
    }

    const records: PlayerSessionOpportunityRecord[] = session.expectedPlayerIds.map(playerId => {
      const attended = session.confirmedAttendingPlayerIds.includes(playerId);
      const playerObj = playerMap.get(playerId);
      const teamId = playerObj?.primaryTeamId || defaultTeamId;

      const batting = attended ? (playerBattingMinutes.get(playerId) || 0) : 0;
      const bowling = attended ? (playerBowlingMinutes.get(playerId) || 0) : 0;
      const fielding = attended ? (playerFieldingMinutes.get(playerId) || 0) : 0;
      const netMins = attended ? (playerNetMinutes.get(playerId) || 0) : 0;
      const cwMins = attended ? (playerCentreWicketMinutes.get(playerId) || 0) : 0;
      const scMins = attended ? (playerScenarioMinutes.get(playerId) || 0) : 0;

      return {
        id: `opp_${session.id}_${playerId}`,
        sessionId: session.id,
        teamId,
        playerId,
        completedAt,
        attended,
        totalActiveMinutes: batting + bowling + fielding,
        battingMinutes: batting,
        bowlingMinutes: bowling,
        fieldingMinutes: fielding,
        netMinutes: netMins,
        centreWicketMinutes: cwMins,
        scenarioMinutes: scMins,
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
