import React, { useState } from 'react';
import type { Player } from '../../../types/cricket';
import type { BowlerCapability, TacticalPhase } from '../../../modules/cricket/tactics/types';
import { BOWLER_CAPABILITY_LABELS } from '../../../modules/cricket/tactics/taxonomyLabels';
import { Target, Edit2, Save } from 'lucide-react';

interface BowlingProfileEditorProps {
  player: Player;
  onSavePlayer: (player: Player) => void;
}

const ALL_PHASES: { phase: TacticalPhase; label: string }[] = [
  { phase: 'new_ball', label: 'New Ball' },
  { phase: 'powerplay', label: 'Powerplay' },
  { phase: 'middle_overs', label: 'Middle Overs' },
  { phase: 'old_ball', label: 'Old Ball' },
  { phase: 'death', label: 'Death Overs' },
  { phase: 'wicket_push', label: 'Wicket Push' },
  { phase: 'run_defence', label: 'Run Defence' },
];

export const BowlingProfileEditor: React.FC<BowlingProfileEditorProps> = ({ player, onSavePlayer }) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [controlRating, setControlRating] = useState<1 | 2 | 3 | 4 | 5>(player.controlRating || 3);
  const [selectedCapabilities, setSelectedCapabilities] = useState<BowlerCapability[]>(player.capabilities || []);
  const [selectedPhases, setSelectedPhases] = useState<TacticalPhase[]>(player.preferredPhases || []);
  const [variationsInput, setVariationsInput] = useState<string>((player.availableVariations || []).join(', '));
  const [tacticalNotes, setTacticalNotes] = useState<string>(player.tacticalNotes || '');

  // Do not display section for non-bowlers
  if (player.bowlingStyle === 'does_not_bowl') return null;

  const toggleCapability = (cap: BowlerCapability) => {
    setSelectedCapabilities(prev =>
      prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]
    );
  };

  const togglePhase = (phase: TacticalPhase) => {
    setSelectedPhases(prev =>
      prev.includes(phase) ? prev.filter(p => p !== phase) : [...prev, phase]
    );
  };

  const handleSave = () => {
    const variations = variationsInput
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);

    const updated: Player = {
      ...player,
      controlRating,
      capabilities: selectedCapabilities,
      preferredPhases: selectedPhases,
      availableVariations: variations,
      tacticalNotes: tacticalNotes.trim() || undefined,
    };

    onSavePlayer(updated);
    setIsEditing(false);
  };

  return (
    <div className="card" style={{ marginTop: '16px', borderLeft: '4px solid var(--accent-gold)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={18} color="var(--accent-gold)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
            BOWLING PROFILE & TACTICAL CAPABILITIES
          </span>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setIsEditing(!isEditing)}
          style={{ width: 'auto', padding: '0 10px', height: '32px', fontSize: '0.75rem' }}
        >
          {isEditing ? 'CANCEL' : <><Edit2 size={12} /> EDIT PROFILE</>}
        </button>
      </div>

      {!isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
          {/* Read-only view */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-surface-elevated)', padding: '8px 12px', borderRadius: '6px' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Control Rating:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} style={{ color: star <= (player.controlRating || 3) ? 'var(--accent-gold)' : 'var(--border-light)', fontSize: '1rem' }}>
                  ★
                </span>
              ))}
              <span style={{ marginLeft: '6px', fontWeight: 700 }}>({player.controlRating || 3}/5)</span>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Stated Capabilities:</div>
            {(player.capabilities || []).length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {player.capabilities?.map(cap => (
                  <span key={cap} className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
                    ✓ {BOWLER_CAPABILITY_LABELS[cap]?.label || cap}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No bowling capabilities selected yet. Click EDIT PROFILE to configure.</div>
            )}
          </div>

          {player.availableVariations && player.availableVariations.length > 0 && (
            <div>
              <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Variations: </span>
              <span>{player.availableVariations.join(', ')}</span>
            </div>
          )}

          {player.preferredPhases && player.preferredPhases.length > 0 && (
            <div>
              <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Preferred Phases: </span>
              <span style={{ textTransform: 'capitalize' }}>{player.preferredPhases.map(p => p.replace('_', ' ')).join(', ')}</span>
            </div>
          )}

          {player.tacticalNotes && (
            <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: '6px', color: 'var(--text-main)' }}>
              <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>Notes: </span>
              {player.tacticalNotes}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Edit Form */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>CONTROL RATING (1-5)</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setControlRating(rating as any)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: controlRating === rating ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                    background: controlRating === rating ? 'var(--accent-gold-soft)' : 'var(--bg-surface-card)',
                    color: controlRating === rating ? 'var(--accent-gold)' : '#fff',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {rating} ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              SELECT BOWLER CAPABILITIES
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px', maxHeight: '200px', overflowY: 'auto', background: 'var(--bg-surface-card)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
              {(Object.keys(BOWLER_CAPABILITY_LABELS) as BowlerCapability[]).map(cap => {
                const isSelected = selectedCapabilities.includes(cap);
                const info = BOWLER_CAPABILITY_LABELS[cap];
                return (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => toggleCapability(cap)}
                    style={{
                      textAlign: 'left',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: isSelected ? '1px solid var(--accent-gold)' : '1px solid transparent',
                      background: isSelected ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                      color: isSelected ? 'var(--accent-gold)' : 'var(--text-main)',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{isSelected ? '✓ ' : ''}{info.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PREFERRED INNINGS PHASES</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {ALL_PHASES.map(({ phase, label }) => {
                const isSel = selectedPhases.includes(phase);
                return (
                  <button
                    key={phase}
                    type="button"
                    onClick={() => togglePhase(phase)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: isSel ? '1px solid var(--primary-green-light)' : '1px solid var(--border-light)',
                      background: isSel ? 'var(--primary-green)' : 'var(--bg-surface-card)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isSel ? '✓ ' : ''}{label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>VARIATIONS (Comma-separated)</label>
            <input
              type="text"
              value={variationsInput}
              onChange={e => setVariationsInput(e.target.value)}
              placeholder="e.g. Outswing, Slower Ball, Yorker"
              style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', fontSize: '0.8rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>TACTICAL NOTES</label>
            <textarea
              rows={2}
              value={tacticalNotes}
              onChange={e => setTacticalNotes(e.target.value)}
              placeholder="e.g. Best bowling at new ball or early middle overs against left-handers"
              style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', fontSize: '0.8rem', resize: 'vertical' }}
            />
          </div>

          <button className="btn btn-gold" onClick={handleSave} style={{ marginTop: '4px' }}>
            <Save size={16} /> SAVE BOWLING PROFILE
          </button>
        </div>
      )}
    </div>
  );
};
