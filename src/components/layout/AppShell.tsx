// App Shell Layout Component with Navigation & Context Switching

import React, { useState } from 'react';
import { Home, Dumbbell, Users, Trophy, BookOpen, Shield, LogOut, UserCheck, ChevronDown, MessageCircleQuestion, AlertTriangle, Download, MoreVertical } from 'lucide-react';
import type { Team, CoachUser, ClubTeam, ActiveScope } from '../../types/cricket';
import { ScopeSelectorModal } from './ScopeSelectorModal';
import { getScopeLabel } from '../../modules/cricket/scopeHelpers';
import { SyncStatusBadge } from './SyncStatusBadge';

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
  onOpenCoachAssistant?: () => void;
  onOpenRulesManagement?: () => void;
  onOpenReportProblem?: () => void;
  onExportData?: () => void;
  onOpenOnboarding?: () => void;
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
  onOpenCoachAssistant,
  onOpenRulesManagement,
  onOpenReportProblem,
  onExportData,
  onOpenOnboarding,
  onSignOut,
  children
}) => {
  const [isScopeModalOpen, setIsScopeModalOpen] = useState<boolean>(false);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState<boolean>(false);
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
          <SyncStatusBadge />

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

          {/* Single Overflow Menu for secondary controls */}
          <button
            type="button"
            aria-label="More options"
            onClick={() => setIsOverflowMenuOpen(prev => !prev)}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-light)',
              color: '#fff',
              borderRadius: '8px',
              padding: '6px 8px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <MoreVertical size={16} />
          </button>

          {isOverflowMenuOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                onClick={() => setIsOverflowMenuOpen(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'var(--bg-surface-elevated, #1c271f)',
                  border: '1px solid var(--border-light, #2d3748)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  zIndex: 999,
                  minWidth: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '4px',
                  gap: '2px'
                }}
              >
                {onOpenCoachAssistant && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOverflowMenuOpen(false);
                      onOpenCoachAssistant();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      textAlign: 'left'
                    }}
                  >
                    <MessageCircleQuestion size={15} color="var(--accent-gold)" /> Coach Assistant
                  </button>
                )}

                {onOpenRulesManagement && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOverflowMenuOpen(false);
                      onOpenRulesManagement();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      textAlign: 'left'
                    }}
                  >
                    <BookOpen size={15} color="#60a5fa" /> Competition Rules
                  </button>
                )}

                {onExportData && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOverflowMenuOpen(false);
                      onExportData();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      textAlign: 'left'
                    }}
                  >
                    <Download size={15} color="#34d399" /> Export Club Data
                  </button>
                )}

                {currentCoach && currentCoach.role === 'head_coach' && onOpenCoachManager && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOverflowMenuOpen(false);
                      onOpenCoachManager();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      textAlign: 'left'
                    }}
                  >
                    <UserCheck size={15} color="var(--accent-gold)" /> Manage Coaches
                  </button>
                )}

                {onOpenReportProblem && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOverflowMenuOpen(false);
                      onOpenReportProblem();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      textAlign: 'left'
                    }}
                  >
                    <AlertTriangle size={15} color="#f87171" /> Report Problem
                  </button>
                )}

                {currentCoach && onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOverflowMenuOpen(false);
                      onSignOut();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      borderTop: '1px solid var(--border-light)',
                      textAlign: 'left'
                    }}
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                )}
              </div>
            </>
          )}
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

      {/* Scope Selector Modal */}
      {isScopeModalOpen && (
        <ScopeSelectorModal
          currentScope={activeScope}
          teams={clubTeams}
          totalPlayersCount={totalPlayersCount}
          onSelectScope={onSelectScope}
          onClose={() => setIsScopeModalOpen(false)}
          onOpenOnboarding={onOpenOnboarding}
        />
      )}
    </div>
  );
};
