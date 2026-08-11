import React from 'react';
import type { CompetitionRulesProfile } from '../../../types/cricket';
import type { TacticalContext, TacticalPhase, TacticalFormat, FieldSide } from '../../../modules/cricket/tactics/types';
import { AlertCircle } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>STAGE 3: MATCH CONDITIONS & PLAYING RULES</div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>
          Competition Rules & Ground Context
        </h2>

        {/* Disclaimer Banner */}
        <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-gold)', borderRadius: '8px', padding: '10px 12px', marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} color="var(--accent-gold)" />
          <span>
            Preset playing conditions are default references. Umpires and actual local competition rules remain strictly authoritative.
          </span>
        </div>
      </div>

      {/* Select Competition Rules Profile */}
      <div className="card">
        <div className="card-title" style={{ fontSize: '0.95rem' }}>
          <span>SELECT COMPETITION RULES PROFILE</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', marginTop: '8px' }}>
          {profiles.map(p => {
            const isSel = p.id === activeProfile?.id;
            return (
              <div
                key={p.id}
                onClick={() => handleProfileChange(p.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: isSel ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
                  background: isSel ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                  color: isSel ? 'var(--accent-gold)' : '#fff',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{p.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {p.inningsOvers} Overs • Max Leg-Side Behind: {p.maxBehindSquareLeg}
                </div>
              </div>
            );
          })}
        </div>

        {/* Profile Notes & Legal Constraints */}
        {activeProfile && (
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '8px', marginTop: '12px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>Active Profile Notes:</div>
            <div>• {activeProfile.sourceNote}</div>
            <div>• Short Ball: {activeProfile.shortBallRulesNotes}</div>
            <div>• Wide Guidelines: {activeProfile.wideInterpretationNotes}</div>
          </div>
        )}

        {/* Local Rules Confirmation Checkbox */}
        <div style={{ background: 'var(--bg-surface-card)', border: '1px solid var(--border-gold)', padding: '12px', borderRadius: '8px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            id="confirmLocalRules"
            checked={context.localRulesConfirmed}
            onChange={e => onUpdateContext({ ...context, localRulesConfirmed: e.target.checked })}
            style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
          />
          <label htmlFor="confirmLocalRules" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)', cursor: 'pointer' }}>
            I confirm local competition playing conditions and grade safety rules are checked.
          </label>
        </div>
      </div>

      {/* Match Phase & Field Restriction */}
      <div className="card">
        <div className="card-title" style={{ fontSize: '0.95rem' }}>
          <span>TACTICAL PHASE & FIELDING RESTRICTION</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>TACTICAL PHASE</label>
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
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>MAX FIELDERS OUTSIDE CIRCLE</label>
            <select
              value={context.maxFieldersOutsideCircle}
              onChange={e => onUpdateContext({ ...context, maxFieldersOutsideCircle: parseInt(e.target.value, 10) })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', fontSize: '0.8rem' }}
            >
              {[2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <option key={num} value={num}>{num} Fielders Max Outside Circle</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ground Geometry & Surface Overlay */}
      <div className="card">
        <div className="card-title" style={{ fontSize: '0.95rem' }}>
          <span>PITCH, BALL & GROUND GEOMETRY OVERLAYS</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginTop: '8px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PITCH CONDITION</label>
            <select
              value={context.pitch || 'seaming'}
              onChange={e => onUpdateContext({ ...context, pitch: e.target.value as any })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', fontSize: '0.8rem' }}
            >
              <option value="seaming">Seaming / Grass</option>
              <option value="bouncy">Bouncy / Hard</option>
              <option value="slow">Slow / Two-Paced</option>
              <option value="turning">Turning / Dry</option>
              <option value="low">Low / Keeping Low</option>
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
              <option value="used">Slightly Used (10-30 overs)</option>
              <option value="old">Old / Reversing Ball</option>
              <option value="wet">Wet / Difficult to Grip</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SHORT BOUNDARY SIDE</label>
            <select
              value={context.shortBoundarySide || 'straight'}
              onChange={e => onUpdateContext({ ...context, shortBoundarySide: e.target.value as FieldSide })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid var(--border-light)', marginTop: '4px', fontSize: '0.8rem' }}
            >
              <option value="straight">Symmetrical / None</option>
              <option value="off">Off Side Short</option>
              <option value="leg">Leg Side Short</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
