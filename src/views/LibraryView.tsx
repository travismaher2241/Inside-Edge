import React, { useState } from 'react';
import type { Activity } from '../types/cricket';
import { Search, X } from 'lucide-react';

interface LibraryViewProps {
  activities: Activity[];
  onAddActivityToSession: (activity: Activity) => void;
  addedActivityIds?: string[];
  onUndoAddActivity?: (activityId: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ activities, onAddActivityToSession, addedActivityIds = [], onUndoAddActivity }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [spaceFilter, setSpaceFilter] = useState('all');
  const [maxDuration, setMaxDuration] = useState(60);
  const [playerCount, setPlayerCount] = useState(0);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [lastAdded, setLastAdded] = useState<Activity | null>(null);

  const filteredActivities = activities.filter(activity => {
    const query = searchQuery.trim().toLowerCase();
    return (!query || `${activity.name} ${activity.purpose} ${activity.tags.join(' ')}`.toLowerCase().includes(query))
      && (selectedCategory === 'ALL' || activity.category === selectedCategory)
      && (spaceFilter === 'all' || activity.spaceRequired === spaceFilter)
      && activity.durationMinutes <= maxDuration
      && (!playerCount || (activity.minPlayers <= playerCount && activity.maxPlayers >= playerCount));
  });

  const add = (activity: Activity) => {
    onAddActivityToSession(activity);
    setLastAdded(activity);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div><div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>COACHING CONTENT</div><h1 style={{ fontSize: '1.4rem' }}>Activity library ({activities.length})</h1></div>
      <label style={{ position: 'relative' }}><span className="sr-only">Search activities</span><Search size={18} style={{ position: 'absolute', left: '12px', top: '18px' }} /><input type="search" placeholder="Search activity, purpose or tag" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} style={{ paddingLeft: '40px' }} /></label>
      <div className="library-filters">
        <label>Category<select value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)}><option>ALL</option>{['Batting','Bowling','Fielding','Wicketkeeping','Tactical','Physical','Team'].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Space<select value={spaceFilter} onChange={event => setSpaceFilter(event.target.value)}><option value="all">All spaces</option><option value="net">Net</option><option value="pitch">Centre wicket</option><option value="outfield">Outfield</option><option value="small_grid">Small grid</option><option value="indoor">Indoor</option></select></label>
        <label>Maximum duration<input type="number" min={5} value={maxDuration} onChange={event => setMaxDuration(Number(event.target.value))} /></label>
        <label>Players<input type="number" min={0} placeholder="Any" value={playerCount || ''} onChange={event => setPlayerCount(Number(event.target.value))} /></label>
      </div>

      <div className="library-grid">
        {filteredActivities.map(activity => {
          const added = addedActivityIds.includes(activity.id);
          return <article key={activity.id} className="card" style={{ display: 'grid', gap: '8px', alignContent: 'start' }}>
            <div><span className="badge badge-gold">{activity.category}</span><h2 style={{ fontSize: '1.05rem', marginTop: '6px' }}>{activity.name}</h2></div>
            <p style={{ color: 'var(--text-secondary)' }}>{activity.purpose}</p>
            <div style={{ fontSize: '0.78rem' }}>{activity.durationMinutes} min · {activity.spaceRequired.replace('_',' ')} · {activity.minPlayers}–{activity.maxPlayers} players · {activity.participationDensity} density</div>
            <div style={{ display: 'flex', gap: '8px' }}><button className="btn btn-secondary" onClick={() => setSelectedActivity(activity)}>Details</button><button className="btn btn-primary" disabled={added} onClick={() => add(activity)}>{added ? 'Added' : 'Add'}</button></div>
          </article>;
        })}
      </div>
      {filteredActivities.length === 0 && <div className="card">No activities match these filters.</div>}

      {selectedActivity && <div className="bottom-sheet-overlay" onClick={() => setSelectedActivity(null)}><div role="dialog" aria-modal="true" aria-labelledby="activity-detail-title" className="bottom-sheet-content" onClick={event => event.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2 id="activity-detail-title">{selectedActivity.name}</h2><button aria-label="Close activity details" className="btn btn-secondary" onClick={() => setSelectedActivity(null)} style={{ width: 'auto' }}><X size={20} /></button></div>
        {[['Setup', selectedActivity.setupSteps], ['Coaching points', selectedActivity.coachingPoints], ['Constraints', selectedActivity.constraints], ['Progressions', selectedActivity.progressions], ['Equipment', selectedActivity.equipment], ['Safety', selectedActivity.safetyNotes ? [selectedActivity.safetyNotes] : []]].map(([title, values]) => <section key={title as string} style={{ marginTop: '14px' }}><h3>{title}</h3>{(values as string[]).length ? <ul style={{ paddingLeft: '20px' }}>{(values as string[]).map(value => <li key={value}>{value}</li>)}</ul> : <p style={{ color: 'var(--text-secondary)' }}>None specified.</p>}</section>)}
        <button className="btn btn-primary" disabled={addedActivityIds.includes(selectedActivity.id)} onClick={() => add(selectedActivity)}>{addedActivityIds.includes(selectedActivity.id) ? 'Added' : 'Add to current session'}</button>
      </div></div>}

      {lastAdded && <div role="status" className="card" style={{ position: 'sticky', bottom: '80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{lastAdded.name} added.</span><button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => { onUndoAddActivity?.(lastAdded.id); setLastAdded(null); }}>Undo</button></div>}
    </div>
  );
};
