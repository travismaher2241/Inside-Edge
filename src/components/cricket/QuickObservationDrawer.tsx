// Quick Observation System Component (≤4s tap flow for live training ground use)

import React, { useState } from 'react';
import type { Player, ObservationTag, DevelopmentFocus, Observation } from '../../types/cricket';
import { OBSERVATION_TAGS } from '../../modules/cricket/taxonomy';
import { Check, X, Tag as TagIcon } from 'lucide-react';

interface QuickObservationDrawerProps {
  player: Player | null;
  developmentFocuses: DevelopmentFocus[];
  onClose: () => void;
  onSaveObservation: (observation: Omit<Observation, 'id' | 'timestamp'>) => void;
}

export const QuickObservationDrawer: React.FC<QuickObservationDrawerProps> = ({
  player,
  developmentFocuses,
  onClose,
  onSaveObservation
}) => {
  const [selectedTag, setSelectedTag] = useState<ObservationTag>('Good execution');
  const [noteText, setNoteText] = useState<string>('');
  const [selectedFocusId, setSelectedFocusId] = useState<string>('');

  if (!player) return null;

  const playerFocuses = developmentFocuses.filter(
    f => f.playerId === player.id && f.state !== 'Archived'
  );

  const handleSave = () => {
    onSaveObservation({
      playerId: player.id,
      source: 'training',
      tag: selectedTag,
      textNote: noteText || `${selectedTag} observed during session block.`,
      focusId: selectedFocusId || (playerFocuses[0]?.id)
    });
    onClose();
  };

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="quick-observation-title" className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
              QUICK PLAYER OBSERVATION
            </div>
            <div id="quick-observation-title" style={{ fontSize: '1.2rem', fontWeight: 800 }}>{player.name}</div>
          </div>
          <button
            aria-label="Close observation drawer"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Quick Observation Chips (1-tap selection) */}
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
          1. CHOOSE OBSERVATION TAG
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {OBSERVATION_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              style={{
                padding: '8px 14px',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: selectedTag === tag ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                background: selectedTag === tag ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                color: selectedTag === tag ? 'var(--accent-gold)' : 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all 0.1s ease'
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Link to Active Development Focus if available */}
        {playerFocuses.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TagIcon size={14} />
              2. LINK TO DEVELOPMENT FOCUS (OPTIONAL)
            </div>
            <select
              value={selectedFocusId}
              onChange={e => setSelectedFocusId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                background: 'var(--bg-surface-card)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                fontSize: '0.85rem'
              }}
            >
              <option value="">-- No specific focus link --</option>
              {playerFocuses.map(f => (
                <option key={f.id} value={f.id}>
                  [{f.domain}] {f.focusStatement} ({f.state})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Short Note Field */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            3. COACH NOTE (OPTIONAL)
          </div>
          <input
            type="text"
            placeholder="e.g. Left 4 consecutive balls outside off line cleanly"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--bg-surface-card)',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Submit Button */}
        <button className="btn btn-gold" onClick={handleSave} style={{ height: '48px', fontSize: '1rem' }}>
          <Check size={20} />
          RECORD OBSERVATION
        </button>
      </div>
    </div>
  );
};
