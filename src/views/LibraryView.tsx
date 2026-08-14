import React, { useState } from 'react';
import type { Activity } from '../types/cricket';
import { Search, X, SlidersHorizontal, Check, Plus } from 'lucide-react';

interface LibraryViewProps {
  activities: Activity[];
  onAddActivityToSession: (activity: Activity) => void;
  addedActivityIds?: string[];
  onUndoAddActivity?: (activityId: string) => void;
}

const CATEGORY_OPTIONS = ['ALL', 'Batting', 'Bowling', 'Fielding', 'Wicketkeeping', 'Tactical', 'Physical', 'Team'];

const SPACE_OPTIONS = [
  { value: 'all', label: 'Any space' },
  { value: 'net', label: 'Net' },
  { value: 'pitch', label: 'Centre wicket' },
  { value: 'outfield', label: 'Outfield' },
  { value: 'small_grid', label: 'Small grid' },
  { value: 'indoor', label: 'Indoor' }
];

const DURATION_OPTIONS = [
  { value: null, label: 'Any' },
  { value: 10, label: '≤ 10 min' },
  { value: 15, label: '≤ 15 min' },
  { value: 20, label: '≤ 20 min' },
  { value: 30, label: '≤ 30 min' },
  { value: 45, label: '≤ 45 min' },
  { value: 60, label: '≤ 60 min' }
];

const PLAYER_GROUP_OPTIONS = [
  { value: 'any', label: 'Any group size' },
  { value: '1-3', label: '1–3 players', min: 1, max: 3 },
  { value: '4-6', label: '4–6 players', min: 4, max: 6 },
  { value: '7-10', label: '7–10 players', min: 7, max: 10 },
  { value: '11-15', label: '11–15 players', min: 11, max: 15 },
  { value: '16+', label: '16+ players', min: 16, max: 99 }
];

const AGE_SUITABILITY_OPTIONS: { value: 'any' | 'junior' | 'senior'; label: string }[] = [
  { value: 'any', label: 'Any age group' },
  { value: 'junior', label: 'Junior-suitable' },
  { value: 'senior', label: 'Senior-suitable' }
];

