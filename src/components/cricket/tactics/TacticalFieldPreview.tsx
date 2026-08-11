import React from 'react';
import type { FieldSpot } from '../../../modules/cricket/tactics/types';

interface TacticalFieldPreviewProps {
  positions: FieldSpot[];
  batterHand: 'right' | 'left';
  width?: number;
  height?: number;
}

export const TacticalFieldPreview: React.FC<TacticalFieldPreviewProps> = ({
  positions,
  batterHand,
  width = 160,
  height = 160,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        background: 'radial-gradient(circle, #1a4733 0%, #0d291e 75%, #081711 100%)',
        borderRadius: '12px',
        border: '1px solid var(--primary-green-light)',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
      }}
    >
      {/* 30-yard circle */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${width * 0.65}px`,
          height: `${height * 0.65}px`,
          borderRadius: '50%',
          border: '1px dashed rgba(255, 255, 255, 0.25)',
          pointerEvents: 'none',
        }}
      />

      {/* Pitch strip */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${width * 0.12}px`,
          height: `${height * 0.35}px`,
          background: '#bfa175',
          borderRadius: '1px',
          opacity: 0.8,
          pointerEvents: 'none',
        }}
      />

      {/* Striker hand badge */}
      <div
        style={{
          position: 'absolute',
          bottom: '2px',
          right: '4px',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '0.55rem',
          fontWeight: 700,
          pointerEvents: 'none',
        }}
      >
        {batterHand.toUpperCase()[0]}HB
      </div>

      {/* Bowler indicator */}
      <div
        style={{
          position: 'absolute',
          top: '32%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#38bdf8',
          border: '1px solid #fff',
        }}
        title="Bowler"
      />

      {/* 10 Field markers */}
      {positions.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            top: `${p.y}%`,
            left: `${p.x}%`,
            transform: 'translate(-50%, -50%)',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: p.id === 'wk' ? '#f97316' : 'var(--accent-gold)',
            border: '1px solid #ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}
          title={`${p.name}: ${p.role}`}
        />
      ))}
    </div>
  );
};
