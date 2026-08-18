import React, { useState } from 'react';
import type { OppositionBatter, BattingHand } from '../../../types/cricket';
import type { BatterObservation, BatterTrait, EvidenceConfidence } from '../../../modules/cricket/tactics/types';
import { BATTER_TRAIT_CATEGORIES, getBatterTraitLabel } from '../../../modules/cricket/tactics/taxonomyLabels';
import { Plus, Trash2, Edit2, Info, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

interface OppositionBatterManagerProps {
  matchId: string;
  batters: OppositionBatter[];
  onSaveBatter: (batter: OppositionBatter) => void;
  onDeleteBatter: (id: string) => void;
}

export const OppositionBatterManager: React.FC<OppositionBatterManagerProps> = ({
  matchId,
  batters,
  onSaveBatter,
  onDeleteBatter,
}) => {
  const [activeBatterId, setActiveBatterId] = useState<string | null>(batters[0]?.id || null);
  const [isAddBatterModalOpen, setIsAddBatterModalOpen] = useState<boolean>(false);
  const [isAddObsModalOpen, setIsAddObsModalOpen] = useState<boolean>(false);
  const [showTacticalPrinciples, setShowTacticalPrinciples] = useState<boolean>(false);

  // Form State for Batter
  const [batterName, setBatterName] = useState<string>('');
  const [batterHand, setBatterHand] = useState<BattingHand>('right');
  const [batterPosition, setBatterPosition] = useState<string>('');
  const [editingBatterId, setEditingBatterId] = useState<string | null>(null);

  // Form State for Observation
  const [obsTrait, setObsTrait] = useState<BatterTrait>('drives_away_from_body');
  const [obsConfidence, setObsConfidence] = useState<EvidenceConfidence>('medium');
  const [obsNote, setObsNote] = useState<string>('');

  const currentBatter = batters.find(b => b.id === activeBatterId) || batters[0];

  const handleOpenAddBatter = () => {
    setEditingBatterId(null);
    setBatterName('');
    setBatterHand('right');
    setBatterPosition('');
    setIsAddBatterModalOpen(true);
  };

  const handleOpenEditBatter = (batter: OppositionBatter) => {
    setEditingBatterId(batter.id);
    setBatterName(batter.name);
    setBatterHand(batter.battingHand);
    setBatterPosition(batter.battingOrderPosition ? String(batter.battingOrderPosition) : '');
    setIsAddBatterModalOpen(true);
  };

  const handleSaveBatterForm = () => {
    if (!batterName.trim()) return;
    const pos = parseInt(batterPosition, 10);
    const newBatter: OppositionBatter = {
      id: editingBatterId || `op-bat-${Date.now()}`,
      matchId,
      name: batterName.trim(),
      battingHand: batterHand,
      battingOrderPosition: !isNaN(pos) ? pos : undefined,
      observations: editingBatterId
        ? (batters.find(b => b.id === editingBatterId)?.observations || [])
        : [],
    };
    onSaveBatter(newBatter);
    setActiveBatterId(newBatter.id);
    setIsAddBatterModalOpen(false);
  };

  const handleAddObservation = () => {
    if (!currentBatter) return;
    const newObs: BatterObservation = {
      trait: obsTrait,
      confidence: obsConfidence,
      note: obsNote.trim() || undefined,
    };

    const existingObs = currentBatter.observations || [];
    const idx = existingObs.findIndex(o => o.trait === obsTrait);
    let updatedObs = [...existingObs];
    if (idx !== -1) {
      updatedObs[idx] = newObs;
    } else {
      updatedObs.push(newObs);
    }

    const updatedBatter: OppositionBatter = {
      ...currentBatter,
      observations: updatedObs,
    };

    onSaveBatter(updatedBatter);
    setObsNote('');
    setIsAddObsModalOpen(false);
  };

  const handleRemoveObservation = (trait: BatterTrait) => {
    if (!currentBatter) return;
    const updatedBatter: OppositionBatter = {
      ...currentBatter,
      observations: (currentBatter.observations || []).filter(o => o.trait !== trait),
    };
    onSaveBatter(updatedBatter);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header & Add Batter Button */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
        <div className="flex-between">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)' }}>OPPONENT</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>
              Opposition Profiles ({batters.length})
            </h2>
          </div>
          <button className="btn btn-gold" onClick={handleOpenAddBatter} style={{ width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.8rem' }}>
            <Plus size={16} /> Add Batter
          </button>
        </div>

        {/* Collapsible Guidance Callout */}
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={() => setShowTacticalPrinciples(!showTacticalPrinciples)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Info size={14} /> Scouting Principles {showTacticalPrinciples ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showTacticalPrinciples && (
            <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '10px 12px', marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>• Strengths become opportunities when bowled in appropriate lines/lengths.</div>
              <div>• Low confidence notes explore tendencies; high confidence enables tailored bowling plans.</div>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Batter Selection Bar */}
      {batters.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {batters.map(b => {
            const isSel = b.id === currentBatter?.id;
            return (
              <button
                key={b.id}
                onClick={() => setActiveBatterId(b.id)}
                style={{
                  minWidth: '120px',
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
                <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                  {b.battingOrderPosition ? `#${b.battingOrderPosition} ` : ''}{b.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {b.battingHand.toUpperCase()[0]}HB • {b.observations.length} Note{b.observations.length === 1 ? '' : 's'}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Active Batter Detail Card */}
      {currentBatter ? (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {currentBatter.battingOrderPosition ? `#${currentBatter.battingOrderPosition} ` : ''}{currentBatter.name}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <span className="badge badge-gold">{currentBatter.battingHand === 'right' ? 'RHB' : 'LHB'}</span>
                {currentBatter.battingOrderPosition && (
                  <span className="badge badge-green">Position #{currentBatter.battingOrderPosition}</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-secondary" onClick={() => handleOpenEditBatter(currentBatter)} style={{ width: 'auto', height: '34px', fontSize: '0.75rem' }}>
                <Edit2 size={14} /> Edit
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => onDeleteBatter(currentBatter.id)}
                style={{ width: 'auto', height: '34px', fontSize: '0.75rem', color: '#f97316' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Observations List */}
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase' }}>Strengths & Weaknesses</span>
              <button
                onClick={() => setIsAddObsModalOpen(true)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> Add Observation
              </button>
            </div>

            {(currentBatter.observations || []).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentBatter.observations.map((obs, i) => {
                  const confBadgeClass = obs.confidence === 'high' ? 'badge-green' : obs.confidence === 'medium' ? 'badge-gold' : 'badge-warning';
                  const confLabel = obs.confidence === 'high' ? 'High Confidence' : obs.confidence === 'medium' ? 'Medium Confidence' : 'Low Confidence';
                  return (
                    <div key={i} style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>{getBatterTraitLabel(obs.trait)}</span>
                          <span className={`badge ${confBadgeClass}`} style={{ fontSize: '0.65rem' }}>
                            {confLabel}
                          </span>
                        </div>
                        {obs.note && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '4px' }}>
                            {obs.note}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemoveObservation(obs.trait)}
                        style={{ background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', padding: '2px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                No observations added yet. Click "+ Add Observation" to record traits.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>No Opposition Batters Added</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Add opposition batters to generate tailored bowling plans.
          </p>
          <button className="btn btn-gold" onClick={handleOpenAddBatter} style={{ marginTop: '12px' }}>
            <Plus size={16} /> Add Opposition Batter
          </button>
        </div>
      )}

      {/* Add / Edit Batter Modal */}
      {isAddBatterModalOpen && (
        <div className="bottom-sheet-overlay" onClick={() => setIsAddBatterModalOpen(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{editingBatterId ? 'Edit Batter' : 'ADD BATTER'}</div>
              <button onClick={() => setIsAddBatterModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>NAME</label>
              <input
                type="text"
                placeholder="Batter name"
                value={batterName}
                onChange={e => setBatterName(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>BATTING HAND</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setBatterHand('right')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: batterHand === 'right' ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                    background: batterHand === 'right' ? 'var(--accent-gold-soft)' : 'var(--bg-surface-card)',
                    color: batterHand === 'right' ? 'var(--accent-gold)' : '#fff',
                    fontWeight: 700,
                  }}
                >
                  RHB
                </button>
                <button
                  type="button"
                  onClick={() => setBatterHand('left')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: batterHand === 'left' ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                    background: batterHand === 'left' ? 'var(--accent-gold-soft)' : 'var(--bg-surface-card)',
                    color: batterHand === 'left' ? 'var(--accent-gold)' : '#fff',
                    fontWeight: 700,
                  }}
                >
                  LHB
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>BATTING POSITION (Optional)</label>
              <input
                type="number"
                placeholder="e.g. Opener / #3"
                value={batterPosition}
                onChange={e => setBatterPosition(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              />
            </div>

            <button className="btn btn-gold" onClick={handleSaveBatterForm}>
              <Check size={16} /> Save Batter
            </button>
          </div>
        </div>
      )}

      {/* Add Observation Modal */}
      {isAddObsModalOpen && currentBatter && (
        <div className="bottom-sheet-overlay" onClick={() => setIsAddObsModalOpen(false)}>
          <div className="bottom-sheet-content" style={{ maxHeight: '90vh', overflowY: 'auto', maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>WHAT DID YOU NOTICE?</div>
              <button onClick={() => setIsAddObsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff' }}><X size={20} /></button>
            </div>

            {/* Trait Selection Grouped by Category */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>OBSERVED TRAIT</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', maxHeight: '200px', overflowY: 'auto', background: 'var(--bg-surface-card)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                {BATTER_TRAIT_CATEGORIES.map(cat => (
                  <div key={cat.name}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {cat.name}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '4px' }}>
                      {cat.traits.map(t => {
                        const isSel = obsTrait === t.trait;
                        return (
                          <button
                            key={t.trait}
                            type="button"
                            onClick={() => setObsTrait(t.trait)}
                            style={{
                              textAlign: 'left',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: isSel ? '1px solid var(--accent-gold)' : '1px solid transparent',
                              background: isSel ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                              color: isSel ? 'var(--accent-gold)' : 'var(--text-main)',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ fontWeight: 700 }}>{isSel ? '✓ ' : ''}{t.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidence Selection */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>CONFIDENCE</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                {[
                  { conf: 'low' as const, label: 'LOW', sub: 'Limited info' },
                  { conf: 'medium' as const, label: 'MEDIUM', sub: 'Observed once' },
                  { conf: 'high' as const, label: 'HIGH', sub: 'Repeated' }
                ].map(({ conf, label, sub }) => (
                  <button
                    key={conf}
                    type="button"
                    onClick={() => setObsConfidence(conf)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: '6px',
                      border: obsConfidence === conf ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                      background: obsConfidence === conf ? 'var(--accent-gold-soft)' : 'var(--bg-surface-card)',
                      color: obsConfidence === conf ? 'var(--accent-gold)' : '#fff',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.75rem' }}>{label}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Note */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>NOTE (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Drives anything from the body"
                value={obsNote}
                onChange={e => setObsNote(e.target.value)}
                style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px', fontSize: '0.8rem' }}
              />
            </div>

            <button className="btn btn-gold" onClick={handleAddObservation}>
              <Check size={16} /> Save Observation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
