import React, { useState } from 'react';
import { X, MessageSquare, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ProblemReporter, type ProblemReport } from '../../modules/diagnostics/problemReporter';

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportProblemModal: React.FC<ReportProblemModalProps> = ({
  isOpen,
  onClose
}) => {
  const [category, setCategory] = useState<ProblemReport['category']>('Training Planner');
  const [description, setDescription] = useState('');
  const [userGoal, setUserGoal] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [submittedReport, setSubmittedReport] = useState<ProblemReport | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const report = ProblemReporter.submitReport({
      category,
      description: description.trim(),
      userGoalText: userGoal.trim() || undefined,
      includeDiagnostics
    });

    setSubmittedReport(report);
  };

  const handleReset = () => {
    setDescription('');
    setUserGoal('');
    setSubmittedReport(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-slate-100">Report a Problem</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedReport ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-lg text-slate-100">Feedback Submitted</h4>
              <p className="text-xs text-slate-400">
                Thank you for helping test Inside Edge. Your error reference code is:
              </p>
              <div className="inline-block bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-base font-mono font-bold text-emerald-400 my-2">
                {submittedReport.errorReference}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Tell our team this error reference ID ({submittedReport.errorReference}) so we can locate the redacted diagnostic context.
            </p>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Feature Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ProblemReport['category'])}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="Training Planner">Training Planner</option>
                <option value="Live Training">Live Training</option>
                <option value="Match">Match Preparation & Review</option>
                <option value="Players">Players & Squad</option>
                <option value="Playing Conditions">Playing Conditions / League Rules</option>
                <option value="Video">Video Capture & Tagging</option>
                <option value="Account">Account & Permissions</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">What happened?</label>
              <textarea
                required
                rows={3}
                placeholder="Describe what was confusing or didn't work as expected..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">What were you trying to do? (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Plan a 40-over match bowler allocation"
                value={userGoal}
                onChange={e => setUserGoal(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDiagnostics}
                onChange={e => setIncludeDiagnostics(e.target.checked)}
                className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Include non-sensitive technical diagnostic context (build version & route)</span>
            </label>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Private notes & text strictly redacted
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
