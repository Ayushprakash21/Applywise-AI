// src/utils/resumeStructureEngine.ts
// Universal Document Normalization & Section Classification Engine
// Converts raw PDF/DOCX text or StructuredDocumentBlocks into normalized sections
// with strict heading-boundary detection, tabular/two-column alignment handling,
// and headerless fallback without ever discarding unclassified blocks.

import type { ResumeSectionType, StructuredDocumentBlock } from '../types';
import { extractDateRangeFromLine, joinSplitDateLines } from './employmentDateParser';

export interface ResumeSectionChunk {
  type: ResumeSectionType;
  heading: string;
  confidence: number;
  startLine: number;
  endLine: number;
  lines: string[];
  blocks: StructuredDocumentBlock[];
}

export interface StructuredResumeDocument {
  normalizedText: string;
  normalizedLines: string[];
  blocks: StructuredDocumentBlock[];
  sections: ResumeSectionChunk[];
  employmentSections: ResumeSectionChunk[];
  usedHeaderlessFallback: boolean;
  unclassifiedLines: string[];
}

const SECTION_HEADING_RULES: Array<{ type: ResumeSectionType; pattern: RegExp; confidence: number }> = [
  // Specific sub-types checked BEFORE generic "experience" so "Volunteer Experience" or "Project Experience" never leaks into Work Experience
  {
    type: 'volunteer',
    pattern: /^(?:volunteer(?:ing)?(?:\s+experience|\s+work)?|community\s+(?:service|involvement|engagement))$/i,
    confidence: 0.94,
  },
  {
    type: 'projects',
    pattern: /^(?:(?:key|major|academic|personal|selected|notable|technical|software)\s+)?projects?(?:\s+(?:experience|summary|work|undertaken))?$/i,
    confidence: 0.95,
  },
  {
    type: 'leadership',
    pattern: /^(?:leadership(?:\s+experience|\s+roles)?|positions?\s+of\s+responsibility|extracurricular(?:\s+activities)?)$/i,
    confidence: 0.9,
  },
  {
    type: 'internships',
    pattern: /^(?:internships?(?:\s+experience)?|industrial\s+training|apprenticeships?|co-?op\s+experience)$/i,
    confidence: 0.94,
  },
  {
    type: 'experience',
    pattern: /^(?:(?:work|professional|career|employment|relevant|practical|industry|corporate|technical|prior)\s+)?(?:experience|employment(?:\s+history)?|work\s+history|career\s+history|jobs?|roles?\s+held|where\s+i['’]?ve\s+worked|work\s+background)$/i,
    confidence: 0.97,
  },
  {
    type: 'education',
    pattern: /^(?:education(?:al)?(?:\s+(?:background|qualifications?|history|details))?|academics?(?:\s+(?:background|qualifications?|credentials))?|qualifications?)$/i,
    confidence: 0.97,
  },
  {
    type: 'skills',
    pattern: /^(?:(?:technical|core|key|primary|relevant|professional|soft|functional)\s+)?(?:skills?(?:\s*(?:&|and)\s*(?:competencies|tools|expertise))?|competencies|core\s+toolkit|tech(?:nical)?\s+stack|tools?\s*(?:&|and)\s*technologies|technologies|expertise|proficiencies)$/i,
    confidence: 0.95,
  },
  {
    type: 'certifications',
    pattern: /^(?:certifications?(?:\s*(?:&|and)\s*licenses?)?|licenses?(?:\s*(?:&|and)\s*certifications?)?|credentials|training\s*(?:&|and)\s*certifications?|courses?(?:\s*(?:&|and)\s*certifications?)?)$/i,
    confidence: 0.94,
  },
  {
    type: 'career_objective',
    pattern: /^(?:career\s+objective|objective|job\s+objective)$/i,
    confidence: 0.93,
  },
  {
    type: 'summary',
    pattern: /^(?:(?:professional|executive|career|personal)?\s*summary|profile(?:\s+summary)?|about\s+me|overview|career\s+profile|professional\s+snapshot)$/i,
    confidence: 0.94,
  },
  {
    type: 'achievements',
    pattern: /^(?:(?:key\s+)?achievements?|accomplishments?|highlights)$/i,
    confidence: 0.91,
  },
  {
    type: 'awards',
    pattern: /^(?:awards?(?:\s*(?:&|and)\s*honors?)?|honors?(?:\s*(?:&|and)\s*awards?)?|recognition)$/i,
    confidence: 0.92,
  },
  {
    type: 'publications',
    pattern: /^(?:publications?|research(?:\s+papers?)?|papers?|patents?)$/i,
    confidence: 0.92,
  },
  {
    type: 'languages',
    pattern: /^(?:languages?(?:\s+known)?)$/i,
    confidence: 0.92,
  },
  {
    type: 'interests',
    pattern: /^(?:interests?|hobbies(?:\s*(?:&|and)\s*interests?)?)$/i,
    confidence: 0.9,
  },
  {
    type: 'references',
    pattern: /^(?:references?)$/i,
    confidence: 0.95,
  },
  {
    type: 'declaration',
    pattern: /^(?:declaration)$/i,
    confidence: 0.95,
  },
  {
    type: 'contact_info',
    pattern: /^(?:contact(?:\s+(?:information|details))?|personal\s+(?:information|details))$/i,
    confidence: 0.92,
  },
];

/**
 * Normalizes noisy PDF/DOCX characters while keeping meaningful column tabs/delimiters intact.
 */
export function normalizeResumeTextLines(rawText: string): string[] {
  if (!rawText) return [];
  const cleanedText = rawText
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/â€¢||||➢|➤/g, '• ')
    .replace(/â€“|–/g, '–')
    .replace(/â€”|—/g, '—')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const rawLines = cleanedText.split('\n');
  const normalized: string[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (normalized.length > 0 && normalized[normalized.length - 1] !== '') {
        normalized.push('');
      }
      continue;
    }

    // Preserve bullet symbol consistency
    let line = trimmed.replace(/^([●▪▸▹◦‣⁃*])\s*/, '• ');
    // Fix glued bullet without space: "•Sorting out" -> "• Sorting out"
    line = line.replace(/^•([^\s])/, '• $1');

    // Convert multi-tab or wide-space horizontal alignment (two-column PDF/Word tables) to column delimiter ' | '
    if (/\t+|\s{4,}/.test(line) && !/^•\s/.test(line)) {
      const parts = line
        .split(/\t+|\s{4,}/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length > 1) {
        line = parts.join(' | ');
      }
    }

    // Collapse residual internal double spaces
    line = line.replace(/[ ]{2,}/g, ' ').trim();
    normalized.push(line);
  }

  // Remove empty padding before stitching split date lines
  const nonEmpty = normalized.filter(Boolean);
  return joinSplitDateLines(nonEmpty);
}

