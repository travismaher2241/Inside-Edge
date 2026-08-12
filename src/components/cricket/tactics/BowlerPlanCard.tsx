import React, { useState } from 'react';
import type { Player, OppositionBatter, SavedTacticalPlan } from '../../../types/cricket';
import type { RankedPlan } from '../../../modules/cricket/tactics/recommendationEngine';
import type { FieldSpot } from '../../../modules/cricket/tactics/types';
import { TACTICAL_FIELD_PRESETS, fieldForBatterHand } from '../../../modules/cricket/tactics/fieldPresets';
import { TacticalFieldPreview } from './TacticalFieldPreview';
import { getBowlingStyleLabel } from '../../../modules/cricket/taxonomy';
import { Check, Edit3, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [showRationale, setShowRationale] = useState<boolean>(false);
  const [showAlternativesModal, setShowAlternativesModal] = useState<boolean>(false);

  const currentRanked = rankedPlans[selectedPlanIndex] || rankedPlans[0];
  if (!currentRanked) return null;

  const plan = currentRanked.plan;
  const rawPreset = TACTICAL_FIELD_PRESETS.find(p => p.id === plan.fieldPresetId) || TACTICAL_FIELD_PRESETS[0];
  const activePreset = fieldForBatterHand(rawPreset, batter.battingHand);

  const currentPositions = (savedPlan && savedPlan.planId === plan.id && savedPlan.positions.length === 10)
    ? savedPlan.positions
    : activePreset.positions;

  const isAccepted = savedPlan?.status === 'accepted' || savedPlan?.status === 'edited';

  const handleAccept = () => {
    onAcceptPlan(plan.id, rawPreset.id, currentPositions, captainNotes.trim() || undefined);
  };

  return (
    <div className="card" style={{ borderLeft: isAccepted ? '4px solid var(--primary-green-light)' : '4px solid var(--accent-gold)' }}>
      {/* Compact Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
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
          {isAccepted ? (
            <span className="badge badge-green" style={{ fontSize: '0.75rem', fontWeight: 800 }}>✓ Plan Accepted</span>
          ) : (
            <span className="badge badge-gold">Recommended Plan</span>
          )}
        </div>
      </div>

      {/* Recommended Plan Summary */}
      <div style={{ marginTop: '10px', background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: '8px' }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-gold)' }}>
          {plan.title}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '4px' }}>
          <strong>Bowling:</strong> {plan.line} · {plan.length}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '2px' }}>
          <strong>Field:</strong> {rawPreset.name}
        </div>
      </div>

      {/* Collapsible Rationale Drawer */}
      <div style={{ marginTop: '8px' }}>
        <button
          onClick={() => setShowRationale(!showRationale)}
          style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          Why this plan? {showRationale ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showRationale && (
          <div style={{ background: 'var(--bg-surface-card)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '10px', marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div><strong style={{ color: 'var(--text-main)' }}>Plan Intent:</strong> {plan.rationale}</div>
            {plan.changeTriggers.length > 0 && (
              <div><strong style={{ color: 'var(--text-main)' }}>Change if:</strong> {plan.changeTriggers[0]}</div>
            )}
          </div>
        )}
      </div>

      {/* Visual Field Preview & Board Trigger */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: '8px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-main)' }}>
            Field Board ({currentPositions.filter(p => p.depth === 'outfield' || p.depth === 'boundary').length} outside circle)
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => onOpenFieldBoard(bowler, plan, currentPositions)}
            style={{ width: 'auto', padding: '0 8px', height: '28px', fontSize: '0.7rem', marginTop: '6px' }}
          >
            <Edit3 size={12} /> View Field Board
          </button>
        </div>

        <TacticalFieldPreview positions={currentPositions} batterHand={batter.battingHand} width={80} height={80} />
      </div>

      {/* Captain Notes Input Drawer */}
      {isNoteInputOpen && (
        <div style={{ marginTop: '8px' }}>
          <input
            type="text"
            placeholder="Add coach note for this bowler..."
            value={captainNotes}
            onChange={e => setCaptainNotes(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', fontSize: '0.8rem' }}
          />
        </div>
      )}

      {/* Primary Action Buttons */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
        <button
          className={isAccepted ? "btn btn-secondary" : "btn btn-gold"}
          onClick={handleAccept}
          style={{ flex: 2, height: '36px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Check size={16} /> {isAccepted ? '✓ Plan Accepted' : 'Accept Plan'}
        </button>

        {rankedPlans.length > 1 && (
          <button
            className="btn btn-secondary"
            onClick={() => setShowAlternativesModal(true)}
            style={{ flex: 1, height: '36px', fontSize: '0.75rem' }}
          >
            View Alternatives ({rankedPlans.length})
          </button>
        )}

        <button
          className="btn btn-secondary"
          onClick={() => setIsNoteInputOpen(!isNoteInputOpen)}
          style={{ width: 'auto', padding: '0 10px', height: '36px', fontSize: '0.75rem' }}
        >
          <MessageSquare size={12} /> {captainNotes ? 'Note Added' : '+ Add Note'}
        </button>
      </div>

      {/* Alternatives Modal */}
      {showAlternativesModal && (
        <div className="bottom-sheet-overlay" onClick={() => setShowAlternativesModal(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '12px' }}>
              TACTICAL ALTERNATIVES — {bowler.name} vs {batter.name}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rankedPlans.map((rp, idx) => (
                <div
                  key={rp.plan.id}
                  onClick={() => {
                    setSelectedPlanIndex(idx);
                    setShowAlternativesModal(false);
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: idx === selectedPlanIndex ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                    background: idx === selectedPlanIndex ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                    Option {idx + 1}: {rp.plan.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {rp.plan.line} · {rp.plan.length}
                  </div>
                </div>
              ))}
            </div>

            <button className="btn btn-secondary" onClick={() => setShowAlternativesModal(false)} style={{ marginTop: '14px' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
