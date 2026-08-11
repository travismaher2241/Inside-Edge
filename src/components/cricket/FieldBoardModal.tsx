// Interactive Cricket Field Setting Board Component (Draggable & Blank by Default per §17.1)

import React, { useState, useRef } from 'react';
import type { FieldPosition, BattingHand } from '../../types/cricket';
import { X, Shield, Plus, Trash2 } from 'lucide-react';

interface FieldBoardModalProps {
  onClose: () => void;
}

const PRESET_POSITIONS: Record<string, FieldPosition[]> = {
  'Standard 3-Slip Seam': [
    { id: 'f-1', name: 'Wicketkeeper', x: 50, y: 88 },
    { id: 'f-2', name: '1st Slip', x: 42, y: 82 },
    { id: 'f-3', name: '2nd Slip', x: 35, y: 78 },
    { id: 'f-4', name: 'Gully', x: 26, y: 70 },
    { id: 'f-5', name: 'Point', x: 18, y: 55 },
    { id: 'f-6', name: 'Cover', x: 25, y: 38 },
    { id: 'f-7', name: 'Mid-Off', x: 40, y: 28 },
    { id: 'f-8', name: 'Mid-On', x: 60, y: 28 },
    { id: 'f-9', name: 'Mid-Wicket', x: 75, y: 40 },
    { id: 'f-10', name: 'Square Leg', x: 82, y: 58 },
    { id: 'f-11', name: 'Fine Leg', x: 65, y: 80 }
  ],
  'Spin Ring 5-4': [
    { id: 'f-1', name: 'Wicketkeeper', x: 50, y: 86 },
    { id: 'f-2', name: 'Slip', x: 42, y: 80 },
    { id: 'f-3', name: 'Short Leg', x: 56, y: 65 },
    { id: 'f-4', name: 'Backward Point', x: 20, y: 56 },
    { id: 'f-5', name: 'Cover', x: 28, y: 40 },
    { id: 'f-6', name: 'Mid-Off', x: 42, y: 26 },
    { id: 'f-7', name: 'Mid-On', x: 58, y: 26 },
    { id: 'f-8', name: 'Mid-Wicket', x: 74, y: 42 },
    { id: 'f-9', name: 'Square Leg', x: 80, y: 60 },
    { id: 'f-10', name: 'Deep Mid-Wicket', x: 88, y: 20 },
    { id: 'f-11', name: 'Long-Off', x: 30, y: 12 }
  ],
  'Death 5-Out Boundary': [
    { id: 'f-1', name: 'Wicketkeeper', x: 50, y: 88 },
    { id: 'f-2', name: 'Short Third', x: 28, y: 74 },
    { id: 'f-3', name: 'Extra Cover', x: 28, y: 40 },
    { id: 'f-4', name: 'Mid-Off', x: 42, y: 30 },
    { id: 'f-5', name: 'Mid-On', x: 58, y: 30 },
    { id: 'f-6', name: 'Deep Point', x: 10, y: 55 },
    { id: 'f-7', name: 'Deep Cover', x: 15, y: 20 },
    { id: 'f-8', name: 'Long-Off', x: 35, y: 10 },
    { id: 'f-9', name: 'Long-On', x: 65, y: 10 },
    { id: 'f-10', name: 'Deep Mid-Wicket', x: 88, y: 25 },
    { id: 'f-11', name: 'Deep Fine Leg', x: 80, y: 82 }
  ],
  'Blank Board': []
};

