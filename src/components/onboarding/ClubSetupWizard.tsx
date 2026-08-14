import React, { useState } from 'react';
import { X, FileText, ArrowRight, Plus, Trash2, Calendar } from 'lucide-react';
import type { ClubSetupData } from '../../modules/onboarding/onboardingService';

interface ClubSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (setupData: ClubSetupData, directToPlanner: boolean) => void;
}

export const ClubSetupWizard: React.FC<ClubSetupWizardProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [step, setStep] = useState<number>(1);
  const [clubName, setClubName] = useState<string>('');
  const [season, setSeason] = useState<string>('2026/27');
  const [teamName, setTeamName] = useState<string>('1st XI');
  const [teamType, setTeamType] = useState<'Senior' | 'Junior'>('Senior');
  const [gradeName, setGradeName] = useState<string>('Division 1');

  const [players, setPlayers] = useState<Array<{ name: string; primaryRole?: string }>>([
    { name: 'Jack Miller', primaryRole: 'Batter' },
    { name: 'Ben Smith', primaryRole: 'Pace Bowler' }
  ]);
  const [newPlayerName, setNewPlayerName] = useState<string>('');

  if (!isOpen) return null;

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    setPlayers(prev => [...prev, { name: newPlayerName.trim(), primaryRole: 'All-Rounder' }]);
    setNewPlayerName('');
  };

  const handleRemovePlayer = (index: number) => {
    setPlayers(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = (directToPlanner: boolean) => {
    onComplete({
      clubName: clubName.trim() || 'My Cricket Club',
      season,
      teamName: teamName.trim() || '1st XI',
      teamType,
      gradeName,
      players
    }, directToPlanner);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl space-y-6">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
              STEP {step} OF 4
            </span>
            <h3 className="font-bold text-sm text-slate-200">
              {step === 1 && 'Club Details'}
              {step === 2 && 'First Team'}
              {step === 3 && 'Add Players'}
              {step === 4 && 'Playing Conditions'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Club */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Club Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Western Park Cricket Club"
                value={clubName}
                onChange={e => setClubName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Season</label>
              <select
                value={season}
                onChange={e => setSeason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="2026/27">2026/27</option>
                <option value="2025/26">2025/26</option>
              </select>
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                disabled={!clubName.trim()}
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Team */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Team Name</label>
              <input
                type="text"
                required
                placeholder="e.g. 1st XI"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Team Type</label>
                <select
                  value={teamType}
                  onChange={e => setTeamType(e.target.value as 'Senior' | 'Junior')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="Senior">Senior</option>
                  <option value="Junior">Junior</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Grade (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Division 1"
                  value={gradeName}
                  onChange={e => setGradeName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button onClick={() => setStep(1)} className="text-xs text-slate-400 hover:text-slate-200">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Players */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add player name..."
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleAddPlayer}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
              {players.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <span className="font-semibold text-slate-200">{p.name}</span>
                  <button onClick={() => handleRemovePlayer(idx)} className="text-slate-500 hover:text-rose-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button onClick={() => setStep(2)} className="text-xs text-slate-400 hover:text-slate-200">
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Playing Conditions */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-center">
              <FileText className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
              <h4 className="font-bold text-sm">League Playing Conditions</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inside Edge can use your competition playing conditions to make Match planning relevant to your actual league.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => handleFinalSubmit(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <Calendar className="w-4 h-4" /> Plan My First Training Session
              </button>
              <button
                onClick={() => handleFinalSubmit(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                Go to Home View
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
