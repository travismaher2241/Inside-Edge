import React from 'react';
import type { ClubTeam, ActiveScope } from '../../types/cricket';
import { X, Check, Shield, Users } from 'lucide-react';

interface ScopeSelectorModalProps {
  currentScope: ActiveScope;
  teams: ClubTeam[];
  totalPlayersCount: number;
  onSelectScope: (scope: ActiveScope) => void;
  onClose: () => void;
  onOpenOnboarding?: () => void;
}

export const ScopeSelectorModal: React.FC<ScopeSelectorModalProps> = ({
  currentScope,
  teams,
  totalPlayersCount,
  onSelectScope,
  onClose,
  onOpenOnboarding
}) => {
  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select club or team view"
        className="bottom-sheet-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        {/* Modal Header */}
        <div className="sheet-header">
          <div>
            <div className="section-label-gold">
              WORKING CONTEXT
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
              Select Club or Team View
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Club Scope Section */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
            CLUB CONTEXT
          </div>
          <div
            onClick={() => {
              onSelectScope({ mode: 'club' });
              onClose();
            }}
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              border: currentScope.mode === 'club' ? '2px solid var(--accent-gold)' : '1px solid var(--border-light)',
              background: currentScope.mode === 'club' ? 'var(--accent-gold-soft)' : 'var(--bg-surface-card)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: currentScope.mode === 'club' ? 'var(--accent-gold)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} /> Club Overview
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {teams.length} teams · {totalPlayersCount} total club players
              </div>
            </div>
            {currentScope.mode === 'club' && <Check size={18} color="var(--accent-gold)" />}
          </div>
        </div>

        {/* Teams Scope Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              TEAMS CONTEXT
            </div>
            {onOpenOnboarding && (
              <button
                onClick={() => {
                  onClose();
                  onOpenOnboarding();
                }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
              >
                + Add Team Setup
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
            {teams.map(t => {
              const isSelected = currentScope.mode === 'team' && currentScope.teamId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    onSelectScope({ mode: 'team', teamId: t.id });
                    onClose();
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid var(--primary-green-light)' : '1px solid var(--border-light)',
                    background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface-card)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? 'var(--primary-green-light)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={16} /> {t.name}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {t.gradeOrDivision || t.ageGroup}
                    </div>
                  </div>
                  {isSelected && <Check size={18} color="var(--primary-green-light)" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
