import React, { useState } from 'react';
import type { ClubTeam, ClubTrainingSession, SavedClubTemplate, TrainingResource, TrainingResourceType } from '../../../types/cricket';
import { Bookmark, ChevronDown, ChevronUp, Copy, MoreVertical, Pencil, Plus, Save, Trash2 } from 'lucide-react';

interface TrainingTemplateManagerProps {
  templates: SavedClubTemplate[];
  teams?: ClubTeam[];
  resources?: TrainingResource[];
  currentSession?: ClubTrainingSession;
  onApplyTemplate: (template: SavedClubTemplate) => void;
  onSaveTemplate: (template: SavedClubTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
}

const RESOURCE_TYPES: Array<{ value: TrainingResourceType; label: string }> = [
  { value: 'standard_net', label: 'Standard net' },
  { value: 'spin_net', label: 'Spin net' },
  { value: 'pace_new_ball_net', label: 'New-ball net' },
  { value: 'bowling_machine_net', label: 'Bowling machine' },
  { value: 'centre_wicket', label: 'Centre wicket' },
  { value: 'centre_wicket_half', label: 'Half centre wicket' },
  { value: 'fielding_area', label: 'Fielding area' },
  { value: 'wicketkeeping_station', label: 'Wicketkeeping station' },
  { value: 'fitness_area', label: 'Fitness area' },
  { value: 'custom', label: 'Custom resource' }
];

export const TrainingTemplateManager: React.FC<TrainingTemplateManagerProps> = ({
  templates,
  teams = [],
  resources = [],
  currentSession,
  onApplyTemplate,
  onSaveTemplate,
  onDeleteTemplate
}) => {
  const [editing, setEditing] = useState<SavedClubTemplate | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<SavedClubTemplate | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rotationMins, setRotationMins] = useState(12);
  const [objectives, setObjectives] = useState('');
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [resourceTypes, setResourceTypes] = useState<TrainingResourceType[]>([]);

  const openForm = (template?: SavedClubTemplate) => {
    setActiveMenuId(null);
    setEditing(template ?? { id: '', name: '', description: '', teamGroupRules: [], rotationDurationMinutes: 12, sessionObjectives: [] });
    setName(template?.name ?? '');
    setDescription(template?.description ?? '');
    setRotationMins(template?.rotationDurationMinutes ?? 12);
    setObjectives(template?.sessionObjectives.join('\n') ?? '');
    setTeamIds(template?.includedTeamIds ?? []);
    setResourceTypes(template?.resourceTypeRules ?? template?.teamGroupRules.map(rule => rule.allocatedResourceType) ?? []);
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const id = editing?.id || `tmpl-${Date.now()}`;
    onSaveTemplate({
      ...editing,
      id,
      name: name.trim(),
      description: description.trim() || 'Custom club training template',
      includedTeamIds: teamIds,
      resourceTypeRules: resourceTypes,
      teamGroupRules: resourceTypes.map(type => ({ teamQuery: 'all' as const, allocatedResourceType: type })),
      rotationDurationMinutes: Math.max(5, rotationMins),
      sessionObjectives: objectives.split('\n').map(value => value.trim()).filter(Boolean)
    });
    setEditing(null);
  };

