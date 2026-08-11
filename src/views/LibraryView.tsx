// Activity Library & Problem-Based Search View for Inside Edge

import React, { useState } from 'react';
import type { Activity } from '../types/cricket';
import { Search } from 'lucide-react';

interface LibraryViewProps {
  activities: Activity[];
  onAddActivityToSession: (activity: Activity) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  activities,
  onAddActivityToSession
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredActivities = activities.filter(act => {
    const matchesQuery = searchQuery === '' || 
      act.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat = selectedCategory === 'ALL' || act.category === selectedCategory;

    return matchesQuery && matchesCat;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>CURATED COACHING CONTENT</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Activity Library ({activities.length})</h1>
      </div>

      {/* Problem-Based Search Bar */}
      <div style={{ position: 'relative' }}>
        <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Search by coaching problem (e.g. 'spin', 'new ball', 'death')..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 12px 12px 40px',
            background: 'var(--bg-surface-card)',
            border: '1px solid var(--border-light)',
            borderRadius: '10px',
            color: 'var(--text-main)',
            fontSize: '0.85rem'
          }}
        />
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['ALL', 'Batting', 'Bowling', 'Fielding', 'Tactical'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '6px 12px',
              borderRadius: '9999px',
              border: selectedCategory === cat ? '1px solid var(--accent-gold)' : '1px solid var(--border-light)',
              background: selectedCategory === cat ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
              color: selectedCategory === cat ? 'var(--accent-gold)' : 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Activity Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredActivities.map(act => (
          <div key={act.id} className="card" style={{ borderLeft: '4px solid var(--primary-green-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-gold">[{act.category}] {act.durationMinutes} MINS</span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '4px' }}>{act.name}</h3>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  onAddActivityToSession(act);
                }}
                style={{ width: 'auto', height: '34px', fontSize: '0.75rem' }}
              >
                + ADD TO SESSION
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', marginTop: '6px', fontWeight: 600 }}>
              Purpose: {act.purpose}
            </div>

            {/* Coaching Points */}
            <div style={{ marginTop: '10px', background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                COACHING CUES (3-6 POINTS)
              </div>
              <ul style={{ paddingLeft: '16px', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                {act.coachingPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>

            {/* Tags & Constraints */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
              {act.tags.map(t => (
                <span key={t} style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  #{t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
