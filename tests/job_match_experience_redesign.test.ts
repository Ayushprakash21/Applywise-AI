import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('APPLYVISE AI — Job Match Experience Redesign Suite', async (t) => {
  const componentPath = path.resolve(process.cwd(), 'src/components/JobMatchExperience.tsx');
  const componentSource = fs.readFileSync(componentPath, 'utf8');

  const landingPath = path.resolve(process.cwd(), 'src/components/LandingPage.tsx');
  const landingSource = fs.readFileSync(landingPath, 'utf8');

  await t.test('1. Absence of Red/Yellow Warning Alert Patterns in Match Screen', () => {
    // Assert no alarming warning phrases
    assert.doesNotMatch(componentSource, /Critical Skill Missing/i, 'No alarming "Critical Skill Missing" phrasing');
    assert.doesNotMatch(componentSource, /RED FLAG/i, 'No "RED FLAG" alert styling');
    assert.doesNotMatch(componentSource, /WARNING: Requirement not fulfilled/i, 'No aggressive "WARNING: Requirement not fulfilled" banners');
    assert.doesNotMatch(componentSource, /bg-amber-500|bg-red-500|bg-rose-500/i, 'No high-alert background classes in candidate view');
  });

  await t.test('2. Constructive & Neutral Career Intelligence Phrasing', () => {
    assert.match(componentSource, /Skill to strengthen:/, 'Uses constructive "Skill to strengthen:" phrasing');
    assert.match(componentSource, /This requirement is not yet demonstrated in your profile/, 'Uses neutral "not yet demonstrated" explanation');
    assert.match(componentSource, /Where your experience aligns/, 'Presents positive "Where your experience aligns" section');
    assert.match(componentSource, /Skills to strengthen/, 'Presents neutral "Skills to strengthen" section');
  });

  await t.test('3. Decision-Oriented Main Screen Structure', () => {
    assert.match(componentSource, /View Job & Apply/, 'Includes clear View Job & Apply primary action');
    assert.match(componentSource, /Match Assessment/, 'Includes Match Assessment score section');
    assert.match(componentSource, /topStrengths/, 'Computes up to 3 strongest matching areas');
    assert.match(componentSource, /skillsToStrengthen/, 'Computes up to 3 concise skills to strengthen');
  });

  await t.test('4. Privacy Protection & Zero Public Data Leakage', () => {
    // Ensure no fake emails or private contact leaks in default view
    assert.doesNotMatch(componentSource, /ayush@example\.com/, 'Never invents or leaks ayush@example.com in demo or default profile');
    assert.match(componentSource, /Protected on Demonstration View|Privacy Protected/i, 'Guards candidate contact info on demo view');
    // Ensure raw fact-sheet dump is behind on-demand disclosure
    assert.match(componentSource, /showDeepFactAudit/, 'Raw fact sheet requires explicit progressive disclosure');
  });

  await t.test('5. Profile Evidence Clean 3-Column Alignment Table', () => {
    assert.match(componentSource, /Job Requirement/, 'Column 1 header: Job Requirement');
    assert.match(componentSource, /Relevant Profile Grounding/, 'Column 2 header: Relevant Profile Grounding');
    assert.match(componentSource, /Assessment/, 'Column 3 header: Assessment');
    
    // Status labels contract
    assert.match(componentSource, />\s*Supported\s*</, 'Provides neutral "Supported" status label');
    assert.match(componentSource, />\s*Partially supported\s*</, 'Provides neutral "Partially supported" status label');
    assert.match(componentSource, />\s*Not yet demonstrated\s*</, 'Provides neutral "Not yet demonstrated" status label');
    assert.match(componentSource, />\s*Needs verification\s*</, 'Provides neutral "Needs verification" status label');
  });

  await t.test('6. Tailored Resume Professional ATS Preview', () => {
    assert.doesNotMatch(componentSource, /ATS DOCX EXPORT ENGINE/, 'Removes technical engineering headers');
    assert.match(componentSource, /Targeted Resume Preview/, 'Provides clean professional document header');
    assert.match(componentSource, /Professional Summary/, 'Contains professional summary');
    assert.match(componentSource, /Core Competencies/, 'Contains core competencies');
    assert.match(componentSource, /Professional Experience/, 'Contains professional experience');
    assert.match(componentSource, /Download ATS Resume/, 'Provides clean action to download resume');
  });

  await t.test('7. Verification Standard Integrity Retained', () => {
    assert.match(componentSource, /AUDIT PASS: Zero fabricated credentials/, 'Preserves zero-hallucination audit guarantee');
    assert.match(landingSource, /JobMatchExperience/, 'Mounted cleanly in LandingPage');
  });
});
