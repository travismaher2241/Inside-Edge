// Refactored Interactive Cricket Field Setting Board Component (10 Markers: Keeper + 9 Fielders)

import React, { useState, useRef, useEffect } from 'react';
import type { BattingHand } from '../../types/cricket';
import type { FieldSpot, FieldSide } from '../../modules/cricket/tactics/types';
import { TACTICAL_FIELD_PRESETS, fieldForBatterHand } from '../../modules/cricket/tactics/fieldPresets';
import { X, Shield, RotateCcw, AlertTriangle, Check, Info } from 'lucide-react';

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
}) => {
  const [batterHand, setBatterHand] = useState<BattingHand>(initialBatterHand);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialPresetId);
  const [selectedFielderId, setSelectedFielderId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize positions: if initialPositions provided and valid, use them; else load preset for batter hand
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
    // Mirror current positions across x=50
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

    // Compute depth dynamically based on distance from center pitch (50, 50)
    const distFromCenter = Math.sqrt(Math.pow(xPercent - 50, 2) + Math.pow(yPercent - 50, 2));
    const isOutfield = distFromCenter > 32; // Beyond 30-yard circle (~32% radius)

    // Compute whether behind square on leg side:
    // For RHB: leg side is x > 50. Behind popping crease is y > 60.
    // For LHB: leg side is x < 50. Behind popping crease is y > 60.
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

  // Legality Calculations & Validation
  const countKeeper = positions.filter(p => p.id === 'wk').length;
  const countOutsideCircle = positions.filter(p => p.depth === 'outfield' || p.depth === 'boundary' || Math.sqrt(Math.pow(p.x - 50, 2) + Math.pow(p.y - 50, 2)) > 32).length;
  const countBehindSquareLeg = positions.filter(p => p.behindSquareLeg && p.id !== 'wk').length;
  const countLegSideTotal = positions.filter(p => p.side === 'leg' && p.id !== 'wk').length;

  const validationErrors: string[] = [];
  if (positions.length !== 10) {
    validationErrors.push(`Field must contain exactly 10 markers (1 Wicketkeeper + 9 Fielders; Bowler is separate). Currently: ${positions.length}`);
  }
  if (countKeeper !== 1) {
    validationErrors.push('Field must contain exactly 1 Wicketkeeper.');
  }
  if (countBehindSquareLeg > maxBehindSquareLeg) {
    validationErrors.push(`Illegal field: ${countBehindSquareLeg} fielders behind square on the leg side (max permitted: ${maxBehindSquareLeg}).`);
  }
  if (countOutsideCircle > maxOutsideCircle) {
    validationErrors.push(`Illegal field: ${countOutsideCircle} fielders outside 30-yard circle (current phase max: ${maxOutsideCircle}).`);
  }
  if (maxTotalLegSide && countLegSideTotal > maxTotalLegSide) {
    validationErrors.push(`Illegal field: ${countLegSideTotal} leg-side fielders (competition max: ${maxTotalLegSide}).`);
  }

  const isLegal = validationErrors.length === 0;
  const selectedFielder = positions.find(p => p.id === selectedFielderId);

  const handleSave = () => {
    if (!isLegal) return;
    if (onSaveField) {
      onSaveField(positions);
    }
    onClose();
  };

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div className="bottom-sheet-content" style={{ maxHeight: '94vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
              TACTICAL FIELD BOARD {bowlerName ? `• ${bowlerName}` : ''}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{planTitle || 'Tactical Field Setting'}</div>
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
          <div style={{ background: 'rgba(231, 111, 81, 0.15)', border: '1px solid #f97316', padding: '8px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.78rem', color: '#f97316', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {validationErrors.map((err, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} />
                <span>{err}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--primary-green-light)', padding: '6px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.75rem', color: 'var(--primary-green-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} />
              <span>Legal Field Setting Verified (1 Keeper + 9 Fielders)</span>
            </div>
            <span>Outside Circle: {countOutsideCircle}/{maxOutsideCircle} • Behind Square: {countBehindSquareLeg}/{maxBehindSquareLeg}</span>
          </div>
        )}

        {/* Controls: Batter Hand & Preset Selection */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>STRIKER HAND</label>
            <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
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

          <div style={{ flex: 2, minWidth: '200px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>LOAD TACTICAL PRESET</label>
            <select
              value={selectedPresetId}
              onChange={e => loadPreset(e.target.value, batterHand)}
              style={{
                width: '100%',
                padding: '6px',
                marginTop: '2px',
                background: 'var(--bg-surface-card)',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.75rem'
              }}
            >
              {TACTICAL_FIELD_PRESETS.map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} ({preset.intent.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cricket Oval Pitch Canvas */}
        <div
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'relative',
            width: '100%',
            height: '330px',
            background: 'radial-gradient(circle, #1a4733 0%, #0d291e 75%, #081711 100%)',
            borderRadius: '16px',
            border: '2px solid var(--primary-green-light)',
            overflow: 'hidden',
            margin: '0 auto 8px auto',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)',
            touchAction: 'none'
          }}
        >
          {/* Short Boundary Indicator if supplied */}
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

          {/* Bowler Marker at top of pitch (implicit bowler displayed separately) */}
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
          <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-gold)', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', fontSize: '0.78rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={16} color="var(--accent-gold)" />
            <div>
              <strong style={{ color: 'var(--accent-gold)' }}>{selectedFielder.name} ({selectedFielder.side.toUpperCase()}): </strong>
              <span>{selectedFielder.role}</span>
              {selectedFielder.behindSquareLeg && <span style={{ color: '#f97316', marginLeft: '6px', fontWeight: 700 }}>(Behind Square Leg)</span>}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleResetToPreset} style={{ flex: 1, fontSize: '0.8rem' }}>
            <RotateCcw size={14} /> RESET PRESET
          </button>

          <button
            className="btn btn-gold"
            onClick={handleSave}
            disabled={!isLegal}
            style={{ flex: 2, opacity: isLegal ? 1 : 0.5 }}
          >
            <Shield size={16} /> SAVE FIELD SETTING
          </button>
        </div>
      </div>
    </div>
  );
};
