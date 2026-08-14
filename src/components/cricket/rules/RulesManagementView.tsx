import React, { useState } from 'react';
import { Upload, BookOpen, ShieldCheck, AlertTriangle, FileText, Plus, CheckCircle2, GitCompare } from 'lucide-react';
import type { CompetitionRuleSet, CompetitionRule } from '../../../modules/competition-rules/schemas/competitionRuleTypes';
import { DocumentService } from '../../../modules/competition-rules/documents/documentService';
import { extractPdfPages } from '../../../modules/competition-rules/ingestion/pdfTextExtractor';
import { RuleReviewService } from '../../../modules/competition-rules/review/ruleReviewService';
import { ApprovalService } from '../../../modules/competition-rules/review/approvalService';
import { RuleSetVersionEngine } from '../../../modules/competition-rules/versioning/ruleSetVersionEngine';
import { RuleSetDiffEngine, type RuleSetDiffResult } from '../../../modules/competition-rules/versioning/ruleSetDiffEngine';
import { RuleSetAssignmentService } from '../../../modules/competition-rules/assignment/ruleSetAssignmentService';
import { CompetitionRuleRepository } from '../../../modules/competition-rules/storage/competitionRuleRepository';
import { RulesReviewModal } from './RulesReviewModal';
import { ManualRuleEntryModal } from './ManualRuleEntryModal';

interface RulesManagementViewProps {
  clubId?: string;
  teamId?: string;
  userRole?: string;
  season?: string;
}

