import React, { useMemo, useState } from 'react';
import { sanitizeJobDescription, stripHtmlToText } from '../utils/sanitizeHtml.ts';
import { ChevronDown, ChevronUp, ExternalLink, ShieldCheck } from 'lucide-react';

interface SafeHtmlRendererProps {
  html: string | null | undefined;
  className?: string;
  enableExpandCollapse?: boolean;
  maxCollapsedLength?: number;
}

export const SafeHtmlRenderer: React.FC<SafeHtmlRendererProps> = ({
  html,
  className = '',
  enableExpandCollapse = true,
  maxCollapsedLength = 2200,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { isHtml, sanitizedHtml, plainTextFallback, hasScriptOrUnsafeTags } = useMemo(() => {
    return sanitizeJobDescription(html);
  }, [html]);

  const isLong = plainTextFallback.length > maxCollapsedLength;
  const shouldTruncate = enableExpandCollapse && isLong && !isExpanded;

  if (!html || !html.trim()) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 italic">
        No detailed job description provided by employer.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Sanitized Content Container */}
      <div className="relative">
        <div
          className={`text-slate-700 text-sm leading-relaxed transition-all duration-300 font-sans ${
            shouldTruncate ? 'max-h-[520px] overflow-hidden' : ''
          }`}
        >
          {isHtml ? (
            <div
              className="job-description-content space-y-3.5 prose prose-slate max-w-none 
                         [&>p]:mb-3 [&>p]:leading-relaxed [&>p]:text-slate-700
                         [&>h2]:text-base [&>h2]:font-bold [&>h2]:text-slate-900 [&>h2]:mt-5 [&>h2]:mb-2 [&>h2]:pb-1 [&>h2]:border-b [&>h2]:border-slate-100
                         [&>h3]:text-sm [&>h3]:font-bold [&>h3]:text-slate-900 [&>h3]:mt-4 [&>h3]:mb-1.5
                         [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:my-3 [&>ul]:space-y-1.5
                         [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:my-3 [&>ol]:space-y-1.5
                         [&>li]:text-slate-700 [&>li]:leading-relaxed
                         [&>strong]:font-semibold [&>strong]:text-slate-900
                         [&>a]:text-blue-600 [&>a]:underline [&>a]:font-medium hover:[&>a]:text-blue-800
                         [&>blockquote]:border-l-4 [&>blockquote]:border-blue-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-slate-600
                         [&>table]:w-full [&>table]:border-collapse [&>table]:my-3
                         [&>table_th]:border [&>table_th]:border-slate-200 [&>table_th]:p-2 [&>table_th]:bg-slate-50 [&>table_th]:font-bold
                         [&>table_td]:border [&>table_td]:border-slate-200 [&>table_td]:p-2"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          ) : (
            <div className="whitespace-pre-line space-y-3 text-slate-700">
              {plainTextFallback}
            </div>
          )}
        </div>

        {/* Gradient Fade overlay when truncated */}
        {shouldTruncate && (
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/85 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Expand / Collapse Action */}
      {isLong && enableExpandCollapse && (
        <div className="pt-1 flex items-center justify-between border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="py-1.5 px-3 rounded-lg neu-button text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1 transition shadow-2xs"
          >
            <span>{isExpanded ? 'Collapse Description' : 'Read Full Original Description'}</span>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          <span className="text-[11px] text-slate-400 font-mono">
            {isExpanded ? 'Full content visible' : `${Math.round(plainTextFallback.length / 5)} words`}
          </span>
        </div>
      )}

      {/* Security Notice for Sanitized External HTML */}
      {hasScriptOrUnsafeTags && (
        <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-[11px] text-amber-800 flex items-center space-x-2">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>External formatting sanitized for security. Potentially unsafe scripts or objects were neutralized.</span>
        </div>
      )}
    </div>
  );
};
