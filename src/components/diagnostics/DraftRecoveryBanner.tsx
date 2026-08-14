import React, { useState, useEffect } from 'react';
import { RotateCcw, X, FileText } from 'lucide-react';
import { DraftRecoveryEngine, type UnsavedDraft } from '../../modules/diagnostics/draftRecoveryEngine';

interface DraftRecoveryBannerProps {
  onRestoreDraft: (draft: UnsavedDraft) => void;
}

export const DraftRecoveryBanner: React.FC<DraftRecoveryBannerProps> = ({ onRestoreDraft }) => {
  const [activeDraft, setActiveDraft] = useState<UnsavedDraft | null>(null);

  useEffect(() => {
    const drafts = DraftRecoveryEngine.getAllDrafts();
    if (drafts.length > 0) {
      setActiveDraft(drafts[0]);
    }
  }, []);

  if (!activeDraft) return null;

  const handleRestore = () => {
    onRestoreDraft(activeDraft);
    DraftRecoveryEngine.discardDraft(activeDraft.type);
    setActiveDraft(null);
  };

  const handleDiscard = () => {
    DraftRecoveryEngine.discardDraft(activeDraft.type);
    setActiveDraft(null);
  };

  return (
    <div className="bg-slate-900 border-b border-emerald-800/80 px-4 py-2.5 flex items-center justify-between text-xs text-slate-200">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-emerald-400" />
        <span>
          <strong className="text-slate-100">Unfinished Work Found:</strong> Inside Edge found an unsaved {activeDraft.type.replace(/_/g, ' ')} draft ({activeDraft.title}).
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleRestore}
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Restore
        </button>
        <button
          onClick={handleDiscard}
          className="px-2.5 py-1 text-slate-400 hover:text-slate-200"
        >
          Discard
        </button>
      </div>
    </div>
  );
};
