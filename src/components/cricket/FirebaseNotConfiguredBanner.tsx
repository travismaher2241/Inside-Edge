import React from 'react';

// Friendly user-facing notification for club sharing connectivity.
// Developer diagnostic terms (Firebase, localStorage, project setup) are excluded from production UI.
export const FirebaseNotConfiguredBanner: React.FC = () => (
  <div
    style={{
      background: 'var(--bg-surface-elevated)',
      border: '1px solid var(--border-gold)',
      borderRadius: 'var(--radius-md, 8px)',
      padding: '12px 14px',
      marginBottom: '14px',
      fontSize: '0.82rem',
      color: 'var(--text-secondary)',
      lineHeight: 1.4
    }}
  >
    <strong style={{ color: 'var(--accent-gold)' }}>CLUB SHARING</strong>
    <p style={{ marginTop: '2px', margin: 0 }}>
      Club-wide reports aren't connected yet. Your team's match plans, reviews, and training tools remain fully available.
    </p>
  </div>
);
