// tests/employment_structural_parser.test.ts
// Comprehensive automated test suite for Resume Employment History & Date Extraction Engine

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseEmploymentDates,
  extractDateRangeFromLine,
  parseStructuralEmploymentHistory,
  isInvalidToken,
  normalizeDateToken,
} from '../src/utils/structuralEmploymentParser.ts';
import { workerResumeEngine } from '../worker/resumeEngine.ts';
import { resumeEngine } from '../server/resumeEngine.ts';

test('1. Two employers with different employment dates', () => {
  const text = `
EXPERIENCE
Tata Consultancy Services (TCS)
Senior Process Associate
September 2022 - Present
Indore, India

Accenture
Process Associate
July 2020 - August 2022
Mumbai, India
EDUCATION
B.Tech in Computer Science
  `;

  const records = parseStructuralEmploymentHistory(text);
  assert.equal(records.length, 2, 'Must extract exactly two distinct employers');

  assert.equal(records[0].company, 'Tata Consultancy Services (TCS)');
  assert.equal(records[0].job_title, 'Senior Process Associate');
  assert.equal(records[0].start_date, '2022-09');
  assert.equal(records[0].end_date, null);
  assert.equal(records[0].is_current, true);

  assert.equal(records[1].company, 'Accenture');
  assert.equal(records[1].job_title, 'Process Associate');
  assert.equal(records[1].start_date, '2020-07');
  assert.equal(records[1].end_date, '2022-08');
  assert.equal(records[1].is_current, false);
});

test('2. Three employers with different employment dates', () => {
  const text = `
PROFESSIONAL EXPERIENCE
Amazon | Software Development Engineer II | 2023 - Present
Microsoft | Software Engineer | 2021 - 2023
Infosys Technologies | Systems Engineer | 2018 - 2021
SKILLS
Java, TypeScript, AWS
  `;

  const records = parseStructuralEmploymentHistory(text);
  assert.equal(records.length, 3, 'Must extract exactly three employers');

  assert.equal(records[0].company, 'Amazon');
  assert.equal(records[0].job_title, 'Software Development Engineer II');
  assert.equal(records[0].start_date, '2023');
  assert.equal(records[0].is_current, true);

  assert.equal(records[1].company, 'Microsoft');
  assert.equal(records[1].start_date, '2021');
  assert.equal(records[1].end_date, '2023');
  assert.equal(records[1].is_current, false);

  assert.equal(records[2].company, 'Infosys Technologies');
  assert.equal(records[2].start_date, '2018');
  assert.equal(records[2].end_date, '2021');
  assert.equal(records[2].is_current, false);
});

test('3. One current role and multiple previous roles', () => {
  const text = `
EXPERIENCE
Google - Staff Architect
January 2024 - Present
• Leading cloud migration

Meta - Senior Software Engineer
March 2021 - December 2023
• Built distributed caching

Twitter - Software Engineer
June 2018 - February 2021
• Scaled timeline infrastructure
  `;

  const records = parseStructuralEmploymentHistory(text);
  assert.equal(records.length, 3);
  assert.equal(records[0].is_current, true);
  assert.equal(records[1].is_current, false);
  assert.equal(records[2].is_current, false);
});

test('4. Two different positions at the same company (promotions preserved)', () => {
  const text = `
WORK EXPERIENCE
Tata Consultancy Services
Lead Process Specialist
2024 - Present

Tata Consultancy Services
Process Associate
2021 - 2024
EDUCATION
MBA
  `;

  const records = parseStructuralEmploymentHistory(text);
  assert.equal(records.length, 2, 'Both promotions at same company must be preserved');
  assert.equal(records[0].company, 'Tata Consultancy Services');
  assert.equal(records[0].job_title, 'Lead Process Specialist');
  assert.equal(records[0].start_date, '2024');
  assert.equal(records[0].is_current, true);

  assert.equal(records[1].company, 'Tata Consultancy Services');
  assert.equal(records[1].job_title, 'Process Associate');
  assert.equal(records[1].start_date, '2021');
  assert.equal(records[1].end_date, '2024');
  assert.equal(records[1].is_current, false);
});