export const RulesManagementView: React.FC<RulesManagementViewProps> = ({
  clubId = 'club-1',
  teamId = 't1',
  userRole = 'head_coach',
  season = '2026/27'
}) => {
  const [selectedSeason, setSelectedSeason] = useState(season);
  const competitionName = 'Warragul & District Cricket Association';
  const [gradeName, setGradeName] = useState('Division 1');

  const [activeRuleSet, setActiveRuleSet] = useState<CompetitionRuleSet | undefined>(
    CompetitionRuleRepository.getActiveRuleSetForCompetition(competitionName, selectedSeason, gradeName)
  );

  const [reviewRuleSet, setReviewRuleSet] = useState<CompetitionRuleSet | undefined>(activeRuleSet);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [diffResult, setDiffResult] = useState<RuleSetDiffResult | null>(null);

  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');

  const refreshData = () => {
    const active = CompetitionRuleRepository.getActiveRuleSetForCompetition(competitionName, selectedSeason, gradeName);
    setActiveRuleSet(active);
    if (!reviewRuleSet && active) setReviewRuleSet(active);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingStatus(`Uploading & reading ${file.name}...`);
    setDuplicateWarning('');

    const reader = new FileReader();
    reader.onload = event => {
      const content = (event.target?.result as string) || '';

      // 1. Create document
      const docResult = DocumentService.createDocument({
        originalFileName: file.name,
        mimeType: file.type || 'application/pdf',
        uploadedBy: 'coach_head_1',
        documentType: 'playing_conditions',
        clubId,
        seasonHint: selectedSeason,
        competitionHint: competitionName,
        gradeHint: gradeName,
        content
      });

      if (docResult.isDuplicate) {
        setDuplicateWarning(`File "${file.name}" appears to be a duplicate of an existing uploaded document.`);
      }

      const doc = docResult.document;
      const pageResult = extractPdfPages(content);

      DocumentService.updateDocument(doc.id, {
        pageCount: pageResult.pageCount,
        readablePageCount: pageResult.readablePageCount,
        unreadablePages: pageResult.unreadablePages,
        scannedPdfDetected: pageResult.scannedPdfDetected,
        extractionWarnings: pageResult.extractionWarnings,
        extractionStatus: pageResult.readablePageCount > 0 ? 'success' : 'partial'
      });

      // 2. Draft ruleset creation / versioning
      if (activeRuleSet) {
        // Revision upload -> versioning
        const candidates = RuleReviewService.processDocumentToDraftRuleSet({
          organisationName: competitionName,
          competitionName,
          gradeName,
          season: selectedSeason,
          documents: [{ document: doc, rawContent: content }],
          createdBy: 'coach_head_1'
        });

        const newVersion = RuleSetVersionEngine.createNewVersion(
          activeRuleSet.id,
          [doc.id],
          candidates.rules,
          'coach_head_1'
        );

        if (newVersion) {
          const diff = RuleSetDiffEngine.diffRuleSets(activeRuleSet, newVersion);
          setDiffResult(diff);
          setReviewRuleSet(newVersion);
        }
      } else {
        const draft = RuleReviewService.processDocumentToDraftRuleSet({
          organisationName: competitionName,
          competitionName,
          gradeName,
          season: selectedSeason,
          documents: [{ document: doc, rawContent: content }],
          createdBy: 'coach_head_1'
        });
        setReviewRuleSet(draft);
      }

      setProcessingStatus('');
      setIsReviewModalOpen(true);
      refreshData();
    };

    reader.readAsText(file);
  };

  const handleApproveRule = (ruleId: string) => {
    if (!reviewRuleSet) return;
    const updated = ApprovalService.approveRule(reviewRuleSet.id, ruleId, 'coach_head_1');
    if (updated) {
      setReviewRuleSet(updated);
      refreshData();
    }
  };

  const handleEditRule = (ruleId: string, edits: Partial<CompetitionRule>) => {
    if (!reviewRuleSet) return;
    const updated = ApprovalService.editRule(reviewRuleSet.id, ruleId, edits, 'coach_head_1');
    if (updated) {
      setReviewRuleSet(updated);
      refreshData();
    }
  };

  const handleRejectRule = (ruleId: string) => {
    if (!reviewRuleSet) return;
    const updated = ApprovalService.rejectRule(reviewRuleSet.id, ruleId, 'coach_head_1');
    if (updated) {
      setReviewRuleSet(updated);
      refreshData();
    }
  };

  const handleAddManualRule = (ruleData: any) => {
    if (!reviewRuleSet) return;
    const updated = ApprovalService.addManualRule(reviewRuleSet.id, ruleData, 'coach_head_1');
    if (updated) {
      setReviewRuleSet(updated);
      refreshData();
    }
  };

  const handleActivateRuleSet = () => {
    if (!reviewRuleSet) return;
    const result = ApprovalService.activateRuleSet(reviewRuleSet.id, userRole, 'coach_head_1');
    if (result.success && result.ruleSet) {
      RuleSetAssignmentService.assignRuleSet({
        ruleSetId: result.ruleSet.id,
        ruleSetVersion: result.ruleSet.version,
        clubId,
        teamId,
        gradeName,
        competitionName,
        season: selectedSeason,
        assignedBy: 'coach_head_1'
      });
      setIsReviewModalOpen(false);
      refreshData();
    } else if (result.error) {
      alert(result.error);
    }
  };

  return (
    <div className="space-y-6 text-slate-100 p-6 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight">League Playing Conditions</h1>
          </div>
          <p className="text-xs text-slate-400">
            Upload competition by-laws to drive rules-aware match planning, over limits, and field restrictions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Season</label>
            <select
              value={selectedSeason}
              onChange={e => {
                setSelectedSeason(e.target.value);
                refreshData();
              }}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="2026/27">2026/27</option>
              <option value="2025/26">2025/26 (Archived)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Grade</label>
            <input
              type="text"
              value={gradeName}
              onChange={e => setGradeName(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-medium w-28"
            />
          </div>
        </div>
      </div>

      {/* Duplicate / Processing Banners */}
      {processingStatus && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 p-4 rounded-xl text-xs flex items-center gap-2 animate-pulse">
          <Upload className="w-4 h-4" /> {processingStatus}
        </div>
      )}

      {duplicateWarning && (
        <div className="bg-amber-950/60 border border-amber-800 text-amber-300 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> {duplicateWarning}
        </div>
      )}

      {/* Main Playing Conditions Status Card */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100">{competitionName}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Grade: {gradeName} — Season {selectedSeason}</p>
          </div>
          <div>
            {activeRuleSet ? (
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                <ShieldCheck className="w-4 h-4" /> ACTIVE RULESET (v{activeRuleSet.version})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                No active rules uploaded
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-2 transition-colors shadow-md">
            <Upload className="w-4 h-4" /> Upload Playing Conditions PDF
            <input type="file" accept=".pdf,.txt" onChange={handleFileUpload} className="hidden" />
          </label>

          {reviewRuleSet && (
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Review Candidate Rules ({reviewRuleSet.rules.length})
            </button>
          )}

          {reviewRuleSet && (
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Rule Manually
            </button>
          )}
        </div>

        {/* Active Rules Grid Summary */}
        {activeRuleSet && activeRuleSet.rules.length > 0 ? (
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Competition Rules ({activeRuleSet.rules.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeRuleSet.rules.filter(r => r.status === 'Approved').map(rule => (
                <div key={rule.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-100">{rule.title}</span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                      {rule.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{rule.approvedInterpretation || rule.rawInterpretation}</p>
                  <p className="text-[10px] text-slate-500">Source: Page {rule.sourcePage} ({rule.sourceSection})</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-xl">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No approved playing conditions active for this grade</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Upload your competition PDF or add rules manually to generate approved playing conditions.
            </p>
          </div>
        )}
      </div>

      {/* Version Comparison Diff Card */}
      {diffResult && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <GitCompare className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-slate-100">
              Rule Changes Detected (v{diffResult.oldVersion} → v{diffResult.newVersion})
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Inside Edge compared the revised document against the active ruleset: {diffResult.changedCount} changed, {diffResult.addedCount} added, {diffResult.removedCount} removed.
          </p>

          <div className="space-y-2">
            {diffResult.deltas.filter(d => d.changeType !== 'UNCHANGED').map(delta => (
              <div key={delta.ruleId} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{delta.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    delta.changeType === 'CHANGED' ? 'bg-amber-950 text-amber-300' : delta.changeType === 'ADDED' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                  }`}>
                    {delta.changeType}
                  </span>
                </div>
                {delta.oldValue && <p className="text-slate-400 line-through">Previous: {delta.oldValue}</p>}
                {delta.newValue && <p className="text-emerald-400 font-medium">New: {delta.newValue}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {reviewRuleSet && (
        <RulesReviewModal
          ruleSet={reviewRuleSet}
          isOpen={isReviewModalOpen}
          userRole={userRole}
          onClose={() => setIsReviewModalOpen(false)}
          onApproveRule={handleApproveRule}
          onEditRule={handleEditRule}
          onRejectRule={handleRejectRule}
          onActivateRuleSet={handleActivateRuleSet}
        />
      )}

      <ManualRuleEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={handleAddManualRule}
      />
    </div>
  );
};