export const LibraryView: React.FC<LibraryViewProps> = ({
  activities,
  onAddActivityToSession,
  addedActivityIds = [],
  onUndoAddActivity
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [spaceFilter, setSpaceFilter] = useState<string>('all');
  const [maxDuration, setMaxDuration] = useState<number | null>(null);
  const [playerGroup, setPlayerGroup] = useState<string>('any');
  const [ageSuitabilityFilter, setAgeSuitabilityFilter] = useState<'any' | 'junior' | 'senior'>('any');

  // Modals & Drawers
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState<boolean>(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [lastAdded, setLastAdded] = useState<Activity | null>(null);

  // Filter Logic
  const filteredActivities = activities.filter(activity => {
    // 1. Search Query
    const query = searchQuery.trim().toLowerCase();
    if (query && !`${activity.name} ${activity.purpose} ${activity.tags.join(' ')}`.toLowerCase().includes(query)) {
      return false;
    }

    // 2. Category
    if (selectedCategory !== 'ALL' && activity.category !== selectedCategory) {
      return false;
    }

    // 3. Space
    if (spaceFilter !== 'all' && activity.spaceRequired !== spaceFilter) {
      return false;
    }

    // 4. Max Duration
    if (maxDuration !== null && activity.durationMinutes > maxDuration) {
      return false;
    }

    // 5. Player Group Range
    if (playerGroup !== 'any') {
      const matchGroup = PLAYER_GROUP_OPTIONS.find(g => g.value === playerGroup);
      if (matchGroup && matchGroup.min !== undefined && matchGroup.max !== undefined) {
        // Activity is compatible if its min-max range overlaps with selected group range
        if (activity.minPlayers > matchGroup.max || activity.maxPlayers < matchGroup.min) {
          return false;
        }
      }
    }

    // 6. Age Suitability (absent/'all' on the activity means suitable for everyone)
    if (ageSuitabilityFilter !== 'any') {
      const suitability = activity.ageSuitability ?? 'all';
      if (suitability !== 'all' && suitability !== ageSuitabilityFilter) {
        return false;
      }
    }

    return true;
  });

  const activeFiltersCount = (selectedCategory !== 'ALL' ? 1 : 0)
    + (spaceFilter !== 'all' ? 1 : 0)
    + (maxDuration !== null ? 1 : 0)
    + (playerGroup !== 'any' ? 1 : 0)
    + (ageSuitabilityFilter !== 'any' ? 1 : 0);

  const resetAllFilters = () => {
    setSelectedCategory('ALL');
    setSpaceFilter('all');
    setMaxDuration(null);
    setPlayerGroup('any');
    setAgeSuitabilityFilter('any');
  };

  const handleAdd = (activity: Activity) => {
    onAddActivityToSession(activity);
    setLastAdded(activity);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Title Header & Results Counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Activity Library</h1>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {activeFiltersCount > 0
              ? `${filteredActivities.length} matche${filteredActivities.length === 1 ? '' : 's'}`
              : `${activities.length} activities`
            }
          </div>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => setIsFilterSheetOpen(true)}
          style={{ width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <SlidersHorizontal size={14} />
          Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
        </button>
      </div>

      {/* Search Input Bar */}
      <div style={{ position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
        <input
          type="search"
          placeholder="Search activities..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            paddingLeft: '40px',
            paddingRight: searchQuery ? '36px' : '12px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface-card)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-main)',
            fontSize: '0.9rem'
          }}
        />
        {searchQuery && (
          <button
            aria-label="Clear search query"
            onClick={() => setSearchQuery('')}
            style={{ position: 'absolute', right: '10px', top: '11px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Active Filter Chips Bar */}
      {activeFiltersCount > 0 && (
        <div className="library-filter-chips-row">
          {selectedCategory !== 'ALL' && (
            <span className="filter-chip">
              {selectedCategory}
              <button aria-label={`Remove filter for category ${selectedCategory}`} onClick={() => setSelectedCategory('ALL')} className="filter-chip-remove">✕</button>
            </span>
          )}
          {spaceFilter !== 'all' && (
            <span className="filter-chip">
              {SPACE_OPTIONS.find(s => s.value === spaceFilter)?.label}
              <button aria-label="Remove space filter" onClick={() => setSpaceFilter('all')} className="filter-chip-remove">✕</button>
            </span>
          )}
          {maxDuration !== null && (
            <span className="filter-chip">
              ≤ {maxDuration} min
              <button aria-label="Remove duration filter" onClick={() => setMaxDuration(null)} className="filter-chip-remove">✕</button>
            </span>
          )}
          {playerGroup !== 'any' && (
            <span className="filter-chip">
              {PLAYER_GROUP_OPTIONS.find(g => g.value === playerGroup)?.label}
              <button aria-label="Remove player count filter" onClick={() => setPlayerGroup('any')} className="filter-chip-remove">✕</button>
            </span>
          )}
          {ageSuitabilityFilter !== 'any' && (
            <span className="filter-chip">
              {AGE_SUITABILITY_OPTIONS.find(a => a.value === ageSuitabilityFilter)?.label}
              <button aria-label="Remove age suitability filter" onClick={() => setAgeSuitabilityFilter('any')} className="filter-chip-remove">✕</button>
            </span>
          )}
          <button
            onClick={resetAllFilters}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', padding: '4px 6px' }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Activity Results Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredActivities.map(activity => {
          const added = addedActivityIds.includes(activity.id);

          return (
            <article
              key={activity.id}
              className="library-activity-card"
              onClick={() => setSelectedActivity(activity)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-gold">{activity.category}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {activity.durationMinutes} min · {activity.spaceRequired.replace('_', ' ')}
                </span>
              </div>

              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>{activity.name}</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                  {activity.purpose}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  👥 {activity.minPlayers}–{activity.maxPlayers} players
                </div>

                <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedActivity(activity)}
                    style={{ width: 'auto', padding: '0 10px', height: '32px', fontSize: '0.75rem' }}
                  >
                    Details
                  </button>
                  <button
                    className={added ? 'btn btn-secondary' : 'btn btn-gold'}
                    disabled={added}
                    onClick={() => handleAdd(activity)}
                    style={{ width: 'auto', padding: '0 12px', height: '32px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {added ? (
                      <>
                        <Check size={14} /> Added
                      </>
                    ) : (
                      <>
                        <Plus size={14} /> Add
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* No Results Friendly State */}
      {filteredActivities.length === 0 && (
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
            No activities match these filters.
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Try removing a filter or widening the group size.
          </div>
          <button
            className="btn btn-gold"
            onClick={resetAllFilters}
            style={{ width: 'auto', margin: '14px auto 0', padding: '0 16px', height: '36px', fontSize: '0.8rem' }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Filter Bottom Sheet Modal */}
      {isFilterSheetOpen && (
        <div className="bottom-sheet-overlay" onClick={() => setIsFilterSheetOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter activities"
            className="bottom-sheet-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-gold)' }}>FILTER ACTIVITIES</h2>
              <button aria-label="Close filter sheet" onClick={() => setIsFilterSheetOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Category Filter */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CATEGORY</div>
                <div className="filter-pill-grid">
                  {CATEGORY_OPTIONS.map(cat => (
                    <button
                      key={cat}
                      className={`filter-pill-btn ${selectedCategory === cat ? 'selected' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat === 'ALL' ? 'All categories' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Space Filter */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>SPACE REQUIRED</div>
                <div className="filter-pill-grid">
                  {SPACE_OPTIONS.map(sp => (
                    <button
                      key={sp.value}
                      className={`filter-pill-btn ${spaceFilter === sp.value ? 'selected' : ''}`}
                      onClick={() => setSpaceFilter(sp.value)}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Maximum Duration Filter */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>MAX DURATION</div>
                <div className="filter-pill-grid">
                  {DURATION_OPTIONS.map(dur => (
                    <button
                      key={dur.label}
                      className={`filter-pill-btn ${maxDuration === dur.value ? 'selected' : ''}`}
                      onClick={() => setMaxDuration(dur.value)}
                    >
                      {dur.label === 'Any' ? 'Any duration' : dur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Players Group Size Filter */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>GROUP SIZE (PLAYERS)</div>
                <div className="filter-pill-grid">
                  {PLAYER_GROUP_OPTIONS.map(grp => (
                    <button
                      key={grp.value}
                      className={`filter-pill-btn ${playerGroup === grp.value ? 'selected' : ''}`}
                      onClick={() => setPlayerGroup(grp.value)}
                    >
                      {grp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Suitability Filter */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AGE SUITABILITY</div>
                <div className="filter-pill-grid">
                  {AGE_SUITABILITY_OPTIONS.map(age => (
                    <button
                      key={age.value}
                      className={`filter-pill-btn ${ageSuitabilityFilter === age.value ? 'selected' : ''}`}
                      onClick={() => setAgeSuitabilityFilter(age.value)}
                    >
                      {age.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sheet Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                <button
                  className="btn btn-secondary"
                  onClick={resetAllFilters}
                  style={{ flex: 1, height: '40px', fontSize: '0.85rem' }}
                >
                  Reset
                </button>
                <button
                  className="btn btn-gold"
                  onClick={() => setIsFilterSheetOpen(false)}
                  style={{ flex: 2, height: '40px', fontSize: '0.85rem' }}
                >
                  Show {filteredActivities.length} Activit{filteredActivities.length === 1 ? 'y' : 'ies'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Details Drawer */}
      {selectedActivity && (
        <div className="bottom-sheet-overlay" onClick={() => setSelectedActivity(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-detail-title"
            className="bottom-sheet-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-gold">{selectedActivity.category}</span>
                <h2 id="activity-detail-title" style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px' }}>
                  {selectedActivity.name}
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  ⏱ {selectedActivity.durationMinutes} min · 📍 {selectedActivity.spaceRequired.replace('_', ' ')} · 👥 {selectedActivity.minPlayers}–{selectedActivity.maxPlayers} players
                </div>
              </div>
              <button aria-label="Close activity details" className="btn btn-secondary" onClick={() => setSelectedActivity(null)} style={{ width: 'auto', padding: '0 8px', height: '32px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: '14px', fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-main)' }}>
              <strong>Purpose:</strong> {selectedActivity.purpose}
            </div>

            {[
              ['Setup', selectedActivity.setupSteps],
              ['Coaching Cues (3–5 Points)', selectedActivity.coachingPoints],
              ['If Struggling (Simplification)', selectedActivity.structuredProgressions?.simplification || []],
              ['If Succeeding (Progression)', selectedActivity.structuredProgressions?.advancement || selectedActivity.progressions || []],
              ['Add Decision Making', selectedActivity.structuredProgressions?.decisionMaking || []],
              ['Take into Game (Game Scenarios)', (selectedActivity.structuredProgressions?.gameScenarios || []).map(s => `${s.title}: ${s.description}`)],
              ['Equipment', selectedActivity.equipment],
              ['Safety', selectedActivity.safetyNotes ? [selectedActivity.safetyNotes] : []]
            ].map(([title, values]) => (
              <section key={title as string} style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase' }}>
                  {title}
                </div>
                {(values as string[]).length ? (
                  <ul style={{ paddingLeft: '18px', marginTop: '4px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {(values as string[]).map(v => <li key={v}>{v}</li>)}
                  </ul>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>None specified.</div>
                )}
              </section>
            ))}

            <button
              className="btn btn-gold"
              disabled={addedActivityIds.includes(selectedActivity.id)}
              onClick={() => {
                handleAdd(selectedActivity);
                setSelectedActivity(null);
              }}
              style={{ marginTop: '16px', height: '40px', fontSize: '0.85rem' }}
            >
              {addedActivityIds.includes(selectedActivity.id) ? '✓ Added to Session' : '+ Add to Current Session'}
            </button>
          </div>
        </div>
      )}

      {/* Sticky Toast for Last Added Activity */}
      {lastAdded && (
        <div
          role="status"
          className="card"
          style={{
            position: 'sticky',
            bottom: '80px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-gold)',
            padding: '10px 14px',
            fontSize: '0.85rem',
            zIndex: 20
          }}
        >
          <span style={{ fontWeight: 700, color: '#4ade80' }}>
            ✓ {lastAdded.name} added to session.
          </span>
          <button
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '0 10px', height: '30px', fontSize: '0.75rem' }}
            onClick={() => {
              onUndoAddActivity?.(lastAdded.id);
              setLastAdded(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
};
