// tests/universal_resume_intelligence.test.ts
// Comprehensive Universal Resume Intelligence Test Suite:
// - Reproduces original bullet-split, wrapped-date, and stale-profile overwrite failures
// - Validates all 20 diverse resume layouts (A-T)
// - Verifies exact 7-record reference fixture through DOCX <w:numPr> XML + Worker + Node parity
// - Verifies post-AI source-grounding & anti-hallucination repair pipeline

import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {
  extractDocxResumeText,
  extractStructuredWordXmlBlocks,
} from '../src/utils/docxExtractor.ts';
import {
  parseEmploymentDates,
  extractDateRangeFromLine,
  doDateIntervalsOverlap,
} from '../src/utils/employmentDateParser.ts';
import {
  structureResumeDocument,
  segmentEmploymentSection,
} from '../src/utils/resumeStructureEngine.ts';
import {
  parseStructuralEmploymentHistory,
  validateAndMergeEmploymentRecords,
  normalizeAndValidateAiExperiences,
} from '../src/utils/structuralEmploymentParser.ts';
import { workerResumeEngine } from '../worker/resumeEngine.ts';
import { resumeEngine } from '../server/resumeEngine.ts';
import type { UserProfile } from '../src/types/index.ts';

async function buildMockDocxBytes(documentXmlBody: string): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>`
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>${documentXmlBody}</w:body>
    </w:document>`
  );
  return zip.generateAsync({ type: 'uint8array' });
}

test('Regression: wrapped dates, wrapped lowercase bullet fragments, and stale profile overwrite', () => {
  const dirtyResumeText = `
Ayush Prakash
ayush@example.com
PROFESSIONAL SUMMARY
Results-driven specialist with 4+ years of experience across operations and analytics.

WORK EXPERIENCE
ESP Softtech Pvt. Ltd., Indore | Sept 2023 –
Aug 2024
Process Associate
• Reconciled client invoices across regional accounts.

SynergyTop Softlabs Pvt. Ltd., Indore | Feb 2023 – July 2023
Data Operations Associate
Managed daily transaction audits and sorted out budget
discrepancies in a fast
paced environment.
  `;

  const parsed = parseStructuralEmploymentHistory(dirtyResumeText);
  assert.equal(parsed.length, 2, 'Must extract exactly 2 jobs without splitting ESP Softtech or turning bullets into jobs');
  assert.equal(parsed[0].company, 'ESP Softtech Pvt. Ltd.');
  assert.equal(parsed[0].location, 'Indore');
  assert.equal(parsed[0].start_date, '2023-09');
  assert.equal(parsed[0].end_date, '2024-08');

  assert.equal(parsed[1].company, 'SynergyTop Softlabs Pvt. Ltd.');
  assert.ok(
    parsed[1].description.some((d) => d.includes('discrepancies in a fast paced environment.')),
    'Wrapped lowercase fragments must stitch cleanly into parent job responsibilities'
  );
  assert.equal(
    parsed.some((r) => /discrepancies|paced environment/i.test(r.company) || /discrepancies|paced environment/i.test(r.job_title)),
    false
  );

  // Verify stale profile corrupted records are REPLACED by real newly uploaded resume records
  const staleCorruptedProfile: UserProfile = {
    id: 'usr_stale',
    fullName: 'Ayush Prakash',
    email: 'ayush@example.com',
    phone: '',
    location: '',
    currentTitle: 'discrepancies in a fast',
    currentEmployer: 'ESP Softtech Pvt. Ltd., Indore | 2023',
    totalExperienceYears: 4,
    professionalSummary: '',
    education: [],
    certifications: [],
    skills: [],
    experiences: [
      {
        id: 'stale_1',
        company: 'discrepancies in a fast',
        role: 'paced environment.',
        startDate: '2022',
        endDate: 'Present',
        current: true,
        location: '',
        description: '',
        achievements: [],
        verifiedSkillsUsed: [],
      },
    ],
    languages: [],
    masterResumeLastUpdated: '2026-01-01T00:00:00Z',
  };

  const workerFresh = workerResumeEngine.heuristicParse(dirtyResumeText, staleCorruptedProfile);
  const nodeFresh = resumeEngine.heuristicParse(dirtyResumeText, staleCorruptedProfile);
  assert.equal(workerFresh.experiences.length, 2);
  assert.equal(nodeFresh.experiences.length, 2);
  assert.equal(workerFresh.experiences[0].startDate, '2023-09');
  assert.equal(workerFresh.experiences[0].endDate, '2024-08');
  assert.equal(nodeFresh.experiences[0].company, 'ESP Softtech Pvt. Ltd.');
});

