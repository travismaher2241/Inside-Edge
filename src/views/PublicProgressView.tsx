import React, { useState, useEffect } from 'react';
import type { PublishedPlayerProgressSummary } from '../types/cricket';
import { PlayerProgressService } from '../modules/cricket/playerProgressService';
import { ShieldCheck, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

interface PublicProgressViewProps {
  token: string;
}

export const PublicProgressView: React.FC<PublicProgressViewProps> = ({ token }) => {
  const [summary, setSummary] = useState<PublishedPlayerProgressSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Enforce no-referrer security policy
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);

    if (!token) {
      setError('Invalid or expired progress report link.');
      setIsLoading(false);
      return;
    }

    PlayerProgressService.getPublicProgressSummary(token)
      .then(res => {
        if (res) {
          setSummary(res);
        } else {
          setError('This progress report link has expired or has been revoked by the head coach.');
        }
      })
      .catch(() => setError('Unable to load progress report.'))
      .finally(() => setIsLoading(false));
  }, [token]);

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading player progress report...
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="container" style={{ padding: '32px 16px', maxWidth: '480px', margin: '0 auto' }}>
        <div className="card" style={{ border: '1px solid var(--border-danger)', padding: '24px', textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: '12px' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Report Unavailable</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            {error || 'No published report found.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '16px', maxWidth: '540px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(20, 30, 48, 0.9) 0%, rgba(36, 59, 85, 0.9) 100%)',
          border: '1px solid var(--border-gold)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <ShieldCheck size={20} style={{ color: 'var(--accent-gold)' }} />
          <span className="section-label-gold">
            Inside Edge · Player Progress Summary v{summary.version}
          </span>
        </div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 900, marginTop: '4px' }}>
          Development Progress Report
        </h1>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={14} /> Reporting Period: {summary.reportingPeriod.startDate} to {summary.reportingPeriod.endDate}
        </div>
      </div>

      {/* 1. Training Opportunity & Fairness */}
      <section className="card" style={{ padding: '16px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={16} style={{ color: '#4ade80' }} /> Training Opportunity Summary
        </h3>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          {summary.fairnessWindowLabel || 'Calculated over recent attended sessions'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
              {summary.attendanceSummary.battingMinutes}m
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Batting Net Time</div>
          </div>
          <div style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#60a5fa' }}>
              {summary.attendanceSummary.bowlingMinutes}m
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Bowling Net Time</div>
          </div>
        </div>
      </section>

      {/* 2. Active Development Focuses */}
      <section className="card" style={{ padding: '16px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>
          🎯 Current Coaching Focuses
        </h3>
        {summary.focuses.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {summary.focuses.map(f => (
              <div
                key={f.focusStatement}
                style={{
                  background: 'var(--bg-surface)',
                  borderLeft: '4px solid var(--accent-gold)',
                  padding: '10px 12px',
                  borderRadius: '0 8px 8px 0'
                }}
              >
                <div className="flex-between">
                  <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{f.focusStatement}</span>
                  <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>{f.state}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {f.summary}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No active public focuses set.</div>
        )}
      </section>

      {/* 3. Selected Evidence Excerpts */}
      {summary.selectedEvidence.length > 0 && (
        <section className="card" style={{ padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>
            ✨ Positive Observations & Evidence
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {summary.selectedEvidence.map((e, idx) => (
              <div key={idx} style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: '8px', fontSize: '0.82rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  {e.date} · {e.tags.join(', ')}
                </div>
                <div style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>
                  "{e.excerpt}"
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Next Steps */}
      {summary.nextSteps.length > 0 && (
        <section className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px', color: 'var(--accent-gold)' }}>
            🌱 Next Steps & Coaching Plan
          </h3>
          <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {summary.nextSteps.map((ns, idx) => (
              <li key={idx}>{ns}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