test('5. Resume containing only years (preserves year precision)', () => {
  const dates = parseEmploymentDates('2020 - 2023');
  assert.equal(dates.startDate, '2020');
  assert.equal(dates.endDate, '2023');
  assert.equal(dates.current, false);
  assert.equal(dates.isDateUncertain, false);
});

test('6. Resume containing month and year', () => {
  const dates = parseEmploymentDates('September 2024 – Present');
  assert.equal(dates.normalizedStart, '2024-09');
  assert.equal(dates.startDate, 'September 2024');
  assert.equal(dates.endDate, 'Present');
  assert.equal(dates.current, true);
  assert.equal(dates.isDateUncertain, false);
  assert.equal(dates.originalDateText, 'September 2024 – Present');
});

test('7. Resume containing no dates for one position flags verification', () => {
  const text = `
EXPERIENCE
Oracle - Senior Consultant
Dates not provided
• Led ERP transformation
  `;

  const records = parseStructuralEmploymentHistory(text);
  assert.equal(records.length, 1);
  assert.equal(records[0].company, 'Oracle');
  assert.equal(records[0].start_date, null);
  assert.equal(records[0].end_date, null);
  assert.equal(records[0].is_current, false);
  assert.equal(records[0].needs_verification, true);
});

test('8. Dates positioned on a separate line are mapped to the correct job header', () => {
  const text = `
EXPERIENCE
Tata Consultancy Services
Senior Process Associate
Indore, India
September 2022 - Present
• Oversaw logistics operations
  `;

  const records = parseStructuralEmploymentHistory(text);
  assert.equal(records.length, 1);
  assert.equal(records[0].company, 'Tata Consultancy Services');
  assert.equal(records[0].job_title, 'Senior Process Associate');
  assert.equal(records[0].location, 'Indore');
  assert.equal(records[0].start_date, '2022-09');
  assert.equal(records[0].is_current, true);
});

test('9. Dates positioned on the right side of the page (tab/pipe aligned)', () => {
  const text = `
EXPERIENCE
Cognizant Technology Solutions \t\t\t\t\t\t 04/2021 - 08/2023
Business Analyst | Pune
• Prepared requirements documentation
  `;

  const records = parseStructuralEmploymentHistory(text);
  assert.equal(records.length, 1);
  assert.equal(records[0].company, 'Cognizant Technology Solutions');
  assert.equal(records[0].job_title, 'Business Analyst');
  assert.equal(records[0].start_date, '2021-04');
  assert.equal(records[0].end_date, '2023-08');
});

test('10. PDF with multiple columns and inconsistent spacing', () => {
  const text = `
WORK EXPERIENCE
Indore, India | TCS | 2022 - Present | Senior Process Associate
• Supported international supply chains
  `;

  const records = parseStructuralEmploymentHistory(text);
  assert.equal(records.length, 1);
  assert.equal(records[0].company, 'TCS');
  assert.equal(records[0].job_title, 'Senior Process Associate');
  assert.equal(records[0].location, 'Indore');
  assert.equal(records[0].start_date, '2022');
  assert.equal(records[0].is_current, true);
});

test('11. Employment entry containing the word Present in its description does NOT make role current', () => {
  const text = `
EXPERIENCE
Cisco Systems - Network Engineer
2019 - 2021
• Regularly presented quarterly performance metrics to senior directors.
• Handled present day routing configurations.
  `;

  const records = parseStructuralEmploymentHistory(text);
  assert.equal(records.length, 1);
  assert.equal(records[0].company, 'Cisco Systems');
  assert.equal(records[0].is_current, false, 'Word "presented" in description must not mark role as current');
  assert.equal(records[0].end_date, '2021');
});

test('12. Resume containing the word Current outside the employment section', () => {
  const text = `
Ayush Prakash
Current Address: 101 Silicon Valley, San Francisco, CA
EXPERIENCE
Google - Software Engineer
2020 - 2022
• Developed search ranking features
EDUCATION
Stanford University
  `;

  const records = parseStructuralEmploymentHistory(text);
  assert.equal(records.length, 1);
  assert.equal(records[0].company, 'Google');
  assert.equal(records[0].is_current, false, 'Current Address in header must not leak into experience current flag');
  assert.equal(records[0].end_date, '2022');
});