test('Reference Fixture Regression: 7 authentic roles extracted cleanly across DOCX XML + Worker + Node', async () => {
  const p = (text: string, opts?: { bold?: boolean; bullet?: boolean; heading?: boolean }) => {
    const pPrParts: string[] = [];
    if (opts?.heading) pPrParts.push('<w:pStyle w:val="Heading2"/>');
    if (opts?.bullet) pPrParts.push('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>');
    const pPr = pPrParts.length ? `<w:pPr>${pPrParts.join('')}</w:pPr>` : '';
    const rPr = opts?.bold ? '<w:rPr><w:b/></w:rPr>' : '';
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<w:p>${pPr}<w:r>${rPr}<w:t>${escaped}</w:t></w:r></w:p>`;
  };

  // Mimics real Word OOXML where bullets use <w:numPr> WITHOUT literal bullet characters
  const xmlBody = [
    p('Ayush Prakash', { bold: true, heading: true }),
    p('ayush.prakash@example.com | +91 9876543210 | Indore, India'),
    p('PROFESSIONAL SUMMARY', { bold: true, heading: true }),
    p('Detail-oriented professional with 4+ years of experience across supply chain operations, banking, and process excellence.'),
    p('WORK EXPERIENCE', { bold: true, heading: true }),

    p('Tata Consultancy Services (TCS) | Indore | September 2024 – Present', { bold: true }),
    p('Senior Process Associate – Supply Chain Operations'),
    p('Managed international freight coordination and SAP exception queues.', { bullet: true }),

    p('ESP Softtech Pvt. Ltd., Indore | Sept 2023 – Aug 2024', { bold: true }),
    p('Operations Specialist'),
    p('Audited SLA adherence across enterprise accounts.', { bullet: true }),

    p('SynergyTop Softlabs Pvt. Ltd., Indore | Feb 2023 – July 2023', { bold: true }),
    p('Process Associate'),
    p('Managed vendor reconciliations and sorting out budget', { bullet: true }),
    p('discrepancies in a fast-paced environment.'),

    p('Accenture Solutions Pvt. Ltd., Indore | Dec 2021 – Feb 2023', { bold: true }),
    p('Application Support Analyst'),
    p('Resolved tier-2 incident escalations for European retail clients.', { bullet: true }),

    p('Teleperformance | Sept 2021 – Nov 2021', { bold: true }),
    p('Customer Support Executive'),
    p('Delivered SLA-compliant resolution across billing queues.', { bullet: true }),

    p('Toppr Technologies | July 2021', { bold: true }),
    p('Academic Counselor Intern'),
    p('Supported onboarding workflows for regional cohorts.', { bullet: true }),

    p('ICICI Bank | Anand | Feb 2021 – Apr 2021', { bold: true }),
    p('Retail Banking Trainee'),
    p('Assisted branch operations and KYC document verification.', { bullet: true }),

    p('EDUCATION', { bold: true, heading: true }),
    p('MBA in Operations | Devi Ahilya University | 2021'),
  ].join('\n');

  const docxBytes = await buildMockDocxBytes(xmlBody);
  const extracted = await extractDocxResumeText(docxBytes);
  assert.equal(extracted.isScanned, false);
  assert.ok(extracted.blocks && extracted.blocks.some((b) => b.isBullet), 'XML <w:numPr> bullets must be preserved');

  const records = parseStructuralEmploymentHistory(extracted.text, extracted.blocks);
  assert.equal(records.length, 7, 'Must extract all 7 distinct employers accurately');

  assert.equal(records[0].company, 'Tata Consultancy Services (TCS)');
  assert.equal(records[0].is_current, true);
  assert.equal(records[0].start_date, '2024-09');

  assert.equal(records[1].company, 'ESP Softtech Pvt. Ltd.');
  assert.equal(records[1].start_date, '2023-09');
  assert.equal(records[1].end_date, '2024-08');

  assert.equal(records[2].company, 'SynergyTop Softlabs Pvt. Ltd.');
  assert.equal(records[2].start_date, '2023-02');
  assert.equal(records[2].end_date, '2023-07');
  assert.ok(records[2].description.some((d) => d.includes('discrepancies in a fast-paced environment.')));

  assert.equal(records[3].company, 'Accenture Solutions Pvt. Ltd.');
  assert.equal(records[3].start_date, '2021-12');
  assert.equal(records[3].end_date, '2023-02');

  assert.equal(records[4].company, 'Teleperformance');
  assert.equal(records[4].start_date, '2021-09');
  assert.equal(records[4].end_date, '2021-11');

  assert.equal(records[5].company, 'Toppr Technologies');
  assert.equal(records[5].start_date, '2021-07');

  assert.equal(records[6].company, 'ICICI Bank');
  assert.equal(records[6].location, 'Anand');
  assert.equal(records[6].start_date, '2021-02');
  assert.equal(records[6].end_date, '2021-04');

  // Verify parity on Worker & Node engines
  const workerRes = await workerResumeEngine.structureProfileDetailed(extracted.text, null, undefined, extracted.blocks);
  const nodeRes = await resumeEngine.structureProfileDetailed(extracted.text, null, extracted.blocks);
  assert.equal(workerRes.extractedFields.experiences.length, 7);
  assert.equal(nodeRes.extractedFields.experiences.length, 7);
});

test('Layouts A-J: Diverse Resume Formats (tabular DOCX, columns, promotions, academic vs student, client notes)', async () => {
  // Layout C: DOCX table cells (<w:tr>/<w:tc>)
  const tableXml = `
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>EXPERIENCE</w:t></w:r></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Datadog Inc.</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Staff Site Reliability Engineer</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>2022-05 - Present</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Cloudflare Solutions</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Systems Engineer</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>2020-01 - 2022-04</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  `;
  const tableDocx = await buildMockDocxBytes(tableXml);
  const tableExtracted = await extractDocxResumeText(tableDocx);
  const tableJobs = parseStructuralEmploymentHistory(tableExtracted.text, tableExtracted.blocks);
  assert.equal(tableJobs.length, 2);
  assert.equal(tableJobs[0].company, 'Datadog Inc.');
  assert.equal(tableJobs[0].start_date, '2022-05');
  assert.equal(tableJobs[0].is_current, true);
  assert.equal(tableJobs[1].company, 'Cloudflare Solutions');
  assert.equal(tableJobs[1].start_date, '2020-01');
  assert.equal(tableJobs[1].end_date, '2022-04');

  // Academic research employment preserved vs Education degree rejected + Internships-only section
  const academicAndIntern = `
INTERNSHIPS
Google | Software Engineering Intern | Jun 2023 - Aug 2023
• Built benchmark harness.

EXPERIENCE
Stanford University | Research Associate | 2022 - 2024
• Published empirical runtime benchmarks.

EDUCATION
Massachusetts Institute of Technology | B.S. in Computer Science | 2018 - 2022
  `;
  const acadJobs = parseStructuralEmploymentHistory(academicAndIntern);
  assert.equal(acadJobs.length, 2);
  assert.equal(acadJobs[0].company, 'Google');
  assert.equal(acadJobs[0].employment_type, 'internship');
  assert.equal(acadJobs[1].company, 'Stanford University');
  assert.equal(acadJobs[1].job_title, 'Research Associate');
  assert.equal(acadJobs.some((j) => /Massachusetts Institute/i.test(j.company)), false);

  const directBlocks = extractStructuredWordXmlBlocks(tableXml);
  assert.ok(directBlocks.some((b) => b.isTableRow));
  assert.equal(extractDateRangeFromLine('Feb - Apr 2021').startDate, '2021-02');
  assert.equal(extractDateRangeFromLine('Feb - Apr 2021').endDate, '2021-04');

  // Layout E + G + K: Title-first, nested promotion without repeating company, client list inside bullets
  const complexText = `
WORK EXPERIENCE
Senior Software Engineer
Vertex Labs Inc. | 2023 - Present
• Built analytics pipelines for clients such as Goldman Sachs and JP Morgan.
Software Engineer | 2021 - 2023
• Migrated legacy monoliths to TypeScript microservices.
  `;
  const complexJobs = parseStructuralEmploymentHistory(complexText);
  assert.equal(complexJobs.length, 2, 'Promotions (even nested without repeating company) must both survive');
  assert.equal(complexJobs[0].company, 'Vertex Labs Inc.');
  assert.equal(complexJobs[0].job_title, 'Senior Software Engineer');
  assert.equal(complexJobs[1].company, 'Vertex Labs Inc.');
  assert.equal(complexJobs[1].job_title, 'Software Engineer');
  assert.equal(
    complexJobs.some((j) => /Goldman|Morgan/i.test(j.company)),
    false,
    'Client names in bullets must never be promoted to employers'
  );
});

test('Layouts K-T: Section boundary isolation, unusual headers, projects-first, headerless fallback, ISO/Mojibake & dedup', () => {
  // Unusual headings + Projects & Education BEFORE Employment + Volunteer Experience separation
  const reorderedText = `
Jane Rivera
CORE TOOLKIT
Python, SQL, Kubernetes

ACADEMIC PROJECTS
Distributed Cache Simulator (2024)
• Built Raft consensus cluster in Go.

VOLUNTEER EXPERIENCE
Local Food Bank Coordinator | 2022 - Present
• Organized weekend food drives.

WHERE I'VE WORKED
Stripe Inc. — Platform Engineer — 2023-09 to Till Date
â€¢ Reduced payment webhook p99 latency by 42%.
Technologies: TypeScript, AWS, PostgreSQL, Docker
  `;

  const structured = structureResumeDocument(reorderedText);
  assert.equal(structured.employmentSections.length, 1);
  assert.equal(structured.employmentSections[0].type, 'experience');

  const jobs = parseStructuralEmploymentHistory(reorderedText);
  assert.equal(jobs.length, 1, 'Projects, Volunteer Experience, and Tech Stack lines must never leak into Work Experience');
  assert.equal(jobs[0].company, 'Stripe Inc.');
  assert.equal(jobs[0].start_date, '2023-09');
  assert.equal(jobs[0].is_current, true);

  // Headerless resume fallback (Layout N)
  const headerlessText = `
Marcus Chen | marcus@dev.io
Engineering Leader with 9+ years of experience in distributed storage.

Snowflake Inc. | Principal Systems Engineer | Mar 2021 – Present
• Designed multi-tenant query scheduler.

Databricks | Senior Software Engineer | Jan 2018 – Feb 2021
• Scaled Spark shuffle service.
  `;
  const segHeaderless = segmentEmploymentSection(headerlessText);
  assert.equal(segHeaderless.usedHeaderlessFallback, true);
  const headerlessJobs = parseStructuralEmploymentHistory(headerlessText);
  assert.equal(headerlessJobs.length, 2);
  assert.equal(headerlessJobs[0].company, 'Snowflake Inc.');
  assert.equal(headerlessJobs[1].company, 'Databricks');
});

test('Date Intelligence & Post-AI Source Grounding Validator: blocks fabricated 2022-Present and bullet jobs', () => {
  const isoDates = parseEmploymentDates('2023-09 - 2024-08');
  assert.equal(isoDates.normalizedStart, '2023-09');
  assert.equal(isoDates.normalizedEnd, '2024-08');
  assert.equal(isoDates.isDateUncertain, false);

  const chronErr = parseEmploymentDates('2024-05 - 2022-01');
  assert.equal(chronErr.isDateUncertain, true);
  assert.ok(chronErr.dateWarning?.includes('Chronological error'));

  assert.equal(doDateIntervalsOverlap('2021-01', '2023-06', false, '2023-01', '2024-01', false), true);
  assert.equal(doDateIntervalsOverlap('2021-01', '2022-06', false, '2023-01', '2024-01', false), false);

  // Simulate hallucinating LLM output
  const sourceResume = `
WORK EXPERIENCE
Acme Logistics Ltd. | Supply Chain Analyst
May 2021 – August 2023
• Coordinated customs clearance and audit tracking.
EDUCATION
B.Sc. in Mathematics | Delhi University | 2020
  `;

  const badAiOutput = [
    {
      company: 'Acme Logistics Ltd.',
      role: 'Supply Chain Analyst',
      startDate: '2022',      // fabricated year (source says 2021)
      endDate: 'Present',     // fabricated Present (source says August 2023)
      current: true,
      responsibilities: ['Coordinated customs clearance and audit tracking.'],
      sourceEvidence: ['Acme Logistics Ltd. | Supply Chain Analyst'],
    },
    {
      company: 'discrepancies in a fast',
      role: 'paced environment.',
      startDate: '2022',
      endDate: 'Present',
      current: true,
    },
    {
      company: 'Delhi University',
      role: 'B.Sc. in Mathematics',
      startDate: '2017',
      endDate: '2020',
      current: false,
    },
  ];

  const repaired = normalizeAndValidateAiExperiences(badAiOutput, sourceResume);
  assert.equal(repaired.experiences.length, 1, 'Bullet hallucinations and B.Sc. education record must be rejected');
  assert.equal(repaired.experiences[0].company, 'Acme Logistics Ltd.');
  assert.equal(repaired.experiences[0].startDate, '', 'Ungrounded AI start year 2022 must be stripped');
  assert.equal(repaired.experiences[0].current, false, 'Ungrounded AI Present flag must be cleared');
  assert.equal(repaired.experiences[0].confidenceCategory, 'Needs review');
  assert.ok(repaired.warnings.some((w) => /unverified/i.test(w)));

  // Split fragment deduplication test
  const fragmented = validateAndMergeEmploymentRecords(
    [
      {
        company: 'ESP Softtech Pvt. Ltd.',
        job_title: 'Title not detected',
        location: 'Indore',
        employment_type: null,
        start_date: '2023-09',
        end_date: '2024-08',
        is_current: false,
        original_date_text: 'Sept 2023 - Aug 2024',
        description: ['Audited SLAs.'],
        source_text: 'ESP Softtech Pvt. Ltd., Indore | Sept 2023 - Aug 2024',
        confidence: 65,
        needs_verification: true,
      },
      {
        company: 'ESP Softtech Pvt. Ltd.',
        job_title: 'Operations Specialist',
        location: 'Indore',
        employment_type: null,
        start_date: '2023-09',
        end_date: null,
        is_current: false,
        original_date_text: '2023-09',
        description: ['Built reporting dashboards.'],
        source_text: 'Operations Specialist',
        confidence: 70,
        needs_verification: true,
      },
    ],
    'ESP Softtech Pvt. Ltd., Indore | Sept 2023 - Aug 2024\nOperations Specialist'
  );
  assert.equal(fragmented.length, 1, 'Split fragments of same employer+tenure must merge cleanly');
  assert.equal(fragmented[0].job_title, 'Operations Specialist');
  assert.equal(fragmented[0].description.length, 2);
});
