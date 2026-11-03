import React from 'react';
import { JobDescriptionRenderer } from './JobDescriptionRenderer.tsx';

export interface SafeHtmlRendererProps {
  html: string | null | undefined;
  className?: string;
  enableExpandCollapse?: boolean;
  maxCollapsedLength?: number;
}

/**
 * SafeHtmlRenderer
 * 
 * Secure document renderer preserving semantic employer document hierarchy
 * (headings, paragraphs, bullet lists, bold text, links, tables) with natural
 * content flow and zero artificial scroll clipping.
 */
export const SafeHtmlRenderer: React.FC<SafeHtmlRendererProps> = ({
  html,
  className = '',
  enableExpandCollapse = false,
}) => {
  return (
    <JobDescriptionRenderer
      content={html}
      className={className}
      enableExpandCollapse={enableExpandCollapse}
    />
  );
};

export default SafeHtmlRenderer;
