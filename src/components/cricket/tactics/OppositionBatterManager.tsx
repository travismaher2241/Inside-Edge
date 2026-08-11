import React, { useState } from 'react';
import type { OppositionBatter, BattingHand } from '../../../types/cricket';
import type { BatterObservation, BatterTrait, EvidenceConfidence } from '../../../modules/cricket/tactics/types';
import { BATTER_TRAIT_CATEGORIES, getBatterTraitLabel } from '../../../modules/cricket/tactics/taxonomyLabels';
import { User, Plus, Trash2, Edit2, Info, Check, X } from 'lucide-react';

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

  // Form State for Batter
  const [batterName, setBatterName] = useState<string>('');
  const [batterHand, setBatterHand] = useState<BattingHand>('right');
  const [batterPosition, setBatterPosition] = useState<string>('');
  const [editingBatterId, setEditingBatterId] = useState<string | null>(null);

  // Form State for Observation
  const [obsTrait, setObsTrait] = useState<BatterTrait>('drives_away_from_body');
  const [obsConfidence, setObsConfidence] = useState<EvidenceConfidence>('medium');
  const [obsNote, setObsNote] = useState<string>('');
  const [obsSampleSize, setObsSampleSize] = useState<string>('');

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
    const size = parseInt(obsSampleSize, 10);
    const newObs: BatterObservation = {
      trait: obsTrait,
      confidence: obsConfidence,
      note: obsNote.trim() || undefined,
      sampleSize: !isNaN(size) ? size : undefined,
    };

    const existingObs = currentBatter.observations || [];
    // Replace if trait already observed, else append
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
    setObsSampleSize('');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header & Add Batter Button */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>STAGE 2: OPPOSITION BATTERS</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>
              Opposition Batter Profiles ({batters.length})
            </h2>
          </div>
          <button className="btn btn-gold" onClick={handleOpenAddBatter} style={{ width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.8rem' }}>
            <Plus size={16} /> ADD BATTER
          </button>
        </div>

        {/* Guidance Callout */}
        <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '10px 12px', marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={14} /> Tactical Principles:
          </div>
          <div>• A strength is not automatically a weakness (e.g. strong drive becomes an opportunity only with edge evidence).</div>
          <div>• Low-confidence observations are exploratory; high confidence enables strongly tailored plans.</div>
          <div>• Recommended plans are structured suggestions; local conditions remain authoritative.</div>
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
                  {b.battingHand.toUpperCase()[0]}HB • {b.observations.length} Observations
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
                <span className="badge badge-gold">{currentBatter.battingHand === 'right' ? 'Right-Handed Batter (RHB)' : 'Left-Handed Batter (LHB)'}</span>
                <span className="badge badge-green">{currentBatter.observations.length} Traits Logged</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-secondary" onClick={() => handleOpenEditBatter(currentBatter)} style={{ width: 'auto', height: '34px', fontSize: '0.75rem' }}>
                <Edit2 size={14} /> EDIT
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
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)' }}>OBSERVED STRENGTHS & WEAKNESSES</span>
              <button
                onClick={() => setIsAddObsModalOpen(true)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> ADD OBSERVATION
              </button>
            </div>

            {(currentBatter.observations || []).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentBatter.observations.map((obs, i) => {
                  const confBadgeClass = obs.confidence === 'high' ? 'badge-green' : obs.confidence === 'medium' ? 'badge-gold' : 'badge-warning';
                  return (
                    <div key={i} style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>{getBatterTraitLabel(obs.trait)}</span>
                          <span className={`badge ${confBadgeClass}`} style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                            {obs.confidence} Confidence
                          </span>
                          {obs.sampleSize && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              n={obs.sampleSize} innings
                            </span>
                          )}
                        </div>
                        {obs.note && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '4px' }}>
                            Note: {obs.note}
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
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                No observations added for {currentBatter.name} yet. Click "+ ADD OBSERVATION" to record traits.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <User size={36} color="var(--accent-gold)" style={{ margin: '0 auto 8px auto' }} />
          <h3>No Opposition Batters Added</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Add opposition batters to generate tailored tactical plans.
          </p>
          <button className="btn btn-gold" onClick={handleOpenAddBatter} style={{ marginTop: '12px' }}>
            <Plus size={16} /> ADD FIRST OPPOSITION BATTER
          </button>
        </div>
      )}

      {/* Add / Edit Batter Modal */}
      {isAddBatterModalOpen && (
        <div className="bottom-sheet-overlay" onClick={() => setIsAddBatterModalOpen(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{editingBatterId ? 'Edit Batter' : 'Add Opposition Batter'}</div>
              <button onClick={() => setIsAddBatterModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>BATTER NAME</label>
              <input
                type="text"
                placeholder="e.g. Steven Smith"
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
                  RIGHT HAND (RHB)
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
                  LEFT HAND (LHB)
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>BATTING ORDER POSITION (Optional)</label>
              <input
                type="number"
                placeholder="e.g. 3"
                value={batterPosition}
                onChange={e => setBatterPosition(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              />
            </div>

            <button className="btn btn-gold" onClick={handleSaveBatterForm}>
              <Check size={16} /> SAVE BATTER PROFILE
            </button>
          </div>
        </div>
      )}

      {/* Add Observation Modal */}
      {isAddObsModalOpen && currentBatter && (
        <div className="bottom-sheet-overlay" onClick={() => setIsAddObsModalOpen(false)}>
          <div className="bottom-sheet-content" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Add Trait Observation: {currentBatter.name}</div>
              <button onClick={() => setIsAddObsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff' }}><X size={20} /></button>
            </div>

            {/* Trait Selection Grouped by Category */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SELECT TRAIT CATEGORY & OBSERVED TRAIT</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px', maxHeight: '240px', overflowY: 'auto', background: 'var(--bg-surface-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                {BATTER_TRAIT_CATEGORIES.map(cat => (
                  <div key={cat.name}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {cat.name}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '4px' }}>
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
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>EVIDENCE CONFIDENCE LEVEL</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {(['low', 'medium', 'high'] as EvidenceConfidence[]).map(conf => (
                  <button
                    key={conf}
                    type="button"
                    onClick={() => setObsConfidence(conf)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: obsConfidence === conf ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                      background: obsConfidence === conf ? 'var(--accent-gold-soft)' : 'var(--bg-surface-card)',
                      color: obsConfidence === conf ? 'var(--accent-gold)' : '#fff',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      fontSize: '0.75rem',
                    }}
                  >
                    {conf === 'low' && 'Weak / Hearsay'}
                    {conf === 'medium' && 'Trusted / One Innings'}
                    {conf === 'high' && 'High / Verified Data'}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Note */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>EVIDENCE NOTE (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Edged three times through gully against away swing in last 2 matches"
                value={obsNote}
                onChange={e => setObsNote(e.target.value)}
                style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px', fontSize: '0.8rem' }}
              />
            </div>

            {/* Optional Sample Size */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SAMPLE SIZE (Innings observed, Optional)</label>
              <input
                type="number"
                placeholder="e.g. 5"
                value={obsSampleSize}
                onChange={e => setObsSampleSize(e.target.value)}
                style={{ width: '100%', padding: '8px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px', fontSize: '0.8rem' }}
              />
            </div>

            <button className="btn btn-gold" onClick={handleAddObservation}>
              <Check size={16} /> SAVE TRAIT OBSERVATION
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
