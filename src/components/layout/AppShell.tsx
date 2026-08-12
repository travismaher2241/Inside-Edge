// App Shell Layout Component with Navigation & Context Switching

import React, { useState } from 'react';
import { Home, Dumbbell, Users, Trophy, BookOpen, Shield, LogOut, UserCheck, ChevronDown } from 'lucide-react';
import type { Team, CoachUser, ClubTeam, ActiveScope } from '../../types/cricket';
import { ScopeSelectorModal } from './ScopeSelectorModal';
import { getScopeLabel } from '../../modules/cricket/scopeHelpers';

export type TabType = 'home' | 'train' | 'team' | 'match' | 'library';

interface AppShellProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  team: Team;
  clubTeams: ClubTeam[];
  totalPlayersCount: number;
  activeScope: ActiveScope;
  onSelectScope: (scope: ActiveScope) => void;
  onOpenFieldBoard: () => void;
  currentCoach?: CoachUser | null;
  onOpenCoachManager?: () => void;
  onSignOut?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onSelectTab,
  team: _team,
  clubTeams,
  totalPlayersCount,
  activeScope,
  onSelectScope,
  onOpenFieldBoard,
  currentCoach,
  onOpenCoachManager,
  onSignOut,
  children
}) => {
  const [isScopeModalOpen, setIsScopeModalOpen] = useState<boolean>(false);
  const currentScopeLabel = getScopeLabel(activeScope, clubTeams);

  return (
    <div className="app-container">
      {/* Sticky Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="brand-badge">
            INSIDE <span>EDGE</span>
          </div>

          {/* Interactive Context / Team Selector Pill */}
          <button
            type="button"
            onClick={() => setIsScopeModalOpen(true)}
            style={{
              background: activeScope.mode === 'club' ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
              border: activeScope.mode === 'club' ? '1px solid var(--accent-gold)' : '1px solid var(--primary-green-light)',
              color: activeScope.mode === 'club' ? 'var(--accent-gold)' : '#fff',
              borderRadius: '20px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <span>{currentScopeLabel}</span>
            <ChevronDown size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onOpenFieldBoard}
            style={{
              background: 'rgba(229, 169, 60, 0.15)',
              border: '1px solid var(--border-gold)',
              color: 'var(--accent-gold)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <Shield size={14} /> FIELD BOARD
          </button>

          {currentCoach && (
            <>
              {currentCoach.role === 'head_coach' && onOpenCoachManager && (
                <button
                  type="button"
                  aria-label="Manage coaches"
                  onClick={onOpenCoachManager}
                  style={{
                    background: 'var(--accent-gold-soft)',
                    border: '1px solid var(--border-gold)',
                    color: 'var(--accent-gold)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <UserCheck size={14} /> COACHES
                </button>
              )}

              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  title="Sign Out"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    borderRadius: '8px',
                    padding: '6px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <LogOut size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Persistent Working Scope Banner */}
      <div style={{ background: activeScope.mode === 'club' ? 'rgba(229, 169, 60, 0.12)' : 'rgba(74, 222, 128, 0.08)', padding: '4px 16px', fontSize: '0.7rem', fontWeight: 800, color: activeScope.mode === 'club' ? 'var(--accent-gold)' : '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)' }}>
        <span>{activeScope.mode === 'club' ? 'CLUB VIEW — Inside Edge Cricket Club' : `TEAM VIEW — ${currentScopeLabel}`}</span>
        <button onClick={() => setIsScopeModalOpen(true)} style={{ background: 'none', border: 'none', color: 'inherit', fontSize: '0.68rem', textDecoration: 'underline', cursor: 'pointer' }}>Change context</button>
      </div>

      {/* Main View Body */}
      <main className="app-main">
        {children}
      </main>

      {/* Mobile Persistent Navigation */}
      <nav className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => onSelectTab('home')}
          aria-current={activeTab === 'home' ? 'page' : undefined}
        >
          <Home />
          <span>Home</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'train' ? 'active' : ''}`}
          onClick={() => onSelectTab('train')}
          aria-current={activeTab === 'train' ? 'page' : undefined}
        >
          <Dumbbell />
          <span>Train</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => onSelectTab('team')}
          aria-current={activeTab === 'team' ? 'page' : undefined}
        >
          <Users />
          <span>Team</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'match' ? 'active' : ''}`}
          onClick={() => onSelectTab('match')}
          aria-current={activeTab === 'match' ? 'page' : undefined}
        >
          <Trophy />
          <span>Match</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => onSelectTab('library')}
          aria-current={activeTab === 'library' ? 'page' : undefined}
        >
          <BookOpen />
          <span>Library</span>
        </button>
      </nav>

      {/* Scope Selector Modal */}
      {isScopeModalOpen && (
        <ScopeSelectorModal
          currentScope={activeScope}
          teams={clubTeams}
          totalPlayersCount={totalPlayersCount}
          onSelectScope={onSelectScope}
          onClose={() => setIsScopeModalOpen(false)}
        />
      )}
    </div>
  );
};