export const FieldBoardModal: React.FC<FieldBoardModalProps> = ({ onClose }) => {
  const [batterHand, setBatterHand] = useState<BattingHand>('right');
  const [positions, setPositions] = useState<FieldPosition[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('Blank Board');
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const loadPreset = (presetName: string) => {
    setSelectedPreset(presetName);
    setPositions(PRESET_POSITIONS[presetName] || []);
  };

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const xPx = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const yPx = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const xPercent = Math.round((xPx / rect.width) * 100);
    const yPercent = Math.round((yPx / rect.height) * 100);

    setPositions(prev =>
      prev.map(p => (p.id === draggingId ? { ...p, x: xPercent, y: yPercent } : p))
    );
  };

  const handlePointerUp = () => {
    if (draggingId) {
      setDraggingId(null);
    }
  };

  const handleAddFielder = () => {
    setPositions(prev => {
      if (prev.length >= 11) return prev;
      const newPosition: FieldPosition = {
        id: `f-${Date.now()}-${prev.length}`,
        name: `Fielder ${prev.length + 1}`,
        x: 50,
        y: 50
      };
      return [...prev, newPosition];
    });
  };

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div className="bottom-sheet-content" style={{ maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
              CRICKET TACTICS BOARD
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>Field Setting Canvas</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Preset & Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>BATTER HAND</label>
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              <button
                onClick={() => setBatterHand('right')}
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
                onClick={() => setBatterHand('left')}
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

          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>PRESET PLAN</label>
            <select
              value={selectedPreset}
              onChange={e => loadPreset(e.target.value)}
              style={{
                width: '100%',
                padding: '6px',
                marginTop: '4px',
                background: 'var(--bg-surface-card)',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                fontSize: '0.75rem'
              }}
            >
              <option value="Blank Board">Blank Board (Default)</option>
              <option value="Standard 3-Slip Seam">Standard 3-Slip Seam</option>
              <option value="Spin Ring 5-4">Spin Ring 5-4</option>
              <option value="Death 5-Out Boundary">Death 5-Out Boundary</option>
            </select>
          </div>
        </div>

        {/* Cricket Oval Pitch Canvas with Draggable Fielders */}
        <div
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'relative',
            width: '100%',
            height: '320px',
            background: 'radial-gradient(circle, #1a4733 0%, #0d291e 75%, #081711 100%)',
            borderRadius: '16px',
            border: '2px solid var(--primary-green-light)',
            overflow: 'hidden',
            margin: '0 auto 12px auto',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)',
            touchAction: 'none'
          }}
        >
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
              border: '1px dashed rgba(255, 255, 255, 0.25)',
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
              flexDirection: 'column' as const,
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 0',
              pointerEvents: 'none'
            }}
          >
            <div style={{ width: '16px', height: '2px', background: '#ffffff' }} />
            <div style={{ width: '16px', height: '2px', background: '#ffffff' }} />
          </div>

          {/* Batter & Bowler Indicator */}
          <div style={{ position: 'absolute', bottom: '70px', left: '50%', transform: 'translateX(-50%)', color: 'var(--accent-gold)', fontSize: '0.65rem', fontWeight: 800, pointerEvents: 'none' }}>
            {batterHand === 'right' ? 'RHB STRIKER' : 'LHB STRIKER'}
          </div>

          {/* Render Blank Board Placeholder or Draggable Field Position Dots */}
          {positions.length === 0 ? (
            <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', pointerEvents: 'none' }}>
              Blank Board • Tap "+ Add Fielder" or choose a Preset
            </div>
          ) : (
            positions.map(p => (
              <div
                key={p.id}
                onPointerDown={e => handlePointerDown(p.id, e)}
                style={{
                  position: 'absolute',
                  top: `${p.y}%`,
                  left: `${p.x}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column' as const,
                  alignItems: 'center',
                  cursor: 'grab',
                  touchAction: 'none',
                  zIndex: draggingId === p.id ? 10 : 2
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: draggingId === p.id ? '#ffffff' : 'var(--accent-gold)',
                    border: '2px solid #ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.6)'
                  }}
                />
                <span
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    background: 'rgba(0,0,0,0.85)',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    marginTop: '2px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {p.name}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Toolbar & Footer Actions */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button className="btn btn-secondary" onClick={handleAddFielder} style={{ flex: 1, fontSize: '0.8rem' }}>
            <Plus size={14} /> ADD FIELDER ({positions.length}/11)
          </button>
          <button className="btn btn-secondary" onClick={() => loadPreset('Blank Board')} style={{ flex: 1, fontSize: '0.8rem' }}>
            <Trash2 size={14} /> CLEAR ALL
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-gold" onClick={onClose} style={{ flex: 1 }}>
            <Shield size={16} /> SAVE FIELD PLAN
          </button>
        </div>
      </div>
    </div>
  );
};
