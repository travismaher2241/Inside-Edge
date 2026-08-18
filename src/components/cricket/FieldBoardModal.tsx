// Refactored Interactive Cricket Field Setting Board Component (10 Markers: Keeper + 9 Fielders)

import React, { useState, useRef, useEffect } from 'react';
import type { BattingHand, SavedFieldSetting } from '../../types/cricket';
import type { FieldSpot, FieldSide, TacticalPhase } from '../../modules/cricket/tactics/types';
import { TACTICAL_FIELD_PRESETS, fieldForBatterHand } from '../../modules/cricket/tactics/fieldPresets';
import { X, Shield, RotateCcw, AlertTriangle, Check, Info, Settings, ChevronDown, ChevronUp } from 'lucide-react';

interface FieldBoardModalProps {
  onClose: () => void;
  initialBatterHand?: BattingHand;
  initialPresetId?: string;
  initialPositions?: FieldSpot[];
  bowlerName?: string;
  planTitle?: string;
  maxOutsideCircle?: number;
  maxBehindSquareLeg?: number;
  maxTotalLegSide?: number;
  shortBoundarySide?: FieldSide;
  onSaveField?: (positions: FieldSpot[]) => void;
  savedSettings?: SavedFieldSetting[];
  matchId?: string;
  onSaveSetting?: (setting: SavedFieldSetting) => void;
  onDeleteSetting?: (settingId: string) => void;
}

