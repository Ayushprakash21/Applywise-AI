import test from 'node:test';
import assert from 'node:assert/strict';
import { resumeEngine } from '../server/resumeEngine.ts';

test('Resume Engine: File validation, extraction, and error handling', async () => {
  // 1. Empty document handling
  await assert.rejects(
    async () => resumeEngine.extractText(Buffer.alloc(0), 'resume.pdf', 'application/pdf'),
    /empty/i
  );

  // 2. Unsupported format rejection
  await assert.rejects(
    async () => resumeEngine.extractText(Buffer.from('hello'), 'resume.exe', 'application/octet-stream'),
    /unsupported file format/i
  );

  // 3. Malformed PDF header rejection
  await assert.rejects(
    async () => resumeEngine.extractText(Buffer.from('NOT A PDF FILE CONTENT'), 'resume.pdf', 'application/pdf'),
    /malformed pdf/i
  );

  // 4. Heuristic text structured profile extraction
  const sampleText = `
Alex Mercer
alex.mercer@example.com | (555) 123-4567 | San Francisco, CA
Senior Software Engineer with 6 years experience in TypeScript, React, and Node.js.

EXPERIENCE:
Staff Software Engineer at Acme Corp (2021 - Present)
- Architected distributed data ingestion processing 10M records daily.
- Built reusable frontend components in React and TypeScript.

EDUCATION:
Bachelor of Science in Computer Science, Stanford University (2018)
  `;

  const profile = resumeEngine.heuristicParse(sampleText);
  assert.equal(profile.fullName, 'Alex Mercer');
  assert.equal(profile.email, 'alex.mercer@example.com');
  assert.ok(profile.skills.some(s => s.name === 'React'));
  assert.ok(profile.skills.some(s => s.name === 'TypeScript'));

  // 5. Truthful resume tailoring without hallucination
  const tailoring = await resumeEngine.tailorResume(
    profile,
    'Lead Frontend Engineer',
    'TechNova Systems',
    'Looking for a Lead Frontend Engineer with React and TypeScript expertise.'
  );

  assert.equal(tailoring.truthfulnessScore, 100);
  assert.ok((tailoring.tailoredResume.headline || '').includes('Frontend'));
  assert.ok(tailoring.coverLetter.includes('TechNova Systems'));
});
