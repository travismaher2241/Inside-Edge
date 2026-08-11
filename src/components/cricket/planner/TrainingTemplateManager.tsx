import React, { useState } from 'react';
import type { ClubTeam, ClubTrainingSession, SavedClubTemplate, TrainingResource, TrainingResourceType } from '../../../types/cricket';
import { ArrowRight, Bookmark, Copy, Pencil, Plus, Save, Trash2 } from 'lucide-react';

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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rotationMins, setRotationMins] = useState(12);
  const [objectives, setObjectives] = useState('');
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [resourceTypes, setResourceTypes] = useState<TrainingResourceType[]>([]);

  const openForm = (template?: SavedClubTemplate) => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>CLUB TEMPLATES</div><h2 style={{ fontSize: '1.2rem' }}>Reusable session templates ({templates.length})</h2></div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {currentSession && <button className="btn btn-secondary" onClick={saveCurrent}><Save size={14} /> Save current</button>}
          <button className="btn btn-gold" onClick={() => openForm()}><Plus size={14} /> New template</button>
        </div>
      </div>

      {editing && (
        <form onSubmit={save} className="card" style={{ display: 'grid', gap: '12px' }}>
          <label>Template name<input value={name} onChange={event => setName(event.target.value)} required /></label>
          <label>Description<input value={description} onChange={event => setDescription(event.target.value)} /></label>
          <label>Rotation minutes<input type="number" min={5} value={rotationMins} onChange={event => setRotationMins(Number(event.target.value))} /></label>
          <label>Objectives, one per line<textarea value={objectives} onChange={event => setObjectives(event.target.value)} rows={3} /></label>
          {teams.length > 0 && <fieldset><legend>Teams</legend><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{teams.map(team => <label key={team.id}><input type="checkbox" checked={teamIds.includes(team.id)} onChange={() => setTeamIds(value => value.includes(team.id) ? value.filter(id => id !== team.id) : [...value, team.id])} /> {team.name}</label>)}</div></fieldset>}
          <fieldset><legend>Resource rules</legend><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{RESOURCE_TYPES.map(type => <label key={type.value}><input type="checkbox" checked={resourceTypes.includes(type.value)} onChange={() => setResourceTypes(value => value.includes(type.value) ? value.filter(item => item !== type.value) : [...value, type.value])} /> {type.label}</label>)}</div></fieldset>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-gold" type="submit">Save template</button></div>
        </form>
      )}

      {templates.map(template => (
        <div key={template.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}><h3 style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Bookmark size={16} color="var(--accent-gold)" />{template.name}</h3><p style={{ color: 'var(--text-secondary)' }}>{template.description}</p><div style={{ color: 'var(--accent-gold)', fontSize: '0.75rem' }}>{template.rotationDurationMinutes} min · {template.sessionObjectives.join('; ') || 'No objectives'} · {(template.resourceTypeRules ?? template.teamGroupRules).length} resource rule(s)</div></div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => openForm(template)}><Pencil size={14} /> Edit</button>
            <button className="btn btn-secondary" onClick={() => onSaveTemplate({ ...template, id: `tmpl-${Date.now()}`, name: `${template.name} copy` })}><Copy size={14} /> Duplicate</button>
            {onDeleteTemplate && <button className="btn btn-secondary" onClick={() => { if (window.confirm(`Delete the "${template.name}" template? This can't be undone.`)) onDeleteTemplate(template.id); }}><Trash2 size={14} /> Delete</button>}
            <button className="btn btn-primary" onClick={() => onApplyTemplate(template)}>Apply <ArrowRight size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
};
