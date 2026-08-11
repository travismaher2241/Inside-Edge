// Interactive Match Creation Modal for Inside Edge (FR-015)

import React, { useState } from 'react';
import type { MatchRecord } from '../../types/cricket';
import { Calendar, MapPin, X, Plus, Trash2, Check, AlertTriangle } from 'lucide-react';

interface MatchCreationModalProps {
  onClose: () => void;
  onSaveMatch: (match: MatchRecord) => void;
}

const MATCH_FORMATS: MatchRecord['format'][] = [
  'T20',
  'One Day (40/50 Overs)',
  'Two Day',
  'Junior 20 Overs'
];

export const MatchCreationModal: React.FC<MatchCreationModalProps> = ({
  onClose,
  onSaveMatch
}) => {
  const [opponent, setOpponent] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [venue, setVenue] = useState<string>('Home Oval');
  const [format, setFormat] = useState<MatchRecord['format']>('T20');
  const [result, setResult] = useState<string>('');

  // Pre-Match Plan
  const [teamObjectives, setTeamObjectives] = useState<string[]>([
    'Hold line outside off stump early',
    'Zero dropped catches in inner ring'
  ]);
  const [newObjText, setNewObjText] = useState<string>('');
  const [battingNotes, setBattingNotes] = useState<string>('Build partnerships early; target spin down the ground.');
  const [bowlingNotes, setBowlingNotes] = useState<string>('Bowl stump to stump in Powerplay; execute slower ball bouncers.');
  const [fieldingFocus, setFieldingFocus] = useState<string>('Aggressive inner-ring positioning; clean relay throws.');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddObjective = () => {
    const trimmed = newObjText.trim();
    if (!trimmed) return;
    if (teamObjectives.length >= 3) {
      setErrorMessage('Maximum 3 team objectives permitted.');
      return;
    }
    setTeamObjectives([...teamObjectives, trimmed]);
    setNewObjText('');
    setErrorMessage(null);
  };

  const handleRemoveObjective = (index: number) => {
    setTeamObjectives(teamObjectives.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!opponent.trim()) {
      setErrorMessage('Please enter an opponent club/team name.');
      return;
    }

    if (!venue.trim()) {
      setErrorMessage('Please enter a match venue.');
      return;
    }

    const newMatch: MatchRecord = {
      id: `match-${Date.now()}`,
      opponent: opponent.trim(),
      date,
      venue: venue.trim(),
      format,
      result: result.trim() || undefined,
      preMatchPlan: {
        teamObjectives: teamObjectives.length > 0 ? teamObjectives : ['Play disciplined cricket'],
        battingNotes: battingNotes.trim() || 'Focus on basic ball watching.',
        bowlingNotes: bowlingNotes.trim() || 'Stump-to-stump accuracy.',
        fieldingFocus: fieldingFocus.trim() || 'Clean picking and loud communication.'
      }
    };

    onSaveMatch(newMatch);
    onClose();
  };

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div
        className="bottom-sheet-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '640px', padding: '20px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: '0.5px' }}>
              MATCH FIXTURE & PRE-MATCH PLAN
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Add New Match</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{ background: 'var(--status-warning-bg)', border: '1px solid rgba(231, 111, 81, 0.4)', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span style={{ flex: 1 }}>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: '#f97316', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              OPPONENT NAME
            </label>
            <input
              type="text"
              value={opponent}
              onChange={e => setOpponent(e.target.value)}
              placeholder="e.g. Camberwell Magpies CC"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-main)',
                fontSize: '0.9rem'
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <Calendar size={14} /> MATCH DATE
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <MapPin size={14} /> VENUE
              </label>
              <input
                type="text"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Camberwell Sports Ground"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-gold)', display: 'block', marginBottom: '6px' }}>
              MATCH FORMAT
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {MATCH_FORMATS.map(fmt => (
                <button
                  type="button"
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: format === fmt ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                    background: format === fmt ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                    color: format === fmt ? 'var(--accent-gold)' : 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              MATCH RESULT (Optional / Leave blank if upcoming)
            </label>
            <input
              type="text"
              value={result}
              onChange={e => setResult(e.target.value)}
              placeholder="e.g. Won by 24 runs (or leave empty if future match)"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-main)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Pre-Match Plan Section */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
              PRE-MATCH STRATEGY PLAN
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                TEAM OBJECTIVES (1-3)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px' }}>
                {teamObjectives.map((obj, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-surface-card)', borderRadius: '6px', fontSize: '0.8rem' }}>
                    <span>🎯 {obj}</span>
                    <button type="button" onClick={() => handleRemoveObjective(idx)} style={{ background: 'none', border: 'none', color: '#f97316', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {teamObjectives.length < 3 && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={newObjText}
                    onChange={e => setNewObjText(e.target.value)}
                    placeholder="Add team objective..."
                    style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-card)', color: '#fff', fontSize: '0.8rem' }}
                  />
                  <button type="button" onClick={handleAddObjective} className="btn btn-secondary" style={{ width: 'auto', padding: '0 10px', height: '32px', fontSize: '0.75rem' }}>
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                BATTING NOTES
              </label>
              <input
                type="text"
                value={battingNotes}
                onChange={e => setBattingNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-card)', color: '#fff', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                BOWLING NOTES
              </label>
              <input
                type="text"
                value={bowlingNotes}
                onChange={e => setBowlingNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-card)', color: '#fff', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                FIELDING FOCUS
              </label>
              <input
                type="text"
                value={fieldingFocus}
                onChange={e => setFieldingFocus(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-card)', color: '#fff', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              CANCEL
            </button>
            <button type="submit" className="btn btn-gold" style={{ flex: 2 }}>
              <Check size={16} /> SAVE MATCH FIXTURE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
