import React, { useState } from 'react';
import { X, Plus, BookOpen } from 'lucide-react';
import type { RuleCategory, RuleBehaviour } from '../../../modules/competition-rules/schemas/competitionRuleTypes';

interface ManualRuleEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ruleData: {
    title: string;
    category: RuleCategory;
    behaviour: RuleBehaviour;
    rawInterpretation: string;
    approvedInterpretation: string;
    sourceExcerpt: string;
    coachNotes?: string;
  }) => void;
}

export const ManualRuleEntryModal: React.FC<ManualRuleEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RuleCategory>('bowling');
  const [behaviour, setBehaviour] = useState<RuleBehaviour>('CONSTRAINT');
  const [interpretation, setInterpretation] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coachNotes, setCoachNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !interpretation.trim()) return;

    onSubmit({
      title: title.trim(),
      category,
      behaviour,
      rawInterpretation: interpretation.trim(),
      approvedInterpretation: interpretation.trim(),
      sourceExcerpt: excerpt.trim() || interpretation.trim(),
      coachNotes: coachNotes.trim()
    });

    // Reset
    setTitle('');
    setInterpretation('');
    setExcerpt('');
    setCoachNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-lg">Add Manual Playing Condition</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Rule Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Maximum Overs Per Bowler"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as RuleCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="match_structure">Match Structure</option>
                <option value="bowling">Bowling</option>
                <option value="batting">Batting</option>
                <option value="fielding">Fielding</option>
                <option value="match_phases">Match Phases</option>
                <option value="player_eligibility">Player Eligibility</option>
                <option value="equipment_ground">Equipment & Pitch</option>
                <option value="safety">Safety</option>
                <option value="procedure">Procedure</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Behaviour</label>
              <select
                value={behaviour}
                onChange={e => setBehaviour(e.target.value as RuleBehaviour)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="CONSTRAINT">Constraint (Hard Limit)</option>
                <option value="CALCULATION">Calculation</option>
                <option value="INFORMATION">Information</option>
                <option value="WARNING">Warning</option>
                <option value="PROCEDURE">Procedure</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Rule Summary / Interpretation</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. A bowler may bowl a maximum of 8 overs in a 40-over innings."
              value={interpretation}
              onChange={e => setInterpretation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Source Excerpt / Authority Note</label>
            <input
              type="text"
              placeholder="e.g. Manual entry based on WDCA By-Law 7.3 email amendment"
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Coach Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Applies to senior 1st & 2nd XI grades only"
              value={coachNotes}
              onChange={e => setCoachNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
