import React, { useState, useEffect, useRef } from 'react';
import type { Observation, ObservationTag, DevelopmentFocus, Player } from '../../../types/cricket';
import { IndexedDbJournal } from '../../../storage/indexedDbJournal';
import { SyncOutboxEngine } from '../../../modules/cricket/syncOutboxEngine';
import { uploadObservationClip, MediaUploadError } from '../../../modules/cricket/mediaStorageEngine';
import { Mic, MicOff, X, Save, Video, Paperclip, Loader2 } from 'lucide-react';

interface QuickObservationModalProps {
  player: Player;
  sessionId?: string;
  activeFocuses?: DevelopmentFocus[];
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (observation: Observation) => void;
  /** When the player's primary team has Junior Mode on, default guardian sharing to on. */
  isJuniorTeam?: boolean;
}

const TAG_OPTIONS: ObservationTag[] = [
  'Good execution',
  'Needs work',
  'Decision',
  'Technique',
  'Intent',
  'Workload'
];

export const QuickObservationModal: React.FC<QuickObservationModalProps> = ({
  player,
  sessionId,
  activeFocuses = [],
  isOpen,
  onClose,
  onSaved,
  isJuniorTeam = false
}) => {
  const [textNote, setTextNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<ObservationTag[]>(['Technique']);
  const [selectedFocusId, setSelectedFocusId] = useState<string>(activeFocuses[0]?.id || '');
  const [staffVisibility, setStaffVisibility] = useState<'all_coaches' | 'head_coach_only'>('all_coaches');
  const [shareWithPlayerGuardian, setShareWithPlayerGuardian] = useState<boolean>(isJuniorTeam);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [selectedClip, setSelectedClip] = useState<File | null>(null);
  const [isUploadingClip, setIsUploadingClip] = useState(false);
  const [clipWarning, setClipWarning] = useState<string>('');
  const clipInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const sr = new SpeechRecognition();
        sr.continuous = true;
        sr.interimResults = true;
        sr.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setTextNote(prev => (prev ? `${prev} ${transcript}` : transcript));
        };
        sr.onerror = () => setIsRecording(false);
        sr.onend = () => setIsRecording(false);
        setRecognition(sr);
      }
    }
  }, []);

  if (!isOpen) return null;

  const toggleVoiceRecording = () => {
    if (!recognition) return;
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleToggleTag = (tag: ObservationTag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!textNote.trim()) return;

    const newObservation: Observation = {
      id: `obs_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      operationId: `op_obs_${Date.now()}`,
      playerId: player.id,
      source: 'training',
      sessionId,
      tags: selectedTags,
      textNote: textNote.trim(),
      linkedFocusIds: selectedFocusId ? [selectedFocusId] : [],
      access: {
        staffVisibility,
        shareWithPlayerGuardian
      },
      createdAt: new Date().toISOString(),
      createdByUserId: 'coach_head_1',
      baseRevision: 0,
      revision: 1,
      syncStatus: 'pending'
    };

    // Clip upload is best-effort: a failed upload never loses the coach's note.
    let clipFailureMessage = '';
    if (selectedClip) {
      setIsUploadingClip(true);
      try {
        const attachment = await uploadObservationClip({
          observationId: newObservation.id,
          file: selectedClip,
          uploadedByUserId: newObservation.createdByUserId
        });
        newObservation.attachments = [attachment];
      } catch (err) {
        clipFailureMessage = err instanceof MediaUploadError ? err.message : 'Clip upload failed.';
      } finally {
        setIsUploadingClip(false);
      }
    }

    // Save to IndexedDB outbox
    await IndexedDbJournal.appendOperation(sessionId || 'general', {
      operationId: newObservation.operationId,
      type: 'OBSERVATION_CREATED',
      playerId: player.id,
      details: newObservation,
      occurredAt: new Date().toISOString(),
      deviceId: 'dev_local'
    });

    // Attempt to flush pending outbox operations if online (guarded internally by test mode)
    void SyncOutboxEngine.processPendingOperations();

    onSaved?.(newObservation);

    if (clipFailureMessage) {
      // Keep the modal open so the coach sees the clip failed, without losing their saved note.
      setClipWarning(`Note saved, but the clip did not upload: ${clipFailureMessage}`);
      setSelectedClip(null);
      setTextNote('');
      return;
    }

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-labelledby="obs-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-gold)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 id="obs-modal-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              📝 Add Note: {player.name}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Sub-2-second live observation capture
            </span>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ width: 'auto', padding: '0 8px', height: '32px' }}>
            <X size={18} />
          </button>
        </div>

        {clipWarning && (
          <div role="status" style={{ fontSize: '0.78rem', color: '#f97316', background: 'rgba(249, 115, 22, 0.12)', border: '1px solid #f97316', borderRadius: '6px', padding: '8px 10px' }}>
            {clipWarning}
          </div>
        )}

        {/* Voice Dictation Button */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
            onClick={toggleVoiceRecording}
            style={{ fontSize: '0.8rem', height: '36px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            {isRecording ? 'Listening... (Tap to Stop)' : 'Dictate Voice Note'}
          </button>
          {!recognition && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Voice unavailable — type below
            </span>
          )}
        </div>

        {/* Attach Clip */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={clipInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0] ?? null;
              setSelectedClip(file);
              setClipWarning('');
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => clipInputRef.current?.click()}
            style={{ fontSize: '0.8rem', height: '36px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Video size={16} /> {selectedClip ? 'Change Clip' : 'Attach Clip'}
          </button>
          {selectedClip && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Paperclip size={12} /> {selectedClip.name}
              <button
                type="button"
                aria-label="Remove attached clip"
                onClick={() => { setSelectedClip(null); if (clipInputRef.current) clipInputRef.current.value = ''; }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <X size={14} />
              </button>
            </span>
          )}
        </div>

        {/* Text Area */}
        <textarea
          rows={3}
          value={textNote}
          onChange={e => setTextNote(e.target.value)}
          placeholder="Speak or type observation notes..."
          style={{
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            borderRadius: '6px',
            padding: '8px',
            fontSize: '0.85rem'
          }}
        />

        {/* Quick Tag Chips */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>Quick Tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {TAG_OPTIONS.map(tag => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    border: '1px solid var(--border-gold)',
                    background: isSelected ? 'var(--accent-gold)' : 'transparent',
                    color: isSelected ? '#000' : 'var(--text-main)',
                    cursor: 'pointer'
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Link to Active Development Focus */}
        {activeFocuses.length > 0 && (
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
              Link to Development Focus
            </label>
            <select
              value={selectedFocusId}
              onChange={e => setSelectedFocusId(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                padding: '6px',
                borderRadius: '6px',
                fontSize: '0.8rem'
              }}
            >
              <option value="">-- None / General Observation --</option>
              {activeFocuses.map(f => (
                <option key={f.id} value={f.id}>
                  {f.focusStatement} ({f.state})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Privacy Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '0.78rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={staffVisibility === 'head_coach_only'}
              onChange={e => setStaffVisibility(e.target.checked ? 'head_coach_only' : 'all_coaches')}
            />
            Head Coach Only (Private)
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={shareWithPlayerGuardian}
              onChange={e => setShareWithPlayerGuardian(e.target.checked)}
            />
            Eligible for Parent Sharing
          </label>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ width: 'auto', fontSize: '0.8rem' }}>
            Cancel
          </button>
          <button
            className="btn btn-gold"
            onClick={handleSave}
            disabled={isUploadingClip}
            style={{ width: 'auto', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', opacity: isUploadingClip ? 0.7 : 1 }}
          >
            {isUploadingClip ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isUploadingClip ? 'Uploading Clip…' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
};
