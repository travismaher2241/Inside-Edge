// App Shell Layout Component with Navigation

import React from 'react';
import { Home, Dumbbell, Users, Trophy, BookOpen, Shield, LogOut, UserCheck } from 'lucide-react';
import type { Team, CoachUser } from '../../types/cricket';

export type TabType = 'home' | 'train' | 'team' | 'match' | 'library';

interface AppShellProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  team: Team;
  onOpenFieldBoard: () => void;
  currentCoach?: CoachUser | null;
  onOpenCoachManager?: () => void;
  onSignOut?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onSelectTab,
  team,
  onOpenFieldBoard,
  currentCoach,
  onOpenCoachManager,
  onSignOut,
  children
}) => {
  return (
    <div className="app-container">
      {/* Sticky Header */}
      <header className="app-header">
        <div className="brand-badge">
          INSIDE <span>EDGE</span>
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
                  aria-label="Sign out"
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

          <div className="team-pill">{team.ageGroup}</div>
        </div>
      </header>


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
    </div>
  );
};
