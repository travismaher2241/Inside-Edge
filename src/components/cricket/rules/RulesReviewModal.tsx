import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, FileText, Edit3 } from 'lucide-react';
import type { CompetitionRuleSet, CompetitionRule } from '../../../modules/competition-rules/schemas/competitionRuleTypes';

interface RulesReviewModalProps {
  ruleSet: CompetitionRuleSet;
  isOpen: boolean;
  userRole?: string;
  onClose: () => void;
  onApproveRule: (ruleId: string) => void;
  onEditRule: (ruleId: string, updated: Partial<CompetitionRule>) => void;
  onRejectRule: (ruleId: string) => void;
  onActivateRuleSet: () => void;
}

export const RulesReviewModal: React.FC<RulesReviewModalProps> = ({
  ruleSet,
  isOpen,
  userRole = 'head_coach',
  onClose,
  onApproveRule,
  onEditRule,
  onRejectRule,
  onActivateRuleSet
}) => {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(ruleSet.rules[0]?.id || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editInterpretation, setEditInterpretation] = useState('');
  const [viewSourceModal, setViewSourceModal] = useState<CompetitionRule | null>(null);

  if (!isOpen) return null;

  const currentRule = ruleSet.rules.find(r => r.id === selectedRuleId) || ruleSet.rules[0];
  const pendingCount = ruleSet.rules.filter(r => r.status === 'Extracted' || r.status === 'Needs Review').length;
  const approvedCount = ruleSet.rules.filter(r => r.status === 'Approved').length;

  const handleStartEdit = (rule: CompetitionRule) => {
    setEditInterpretation(rule.approvedInterpretation || rule.rawInterpretation);
    setIsEditing(true);
  };

  const handleSaveEdit = (ruleId: string) => {
    onEditRule(ruleId, { approvedInterpretation: editInterpretation });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full h-[85vh] flex flex-col text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Review Playing Conditions</h2>
            <p className="text-xs text-slate-400">
              {ruleSet.organisationName} — {ruleSet.competitionName} ({ruleSet.season})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-medium">
              {approvedCount} Approved / {pendingCount} Pending Review
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Rule Sidebar */}
          <div className="w-1/3 border-r border-slate-800 bg-slate-950/50 overflow-y-auto p-3 space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Extracted Rules</h4>
            {ruleSet.rules.map(rule => {
              const isSelected = rule.id === currentRule?.id;
              return (
                <button
                  key={rule.id}
                  onClick={() => {
                    setSelectedRuleId(rule.id);
                    setIsEditing(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all text-xs ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500/50 text-slate-100 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold truncate">{rule.title}</span>
                    {rule.status === 'Approved' ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded">Approved</span>
                    ) : rule.ambiguityFlags.length > 0 ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-950/80 text-amber-400 border border-amber-800/60 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Ambiguous
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">Review</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{rule.approvedInterpretation || rule.rawInterpretation}</p>
                </button>
              );
            })}
          </div>

          {/* Rule Details Panel */}
          {currentRule && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-100">{currentRule.title}</h3>
                    <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded uppercase font-semibold">
                      {currentRule.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Behaviour: {currentRule.behaviour}</p>
                </div>
                <button
                  onClick={() => setViewSourceModal(currentRule)}
                  className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" /> View Original Source
                </button>
              </div>

              {/* Confidence & Ambiguity Indicators */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Extraction Confidence</span>
                  <span className={`text-sm font-semibold capitalize ${
                    currentRule.extractionConfidence === 'high' ? 'text-emerald-400' : currentRule.extractionConfidence === 'medium' ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {currentRule.extractionConfidence} Confidence
                  </span>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Ambiguity Status</span>
                  {currentRule.ambiguityFlags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {currentRule.ambiguityFlags.map(flag => (
                        <span key={flag} className="text-[10px] px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800/80 rounded">
                          ⚠ {flag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-emerald-400">✓ No Ambiguity Detected</span>
                  )}
                </div>
              </div>

              {/* Interpretation Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rule Interpretation</span>
                  {!isEditing && (
                    <button
                      onClick={() => handleStartEdit(currentRule)}
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      rows={3}
                      value={editInterpretation}
                      onChange={e => setEditInterpretation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setIsEditing(false)} className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1">
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(currentRule.id)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded font-medium"
                      >
                        Save & Approve
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-200 font-medium leading-relaxed">
                    {currentRule.approvedInterpretation || currentRule.rawInterpretation}
                  </p>
                )}

                {currentRule.rawInterpretation !== currentRule.approvedInterpretation && currentRule.approvedInterpretation && (
                  <div className="pt-2 border-t border-slate-900 text-xs text-slate-500">
                    <span className="font-semibold text-slate-400">Raw AI Extraction (Preserved):</span> "{currentRule.rawInterpretation}"
                  </div>
                )}
              </div>

              {/* Source Excerpt */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Source Reference & Quote</span>
                <p className="text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-slate-300">{currentRule.sourceSection}</span> — Page {currentRule.sourcePage}
                </p>
                <blockquote className="text-xs italic text-slate-300 border-l-2 border-slate-700 pl-3 py-1 bg-slate-900/40 rounded-r">
                  "{currentRule.sourceExcerpt}"
                </blockquote>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onApproveRule(currentRule.id)}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                      currentRule.status === 'Approved'
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> {currentRule.status === 'Approved' ? 'Approved' : 'Approve Rule'}
                  </button>
                  <button
                    onClick={() => onRejectRule(currentRule.id)}
                    className="px-4 py-2 text-xs font-semibold bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg transition-colors"
                  >
                    Reject Rule
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {pendingCount === 0 ? (
              <span className="text-emerald-400 font-semibold">✓ All rules reviewed! Ready for activation.</span>
            ) : (
              <span>⚠ {pendingCount} rules still require review before activation.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200">
              Close
            </button>
            {userRole !== 'assistant_coach' && (
              <button
                disabled={pendingCount > 0}
                onClick={onActivateRuleSet}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-colors shadow-lg"
              >
                Activate Playing Conditions
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Source View Overlay Modal */}
      {viewSourceModal && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" /> Source Document View
              </h3>
              <button onClick={() => setViewSourceModal(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <p><span className="text-slate-400 font-medium">Document ID:</span> {viewSourceModal.sourceDocumentId}</p>
              <p><span className="text-slate-400 font-medium">Section:</span> {viewSourceModal.sourceSection}</p>
              <p><span className="text-slate-400 font-medium">Page Number:</span> Page {viewSourceModal.sourcePage}</p>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 italic text-slate-300">
                "{viewSourceModal.sourceExcerpt}"
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-800 mt-4">
              <button onClick={() => setViewSourceModal(null)} className="px-4 py-2 bg-slate-800 text-slate-200 rounded text-xs font-semibold">
                Close Source View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