/**
 * Classifies whether a line is a true resume section heading rather than prose text
 * containing words like "experience" or "skills".
 */
export function classifySectionHeading(
  line: string,
  block?: StructuredDocumentBlock
): { isHeading: boolean; type: ResumeSectionType; confidence: number; headingText: string } {
  const trimmed = line.trim();
  if (!trimmed || /^[•●▪▸▹◦‣⁃\-*]\s/.test(trimmed)) {
    return { isHeading: false, type: 'unknown', confidence: 0, headingText: '' };
  }

  // Never classify prose sentences ending in period as a section header
  if (/[.!?;]$/.test(trimmed)) {
    return { isHeading: false, type: 'unknown', confidence: 0, headingText: '' };
  }

  // Reject any line containing a date range (usually a job header or degree line)
  if (extractDateRangeFromLine(trimmed).found) {
    return { isHeading: false, type: 'unknown', confidence: 0, headingText: '' };
  }

  // Strip decorative borders ("=== EXPERIENCE ===", "--- Skills ---", "WORK EXPERIENCE:")
  const stripped = trimmed
    .replace(/^[=\-_~|*#\s\[\(]+/, '')
    .replace(/[=\-_~|*#:\s\]\)]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped || stripped.length > 48) {
    return { isHeading: false, type: 'unknown', confidence: 0, headingText: '' };
  }

  const words = stripped.split(/\s+/);
  if (words.length > 5) {
    return { isHeading: false, type: 'unknown', confidence: 0, headingText: '' };
  }

  for (const rule of SECTION_HEADING_RULES) {
    if (rule.pattern.test(stripped)) {
      const hasStrongSignal =
        Boolean(block?.isHeading || block?.isBold) ||
        stripped === stripped.toUpperCase() ||
        /:$/.test(trimmed) ||
        words.length <= 3;
      return {
        isHeading: true,
        type: rule.type,
        confidence: hasStrongSignal ? rule.confidence : Math.max(0.75, rule.confidence - 0.1),
        headingText: stripped,
      };
    }
  }

  return { isHeading: false, type: 'unknown', confidence: 0, headingText: '' };
}

/**
 * Segments a normalized resume into typed section chunks and builds a structured document map.
 */
export function structureResumeDocument(
  rawText: string,
  inputBlocks?: StructuredDocumentBlock[]
): StructuredResumeDocument {
  const normalizedLines = normalizeResumeTextLines(rawText);
  const blockLookup = new Map<string, StructuredDocumentBlock>();
  if (inputBlocks) {
    for (const b of inputBlocks) {
      const normKey = b.text.replace(/\s+/g, ' ').trim();
      if (normKey && !blockLookup.has(normKey)) {
        blockLookup.set(normKey, b);
      }
    }
  }

  const sections: ResumeSectionChunk[] = [];
  let currentSection: ResumeSectionChunk = {
    type: 'contact_info',
    heading: 'Header / Preamble',
    confidence: 0.7,
    startLine: 0,
    endLine: -1,
    lines: [],
    blocks: [],
  };

  for (let i = 0; i < normalizedLines.length; i++) {
    const line = normalizedLines[i];
    const matchedBlock = blockLookup.get(line.replace(/\s+/g, ' ').trim());

    // Handle side-by-side two-column section headers e.g. "SKILLS | EXPERIENCE"
    if (line.includes(' | ')) {
      const colParts = line.split(' | ').map((p) => p.trim()).filter(Boolean);
      const headingMatches = colParts.map((part) => classifySectionHeading(part, matchedBlock));
      const strongHeading = headingMatches.find((h) => h.isHeading);
      if (strongHeading && headingMatches.every((h) => h.isHeading)) {
        if (currentSection.lines.length > 0) {
          currentSection.endLine = i - 1;
          sections.push(currentSection);
        }
        currentSection = {
          type: headingMatches[headingMatches.length - 1].type,
          heading: headingMatches[headingMatches.length - 1].headingText,
          confidence: headingMatches[headingMatches.length - 1].confidence,
          startLine: i,
          endLine: i,
          lines: [],
          blocks: [],
        };
        continue;
      }
    }

    const heading = classifySectionHeading(line, matchedBlock);
    if (heading.isHeading) {
      if (currentSection.lines.length > 0) {
        currentSection.endLine = i - 1;
        sections.push(currentSection);
      }
      currentSection = {
        type: heading.type,
        heading: heading.headingText,
        confidence: heading.confidence,
        startLine: i,
        endLine: i,
        lines: [],
        blocks: [],
      };
      continue;
    }

    const block: StructuredDocumentBlock = matchedBlock
      ? {
          ...matchedBlock,
          index: i,
          text: line,
          section: currentSection.type,
          sectionConfidence: currentSection.confidence,
        }
      : {
          id: `line_${i}`,
          index: i,
          text: line,
          isBullet: /^•\s+/.test(line) || /^\d+[.)]\s+/.test(line),
          isHeading: false,
          section: currentSection.type,
          sectionConfidence: currentSection.confidence,
        };

    currentSection.lines.push(line);
    currentSection.blocks.push(block);
    currentSection.endLine = i;
  }

  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  // Promote experience + internships chunks cleanly
  const explicitExperience = sections.filter(
    (s) => s.type === 'experience' || s.type === 'internships'
  );

  let employmentSections = explicitExperience;
  let usedHeaderlessFallback = false;

  // Headerless resume fallback: if NO explicit experience/internships heading exists,
  // inspect non-excluded sections (e.g. header/preamble or unknown) for date-anchored work clusters.
  if (employmentSections.length === 0) {
    const excludedNonWork = new Set<ResumeSectionType>([
      'education',
      'skills',
      'certifications',
      'projects',
      'awards',
      'publications',
      'languages',
      'interests',
      'references',
      'declaration',
      'volunteer',
    ]);
    const candidateChunks = sections.filter((s) => !excludedNonWork.has(s.type));
    const fallbackLines: string[] = [];
    const fallbackBlocks: StructuredDocumentBlock[] = [];
    for (const chunk of candidateChunks) {
      for (let j = 0; j < chunk.lines.length; j++) {
        fallbackLines.push(chunk.lines[j]);
        fallbackBlocks.push(chunk.blocks[j]);
      }
    }

    const hasDateAnchoredCluster = fallbackLines.some((l) => extractDateRangeFromLine(l).found);
    if (hasDateAnchoredCluster) {
      employmentSections = [
        {
          type: 'experience',
          heading: 'Inferred Employment History',
          confidence: 0.72,
          startLine: 0,
          endLine: Math.max(0, fallbackLines.length - 1),
          lines: fallbackLines,
          blocks: fallbackBlocks,
        },
      ];
      usedHeaderlessFallback = true;
    }
  }

  const allBlocks = sections.flatMap((s) => s.blocks);
  const unclassifiedLines = sections
    .filter((s) => s.type === 'unknown' || s.type === 'additional')
    .flatMap((s) => s.lines);

  return {
    normalizedText: normalizedLines.join('\n'),
    normalizedLines,
    blocks: allBlocks,
    sections,
    employmentSections,
    usedHeaderlessFallback,
    unclassifiedLines,
  };
}

/**
 * Segments the employment history section(s) cleanly out of full resume text.
 * Never truncates at narrative mentions of the word "experience".
 */
export function segmentEmploymentSection(
  fullResumeText: string,
  blocks?: StructuredDocumentBlock[]
): { employmentText: string; sectionFound: boolean; sections: ResumeSectionChunk[]; usedHeaderlessFallback: boolean } {
  if (!fullResumeText) {
    return { employmentText: '', sectionFound: false, sections: [], usedHeaderlessFallback: false };
  }
  const structured = structureResumeDocument(fullResumeText, blocks);
  const hasExplicit = structured.sections.some(
    (s) => s.type === 'experience' || s.type === 'internships'
  );
  const employmentText = structured.employmentSections
    .flatMap((s) => s.lines)
    .join('\n');

  return {
    employmentText,
    sectionFound: hasExplicit,
    sections: structured.employmentSections,
    usedHeaderlessFallback: structured.usedHeaderlessFallback,
  };
}
