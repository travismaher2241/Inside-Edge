import React, { useState } from 'react';
import type { Player, OppositionBatter, SavedTacticalPlan } from '../../../types/cricket';
import type { RankedPlan } from '../../../modules/cricket/tactics/recommendationEngine';
import type { FieldSpot } from '../../../modules/cricket/tactics/types';
import { TACTICAL_FIELD_PRESETS, fieldForBatterHand } from '../../../modules/cricket/tactics/fieldPresets';
import { TacticalFieldPreview } from './TacticalFieldPreview';
import { getBowlingStyleLabel } from '../../../modules/cricket/taxonomy';
import { Check, AlertTriangle, Edit3, MessageSquare, RefreshCw } from 'lucide-react';

interface BowlerPlanCardProps {
  bowler: Player;
  batter: OppositionBatter;
  rankedPlans: RankedPlan[];
  savedPlan?: SavedTacticalPlan;
  onAcceptPlan: (planId: string, presetId: string, positions: FieldSpot[], notes?: string) => void;
  onOpenFieldBoard: (bowler: Player, plan: RankedPlan['plan'], positions: FieldSpot[]) => void;
}

export const BowlerPlanCard: React.FC<BowlerPlanCardProps> = ({
  bowler,
  batter,
  rankedPlans,
  savedPlan,
  onAcceptPlan,
  onOpenFieldBoard,
}) => {
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number>(0);
  const [captainNotes, setCaptainNotes] = useState<string>(savedPlan?.captainNotes || '');
  const [isNoteInputOpen, setIsNoteInputOpen] = useState<boolean>(false);

  const currentRanked = rankedPlans[selectedPlanIndex] || rankedPlans[0];
  if (!currentRanked) return null;

  const plan = currentRanked.plan;
  const rawPreset = TACTICAL_FIELD_PRESETS.find(p => p.id === plan.fieldPresetId) || TACTICAL_FIELD_PRESETS[0];
  const activePreset = fieldForBatterHand(rawPreset, batter.battingHand);

  // If saved plan has custom positions, use them, otherwise use activePreset positions
  const currentPositions = (savedPlan && savedPlan.planId === plan.id && savedPlan.positions.length === 10)
    ? savedPlan.positions
    : activePreset.positions;

  const isAccepted = savedPlan?.status === 'accepted' || savedPlan?.status === 'edited';

  const getIntentBadge = (intent: string) => {
    switch (intent) {
      case 'attack': return { label: 'ATTACK', class: 'badge-gold' };
      case 'pressure': return { label: 'PRESSURE', class: 'badge-green' };
      case 'contain': return { label: 'CONTAIN', class: 'badge-warning' };
      case 'boundary_defence': return { label: 'BOUNDARY DEFENCE', class: 'badge-live' };
      default: return { label: intent.toUpperCase(), class: 'badge-gold' };
    }
  };

  const intentBadge = getIntentBadge(plan.intent);

  const handleToggleAlternative = () => {
    if (rankedPlans.length <= 1) return;
    setSelectedPlanIndex(prev => (prev + 1) % rankedPlans.length);
  };

  const handleAccept = () => {
    onAcceptPlan(plan.id, rawPreset.id, currentPositions, captainNotes.trim() || undefined);
  };

  return (
    <div className="card" style={{ borderLeft: isAccepted ? '4px solid var(--primary-green-light)' : '4px solid var(--accent-gold)' }}>
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{bowler.name}</span>
            <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>{getBowlingStyleLabel(bowler.bowlingStyle)}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            vs {batter.name} ({batter.battingHand.toUpperCase()[0]}HB)
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className={`badge ${intentBadge.class}`}>{intentBadge.label}</span>
          {isAccepted && <span className="badge badge-green">✓ SAVED PLAN</span>}
        </div>
      </div>

      {/* Plan Title & Recommendation Summary */}
      <div style={{ marginTop: '12px', background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: '8px' }}>
        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-gold)' }}>
          {plan.title} {currentRanked.isFallback && '(Stock-Ball Fallback)'}
        </div>

        {/* Why it fits / Reasons */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '6px', lineHeight: 1.4 }}>
          <strong>Why it fits: </strong>{plan.rationale}
        </div>

        {currentRanked.reasons.length > 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginTop: '4px' }}>
            ✓ {currentRanked.reasons.join(' • ')}
          </div>
        )}
      </div>

      {/* Warnings */}
      {currentRanked.warnings.length > 0 && (
        <div style={{ background: 'rgba(231, 111, 81, 0.12)', border: '1px solid rgba(231, 111, 81, 0.4)', borderRadius: '6px', padding: '8px 10px', marginTop: '8px', fontSize: '0.75rem', color: '#f97316', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {currentRanked.warnings.map((w, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={12} />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Target Line & Length & Delivery Sequence */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
        <div style={{ background: 'var(--bg-surface-card)', border: '1px solid var(--border-light)', padding: '8px 10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-gold)' }}>TARGET LINE</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '2px' }}>{plan.line}</div>
        </div>

        <div style={{ background: 'var(--bg-surface-card)', border: '1px solid var(--border-light)', padding: '8px 10px', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-gold)' }}>TARGET LENGTH</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '2px' }}>{plan.length}</div>
        </div>
      </div>

      {/* Delivery Sequence */}
      <div style={{ marginTop: '8px', background: 'var(--bg-surface-card)', border: '1px solid var(--border-light)', padding: '8px 10px', borderRadius: '6px' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-gold)' }}>DELIVERY SEQUENCE (2-3 BALL PATTERN)</div>
        <ol style={{ paddingLeft: '16px', margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {plan.sequence.map((seq, i) => (
            <li key={i}>{seq}</li>
          ))}
        </ol>
      </div>

      {/* Dismissal Routes & Misses Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px', fontSize: '0.78rem' }}>
        <div style={{ background: 'var(--bg-surface-card)', padding: '8px 10px', borderRadius: '6px' }}>
          <div style={{ fontWeight: 700, color: 'var(--primary-green-light)', fontSize: '0.7rem' }}>PRIMARY DISMISSAL ROUTES</div>
          <ul style={{ paddingLeft: '14px', margin: '4px 0 0 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {plan.dismissalRoutes.map((route, i) => (
              <li key={i}>{route}</li>
            ))}
          </ul>
        </div>

        <div style={{ background: 'var(--bg-surface-card)', padding: '8px 10px', borderRadius: '6px' }}>
          <div style={{ fontWeight: 700, color: '#f97316', fontSize: '0.7rem' }}>DANGEROUS MISS / EXECUTION RISK</div>
          <div style={{ marginTop: '2px', color: 'var(--text-secondary)' }}>{plan.executionRisk}</div>
          <div style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '0.7rem', marginTop: '6px' }}>PROTECTED MISS</div>
          <div style={{ color: 'var(--text-secondary)' }}>{plan.scoringAreasConceded.join(', ')}</div>
        </div>
      </div>

      {/* Change Triggers */}
      <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>Change Triggers: </span>
        {plan.changeTriggers.join(' • ')}
      </div>

      {/* Visual Field Preview Thumbnail */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '8px' }}>
        <div style={{ flex: 1, paddingRight: '10px' }}>
          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--accent-gold)' }}>
            FIELD PRESET: {rawPreset.name}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            1 Keeper + 9 Fielders ({currentPositions.filter(p => p.depth === 'outfield' || p.depth === 'boundary').length} outside circle)
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => onOpenFieldBoard(bowler, plan, currentPositions)}
            style={{ width: 'auto', padding: '0 10px', height: '30px', fontSize: '0.72rem', marginTop: '8px' }}
          >
            <Edit3 size={12} /> INTERACTIVE FIELD BOARD
          </button>
        </div>

        <TacticalFieldPreview positions={currentPositions} batterHand={batter.battingHand} width={100} height={100} />
      </div>

      {/* Captain Notes Input drawer */}
      {isNoteInputOpen && (
        <div style={{ marginTop: '8px' }}>
          <input
            type="text"
            placeholder="Add captain note for this bowler vs batter..."
            value={captainNotes}
            onChange={e => setCaptainNotes(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', fontSize: '0.8rem' }}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
        <button
          className="btn btn-gold"
          onClick={handleAccept}
          style={{ flex: 1, height: '36px', fontSize: '0.78rem' }}
        >
          <Check size={14} /> ACCEPT PLAN
        </button>

        {rankedPlans.length > 1 && (
          <button
            className="btn btn-secondary"
            onClick={handleToggleAlternative}
            style={{ width: 'auto', padding: '0 10px', height: '36px', fontSize: '0.75rem' }}
          >
            <RefreshCw size={12} /> ALTERNATIVE ({selectedPlanIndex + 1}/{rankedPlans.length})
          </button>
        )}

        <button
          className="btn btn-secondary"
          onClick={() => setIsNoteInputOpen(!isNoteInputOpen)}
          style={{ width: 'auto', padding: '0 10px', height: '36px', fontSize: '0.75rem' }}
        >
          <MessageSquare size={12} /> {captainNotes ? 'NOTE ADDED' : 'NOTE'}
        </button>
      </div>
    </div>
  );
};
