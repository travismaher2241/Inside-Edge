import React, { useState } from 'react';
import type { CompetitionRulesProfile } from '../../../types/cricket';
import type { TacticalContext, TacticalPhase, TacticalFormat, FieldSide } from '../../../modules/cricket/tactics/types';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface RulesProfileSelectorProps {
  profiles: CompetitionRulesProfile[];
  selectedProfileId: string;
  onSelectProfileId: (id: string) => void;
  context: TacticalContext;
  onUpdateContext: (updatedContext: TacticalContext) => void;
}

const PHASES: { phase: TacticalPhase; label: string }[] = [
  { phase: 'new_ball', label: 'New Ball (Overs 1-10)' },
  { phase: 'powerplay', label: 'Powerplay' },
  { phase: 'middle_overs', label: 'Middle Overs' },
  { phase: 'old_ball', label: 'Old / Reversing Ball' },
  { phase: 'death', label: 'Death Overs / Final Phase' },
  { phase: 'wicket_push', label: 'Wicket Push' },
  { phase: 'run_defence', label: 'Run Defence / Target Rush' },
];

export const RulesProfileSelector: React.FC<RulesProfileSelectorProps> = ({
  profiles,
  selectedProfileId,
  onSelectProfileId,
  context,
  onUpdateContext,
}) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const activeProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];

  const handleProfileChange = (profileId: string) => {
    onSelectProfileId(profileId);
    const target = profiles.find(p => p.id === profileId);
    if (target) {
      let tacticalFormat: TacticalFormat = 't20';
      if (target.format === 'one_day_40' || target.format === 'one_day_50') tacticalFormat = 'one_day';
      if (target.format === 'two_day') tacticalFormat = 'multi_day';

      const firstPhaseLimit = target.phases[0]?.maxOutsideCircle ?? 2;
      onUpdateContext({
        ...context,
        format: tacticalFormat,
        maxFieldersOutsideCircle: firstPhaseLimit,
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)' }}>CONDITIONS</div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>
          Match Format & Ground Conditions
        </h2>
      </div>

      {/* Primary Match Conditions Grid */}
      <div className="card">
        <div className="card-title" style={{ fontSize: '0.95rem' }}>
          <span>CORE CONDITIONS</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginTop: '8px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>MATCH FORMAT</label>
            <select
              value={context.format}
              onChange={e => onUpdateContext({ ...context, format: e.target.value as TacticalFormat })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', fontSize: '0.8rem' }}
            >
              <option value="t20">T20 (20 Overs)</option>
              <option value="one_day">One-Day (40/50 Overs)</option>
              <option value="multi_day">Two-Day / Red Ball</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PITCH CONDITION</label>
            <select
              value={context.pitch || 'seaming'}
              onChange={e => onUpdateContext({ ...context, pitch: e.target.value as any })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', fontSize: '0.8rem' }}
            >
              <option value="seaming">Seaming / Grass</option>
              <option value="bouncy">Hard / Bouncy</option>
              <option value="slow">Slow / Two-Paced</option>
              <option value="turning">Turning / Dry</option>
              <option value="flat">Flat / True</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>BALL CONDITION</label>
            <select
              value={context.ball || 'new'}
              onChange={e => onUpdateContext({ ...context, ball: e.target.value as any })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', fontSize: '0.8rem' }}
            >
              <option value="new">New Ball</option>
              <option value="used">Used Ball (10-30 overs)</option>
              <option value="old">Old / Reverse</option>
              <option value="wet">Wet Ball</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>BOUNDARIES</label>
            <select
              value={context.shortBoundarySide || 'straight'}
              onChange={e => onUpdateContext({ ...context, shortBoundarySide: e.target.value as FieldSide })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', fontSize: '0.8rem' }}
            >
              <option value="straight">Symmetrical</option>
              <option value="off">Short Off Side</option>
              <option value="leg">Short Leg Side</option>
            </select>
          </div>
        </div>

        {/* Competition Rules Checkbox */}
        <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-gold)', padding: '10px 12px', borderRadius: '8px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            id="confirmLocalRules"
            checked={context.localRulesConfirmed}
            onChange={e => onUpdateContext({ ...context, localRulesConfirmed: e.target.checked })}
            style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
          />
          <label htmlFor="confirmLocalRules" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-gold)', cursor: 'pointer' }}>
            COMPETITION RULES: Local fielding restrictions and grade safety rules checked
          </label>
        </div>
      </div>

      {/* Fielding Rules */}
      <div className="card">
        <div className="card-title" style={{ fontSize: '0.95rem' }}>
          <span>FIELDING RULES</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PHASE</label>
            <select
              value={context.phase}
              onChange={e => onUpdateContext({ ...context, phase: e.target.value as TacticalPhase })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', fontSize: '0.8rem' }}
            >
              {PHASES.map(ph => (
                <option key={ph.phase} value={ph.phase}>{ph.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>MAX OUTSIDE CIRCLE</label>
            <select
              value={context.maxFieldersOutsideCircle}
              onChange={e => onUpdateContext({ ...context, maxFieldersOutsideCircle: parseInt(e.target.value, 10) })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', fontSize: '0.8rem' }}
            >
              {[2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <option key={num} value={num}>{num} Fielders Max</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Conditions (Collapsible) */}
      <div className="card" style={{ padding: '12px' }}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
        >
          <span>ADVANCED CONDITIONS & RULE PROFILES</span>
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showAdvanced && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>COMPETITION RULE PROFILE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
              {profiles.map(p => {
                const isSel = p.id === activeProfile?.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleProfileChange(p.id)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: isSel ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                      background: isSel ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                      color: isSel ? 'var(--accent-gold)' : '#fff',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{p.name}</div>
                    <div style={{ fontSize: '0.7modal', color: 'var(--text-secondary)', marginTop: '2px' }}>{p.inningsOvers} Overs</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
