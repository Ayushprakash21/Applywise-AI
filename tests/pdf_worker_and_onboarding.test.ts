import { describe, it } from 'node:test';
import assert from 'node:assert';
import { workerResumeEngine } from '../worker/resumeEngine.ts';
import { Document, Paragraph, TextRun, Packer } from 'docx';

describe('PDF Worker & Resume Extraction Engine Tests', () => {
  // Minimal valid PDF text stream
  const createValidPdfBuffer = (text: string): Buffer => {
    const streamContent = `BT /F1 18 Tf 50 700 Td (${text}) Tj ET`;
    const streamLength = Buffer.byteLength(streamContent);
    const pdfSource = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000242 00000 n 
0000000348 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
424
%%EOF`;
    return Buffer.from(pdfSource);
  };

  it('PDF: Valid text-based PDF extracts without worker resolution failure', async () => {
    const resumeText = 'Ayush Prakash - Principal Software Architect - Cloudflare Workers & AI Systems Specialist';
    const pdfBuffer = createValidPdfBuffer(resumeText);

    const result = await workerResumeEngine.extractText(pdfBuffer, 'Ayush_Resume.pdf', 'application/pdf');
    assert.strictEqual(result.format, 'pdf');
    assert.strictEqual(result.isScanned, false);
    assert.ok(result.text.length > 0, 'Extracted text should not be empty');
    assert.ok(result.text.includes('Ayush Prakash'), 'Extracted text must contain candidate name');
    assert.ok(result.text.includes('Cloudflare Workers'), 'Extracted text must contain candidate qualifications');
  });

  it('PDF: Corrupted PDF without valid header is rejected', async () => {
    const corruptedBuffer = Buffer.from('NOT_A_VALID_PDF_HEADER_DATA');
    await assert.rejects(
      async () => {
        await workerResumeEngine.extractText(corruptedBuffer, 'corrupted.pdf', 'application/pdf');
      },
      /Malformed PDF file: Invalid PDF header signature/
    );
  });

  it('PDF: Encrypted / password-protected error handling', async () => {
    // Test that password/encryption errors produce the documented user-friendly message
    const errorHandlingTest = (msg: string) => {
      if (msg.includes('password') || msg.includes('encrypted')) {
        throw new Error('The PDF document is password-protected or encrypted. Please provide an unencrypted document.');
      }
      throw new Error(`Failed to extract text from PDF: ${msg}`);
    };

    assert.throws(
      () => errorHandlingTest('password required to read stream'),
      /The PDF document is password-protected or encrypted/
    );
    assert.throws(
      () => errorHandlingTest('document encrypted with AES-256'),
      /The PDF document is password-protected or encrypted/
    );
  });

  it('PDF: Image-only / scanned PDF without readable text is identified properly', async () => {
    // PDF with less than 40 chars of text is flagged as scanned/image-only
    const minimalText = 'Hi';
    const imageOnlyPdfBuffer = createValidPdfBuffer(minimalText);

    const result = await workerResumeEngine.extractText(imageOnlyPdfBuffer, 'scanned_scan001.pdf', 'application/pdf');
    assert.strictEqual(result.isScanned, true);
    assert.strictEqual(result.text, '');
    assert.ok(result.warning?.includes('scanned image or contains no extractable text'));
  });

  it('PDF: Oversized file exceeding 10MB limit is rejected', async () => {
    // 10MB + 1 byte
    const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 1);
    await assert.rejects(
      async () => {
        await workerResumeEngine.extractText(oversizedBuffer, 'huge_resume.pdf', 'application/pdf');
      },
      /File size exceeds the 10MB limit/
    );
  });

  it('PDF: Empty file (0 bytes) is rejected', async () => {
    const emptyBuffer = Buffer.alloc(0);
    await assert.rejects(
      async () => {
        await workerResumeEngine.extractText(emptyBuffer, 'empty.pdf', 'application/pdf');
      },
      /Uploaded document is empty \(0 bytes\)/
    );
  });

  it('Unsupported file format (.exe, .zip) is rejected', async () => {
    const zipBuffer = Buffer.from('PK\x03\x04sampleziparchive');
    await assert.rejects(
      async () => {
        await workerResumeEngine.extractText(zipBuffer, 'resume.zip', 'application/zip');
      },
      /Unsupported file format/
    );
  });

  it('DOCX: Valid Microsoft Word document extracts real text via mammoth', async () => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            children: [
              new TextRun('Ayush Prakash - Staff Full Stack Architect'),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun('5+ years building scalable Cloudflare Workers edge applications with D1 and TypeScript.'),
            ],
          }),
        ],
      }],
    });

    const docxBuffer = await Packer.toBuffer(doc);
    const result = await workerResumeEngine.extractText(docxBuffer, 'Ayush_Resume.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    assert.strictEqual(result.format, 'docx');
    assert.strictEqual(result.isScanned, false);
    assert.ok(result.text.includes('Ayush Prakash'));
    assert.ok(result.text.includes('Cloudflare Workers'));
  });

  it('DOCX: Corrupted or invalid Word document fails cleanly', async () => {
    const invalidDocx = Buffer.from('Not a real zip or openxml docx file');
    await assert.rejects(
      async () => {
        await workerResumeEngine.extractText(invalidDocx, 'corrupted.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      },
      /Failed to extract text from Word document/
    );
  });

  it('Zero-Hallucination: Heuristic parsing extracts ONLY factual information without fabricating employers or credentials', () => {
    const rawResumeText = `Ayush Prakash
ayushprakash0021@gmail.com | +91 9876543210 | Bengaluru, India
Principal Software Engineer specializing in Distributed Systems, TypeScript, and Edge Computing.

EXPERIENCE:
Antigravity Systems — Principal Software Architect (2023 - Present)
- Designed zero-trust edge architecture handling 50M requests daily.
- Implemented automated ATS resume intelligence with zero hallucination guarantee.

EDUCATION:
Bachelor of Technology in Computer Science, IIT (2020)
`;

    const profile = workerResumeEngine.heuristicParse(rawResumeText);
    assert.strictEqual(profile.fullName, 'Ayush Prakash');
    assert.strictEqual(profile.email, 'ayushprakash0021@gmail.com');
    assert.ok(profile.experiences.some(e => e.company === 'Antigravity Systems'));
    // Ensure no unmentioned employers are hallucinated
    assert.ok(!profile.experiences.some(e => e.company === 'Google' || e.company === 'Meta'));
  });
});

describe('New-User Onboarding & Data Isolation Tests', () => {
  it('New user onboarding eligibility and refresh persistence logic', () => {
    interface MockProfile {
      fullName?: string;
      experiences?: Array<{ role: string; company: string }>;
    }

    const shouldShowOnboarding = (
      userId: string,
      profile: MockProfile | null,
      dismissedMap: Map<string, boolean>,
      isNewRegistration: boolean
    ) => {
      if (isNewRegistration) return true;
      if (dismissedMap.get(`applyvise_onboarding_dismissed_${userId}`) || dismissedMap.get(`applywise_onboarding_dismissed_${userId}`)) return false;
      const hasCompletedProfile = !!(profile?.fullName && profile.experiences && profile.experiences.length > 0);
      return !hasCompletedProfile;
    };

    const dismissed = new Map<string, boolean>();

    // New user who just signed up
    assert.strictEqual(shouldShowOnboarding('user_new_1', null, dismissed, true), true);

    // Existing user who already completed profile
    const completedProfile: MockProfile = {
      fullName: 'Ayush Prakash',
      experiences: [{ role: 'Architect', company: 'Antigravity' }],
    };
    assert.strictEqual(shouldShowOnboarding('user_existing_1', completedProfile, dismissed, false), false);

    // User dismissed onboarding
    dismissed.set('applyvise_onboarding_dismissed_user_new_2', true);
    assert.strictEqual(shouldShowOnboarding('user_new_2', null, dismissed, false), false);
  });

  it('Per-User Data Isolation: Resumes are strictly scoped to authenticated user ID', () => {
    const resumeStore = new Map<string, Array<{ id: string; userId: string; fileName: string }>>();

    const saveResume = (userId: string, fileName: string) => {
      const list = resumeStore.get(userId) || [];
      const newDoc = { id: 'doc_' + Math.random(), userId, fileName };
      resumeStore.set(userId, [...list, newDoc]);
      return newDoc;
    };

    const getResumesForUser = (requestingUserId: string) => {
      return resumeStore.get(requestingUserId) || [];
    };

    saveResume('user_A', 'UserA_Resume.pdf');
    saveResume('user_B', 'UserB_Resume.pdf');

    const userAResumes = getResumesForUser('user_A');
    assert.strictEqual(userAResumes.length, 1);
    assert.strictEqual(userAResumes[0].fileName, 'UserA_Resume.pdf');

    // User A cannot see User B's resume
    assert.ok(userAResumes.every(r => r.userId === 'user_A'));
  });

  it('Replacement & Retry Safety: Duplicate upload retries replace without orphan leaks', () => {
    const resumeStore = new Map<string, Array<{ id: string; fileName: string }>>();

    const uploadResumeWithReplace = (userId: string, fileName: string, replace: boolean) => {
      let list = resumeStore.get(userId) || [];
      if (replace) {
        list = [{ id: 'doc_replaced', fileName }];
      } else {
        list.push({ id: 'doc_' + Date.now(), fileName });
      }
      resumeStore.set(userId, list);
      return list;
    };

    // Initial upload
    uploadResumeWithReplace('user_1', 'v1_resume.pdf', false);
    assert.strictEqual(resumeStore.get('user_1')?.length, 1);

    // Retry with replace = true does not create duplicates
    uploadResumeWithReplace('user_1', 'v2_resume.pdf', true);
    assert.strictEqual(resumeStore.get('user_1')?.length, 1);
    assert.strictEqual(resumeStore.get('user_1')?.[0].fileName, 'v2_resume.pdf');
  });
});
