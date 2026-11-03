import React, { useMemo, useState } from 'react';
import { normalizeJobDescription, ProcessedJobDescription } from '../services/jobDescriptionProcessor.ts';
import { ChevronDown, ChevronUp, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

export interface JobDescriptionRendererProps {
  content: string | null | undefined;
  className?: string;
  enableExpandCollapse?: boolean;
  maxCollapsedWords?: number;
}

/**
 * JobDescriptionRenderer
 * 
 * Renders employer job descriptions with authentic semantic hierarchy:
 * - Proper section headings (22-26px, weight 700, dark navy, 24-32px top margin)
 * - Subheadings (18-21px, weight 650-700, ~24px top margin)
 * - Paragraphs (15-16px, line-height 1.7, 10-14px bottom margin, comfortable reading width)
 * - Bullet lists (15-16px, line-height 1.7, 8-12px item spacing, clear markers & indentation)
 * - Responsive tables with clean borders
 * - Natural content flow without artificial scroll containers or clipped text
 */
export const JobDescriptionRenderer: React.FC<JobDescriptionRendererProps> = ({
  content,
  className = '',
  enableExpandCollapse = false,
  maxCollapsedWords = 800,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const processed: ProcessedJobDescription = useMemo(() => {
    return normalizeJobDescription(content);
  }, [content]);

  const isLong = processed.wordCount > maxCollapsedWords;
  const shouldTruncate = enableExpandCollapse && isLong && !isExpanded;

  if (!content || !content.trim()) {
    return (
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-500 italic">
        No detailed job description provided by employer.
      </div>
    );
  }

  return (
    <div className={`job-description-wrapper space-y-4 text-left ${className}`}>
      {/* Semantic Job Description Content */}
      <div className="relative">
        <div
          className={`job-description-content text-slate-700 text-[15px] sm:text-[16px] leading-[1.75] font-sans
            /* Section Headings (H2) */
            [&_.section-heading]:text-[22px] sm:[&_.section-heading]:text-[24px] [&_.section-heading]:font-bold [&_.section-heading]:text-slate-900 [&_.section-heading]:mt-7 sm:[&_.section-heading]:mt-8 [&_.section-heading]:mb-3.5 [&_.section-heading]:tracking-tight [&_.section-heading]:border-b [&_.section-heading]:border-slate-100 [&_.section-heading]:pb-2
            [&_h2]:text-[22px] sm:[&_h2]:text-[24px] [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-7 sm:[&_h2]:mt-8 [&_h2]:mb-3.5 [&_h2]:tracking-tight [&_h2]:border-b [&_h2]:border-slate-100 [&_h2]:pb-2
            /* Subheadings (H3, H4) */
            [&_h3]:text-[18px] sm:[&_h3]:text-[20px] [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-6 [&_h3]:mb-2.5 [&_h3]:tracking-tight
            [&_h4]:text-[16px] sm:[&_h4]:text-[18px] [&_h4]:font-semibold [&_h4]:text-slate-900 [&_h4]:mt-5 [&_h4]:mb-2
            /* Paragraphs */
            [&_p]:mb-3.5 [&_p]:leading-[1.75] [&_p]:text-slate-700
            /* Lists & Bullet Points */
            [&_.section-list]:list-disc [&_.section-list]:pl-6 [&_.section-list]:my-3.5 [&_.section-list]:space-y-2.5
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3.5 [&_ul]:space-y-2.5
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3.5 [&_ol]:space-y-2.5
            [&_li]:text-slate-700 [&_li]:leading-[1.75] [&_li]:pl-1
            /* Text Formatting */
            [&_strong]:font-semibold [&_strong]:text-slate-900
            [&_b]:font-semibold [&_b]:text-slate-900
            [&_em]:italic [&_em]:text-slate-800
            /* Links */
            [&_a]:text-blue-600 [&_a]:underline [&_a]:font-medium hover:[&_a]:text-blue-800 transition
            /* Blockquotes */
            [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-slate-600
            /* Tables */
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-sm
            [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:p-3 [&_th]:font-bold [&_th]:text-left [&_th]:text-slate-900
            [&_td]:border [&_td]:border-slate-200 [&_td]:p-3 [&_td]:text-slate-700
            /* Code */
            [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:text-xs [&_pre]:font-mono
            [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs
            ${shouldTruncate ? 'max-h-[600px] overflow-hidden' : ''}
          `}
          dangerouslySetInnerHTML={{ __html: processed.sanitizedHtml }}
        />

        {/* Subtle Fade only when deliberate show more/less is explicitly enabled */}
        {shouldTruncate && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Deliberate Expand/Collapse Control for extraordinarily long listings */}
      {isLong && enableExpandCollapse && (
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="py-2 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center space-x-1.5 transition shadow-2xs"
          >
            <span>{isExpanded ? 'Collapse Full Description' : 'Show Full Description'}</span>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          <span className="text-xs text-slate-400 font-mono">
            {processed.wordCount} total words
          </span>
        </div>
      )}

      {/* Security notice if malicious scripts or elements were safely neutralized */}
      {processed.hasUnsafeContent && (
        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-800 flex items-center space-x-2">
          <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
          <span>External formatting sanitized for security. Potentially unsafe script tags or attributes were neutralized.</span>
        </div>
      )}
    </div>
  );
};

export default JobDescriptionRenderer;
