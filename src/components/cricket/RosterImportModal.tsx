import React, { useState, useRef } from 'react';
import type { Player, ClubTeam, PrimaryRole, BattingHand, BowlingStyle } from '../../types/cricket';
import {
  parseCsvRoster,
  convertParsedRowsToPlayers,
  generateSampleCsvTemplate,
  type ParsedRosterRow
} from '../../modules/cricket/rosterImportEngine';
import { Upload, Download, X, AlertTriangle, Users, Trash2 } from 'lucide-react';

interface RosterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubTeams: ClubTeam[];
  existingPlayers: Player[];
  onImportSuccess: (importedPlayers: Player[]) => void;
}

export const RosterImportModal: React.FC<RosterImportModalProps> = ({
  isOpen,
  onClose,
  clubTeams,
  existingPlayers,
  onImportSuccess
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRosterRow[]>([]);
  // Rows flagged as duplicates stay visible in the preview but are not committed, so the
  // button must count what will actually be saved.
  const importableRows = parsedRows.filter(row => row.isValid !== false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [bulkTeamId, setBulkTeamId] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleParseText = (text: string) => {
    if (!text.trim()) {
      setFeedback({ type: 'error', message: 'Please provide CSV text or upload a file.' });
      return;
    }

    const result = parseCsvRoster(text, clubTeams, existingPlayers);
    if (result.parsedPlayers.length === 0) {
      setFeedback({ type: 'error', message: 'No valid player rows detected in CSV.' });
      return;
    }

    setParsedRows(result.parsedPlayers);
    setStep('preview');
    setFeedback(null);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      handleParseText(content);
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateSampleCsvTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'inside_edge_club_roster_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRowChange = (index: number, updates: Partial<ParsedRosterRow>) => {
    setParsedRows(prev => prev.map((row, i) => (i === index ? { ...row, ...updates } : row)));
  };

  const handleDeleteRow = (index: number) => {
    setParsedRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleBulkAssignTeam = () => {
    if (!bulkTeamId) return;
    setParsedRows(prev => prev.map(row => ({ ...row, primaryTeamId: bulkTeamId })));
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setIsSaving(true);
    try {
      const { allPlayersToSave } = convertParsedRowsToPlayers(parsedRows, existingPlayers);
      onImportSuccess(allPlayersToSave);
      onClose();
    } catch (err) {
      console.error('Failed to commit roster import:', err);
      setFeedback({ type: 'error', message: 'Failed to save imported roster. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const ROLES: Array<{ value: PrimaryRole; label: string }> = [
    { value: 'top_order_batter', label: 'Top Order Batter' },
    { value: 'middle_order_batter', label: 'Middle Order Batter' },
    { value: 'all_rounder', label: 'All-Rounder' },
    { value: 'pace_bowler', label: 'Pace Bowler' },
    { value: 'spin_bowler', label: 'Spin Bowler' },
    { value: 'wicketkeeper', label: 'Wicketkeeper' }
  ];

  const BOWLING_STYLES: Array<{ value: BowlingStyle; label: string }> = [
    { value: 'right_arm_fast', label: 'Right-arm Fast' },
    { value: 'right_arm_fast_medium', label: 'Right-arm Fast-Medium' },
    { value: 'right_arm_off_spin', label: 'Right-arm Off-Spin' },
    { value: 'right_arm_leg_spin', label: 'Right-arm Leg-Spin' },
    { value: 'left_arm_fast_medium', label: 'Left-arm Fast-Medium' },
    { value: 'left_arm_orthodox', label: 'Left-arm Orthodox' },
    { value: 'left_arm_unorthodox', label: 'Left-arm Unorthodox' },
    { value: 'does_not_bowl', label: 'Does Not Bowl' }
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="card" style={{ maxWidth: '840px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#111827', border: '1px solid #374151', padding: '24px', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-gold, #f59e0b)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} /> BULK SQUAD ROSTER IMPORT
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
              Import player lists across 1st to 5th XI from PlayHQ, MyCricket, or CSV spreadsheets in seconds.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {feedback && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '0.8rem', background: feedback.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: feedback.type === 'error' ? '#fca5a5' : '#86efac', border: `1px solid ${feedback.type === 'error' ? '#ef4444' : '#22c55e'}` }}>
            {feedback.message}
          </div>
        )}

        {step === 'upload' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            {/* Drag & Drop Box */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? 'var(--accent-gold, #f59e0b)' : '#374151'}`,
                borderRadius: '10px',
                padding: '32px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragging ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s'
              }}
            >
              <Upload size={36} color="var(--accent-gold, #f59e0b)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                Drop your CSV / PlayHQ file here, or <span style={{ color: 'var(--accent-gold, #f59e0b)', textDecoration: 'underline' }}>browse</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                Supports standard CSV exports with columns for Name, Team, Role, Batting Hand, Bowling Style.
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.tsv"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>

            {/* Direct Copy-Paste Area */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8' }}>
                  OR PASTE SPREADSHEET / CSV TEXT DIRECTLY:
                </label>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-gold, #f59e0b)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Download size={12} /> Download Sample CSV
                </button>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Name,Team,Primary Role,Batting Hand,Bowling Style&#10;Travis Maher,1st XI,All-rounder,Right,Right-arm fast-medium&#10;Sam Harper,2nd XI,Wicketkeeper,Right,Does not bowl"
                rows={6}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: '0.8rem', fontFamily: 'monospace' }}
              />
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ width: 'auto', padding: '0 16px' }}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => handleParseText(inputText)}
                style={{ width: 'auto', padding: '0 20px', fontWeight: 800 }}
              >
                Parse & Preview Roster
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff' }}>
                {parsedRows.length} Players Detected
              </div>

              {/* Bulk Team Assignment */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Bulk assign squad:</span>
                <select
                  value={bulkTeamId}
                  onChange={(e) => setBulkTeamId(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155', fontSize: '0.75rem' }}
                >
                  <option value="">Select squad...</option>
                  {clubTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleBulkAssignTeam}
                  disabled={!bulkTeamId}
                  style={{ width: 'auto', padding: '0 8px', height: '28px', fontSize: '0.72rem' }}
                >
                  Apply All
                </button>
              </div>
            </div>

            {/* Editable Preview Table */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #334155', borderRadius: '8px', background: '#0f172a' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#94a3b8', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ padding: '8px 10px' }}>#</th>
                    <th style={{ padding: '8px 10px' }}>Player Name</th>
                    <th style={{ padding: '8px 10px' }}>Squad / Grade</th>
                    <th style={{ padding: '8px 10px' }}>Primary Role</th>
                    <th style={{ padding: '8px 10px' }}>Batting</th>
                    <th style={{ padding: '8px 10px' }}>Bowling Style</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, idx) => (
                    <tr key={row.tempId} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleRowChange(idx, { name: e.target.value })}
                          style={{ background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '4px 6px', fontSize: '0.78rem', width: '100%' }}
                        />
                        {row.validationWarnings.length > 0 && (
                          <div style={{ fontSize: '0.68rem', color: '#f59e0b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <AlertTriangle size={10} /> {row.validationWarnings[0]}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <select
                          value={row.primaryTeamId || ''}
                          onChange={(e) => handleRowChange(idx, { primaryTeamId: e.target.value })}
                          style={{ background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '4px 6px', fontSize: '0.75rem', width: '100%' }}
                        >
                          {clubTeams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <select
                          value={row.primaryRole}
                          onChange={(e) => handleRowChange(idx, { primaryRole: e.target.value as PrimaryRole })}
                          style={{ background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '4px 6px', fontSize: '0.75rem', width: '100%' }}
                        >
                          {ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <select
                          value={row.battingHand}
                          onChange={(e) => handleRowChange(idx, { battingHand: e.target.value as BattingHand })}
                          style={{ background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '4px 6px', fontSize: '0.75rem' }}
                        >
                          <option value="right">Right Hand</option>
                          <option value="left">Left Hand</option>
                        </select>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <select
                          value={row.bowlingStyle}
                          onChange={(e) => handleRowChange(idx, { bowlingStyle: e.target.value as BowlingStyle })}
                          style={{ background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '4px 6px', fontSize: '0.75rem', width: '100%' }}
                        >
                          {BOWLING_STYLES.map(b => (
                            <option key={b.value} value={b.value}>{b.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(idx)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                          title="Remove row"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep('upload')}
                style={{ width: 'auto', padding: '0 16px' }}
              >
                Back to Upload
              </button>

              <button
                type="button"
                className="btn btn-gold"
                onClick={handleConfirmImport}
                disabled={isSaving || importableRows.length === 0}
                style={{ width: 'auto', padding: '0 24px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isSaving ? 'Importing Roster...' : `Import & Save ${importableRows.length} Players`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