test('13. Missing company name: flagged cleanly without crashing', () => {
  const text = `
EXPERIENCE
Senior Consultant
2020 - 2022
• Provided independent advice
  `;

  const records = parseStructuralEmploymentHistory(text);
  assert.equal(records.length, 1);
  assert.equal(records[0].job_title, 'Senior Consultant');
  assert.equal(records[0].needs_verification, true);
});

test('14. Missing job title: flagged cleanly without crashing', () => {
  const text = `
EXPERIENCE
Accenture Solutions
2019 - 2021
• Participated in enterprise client delivery
  `;

  const records = parseStructuralEmploymentHistory(text);
  assert.equal(records.length, 1);
  assert.equal(records[0].company, 'Accenture Solutions');
  assert.equal(records[0].needs_verification, true);
});

test('15. Duplicate employment entries are deduplicated safely', () => {
  const text = `
EXPERIENCE
Tata Consultancy Services
Senior Process Associate
2022 - Present

Tata Consultancy Services
Senior Process Associate
2022 - Present
  `;

  const records = parseStructuralEmploymentHistory(text);
  assert.equal(records.length, 1, 'Exact duplicate must be merged into single record');
});

test('16. Ambiguous date range (Present – Present) is rejected and flagged', () => {
  const dates = parseEmploymentDates('Present – Present');
  assert.equal(dates.isDateUncertain, true);
  assert.equal(dates.current, false);
  assert.ok(dates.dateWarning?.includes('Invalid date range'));
});

test('17. REGRESSION: Exact screenshot errors resolved', () => {
  // Reproduce raw text layout that caused the screenshot bug:
  // - "Supply Chain Operations" was extracted as company
  // - "Present" was extracted as job title
  // - "2024" was extracted as company
  // - "2022 - Present" was assigned across 8 records
  const buggyResumeText = `
Ayush Prakash
Indore, India | ayush@example.com

PROFESSIONAL EXPERIENCE
Tata Consultancy Services (TCS), Indore
Senior Process Associate - Supply Chain Operations
September 2022 – Present
• Spearheaded supply chain workflows and vendor performance management.
• Streamlined procurement order processing across international shipping lanes.

SKILLS
Supply Chain Management, Logistics, Operations, ERP
  `;

  const records = parseStructuralEmploymentHistory(buggyResumeText);

  // Must NOT produce 8 records! Must produce exactly 1 clean record!
  assert.equal(records.length, 1, 'Must extract exactly 1 unified role, not 8 fragmented records');

  const rec = records[0];
  // Must NOT extract "Supply Chain Operations" as Company!
  assert.notEqual(rec.company.toLowerCase(), 'supply chain operations', 'Supply Chain Operations is a domain, not employer');
  assert.ok(rec.company.includes('Tata Consultancy Services'), `Company must be TCS, got: ${rec.company}`);

  // Must NOT extract "Present" as job title!
  assert.notEqual(rec.job_title.toLowerCase(), 'present', 'Present must NEVER be a job title');
  assert.notEqual(rec.job_title, '2024', 'Year 2024 must NEVER be a job title');
  assert.ok(rec.job_title.includes('Senior Process Associate'), `Job title must be Senior Process Associate, got: ${rec.job_title}`);

  // Location must be parsed
  assert.equal(rec.location, 'Indore');

  // Dates must be accurate
  assert.equal(rec.start_date, '2022-09');
  assert.equal(rec.end_date, null);
  assert.equal(rec.is_current, true);

  // Integration test with workerResumeEngine.heuristicParse
  const profile = workerResumeEngine.heuristicParse(buggyResumeText);
  assert.equal(profile.experiences.length, 1);
  assert.ok(profile.experiences[0].company.includes('Tata Consultancy Services'));
  assert.notEqual(profile.experiences[0].role.toLowerCase(), 'present');
  assert.notEqual(profile.experiences[0].company.toLowerCase(), '2024');

  // Integration test with server resumeEngine.heuristicParse
  const serverProfile = resumeEngine.heuristicParse(buggyResumeText);
  assert.equal(serverProfile.experiences.length, 1);
  assert.ok(serverProfile.experiences[0].company.includes('Tata Consultancy Services'));
  assert.notEqual(serverProfile.experiences[0].role.toLowerCase(), 'present');
});
