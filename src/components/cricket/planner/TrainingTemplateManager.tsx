import React, { useState } from 'react';
import type { SavedClubTemplate } from '../../../types/cricket';
import { Bookmark, Plus, ArrowRight } from 'lucide-react';

interface TrainingTemplateManagerProps {
  templates: SavedClubTemplate[];
  onApplyTemplate: (template: SavedClubTemplate) => void;
  onSaveTemplate: (template: SavedClubTemplate) => void;
}

export const TrainingTemplateManager: React.FC<TrainingTemplateManagerProps> = ({
  templates,
  onApplyTemplate,
  onSaveTemplate
}) => {
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [rotationMins] = useState<number>(12);

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newTemplate: SavedClubTemplate = {
      id: `tmpl-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'Custom club training template',
      teamGroupRules: [
        { teamQuery: 'first_seconds', allocatedResourceType: 'pace_new_ball_net' },
        { teamQuery: 'remaining', allocatedResourceType: 'centre_wicket' }
      ],
      rotationDurationMinutes: rotationMins,
      sessionObjectives: ['Match preparation & tactical scenarios']
    };

    onSaveTemplate(newTemplate);
    setName('');
    setDescription('');
    setShowAddForm(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-gold)' }}>CLUB TEMPLATES</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Reusable Session Templates ({templates.length})</h2>
        </div>
        <button
          className="btn btn-gold"
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ width: 'auto', padding: '0 12px', height: '34px', fontSize: '0.75rem' }}
        >
          <Plus size={14} /> NEW TEMPLATE
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateTemplate} className="card" style={{ padding: '14px', background: 'var(--bg-surface-elevated)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px' }}>Create Reusable Club Template</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>TEMPLATE NAME</label>
              <input
                type="text"
                placeholder="e.g. Senior Nets / Junior Centre"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>DESCRIPTION</label>
              <input
                type="text"
                placeholder="Brief summary of allocation rules..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-surface-card)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '6px', marginTop: '4px' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)} style={{ width: 'auto', height: '34px', fontSize: '0.75rem' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" style={{ width: 'auto', height: '34px', fontSize: '0.75rem' }}>
              Save Template
            </button>
          </div>
        </form>
      )}

      {templates.map(tmpl => (
        <div key={tmpl.id} className="card" style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bookmark size={16} color="var(--accent-gold)" />
              {tmpl.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {tmpl.description}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', marginTop: '6px' }}>
              ⏱ {tmpl.rotationDurationMinutes} min rotations • Objectives: {tmpl.sessionObjectives.join('; ')}
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => onApplyTemplate(tmpl)}
            style={{ width: 'auto', padding: '0 12px', height: '36px', fontSize: '0.75rem' }}
          >
            APPLY <ArrowRight size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