  const saveCurrent = () => {
    if (!currentSession) return;
    const selectedTypes = [...new Set(resources.filter(resource => currentSession.availableResourceIds.includes(resource.id)).map(resource => resource.type))];
    onSaveTemplate({
      id: `tmpl-${Date.now()}`,
      name: `${currentSession.title} template`,
      description: `Saved from ${currentSession.title}`,
      includedTeamIds: currentSession.includedTeamIds,
      resourceTypeRules: selectedTypes,
      teamGroupRules: selectedTypes.map(type => ({ teamQuery: 'all', allocatedResourceType: type })),
      rotationDurationMinutes: currentSession.rotationDurationMinutes,
      sessionObjectives: currentSession.sessionObjectives,
      defaultStaffAllocation: currentSession.captainCoachAssignments
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Compact Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Templates</h2>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {templates.length} saved template{templates.length === 1 ? '' : 's'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {currentSession && (
            <button className="btn btn-secondary" onClick={saveCurrent} style={{ width: 'auto', padding: '0 10px', height: '36px', fontSize: '0.75rem' }}>
              <Save size={14} /> Save current
            </button>
          )}
          <button className="btn btn-gold" onClick={() => openForm()} style={{ width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.8rem' }}>
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      {/* Editing Form */}
      {editing && (
        <form onSubmit={save} className="card" style={{ display: 'grid', gap: '12px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
            {editing.id ? 'Edit Template' : 'New Template'}
          </h3>
          <label>Template name<input value={name} onChange={event => setName(event.target.value)} required /></label>
          <label>Description<input value={description} onChange={event => setDescription(event.target.value)} /></label>
          <label>Rotation minutes<input type="number" min={5} value={rotationMins} onChange={event => setRotationMins(Number(event.target.value))} /></label>
          <label>Objectives, one per line<textarea value={objectives} onChange={event => setObjectives(event.target.value)} rows={3} /></label>
          {teams.length > 0 && (
            <fieldset>
              <legend>Teams</legend>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {teams.map(team => (
                  <label key={team.id}>
                    <input 
                      type="checkbox" 
                      checked={teamIds.includes(team.id)} 
                      onChange={() => setTeamIds(value => value.includes(team.id) ? value.filter(id => id !== team.id) : [...value, team.id])} 
                    /> {team.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset>
            <legend>Resource rules</legend>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {RESOURCE_TYPES.map(type => (
                <label key={type.value}>
                  <input 
                    type="checkbox" 
                    checked={resourceTypes.includes(type.value)} 
                    onChange={() => setResourceTypes(value => value.includes(type.value) ? value.filter(item => item !== type.value) : [...value, type.value])} 
                  /> {type.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-gold" type="submit">Save template</button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTemplate && (
        <div className="bottom-sheet-overlay" style={{ alignItems: 'center', padding: '16px' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444', marginBottom: '8px' }}>Delete Template?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Delete "{deleteConfirmTemplate.name}"? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirmTemplate(null)}>Cancel</button>
              <button 
                className="btn" 
                style={{ background: '#ef4444', color: '#fff', fontWeight: 700 }}
                onClick={() => {
                  if (onDeleteTemplate) onDeleteTemplate(deleteConfirmTemplate.id);
                  setDeleteConfirmTemplate(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact Templates List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {templates.map(template => {
          const isExpanded = expandedId === template.id;
          const isMenuOpen = activeMenuId === template.id;
          const ruleCount = (template.resourceTypeRules ?? template.teamGroupRules).length;

          return (
            <div key={template.id} className="template-card-compact">
              <div className="template-header-row">
                <div 
                  style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : template.id)}
                >
                  <div className="template-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bookmark size={15} color="var(--accent-gold)" />
                    {template.name}
                  </div>
                  <div className="template-short-desc">{template.description}</div>
                </div>

                <div className="overflow-menu-container">
                  <button 
                    className="btn-icon-overflow"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(isMenuOpen ? null : template.id);
                    }}
                    aria-label="Template actions"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {isMenuOpen && (
                    <div className="overflow-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="overflow-menu-item"
                        onClick={() => openForm(template)}
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button 
                        className="overflow-menu-item"
                        onClick={() => {
                          setActiveMenuId(null);
                          onSaveTemplate({
                            ...template,
                            id: `tmpl-${Date.now()}`,
                            name: `${template.name} copy`
                          });
                        }}
                      >
                        <Copy size={14} /> Duplicate
                      </button>
                      {onDeleteTemplate && (
                        <button 
                          className="overflow-menu-item danger"
                          onClick={() => {
                            setActiveMenuId(null);
                            setDeleteConfirmTemplate(template);
                          }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Compact Metadata Pills */}
              <div className="template-pills-row">
                <span className="template-pill">{template.rotationDurationMinutes} min rotation</span>
                {ruleCount > 0 && <span className="template-pill">{ruleCount} resource {ruleCount === 1 ? 'rule' : 'rules'}</span>}
                <button 
                  onClick={() => setExpandedId(isExpanded ? null : template.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px', cursor: 'pointer', marginLeft: 'auto' }}
                >
                  {isExpanded ? <>Less <ChevronUp size={12} /></> : <>Details <ChevronDown size={12} /></>}
                </button>
              </div>

              {/* Expanded Detail State */}
              {isExpanded && (
                <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                  {template.sessionObjectives.length > 0 && (
                    <div>
                      <strong style={{ color: 'var(--accent-gold)' }}>Objectives:</strong>
                      <ul style={{ margin: '4px 0 0 16px', color: 'var(--text-secondary)' }}>
                        {template.sessionObjectives.map((obj, i) => <li key={i}>{obj}</li>)}
                      </ul>
                    </div>
                  )}
                  {template.includedTeamIds && template.includedTeamIds.length > 0 && (
                    <div style={{ color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-main)' }}>Target teams:</strong> {template.includedTeamIds.map(tid => teams.find(t => t.id === tid)?.name || tid).join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Primary Action Button */}
              <div className="template-actions-row">
                <button className="btn btn-primary" onClick={() => onApplyTemplate(template)}>
                  Use Template
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
