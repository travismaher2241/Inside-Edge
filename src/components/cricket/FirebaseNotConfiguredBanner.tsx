import React from 'react';
import { ShieldAlert } from 'lucide-react';

// Shown whenever the app is running without real Firebase credentials, so match
// reports are only being saved to this device's local storage and will NOT reach
// anyone else. Must stay loud and unmissable — silently falling back to local
// storage without saying so makes a captain's submission look successful when
// it never reached the coach.
export const FirebaseNotConfiguredBanner: React.FC = () => (
  <div
    style={{
      background: 'rgba(220, 38, 38, 0.15)',
      border: '1px solid #dc2626',
      borderRadius: 'var(--radius-md, 8px)',
      padding: '12px 14px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px'
    }}
  >
    <ShieldAlert style={{ width: '20px', height: '20px', color: '#f87171', flexShrink: 0, marginTop: '1px' }} />
    <div style={{ fontSize: '0.82rem', color: '#fecaca', lineHeight: 1.4 }}>
      <strong>Not connected to the club's shared database.</strong> This device is only
      saving reports to its own local storage — they will not reach anyone else's device
      or account. Set up the Firebase project and add the credentials to <code>.env</code> before
      relying on this for real submissions.
    </div>
  </div>
);
