// src/utils/resumeAttachmentHelper.ts
// Resume Attachment Security Validator & Pure-TypeScript PDF Builder

export const MAX_RESUME_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB limit for email providers (Gmail / Outlook)

export const ALLOWED_RESUME_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const ALLOWED_RESUME_EXTENSIONS = new Set(['.pdf', '.docx']);

export interface AttachmentValidationResult {
  valid: boolean;
  sanitizedFileName: string;
  extension: string;
  error?: string;
}

export function sanitizeAttachmentFilename(rawName: string): string {
  const base = (rawName || 'resume.pdf')
    .replace(/^.*[\\/]/, '') // strip any directory traversal path
    .replace(/[\r\n"<>|:*?]/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .trim();
  return base || 'resume.pdf';
}

export function validateResumeAttachment(params: {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}): AttachmentValidationResult {
  const sanitizedFileName = sanitizeAttachmentFilename(params.fileName);
  const dotIdx = sanitizedFileName.lastIndexOf('.');
  const extension = dotIdx >= 0 ? sanitizedFileName.slice(dotIdx).toLowerCase() : '';

  if (!ALLOWED_RESUME_EXTENSIONS.has(extension)) {
    return {
      valid: false,
      sanitizedFileName,
      extension,
      error: `Unsupported attachment extension "${extension || 'none'}". Only .pdf and .docx resumes are allowed.`,
    };
  }

  const normalizedMime = (params.mimeType || '').toLowerCase().trim();
  if (!ALLOWED_RESUME_MIME_TYPES.has(normalizedMime)) {
    return {
      valid: false,
      sanitizedFileName,
      extension,
      error: `Unsupported attachment MIME type "${normalizedMime || 'unknown'}".`,
    };
  }

  if (
    (extension === '.pdf' && normalizedMime !== 'application/pdf') ||
    (extension === '.docx' && normalizedMime !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  ) {
    return {
      valid: false,
      sanitizedFileName,
      extension,
      error: 'File extension does not match declared MIME type.',
    };
  }

  if (!Number.isFinite(params.fileSizeBytes) || params.fileSizeBytes <= 0) {
    return {
      valid: false,
      sanitizedFileName,
      extension,
      error: 'Attachment file appears empty (0 bytes).',
    };
  }

  if (params.fileSizeBytes > MAX_RESUME_ATTACHMENT_BYTES) {
    return {
      valid: false,
      sanitizedFileName,
      extension,
      error: `Attachment exceeds the 5 MB limit (${(params.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  return {
    valid: true,
    sanitizedFileName,
    extension,
  };
}

function escapePdfText(str: string): string {
  return str
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapTextLines(text: string, maxChars = 88): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      lines.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).trim().length > maxChars) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

/**
 * Generates a valid multi-line single-page or multi-page PDF binary (Uint8Array) using standard Helvetica Type1 font.
 * Zero external dependencies — runs cleanly in Cloudflare Workers and Node.js.
 */
export function generateMinimalPdfFromText(title: string, bodyText: string): Uint8Array {
  const headerLines = title ? [title.toUpperCase(), ''] : [];
  const allLines = [...headerLines, ...wrapTextLines(bodyText, 88)];

  const linesPerPage = 46;
  const pages: string[][] = [];
  for (let i = 0; i < allLines.length; i += linesPerPage) {
    pages.push(allLines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push(['Resume Document']);

  const objects: string[] = [];
  // Obj 1: Catalog
  // Obj 2: Pages
  // Obj 3: Font (Helvetica)
  // Subsequent objects: Page + Content pairs
  const fontObjNum = 3;
  const pageObjIds: number[] = [];
  const contentEntries: Array<{ pageObjNum: number; contentObjNum: number; stream: string }> = [];

  let nextObj = 4;
  for (const pageLines of pages) {
    const pageObjNum = nextObj++;
    const contentObjNum = nextObj++;
    pageObjIds.push(pageObjNum);

    const streamOps: string[] = ['BT', '/F1 10 Tf', '50 750 Td', '14 TL'];
    pageLines.forEach((line, idx) => {
      if (idx === 0) {
        streamOps.push(`(${escapePdfText(line)}) Tj`);
      } else {
        streamOps.push(`T* (${escapePdfText(line)}) Tj`);
      }
    });
    streamOps.push('ET');
    const stream = streamOps.join('\n');
    contentEntries.push({ pageObjNum, contentObjNum, stream });
  }

  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>\nendobj\n`);
  objects.push(`${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

  for (const entry of contentEntries) {
    objects.push(
      `${entry.pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${entry.contentObjNum} 0 R >>\nendobj\n`
    );
    objects.push(
      `${entry.contentObjNum} 0 obj\n<< /Length ${entry.stream.length} >>\nstream\n${entry.stream}\nendstream\nendobj\n`
    );
  }

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}