export const FieldBoardModal: React.FC<FieldBoardModalProps> = ({
  onClose,
  initialBatterHand = 'right',
  initialPresetId = 'pace_fourth_stump_pressure',
  initialPositions,
  bowlerName,
  planTitle,
  maxOutsideCircle = 5,
  maxBehindSquareLeg = 2,
  maxTotalLegSide = 5,
  shortBoundarySide,
  onSaveField,
  savedSettings = [],
  matchId,
  onSaveSetting,
  onDeleteSetting,
}) => {
  const [batterHand, setBatterHand] = useState<BattingHand>(initialBatterHand);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialPresetId);
  const [selectedFielderId, setSelectedFielderId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedSettingId, setSelectedSettingId] = useState<string>('');
  const [settingName, setSettingName] = useState<string>('');
  const [bowlerStyle, setBowlerStyle] = useState<'pace' | 'spin'>('pace');
  const [tacticalPhase, setTacticalPhase] = useState<TacticalPhase>('new_ball');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [isSettingsManagerOpen, setIsSettingsManagerOpen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  const [positions, setPositions] = useState<FieldSpot[]>(() => {
    if (initialPositions && initialPositions.length === 10) {
      return initialPositions;
    }
    const preset = TACTICAL_FIELD_PRESETS.find(p => p.id === initialPresetId) || TACTICAL_FIELD_PRESETS[0];
    return fieldForBatterHand(preset, initialBatterHand).positions;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const loadPreset = (presetId: string, hand: BattingHand) => {
    setSelectedPresetId(presetId);
    const raw = TACTICAL_FIELD_PRESETS.find(p => p.id === presetId) || TACTICAL_FIELD_PRESETS[0];
    const mirrored = fieldForBatterHand(raw, hand);
    setPositions(mirrored.positions);
    setSelectedFielderId(null);
  };

  const handleBatterHandToggle = (hand: BattingHand) => {
    setBatterHand(hand);
    setPositions(prev =>
      prev.map(p => ({
        ...p,
        x: 100 - p.x,
      }))
    );
  };

  const handleResetToPreset = () => {
    loadPreset(selectedPresetId, batterHand);
  };

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingId(id);
    setSelectedFielderId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const xPx = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const yPx = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const xPercent = Math.round((xPx / rect.width) * 100);
    const yPercent = Math.round((yPx / rect.height) * 100);

    const distFromCenter = Math.sqrt(Math.pow(xPercent - 50, 2) + Math.pow(yPercent - 50, 2));
    const isOutfield = distFromCenter > 32;

    const isLegSide = batterHand === 'right' ? xPercent > 50 : xPercent < 50;
    const isBehindSquare = isLegSide && yPercent > 60;

    setPositions(prev =>
      prev.map(p => {
        if (p.id !== draggingId) return p;
        return {
          ...p,
          x: xPercent,
          y: yPercent,
          depth: isOutfield ? 'boundary' : p.depth === 'close' ? 'close' : 'inner_ring',
          side: xPercent === 50 ? 'straight' : isLegSide ? 'leg' : 'off',
          behindSquareLeg: isBehindSquare,
        };
      })
    );
  };

  const handlePointerUp = () => {
    if (draggingId) setDraggingId(null);
  };

  const countKeeper = positions.filter(p => p.id === 'wk').length;
  const countOutsideCircle = positions.filter(p => p.depth === 'outfield' || p.depth === 'boundary').length;
  const countBehindSquareLeg = positions.filter(p => p.behindSquareLeg && p.id !== 'wk').length;
  const countLegSideTotal = positions.filter(p => p.side === 'leg' && p.id !== 'wk').length;

  const validationErrors: string[] = [];
  if (positions.length !== 10) {
    validationErrors.push(`Field must contain exactly 10 markers. Currently: ${positions.length}`);
  }
  if (countKeeper !== 1) {
    validationErrors.push('Field must contain exactly 1 Wicketkeeper.');
  }
  if (countBehindSquareLeg > maxBehindSquareLeg) {
    validationErrors.push(`Illegal field: ${countBehindSquareLeg} fielders behind square (max: ${maxBehindSquareLeg}).`);
  }
  if (countOutsideCircle > maxOutsideCircle) {
    validationErrors.push(`Illegal field: ${countOutsideCircle} fielders outside circle (max: ${maxOutsideCircle}).`);
  }
  if (maxTotalLegSide && countLegSideTotal > maxTotalLegSide) {
    validationErrors.push(`Illegal field: ${countLegSideTotal} leg-side fielders (max: ${maxTotalLegSide}).`);
  }

  const isLegal = validationErrors.length === 0;
  const selectedFielder = positions.find(p => p.id === selectedFielderId);

  const handleSave = () => {
    if (!isLegal) return;
    if (onSaveField) onSaveField(positions);
    onClose();
  };

  const loadSavedSetting = (settingId: string) => {
    setSelectedSettingId(settingId);
    const setting = savedSettings.find(item => item.id === settingId);
    if (!setting) return;
    setSettingName(setting.name);
    setBatterHand(setting.batterHand);
    setBowlerStyle(setting.bowlerStyle);
    setTacticalPhase(setting.tacticalPhase);
    setPositions(setting.positions);
  };

  const persistSetting = (mode: 'save_as' | 'update' | 'duplicate' | 'attach') => {
    if (!onSaveSetting || !isLegal || !settingName.trim()) return;
    const existing = savedSettings.find(item => item.id === selectedSettingId);
    const now = new Date().toISOString();
    const createNew = mode === 'save_as' || mode === 'duplicate' || !existing;
    const setting: SavedFieldSetting = {
      id: createNew ? `field-${Date.now()}` : existing.id,
      name: mode === 'duplicate' ? `${settingName.trim()} copy` : settingName.trim(),
      batterHand,
      bowlerStyle,
      tacticalPhase,
      competitionRulesProfileId: existing?.competitionRulesProfileId,
      positions,
      matchId: mode === 'attach' ? matchId : existing?.matchId,
      createdAt: createNew ? now : existing.createdAt,
      updatedAt: now
    };
    onSaveSetting(setting);
    setSelectedSettingId(setting.id);
    setSettingName(setting.name);
    setSaveMessage(mode === 'attach' ? 'Attached to the current match plan.' : 'Field setting saved.');
  };

  const deleteSetting = () => {
    if (!selectedSettingId || !onDeleteSetting) return;
    onDeleteSetting(selectedSettingId);
    setSelectedSettingId('');
    setSettingName('');
    setSaveMessage('Field setting deleted.');
  };

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="field-board-title" className="bottom-sheet-content" style={{ maxHeight: '94vh', overflowY: 'auto', maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 800, textTransform: 'uppercase' }}>
              TACTICAL FIELD {bowlerName ? `• ${bowlerName}` : ''}
            </div>
            <div id="field-board-title" style={{ fontSize: '1.15rem', fontWeight: 800 }}>{planTitle || 'Tactical Field Setting'}</div>
          </div>
          <button
            type="button"
            aria-label="Close field board"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Validation Errors & Status Bar */}
        {!isLegal ? (
          <div style={{ background: 'rgba(231, 111, 81, 0.15)', border: '1px solid #f97316', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px', fontSize: '0.75rem', color: '#f97316', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {validationErrors.map((err, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} />
                <span>{err}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--primary-green-light)', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px', fontSize: '0.72rem', color: 'var(--primary-green-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} />
              <span>Legal Field (1 Keeper + 9 Fielders)</span>
            </div>
            <span>Outside: {countOutsideCircle}/{maxOutsideCircle}</span>
          </div>
        )}

        {/* Controls: Batter Hand & Preset Selection */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => handleBatterHandToggle('right')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  background: batterHand === 'right' ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                  color: batterHand === 'right' ? 'var(--accent-gold)' : 'var(--text-main)',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                RHB
              </button>
              <button
                type="button"
                onClick={() => handleBatterHandToggle('left')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  background: batterHand === 'left' ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                  color: batterHand === 'left' ? 'var(--accent-gold)' : 'var(--text-main)',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                LHB
              </button>
            </div>
          </div>

          <div style={{ flex: 2 }}>
            <select
              value={selectedPresetId}
              onChange={e => loadPreset(e.target.value, batterHand)}
              style={{
                width: '100%',
                padding: '6px',
                background: 'var(--bg-surface-card)',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.75rem'
              }}
            >
              {TACTICAL_FIELD_PRESETS.map(preset => (
                <option key={preset.id} value={preset.id}>
                  Preset: {preset.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {onSaveSetting && (
          <div style={{ marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => setIsSettingsManagerOpen(open => !open)}
              aria-expanded={isSettingsManagerOpen}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'space-between', fontSize: '0.75rem', height: '30px' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Settings size={14} />
                Saved settings {settingName ? `— ${settingName}` : ''}
              </span>
              {isSettingsManagerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {isSettingsManagerOpen && (
              <div className="card" style={{ display: 'grid', gap: '8px', marginTop: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem' }}>Saved setting<select value={selectedSettingId} onChange={event => loadSavedSetting(event.target.value)}><option value="">New setting</option>{savedSettings.map(setting => <option key={setting.id} value={setting.id}>{setting.name}</option>)}</select></label>
                  <label style={{ fontSize: '0.7rem' }}>Setting name<input value={settingName} onChange={event => setSettingName(event.target.value)} placeholder="e.g. New-ball pressure" /></label>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" onClick={() => persistSetting('save_as')} disabled={!settingName.trim() || !isLegal} style={{ fontSize: '0.7rem' }}>Save as</button>
                  <button className="btn btn-secondary" onClick={() => persistSetting('update')} disabled={!selectedSettingId || !isLegal} style={{ fontSize: '0.7rem' }}>Update</button>
                  <button className="btn btn-secondary" onClick={deleteSetting} disabled={!selectedSettingId} style={{ fontSize: '0.7rem' }}>Delete</button>
                </div>
                {saveMessage && <div role="status" style={{ color: 'var(--primary-green-light)', fontSize: '0.75rem' }}>{saveMessage}</div>}
              </div>
            )}
          </div>
        )}

        {/* Cricket Oval Pitch Canvas (Dominant Visual) */}
        <div
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'relative',
            width: '100%',
            height: '340px',
            background: 'radial-gradient(circle, #1a4733 0%, #0d291e 75%, #081711 100%)',
            borderRadius: '16px',
            border: '2px solid var(--primary-green-light)',
            overflow: 'hidden',
            margin: '0 auto 8px auto',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)',
            touchAction: 'none'
          }}
        >
          {shortBoundarySide && shortBoundarySide !== 'straight' && (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                left: shortBoundarySide === 'off' ? (batterHand === 'right' ? '12px' : 'auto') : (batterHand === 'right' ? 'auto' : '12px'),
                right: shortBoundarySide === 'off' ? (batterHand === 'right' ? 'auto' : '12px') : (batterHand === 'right' ? '12px' : 'auto'),
                background: 'rgba(249, 115, 22, 0.85)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '4px',
                pointerEvents: 'none',
              }}
            >
              SHORT BOUNDARY
            </div>
          )}

          {/* Inner 30-yard Circle */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '210px',
              height: '210px',
              borderRadius: '50%',
              border: '1px dashed rgba(255, 255, 255, 0.3)',
              pointerEvents: 'none'
            }}
          />

          {/* Center Pitch Strip */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '32px',
              height: '110px',
              background: '#bfa175',
              borderRadius: '2px',
              opacity: 0.85,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 0',
              pointerEvents: 'none'
            }}
          >
            <div style={{ width: '16px', height: '2px', background: '#ffffff' }} />
            <div style={{ width: '16px', height: '2px', background: '#ffffff' }} />
          </div>

          {/* Bowler Marker */}
          <div
            style={{
              position: 'absolute',
              top: '32%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 3
            }}
          >
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#38bdf8', border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.6)' }} />
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#38bdf8', background: 'rgba(0,0,0,0.85)', padding: '1px 4px', borderRadius: '4px', marginTop: '2px' }}>
              BOWLER
            </span>
          </div>

          {/* Striker Indicator */}
          <div style={{ position: 'absolute', bottom: '66px', left: '50%', transform: 'translateX(-50%)', color: 'var(--accent-gold)', fontSize: '0.65rem', fontWeight: 800, pointerEvents: 'none' }}>
            {batterHand === 'right' ? 'RHB STRIKER' : 'LHB STRIKER'}
          </div>

          {/* Render 10 Draggable Fielders */}
          {positions.map(p => {
            const isSelected = selectedFielderId === p.id;
            const isDragging = draggingId === p.id;
            const isWk = p.id === 'wk';

            return (
              <div
                key={p.id}
                onPointerDown={e => handlePointerDown(p.id, e)}
                style={{
                  position: 'absolute',
                  top: `${p.y}%`,
                  left: `${p.x}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'grab',
                  touchAction: 'none',
                  padding: '10px',
                  minWidth: '44px',
                  minHeight: '44px',
                  justifyContent: 'center',
                  zIndex: isDragging || isSelected ? 10 : 2
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: isDragging ? '#ffffff' : isWk ? '#f97316' : p.behindSquareLeg ? '#ef4444' : 'var(--accent-gold)',
                    border: isSelected ? '3px solid #ffffff' : '2px solid #ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.7)',
                    transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                    transition: 'transform 0.15s ease'
                  }}
                />
                <span
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    background: isSelected ? 'var(--primary-green)' : 'rgba(0,0,0,0.85)',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    marginTop: '2px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {p.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Selected Fielder Role Tooltip */}
        {selectedFielder && (
          <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-gold)', borderRadius: '8px', padding: '6px 10px', marginBottom: '8px', fontSize: '0.78rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={16} color="var(--accent-gold)" />
            <div>
              <strong style={{ color: 'var(--accent-gold)' }}>{selectedFielder.name} ({selectedFielder.side.toUpperCase()}): </strong>
              <span>{selectedFielder.role}</span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleResetToPreset} style={{ flex: 1, fontSize: '0.78rem' }}>
            <RotateCcw size={14} /> Reset
          </button>

          {onSaveField ? <button className="btn btn-gold" onClick={handleSave} disabled={!isLegal} style={{ flex: 2, opacity: isLegal ? 1 : 0.5 }}><Shield size={16} /> Save Field Setting</button>
            : <button className="btn btn-gold" onClick={onClose} style={{ flex: 2 }}>Close</button>}
        </div>
      </div>
    </div>
  );
};
