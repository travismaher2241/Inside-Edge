import React, { useState, useEffect } from 'react';
import { PublicRsvpService, type PublicRsvpDetails } from '../modules/cricket/publicRsvpService';
import type { RsvpStatus } from '../types/cricket';
import { CheckCircle2, Clock, AlertTriangle, ShieldCheck, Send, RefreshCw, XCircle } from 'lucide-react';

interface PublicRsvpViewProps {
  token: string;
}

export const PublicRsvpView: React.FC<PublicRsvpViewProps> = ({ token }) => {
  const [details, setDetails] = useState<PublicRsvpDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [invalidToken, setInvalidToken] = useState<boolean>(false);

  // Form State
  const [status, setStatus] = useState<RsvpStatus>('confirmed');
  const [hasCustomArrival, setHasCustomArrival] = useState<boolean>(false);
  const [availableFrom, setAvailableFrom] = useState<string>('17:30');
  const [hasCustomDeparture, setHasCustomDeparture] = useState<boolean>(false);
  const [availableUntil, setAvailableUntil] = useState<string>('19:00');
  const [parentNote, setParentNote] = useState<string>('');

  // Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; status: string; message: string } | null>(null);

  useEffect(() => {
    // Set Referrer-Policy on document
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);

    async function loadDetails() {
      setLoading(true);
      setInvalidToken(false);
      try {
        const data = await PublicRsvpService.getPublicRsvpDetails(token);
        if (data) {
          setDetails(data);
          if (data.currentRsvp) {
            setStatus(data.currentRsvp.status);
            if (data.currentRsvp.availableFrom) {
              setHasCustomArrival(true);
              setAvailableFrom(data.currentRsvp.availableFrom);
            }
            if (data.currentRsvp.availableUntil) {
              setHasCustomDeparture(true);
              setAvailableUntil(data.currentRsvp.availableUntil);
            }
            if (data.currentRsvp.parentNote) {
              setParentNote(data.currentRsvp.parentNote);
            }
          }
        } else {
          setInvalidToken(true);
        }
      } catch (err) {
        console.error('Error fetching public RSVP details:', err);
        setInvalidToken(true);
      } finally {
        setLoading(false);
      }
    }

    loadDetails();

    // Listen for online events to process outbox retries
    const handleOnline = () => {
      void PublicRsvpService.processOfflineOutbox();
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      if (document.head.contains(meta)) document.head.removeChild(meta);
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details) return;

    setSubmitting(true);
    setSubmitResult(null);

    const submissionId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const baseRevision = details.currentRsvp?.revision ?? 0;

    const payload = {
      playerId: details.player.id,
      status,
      availableFrom: status === 'confirmed' && hasCustomArrival ? availableFrom : undefined,
      availableUntil: status === 'confirmed' && hasCustomDeparture ? availableUntil : undefined,
      parentNote: parentNote.trim() || undefined,
      baseRevision,
      submissionId
    };

    try {
      const result = await PublicRsvpService.submitPlayerRsvp(token, payload);
      setSubmitResult(result);
      if (result.currentRsvp) {
        setDetails(prev => prev ? { ...prev, currentRsvp: result.currentRsvp } : null);
      }
    } catch (err: any) {
      setSubmitResult({
        success: false,
        status: 'error',
        message: err.message || 'Failed to submit response. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading training availability page...
      </div>
    );
  }

  if (invalidToken || !details) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="card" style={{ maxWidth: '440px', textAlign: 'center' }}>
          <AlertTriangle size={48} color="var(--warning)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px' }}>Invalid or Expired RSVP Link</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            This training availability link is invalid or has been revoked by the coach. Please ask your coach for an updated link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <ShieldCheck size={20} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: 'var(--accent-primary)' }}>
            Inside Edge · Availability
          </span>
        </div>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '4px', color: 'var(--text-main)' }}>
          {details.sessionTitle}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
          {details.teamName} · {details.sessionDate} ({details.sessionTime})
        </p>

        {/* Target Player Badge */}
        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Responding for</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>{details.player.name}</div>
        </div>

        {submitResult && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            background: submitResult.status === 'offline_queued' ? 'rgba(234, 179, 8, 0.15)' : submitResult.success ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${submitResult.status === 'offline_queued' ? 'var(--warning)' : submitResult.success ? '#22c55e' : '#ef4444'}`,
            color: 'var(--text-main)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '4px' }}>
              {submitResult.status === 'offline_queued' ? (
                <> <Clock size={18} color="var(--warning)" /> Offline: Saved on Device </>
              ) : submitResult.success ? (
                <> <CheckCircle2 size={18} color="#22c55e" /> Response Confirmed </>
              ) : (
                <> <XCircle size={18} color="#ef4444" /> Submission Error </>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-secondary)' }}>{submitResult.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Attendance Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Will {details.player.name.split(' ')[0]} be attending?
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                className={`btn ${status === 'confirmed' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '14px', justifyContent: 'center', fontSize: '1rem', fontWeight: 700 }}
                onClick={() => setStatus('confirmed')}
              >
                ✅ Attending
              </button>
              <button
                type="button"
                className={`btn ${status === 'unavailable' ? 'btn-danger' : 'btn-secondary'}`}
                style={{ padding: '14px', justifyContent: 'center', fontSize: '1rem', fontWeight: 700 }}
                onClick={() => setStatus('unavailable')}
              >
                ❌ Unavailable
              </button>
            </div>
          </div>

          {/* Time Windows for Attending */}
          {status === 'confirmed' && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-main)' }}>Timing & Availability Windows</div>

              {/* Arrival Option */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hasCustomArrival}
                    onChange={e => setHasCustomArrival(e.target.checked)}
                  />
                  Arriving late after session start
                </label>
                {hasCustomArrival && (
                  <div style={{ marginTop: '8px', paddingLeft: '24px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Expected Arrival Time:</label>
                    <input
                      type="time"
                      value={availableFrom}
                      onChange={e => setAvailableFrom(e.target.value)}
                      className="input"
                      style={{ marginTop: '4px', width: '140px' }}
                    />
                  </div>
                )}
              </div>

              {/* Departure Option */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hasCustomDeparture}
                    onChange={e => setHasCustomDeparture(e.target.checked)}
                  />
                  Leaving early before session finish
                </label>
                {hasCustomDeparture && (
                  <div style={{ marginTop: '8px', paddingLeft: '24px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Expected Departure Time:</label>
                    <input
                      type="time"
                      value={availableUntil}
                      onChange={e => setAvailableUntil(e.target.value)}
                      className="input"
                      style={{ marginTop: '4px', width: '140px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Optional Parent Note */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Note for Coach (Optional)
            </label>
            <textarea
              rows={2}
              value={parentNote}
              onChange={e => setParentNote(e.target.value)}
              placeholder="e.g. Traffic on motorway, or recovery from shoulder strain..."
              className="input"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800, justifyContent: 'center' }}
          >
            {submitting ? (
              <> <RefreshCw className="spin" size={18} /> Saving... </>
            ) : (
              <> <Send size={18} /> Confirm Availability </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PublicRsvpView;
