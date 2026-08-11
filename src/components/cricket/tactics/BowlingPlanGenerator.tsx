import React, { useState } from 'react';
import type { Player, OppositionBatter, SavedTacticalPlan } from '../../../types/cricket';
import type { TacticalContext, FieldSpot, BowlingPlan } from '../../../modules/cricket/tactics/types';
import { rankBowlingPlans, type RankedPlan } from '../../../modules/cricket/tactics/recommendationEngine';
import { BowlerPlanCard } from './BowlerPlanCard';
import { User, AlertCircle } from 'lucide-react';

interface BowlingPlanGeneratorProps {
  matchId: string;
  selectedXI: Player[];
  batters: OppositionBatter[];
  context: TacticalContext;
  savedPlans: SavedTacticalPlan[];
  onSavePlan: (plan: SavedTacticalPlan) => void;
  onOpenFieldBoard: (bowler: Player, plan: BowlingPlan, positions: FieldSpot[]) => void;
}

export const BowlingPlanGenerator: React.FC<BowlingPlanGeneratorProps> = ({
  matchId,
  selectedXI,
  batters,
  context,
  savedPlans,
  onSavePlan,
  onOpenFieldBoard,
}) => {
  const [activeBatterId, setActiveBatterId] = useState<string>(batters[0]?.id || '');

  const availableBowlers = selectedXI.filter(p => p.bowlingStyle !== 'does_not_bowl');
  const activeBatter = batters.find(b => b.id === activeBatterId) || batters[0];

  if (!activeBatter) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
        <User size={36} color="var(--accent-gold)" style={{ margin: '0 auto 8px auto' }} />
        <h3>No Opposition Batter Selected</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Please complete Stage 2 (Opposition Batters) first to generate bowling plans.
        </p>
      </div>
    );
  }

  if (availableBowlers.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
        <AlertCircle size={36} color="#f97316" style={{ margin: '0 auto 8px auto' }} />
        <h3>No Available Bowlers in Selected XI</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          The selected XI contains no players with a active bowling style. Go to Stage 1 to select bowlers.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>STAGE 4: BOWLING PLANS & RECOMMENDATIONS</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>
              Tailored Plans ({availableBowlers.length} Bowlers)
            </h2>
          </div>
          <span className="badge badge-gold">
            {savedPlans.length} PLANNED
          </span>
        </div>
      </div>

      {/* Opposition Batter Selector Bar */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {batters.map(b => {
          const isSel = b.id === activeBatter.id;
          const batterPlans = savedPlans.filter(p => p.batterId === b.id);
          return (
            <button
              key={b.id}
              onClick={() => setActiveBatterId(b.id)}
              style={{
                minWidth: '130px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: isSel ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                background: isSel ? 'var(--accent-gold-soft)' : 'var(--bg-surface-card)',
                color: isSel ? 'var(--accent-gold)' : 'var(--text-main)',
                cursor: 'pointer',
                textAlign: 'left',
                flexShrink: 0,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>
                {b.battingOrderPosition ? `#${b.battingOrderPosition} ` : ''}{b.name}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {b.battingHand.toUpperCase()[0]}HB • {batterPlans.length}/{availableBowlers.length} Saved
              </div>
            </button>
          );
        })}
      </div>

      {/* Target Batter Banner */}
      <div className="card" style={{ padding: '12px', background: 'var(--bg-surface-elevated)' }}>
        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--accent-gold)' }}>
          Tactical Plans vs {activeBatter.name} ({activeBatter.battingHand.toUpperCase()[0]}HB)
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Format: {context.format.toUpperCase()} • Phase: {context.phase.replace('_', ' ').toUpperCase()} • Max Outside Circle: {context.maxFieldersOutsideCircle}
        </div>
      </div>

      {/* Bowler Plan Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {availableBowlers.map(bowler => {
          const bowlerProfile = {
            playerId: bowler.id,
            style: bowler.bowlingStyle,
            capabilities: bowler.capabilities || [],
            controlRating: bowler.controlRating || 3,
            availableVariations: bowler.availableVariations || [],
          };

          const batterContext: TacticalContext = {
            ...context,
            batterHand: activeBatter.battingHand,
          };

          const rankedPlans: RankedPlan[] = rankBowlingPlans(bowlerProfile, activeBatter.observations, batterContext);

          const saved = savedPlans.find(p => p.matchId === matchId && p.batterId === activeBatter.id && p.bowlerId === bowler.id);

          const handleAcceptPlan = (planId: string, presetId: string, positions: FieldSpot[], notes?: string) => {
            const topPlan = rankedPlans.find(r => r.plan.id === planId) || rankedPlans[0];
            const newSavedPlan: SavedTacticalPlan = {
              id: saved?.id || `plan-${Date.now()}-${bowler.id}`,
              matchId,
              batterId: activeBatter.id,
              bowlerId: bowler.id,
              planId,
              fieldPresetId: presetId,
              positions,
              captainNotes: notes,
              status: 'accepted',
              updatedAt: new Date().toISOString(),
              warnings: topPlan?.warnings || [],
            };
            onSavePlan(newSavedPlan);
          };

          return (
            <BowlerPlanCard
              key={bowler.id}
              bowler={bowler}
              batter={activeBatter}
              rankedPlans={rankedPlans}
              savedPlan={saved}
              onAcceptPlan={handleAcceptPlan}
              onOpenFieldBoard={onOpenFieldBoard}
            />
          );
        })}
      </div>
    </div>
  );
};
