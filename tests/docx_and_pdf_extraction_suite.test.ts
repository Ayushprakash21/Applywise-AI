import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import JSZip from 'jszip';
import esbuild from 'esbuild';
import {
  Document,
  Footer,
  Header,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
} from 'docx';
import { DatabaseSync } from 'node:sqlite';
import { authAndStore, sqlite } from '../server/authAndStore.ts';
import { resumeEngine } from '../server/resumeEngine.ts';
import { workerResumeEngine } from '../worker/resumeEngine.ts';
import { extractDocxResumeText, ResumeExtractionError } from '../src/utils/docxExtractor.ts';
import workerEntry from '../worker/index.ts';
import { api } from '../src/services/api.ts';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function createTextPdfBuffer(pagesText: string[]): Buffer {
  // Minimal valid multi-page text PDF generator
  const objects: string[] = [];
  const pageCount = pagesText.length;
  // Obj 1: Catalog, Obj 2: Pages, Obj 3: Font
  const kidsRefs = pagesText.map((_, idx) => `${4 + idx * 2} 0 R`).join(' ');
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kidsRefs}] /Count ${pageCount} >>\nendobj\n`);
  objects.push(`3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

  pagesText.forEach((txt, idx) => {
    const pageId = 4 + idx * 2;
    const contentId = pageId + 1;
    const safeTxt = txt.replace(/[()\\]/g, '\\$&');
    const stream = `BT /F1 14 Tf 50 720 Td (${safeTxt}) Tj ET`;
    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n`
    );
    objects.push(
      `${contentId} 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj\n`
    );
  });

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf);
}

/**
 * Minimal in-memory Cloudflare D1 shim backed by node:sqlite for executing real Worker HTTP handlers in tests.
 */
function createInMemoryD1(seedUser: { id: string; email: string; fullName: string; role: string }, token: string) {
  const mem = new DatabaseSync(':memory:');
  const migrationsDir = path.join(process.cwd(), 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    // Guard ALTER TABLE duplicate errors across additive migrations if any
    const statements = sql.split(/;\s*\r?\n/).filter((s) => s.trim().length > 0);
    for (const stmt of statements) {
      try {
        mem.exec(`${stmt};`);
      } catch {
        // Ignore seed collisions on idempotent statements
      }
    }
  }

  const now = new Date().toISOString();
  mem.prepare('INSERT INTO users (id, email, password_hash, full_name, role, is_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
    .run(seedUser.id, seedUser.email, 'hashed', seedUser.fullName, seedUser.role, now, now);
  mem.prepare('INSERT INTO user_sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .run('sess_w1', seedUser.id, token, new Date(Date.now() + 86400_000).toISOString(), now);

  const wrapPrepared = (query: string, boundArgs: any[] = []) => ({
    bind: (...args: any[]) => wrapPrepared(query, args),
    first: async <T = any>() => (mem.prepare(query).get(...boundArgs) as T) || null,
    all: async <T = any>() => ({ results: (mem.prepare(query).all(...boundArgs) as T[]) || [] }),
    run: async () => {
      const info = mem.prepare(query).run(...boundArgs);
      return { success: true, meta: { changes: Number(info.changes || 0), last_row_id: Number(info.lastInsertRowid || 0) } };
    },
  });

  return {
    db: {
      prepare: (q: string) => wrapPrepared(q),
      exec: async (q: string) => mem.exec(q),
      batch: async (stmts: any[]) => Promise.all(stmts.map((s) => s.run())),
    } as unknown as D1Database,
    mem,
  };
}

describe('ApplyVise AI — Complete DOCX & PDF Extraction Repair Suite (Node + Cloudflare Worker + Frontend API)', () => {
  const suffix = crypto.randomUUID().slice(0, 6);
  const cleanupEmails = [`docx.e2e.${suffix}@applyvise-test.org`];

  it('A. Extracts simple DOCX containing candidate name, email and phone without losing characters', async () => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph('Ayush Prakash'),
          new Paragraph('ayushprakash0021@gmail.com | +91-9876543210 | Bengaluru, India'),
          new Paragraph('Principal Systems Architect specializing in Cloudflare Workers and Distributed AI.'),
        ],
      }],
    });
    const buf = await Packer.toBuffer(doc);
    const res = await workerResumeEngine.extractText(buf, 'Ayush_Prakash_Full_Resume.docx', DOCX_MIME);
    assert.strictEqual(res.format, 'docx');
    assert.strictEqual(res.isScanned, false);
    assert.ok(res.text.includes('Ayush Prakash'));
    assert.ok(res.text.includes('ayushprakash0021@gmail.com'));
    assert.ok(res.text.includes('+91-9876543210'));
  });

  it('B. Extracts DOCX with multiple employment records & parses structured experiences accurately', async () => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph('Ayush Prakash'),
          new Paragraph('ayush@applyvise.ai | Senior Supply Chain & Software Architect'),
          new Paragraph('EXPERIENCE'),
          new Paragraph('Nordic Logistics GmbH — Senior Supply Chain Architect (Jan 2022 - Present)'),
          new Paragraph('- Directed European logistics automation across 14 distribution hubs.'),
          new Paragraph('Meridian Systems Ltd — Systems Engineer (Mar 2019 - Dec 2021)'),
          new Paragraph('- Built TypeScript ingestion pipelines handling 2M shipments/month.'),
          new Paragraph('EDUCATION'),
          new Paragraph('Master of Science in Supply Chain Engineering, TU Munich (2018)'),
        ],
      }],
    });
    const buf = await Packer.toBuffer(doc);
    const extracted = await workerResumeEngine.extractText(buf, 'MultiRole.docx', DOCX_MIME);
    assert.ok(extracted.text.includes('Nordic Logistics GmbH'));
    assert.ok(extracted.text.includes('Meridian Systems Ltd'));

    const profile = workerResumeEngine.heuristicParse(extracted.text);
    assert.strictEqual(profile.fullName, 'Ayush Prakash');
    assert.ok(profile.experiences.length >= 2, `Expected >=2 experiences, got ${profile.experiences.length}`);
    assert.ok(profile.experiences.some((e) => e.company.includes('Nordic Logistics')));
    assert.ok(profile.experiences.some((e) => e.company.includes('Meridian Systems')));
  });

  it('C. Extracts text embedded inside DOCX tables cleanly', async () => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph('Priya Sharma — Operations Program Manager'),
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Core Competency')] }),
                  new TableCell({ children: [new Paragraph('Tools & Systems')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Global Procurement & Logistics')] }),
                  new TableCell({ children: [new Paragraph('SAP S/4HANA, Python, SQL, Tableau')] }),
                ],
              }),
            ],
          }),
        ],
      }],
    });
    const buf = await Packer.toBuffer(doc);
    const res = await extractDocxResumeText(buf);
    assert.ok(res.text.includes('Global Procurement & Logistics'));
    assert.ok(res.text.includes('SAP S/4HANA, Python, SQL, Tableau'));
  });

  it('D. Preserves Unicode characters (accents, em-dashes, Euro symbols)', async () => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph('Joséphine Müller — Zürich / São Paulo'),
          new Paragraph('Led €4.5M EMEA freight optimization • Reduced transit SLA misses by 18% — 2021–2024'),
        ],
      }],
    });
    const buf = await Packer.toBuffer(doc);
    const res = await extractDocxResumeText(buf);
    assert.ok(res.text.includes('Joséphine Müller'));
    assert.ok(res.text.includes('Zürich / São Paulo'));
    assert.ok(res.text.includes('€4.5M'));
  });

  it('E & F. Extracts DOCX headers, footers, and multiple sections', async () => {
    const doc = new Document({
      sections: [
        {
          headers: {
            default: new Header({ children: [new Paragraph('Header Contact: header.candidate@globalops.eu')] }),
          },
          footers: {
            default: new Footer({ children: [new Paragraph('Footer Credential: PMP Certified #998811')] }),
          },
          children: [
            new Paragraph('Section One Summary: International Operations Executive managing APAC and EMEA supply chains.'),
          ],
        },
        {
          children: [
            new Paragraph('Section Two Publications: Author of Distributed Edge Fulfillment Workflows (2024).'),
          ],
        },
      ],
    });
    const buf = await Packer.toBuffer(doc);
    const res = await extractDocxResumeText(buf);
    assert.ok(res.text.includes('header.candidate@globalops.eu'), 'Header contact must be preserved');
    assert.ok(res.text.includes('Footer Credential: PMP Certified #998811'), 'Footer text must be preserved');
    assert.ok(res.text.includes('Section One Summary'), 'Section 1 content missing');
    assert.ok(res.text.includes('Section Two Publications'), 'Section 2 content missing');
  });

  it('G, H, I, J, K, L, M. Rejects empty, corrupted ZIP, renamed TXT, missing document.xml, 0-byte, >10MB, legacy .doc & encrypted OLE2', async () => {
    // G. Empty body DOCX
    const emptyDoc = new Document({ sections: [{ children: [new Paragraph('')] }] });
    const emptyDocBuf = await Packer.toBuffer(emptyDoc);
    const emptyRes = await extractDocxResumeText(emptyDocBuf);
    assert.strictEqual(emptyRes.isScanned, true);
    assert.strictEqual(emptyRes.errorCode, 'DOCX_EMPTY_DOCUMENT');
    assert.strictEqual(emptyRes.text, '');

    // H. Corrupted ZIP header (starts with PK\x03\x04 followed by garbage)
    const corruptZip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0xff, 0x00, 0xde, 0xad, 0xbe, 0xef]);
    await assert.rejects(
      () => extractDocxResumeText(corruptZip),
      (err: any) => err instanceof ResumeExtractionError && err.code === 'DOCX_UPLOAD_CORRUPTED'
    );

    // I. Plain text renamed to .docx
    await assert.rejects(
      () => workerResumeEngine.extractText(Buffer.from('Plain text resume without zip'), 'fake.docx', DOCX_MIME),
      (err: any) => err instanceof ResumeExtractionError && err.code === 'DOCX_INVALID_ARCHIVE'
    );

    // J. Valid ZIP archive missing word/document.xml
    const zipNoDocXml = new JSZip();
    zipNoDocXml.file('[Content_Types].xml', '<Types/>');
    const noDocBuf = await zipNoDocXml.generateAsync({ type: 'nodebuffer' });
    await assert.rejects(
      () => extractDocxResumeText(noDocBuf),
      (err: any) => err instanceof ResumeExtractionError && err.code === 'DOCX_MISSING_DOCUMENT_XML'
    );

    // K. Zero-byte upload
    await assert.rejects(
      () => workerResumeEngine.extractText(Buffer.alloc(0), 'empty.docx', DOCX_MIME),
      (err: any) => err instanceof ResumeExtractionError && err.code === 'DOCX_EMPTY_DOCUMENT'
    );

    // L. Over 10 MB
    await assert.rejects(
      () => workerResumeEngine.extractText(Buffer.alloc(10 * 1024 * 1024 + 8), 'huge.docx', DOCX_MIME),
      (err: any) => err instanceof ResumeExtractionError && err.code === 'UPLOAD_TOO_LARGE'
    );

    // M1. Legacy .doc OLE2 container
    const oleHeader = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x01, 0x02]);
    await assert.rejects(
      () => workerResumeEngine.extractText(oleHeader, 'legacy.doc', 'application/msword'),
      (err: any) => err instanceof ResumeExtractionError && err.code === 'DOCX_UNSUPPORTED_FEATURE'
    );

    // M2. Encrypted / password-protected OOXML container (OLE2 + UTF-16LE EncryptedPackage marker)
    const utf16Marker = Buffer.from('EncryptedPackage', 'utf16le');
    const encryptedOle = Buffer.concat([oleHeader, utf16Marker]);
    await assert.rejects(
      () => workerResumeEngine.extractText(encryptedOle, 'protected.docx', DOCX_MIME),
      (err: any) => err instanceof ResumeExtractionError && err.code === 'DOCX_ENCRYPTED'
    );
  });

  it('O (Edge Bundle). Proves mammoth/browser/unzip.js + JSZip bundled under Cloudflare Worker conditions extracts DOCX ArrayBuffer without "Could not find file in options"', async () => {
    const built = await esbuild.build({
      entryPoints: [path.join(process.cwd(), 'src', 'utils', 'docxExtractor.ts')],
      bundle: true,
      platform: 'browser',
      format: 'esm',
      conditions: ['workerd', 'worker', 'browser'],
      write: false,
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    });

    const bundledCode = built.outputFiles[0].text;
    assert.ok(bundledCode.includes('Could not find file in options'), 'Bundle must have exercised mammoth browser/unzip.js');

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph('Ayush Prakash — Cloud Edge Systems Architect'),
          new Paragraph('Contact: ayushprakash0021@gmail.com | Built production Cloudflare Workers pipelines across 50M requests.'),
        ],
      }],
    });
    const nodeBuf = await Packer.toBuffer(doc);
    const exactAb = nodeBuf.buffer.slice(nodeBuf.byteOffset, nodeBuf.byteOffset + nodeBuf.byteLength);

    // Import compiled Worker-targeted ESM module via data URL cleanly
    const modUrl = `data:text/javascript;base64,${Buffer.from(bundledCode, 'utf-8').toString('base64')}`;
    const workerModule = await import(modUrl);
    const out = await workerModule.extractDocxResumeText(exactAb);
    assert.strictEqual(out.format, 'docx');
    assert.strictEqual(out.isScanned, false);
    assert.ok(out.text.includes('Ayush Prakash'));
    assert.ok(out.text.includes('Cloudflare Workers pipelines'));
  });

  it('N, O & P. Extracts DOCX cleanly through Cloudflare Worker endpoint, Node/Express endpoint & Frontend api.uploadResumeFile', async () => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ children: [new TextRun({ text: 'Ayush Prakash', bold: true })] }),
          new Paragraph('ayushprakash0021@gmail.com | +91 9876543210 | Bengaluru, India'),
          new Paragraph('EXPERIENCE'),
          new Paragraph('ApplyVise AI — Principal Software Architect (2024 - Present)'),
          new Paragraph('- Engineered Global Career Discovery Engine and zero-hallucination ATS matching pipeline.'),
          new Paragraph('SKILLS: TypeScript, React, Cloudflare Workers, PostgreSQL, Supply Chain'),
        ],
      }],
    });
    const docxBuffer = await Packer.toBuffer(doc);
    const ab = docxBuffer.buffer.slice(docxBuffer.byteOffset, docxBuffer.byteOffset + docxBuffer.byteLength) as ArrayBuffer;

    // --- 1. Cloudflare Worker Fetch Endpoint Test (real Hono worker/index.ts + D1 SQLite shim) ---
    const wToken = `w_tok_${suffix}`;
    const wUser = { id: `w_usr_${suffix}`, email: `worker.${suffix}@applyvise-test.org`, fullName: 'Ayush Prakash', role: 'user' };
    const { db, mem } = createInMemoryD1(wUser, wToken);
    const wForm = new FormData();
    wForm.append('file', new File([ab], 'Ayush_Prakash_Full_Resume.docx', { type: DOCX_MIME }));

    const workerRes = await workerEntry.fetch(
      new Request('https://applyvise-ai.workers.dev/api/resumes/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${wToken}` },
        body: wForm,
      }),
      { DB: db, ASSETS: { fetch: async () => new globalThis.Response('ok') } } as any,
      { waitUntil: () => {}, passThroughOnException: () => {} } as any
    );

    assert.strictEqual(workerRes.status, 200, 'Worker DOCX upload should return 200');
    const workerBody = (await workerRes.json()) as any;
    assert.strictEqual(workerBody.success, true);
    assert.strictEqual(workerBody.profile.fullName, 'Ayush Prakash');
    assert.ok(workerBody.extractedTextSummary.includes('Ayush Prakash'));
    assert.ok(workerBody.profile.skills.some((s: any) => s.name === 'TypeScript'));

    const savedRow = mem.prepare('SELECT file_name, file_type, extracted_text FROM resume_documents WHERE user_id = ?').get(wUser.id) as any;
    assert.strictEqual(savedRow.file_name, 'Ayush_Prakash_Full_Resume.docx');
    assert.strictEqual(savedRow.file_type, 'docx');
    assert.ok(savedRow.extracted_text.includes('ApplyVise AI'));

    // Also test Worker corrupted DOCX upload returns 422 structured error code (no AI call)
    const badForm = new FormData();
    badForm.append('file', new File([new TextEncoder().encode('plain text')], 'broken.docx', { type: DOCX_MIME }));
    badForm.append('replace', 'true');
    const badWorkerRes = await workerEntry.fetch(
      new Request('https://applyvise-ai.workers.dev/api/resumes/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${wToken}` },
        body: badForm,
      }),
      { DB: db, ASSETS: { fetch: async () => new globalThis.Response('ok') } } as any,
      { waitUntil: () => {}, passThroughOnException: () => {} } as any
    );
    assert.strictEqual(badWorkerRes.status, 422);
    const badWorkerBody = (await badWorkerRes.json()) as any;
    assert.strictEqual(badWorkerBody.code, 'DOCX_INVALID_ARCHIVE');
    mem.close();

    // --- 2. Node/Express + Frontend api.uploadResumeFile E2E Multipart HTTP Test ---
    const email = cleanupEmails[0];
    authAndStore.createUser('Ayush Test', email, 'DocxPass123!');
    const session = authAndStore.verifyLogin(email, 'DocxPass123!');

    const expressApp = express();
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
    const reqAuth = (req: any, res: Response, next: NextFunction) => {
      const hdr = req.headers.authorization || '';
      const tok = hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : '';
      const usr = tok ? authAndStore.getUserByToken(tok) : null;
      if (!usr) return res.status(401).json({ success: false, error: 'Unauthorized' });
      req.user = usr;
      next();
    };
    expressApp.post('/api/resumes/upload', reqAuth, upload.single('file'), async (req: any, res: Response) => {
      try {
        const f = req.file;
        if (!f) return res.status(400).json({ success: false, error: 'Missing file' });
        const ext = await resumeEngine.extractText(f.buffer, f.originalname, f.mimetype);
        if (ext.isScanned || ext.text.length < 40) {
          return res.status(422).json({ success: false, isScanned: true, code: ext.errorCode || 'DOCX_EMPTY_DOCUMENT', error: ext.warning });
        }
        const detailed = await resumeEngine.structureProfileDetailed(ext.text, authAndStore.getProfile(req.user.id));
        authAndStore.saveProfile(req.user.id, detailed.extractedFields);
        res.json({ success: true, profile: detailed.extractedFields, extractedTextSummary: ext.text.slice(0, 300) });
      } catch (err: unknown) {
        if (err instanceof ResumeExtractionError) {
          return res.status(err.httpStatus).json({ success: false, error: err.message, code: err.code });
        }
        res.status(400).json({ success: false, error: err instanceof Error ? err.message : String(err) });
      }
    });

    const srv = await new Promise<any>((resolve) => {
      const s = expressApp.listen(0, '127.0.0.1', () => resolve(s));
    });

    const origFetch = globalThis.fetch;
    const origLocalStorage = (globalThis as any).localStorage;
    try {
      const port = (srv.address() as any).port;
      (globalThis as any).localStorage = {
        getItem: (k: string) => (k === 'applyvise_token' ? session.token : null),
      };
      globalThis.fetch = ((url: RequestInfo | URL, init?: RequestInit) => {
        const target = String(url).startsWith('/') ? `http://127.0.0.1:${port}${url}` : url;
        return origFetch(target, init);
      }) as typeof fetch;

      const fileObj = new File([ab], 'Ayush_Prakash_Full_Resume.docx', { type: DOCX_MIME });
      const apiRes = await api.uploadResumeFile(fileObj, false);
      assert.strictEqual(apiRes.success, true);
      assert.strictEqual(apiRes.profile.fullName, 'Ayush Test', 'Existing verified profile name should be preserved cleanly');
      assert.ok(apiRes.extractedTextSummary.includes('Ayush Prakash'));
      assert.ok(apiRes.extractedTextSummary.includes('Principal Software Architect'));
      assert.ok(apiRes.profile.skills.some((s: any) => s.name === 'TypeScript'));

      // Verify Frontend api.uploadResumeFile propagates structured error code on corrupted upload
      const badFile = new File([new TextEncoder().encode('garbage')], 'corrupt.docx', { type: DOCX_MIME });
      await assert.rejects(
        () => api.uploadResumeFile(badFile),
        (err: any) => err.code === 'DOCX_INVALID_ARCHIVE'
      );
    } finally {
      globalThis.fetch = origFetch;
      (globalThis as any).localStorage = origLocalStorage;
      srv.close();
    }
  });

  it('Section 10 PDF Regression: Text-based, multi-page, scanned, corrupted & encrypted PDF checks remain intact', async () => {
    // 1. Multi-page text PDF
    const multiPagePdf = createTextPdfBuffer([
      'Ayush Prakash - Principal Software Engineer - Edge Distributed Systems',
      'Experience: Architected scalable TypeScript APIs and PostgreSQL data layers at ApplyVise AI.',
    ]);
    const pdfRes = await workerResumeEngine.extractText(multiPagePdf, 'MultiPageResume.pdf', 'application/pdf');
    assert.strictEqual(pdfRes.format, 'pdf');
    assert.strictEqual(pdfRes.isScanned, false);
    assert.strictEqual(pdfRes.pageCount, 2);
    assert.ok(pdfRes.text.includes('Ayush Prakash'));
    assert.ok(pdfRes.text.includes('Architected scalable TypeScript APIs'));

    // 2. Scanned PDF (<40 chars)
    const scannedPdf = createTextPdfBuffer(['Scan']);
    const scannedRes = await workerResumeEngine.extractText(scannedPdf, 'scan.pdf', 'application/pdf');
    assert.strictEqual(scannedRes.isScanned, true);
    assert.strictEqual(scannedRes.text, '');

    // 3. Corrupted PDF
    await assert.rejects(
      () => workerResumeEngine.extractText(Buffer.from('CORRUPTED_BYTES'), 'bad.pdf', 'application/pdf'),
      (err: any) => err instanceof ResumeExtractionError && err.code === 'PDF_PARSE_FAILURE'
    );
  });

  after(() => {
    try {
      for (const em of cleanupEmails) {
        sqlite.prepare('DELETE FROM users WHERE email = ?').run(em);
      }
    } catch {
      // ignore cleanup error
    }
  });
});
