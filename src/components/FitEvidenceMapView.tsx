import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Compass,
  Sparkles,
  ExternalLink,
  Check,
  FileText,
  Award,
  Layers,
  ArrowRight
} from 'lucide-react';
import { FitEvidenceMap, FitEvidenceNode, EvidenceConfidence } from '../types/index.ts';
import { api } from '../services/api.ts';

interface FitEvidenceMapViewProps {
  evidenceMap: FitEvidenceMap;
  jobTitle: string;
  companyName: string;
  onConfirmNode?: (nodeId: string) => Promise<void>;
  onShowToast?: (msg: string) => void;
}

export const FitEvidenceMapView: React.FC<FitEvidenceMapViewProps> = ({
  evidenceMap,
  jobTitle,
  companyName,
  onConfirmNode,
  onShowToast,
}) => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'verified' | 'inferred' | 'missing'>('all');

  const filteredNodes = (evidenceMap.nodes || []).filter(node => {
    if (activeFilter === 'verified') return node.confidence === 'VERIFIED_EVIDENCE' || node.confidence === 'USER_CONFIRMED';
    if (activeFilter === 'inferred') return node.confidence === 'INFERRED_RELEVANCE';
    if (activeFilter === 'missing') return node.confidence === 'MISSING_EVIDENCE';
    return true;
  });

  const handleConfirm = async (nodeId: string) => {
    try {
      setConfirmingId(nodeId);
      if (onConfirmNode) {
        await onConfirmNode(nodeId);
      } else {
        await api.confirmFitEvidenceNode(evidenceMap.jobId, nodeId);
      }
      if (onShowToast) onShowToast('Evidence requirement confirmed and added to verified profile.');
    } catch (err: any) {
      if (onShowToast) onShowToast(`Failed to confirm evidence: ${err.message}`);
    } finally {
      setConfirmingId(null);
    }
  };

  const getConfidenceBadge = (confidence: EvidenceConfidence) => {
    switch (confidence) {
      case 'VERIFIED_EVIDENCE':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            <span>Verified Evidence</span>
          </span>
        );
      case 'USER_CONFIRMED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldCheck className="h-3 w-3" />
            <span>User Confirmed</span>
          </span>
        );
      case 'INFERRED_RELEVANCE':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Compass className="h-3 w-3" />
            <span>Inferred Relevance</span>
          </span>
        );
      case 'MISSING_EVIDENCE':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="h-3 w-3" />
            <span>Missing Evidence</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Signature Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 border border-indigo-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Fit Evidence Map &trade;
              </h3>
              <p className="text-xs text-slate-500">
                Transparent requirement-by-requirement audit connecting role demands directly to verified resume evidence.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Evidence Confidence:</span>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
              evidenceMap.overallConfidence === 'high'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : evidenceMap.overallConfidence === 'medium'
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {evidenceMap.overallConfidence} Confidence
            </span>
          </div>
        </div>

        {/* Aggregate KPI Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-indigo-100/60">
          <button
            onClick={() => setActiveFilter('verified')}
            className={`p-3 rounded-xl border text-left transition ${
              activeFilter === 'verified'
                ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                : 'bg-white border-slate-200 hover:border-emerald-200'
            }`}
          >
            <div className="text-[11px] font-semibold text-emerald-700">Verified Evidence</div>
            <div className="text-xl font-extrabold text-emerald-900">{evidenceMap.verifiedCount + (evidenceMap.userConfirmedCount || 0)}</div>
          </button>

          <button
            onClick={() => setActiveFilter('inferred')}
            className={`p-3 rounded-xl border text-left transition ${
              activeFilter === 'inferred'
                ? 'bg-blue-50 border-blue-300 shadow-sm'
                : 'bg-white border-slate-200 hover:border-blue-200'
            }`}
          >
            <div className="text-[11px] font-semibold text-blue-700">Inferred Exposure</div>
            <div className="text-xl font-extrabold text-blue-900">{evidenceMap.inferredCount}</div>
          </button>

          <button
            onClick={() => setActiveFilter('missing')}
            className={`p-3 rounded-xl border text-left transition ${
              activeFilter === 'missing'
                ? 'bg-amber-50 border-amber-300 shadow-sm'
                : 'bg-white border-slate-200 hover:border-amber-200'
            }`}
          >
            <div className="text-[11px] font-semibold text-amber-700">Missing Evidence</div>
            <div className="text-xl font-extrabold text-amber-900">{evidenceMap.missingCount}</div>
          </button>

          <button
            onClick={() => setActiveFilter('all')}
            className={`p-3 rounded-xl border text-left transition ${
              activeFilter === 'all'
                ? 'bg-slate-100 border-slate-300 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-600">Total Checked</div>
            <div className="text-xl font-extrabold text-slate-900">{evidenceMap.totalRequirements}</div>
          </button>
        </div>
      </div>

      {/* Requirement Node Cards */}
      <div className="space-y-3">
        {filteredNodes.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
            No requirements match the selected filter.
          </div>
        ) : (
          filteredNodes.map(node => (
            <div
              key={node.id}
              className={`p-4 rounded-2xl border transition space-y-3 ${
                node.confidence === 'VERIFIED_EVIDENCE' || node.confidence === 'USER_CONFIRMED'
                  ? 'bg-white border-emerald-100 hover:border-emerald-300'
                  : node.confidence === 'INFERRED_RELEVANCE'
                  ? 'bg-white border-blue-100 hover:border-blue-300'
                  : 'bg-amber-50/40 border-amber-200/80'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">{node.requirement}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {node.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div>
                  {getConfidenceBadge(node.confidence)}
                </div>
              </div>

              {/* Evidence or Gap Description */}
              <div className="text-xs space-y-1.5 pl-3 border-l-2 border-slate-200">
                {node.candidateEvidence ? (
                  <div className="flex items-start space-x-1.5 text-slate-700">
                    <FileText className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900">Documented Evidence: </span>
                      <span>{node.candidateEvidence}</span>
                      {node.sourceReference && (
                        <span className="text-slate-400 text-[11px] block mt-0.5">
                          Source: {node.sourceReference}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-1.5 text-amber-800">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold">Documented Gap: </span>
                      <span>No direct reference found on your uploaded resume or confirmed profile.</span>
                    </div>
                  </div>
                )}

                {/* Honest Assessment Analysis */}
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-1">
                  <span className="font-semibold text-slate-700">Assessment: </span>
                  <span>{node.assessmentNotes}</span>
                </div>
              </div>

              {/* Action Buttons: Allow User to Confirm Unverified or Inferred Skills */}
              {(node.confidence === 'INFERRED_RELEVANCE' || node.confidence === 'MISSING_EVIDENCE') && !node.isUserConfirmed && (
                <div className="flex items-center justify-end pt-1">
                  <button
                    onClick={() => handleConfirm(node.id)}
                    disabled={confirmingId === node.id}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs border border-purple-200 flex items-center space-x-1.5 transition"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{confirmingId === node.id ? 'Confirming...' : 'I have this experience (Confirm)'}</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
