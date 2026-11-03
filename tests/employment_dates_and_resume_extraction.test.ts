import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseEmploymentDates, workerResumeEngine } from '../worker/resumeEngine.ts';
import { UserProfile } from '../src/types/index.ts';

describe('Phase 2 — Resume Extraction & Employment Dates Reliability Suite', () => {
  it('1. Complete employment range: parses start, end, duration without fabricating years', () => {
    const dates = parseEmploymentDates('2018 - 2021');
    assert.strictEqual(dates.startDate, '2018');
    assert.strictEqual(dates.endDate, '2021');
    assert.strictEqual(dates.current, false);
    assert.strictEqual(dates.isDateUncertain, false);
    assert.strictEqual(dates.durationMonths, 36);
  });

  it('2. Current role explicitly labelled Present: distinguishes current role dynamically', () => {
    const dates = parseEmploymentDates('March 2021 – Present');
    assert.strictEqual(dates.startDate, 'March 2021');
    assert.strictEqual(dates.endDate, 'Present');
    assert.strictEqual(dates.current, true);
    assert.strictEqual(dates.isDateUncertain, false);
    assert.ok(dates.durationMonths > 36, 'Duration must be computed dynamically using current date');
  });

  it('3. Role with a missing start date: never invents 2022 and flags uncertainty', () => {
    const dates = parseEmploymentDates('Present');
    assert.strictEqual(dates.startDate, '', 'Must never invent 2022 or another default start year');
    assert.strictEqual(dates.endDate, 'Present');
    assert.strictEqual(dates.current, true);
    assert.strictEqual(dates.isDateUncertain, true);
    assert.ok(dates.dateWarning?.includes('start date is missing'));
  });

  it('4. Role with a missing end date: never assumes Present without explicit keyword', () => {
    const dates = parseEmploymentDates('2019 -');
    assert.strictEqual(dates.startDate, '2019');
    assert.strictEqual(dates.endDate, '', 'Must not assume missing end date means Present');
    assert.strictEqual(dates.current, false);
    assert.strictEqual(dates.isDateUncertain, true);
    assert.ok(dates.dateWarning?.includes('End date is missing and not assumed to be Present'));
  });

  it('5. Single-year date: preserves single year without hallucinating range', () => {
    const dates = parseEmploymentDates('2020');
    assert.strictEqual(dates.startDate, '2020');
    assert.strictEqual(dates.endDate, '');
    assert.strictEqual(dates.current, false);
    assert.strictEqual(dates.isDateUncertain, true);
    assert.ok(dates.dateWarning?.includes('Single date detected'));
  });

  it('6. Month-year dates: parses MM/YYYY, En-dashes, and month name ranges accurately', () => {
    const dates = parseEmploymentDates('04/2019 – 11/2022');
    assert.strictEqual(dates.startDate, '04/2019');
    assert.strictEqual(dates.endDate, '11/2022');
    assert.strictEqual(dates.current, false);
    assert.strictEqual(dates.isDateUncertain, false);
    assert.strictEqual(dates.durationMonths, 36);
  });

  it('7. Multiple employers with different dates: preserves all distinct records and computes dynamic total experience', () => {
    const resumeText = `
Jane Doe
jane.doe@example.com
EXPERIENCE
Staff Engineer at TechCorp (2020 - Present)
Software Engineer at OldCo (2017 - 2020)
EDUCATION
B.S. in Computer Science
    `;

    const profile = workerResumeEngine.heuristicParse(resumeText);
    assert.strictEqual(profile.experiences.length, 2);
    assert.strictEqual(profile.experiences[0].company, 'TechCorp');
    assert.strictEqual(profile.experiences[0].role, 'Staff Engineer');
    assert.strictEqual(profile.experiences[0].current, true);

    assert.strictEqual(profile.experiences[1].company, 'OldCo');
    assert.strictEqual(profile.experiences[1].role, 'Software Engineer');
    assert.strictEqual(profile.experiences[1].startDate, '2017');
    assert.strictEqual(profile.experiences[1].endDate, '2020');
    assert.strictEqual(profile.experiences[1].current, false);

    assert.ok(profile.totalExperienceYears >= 6, 'Experience should aggregate non-overlapping duration');
  });

  it('8. Resume without work history: returns empty array, never injects fake employment or fake degrees', () => {
    const resumeText = `
Alex Student
alex@example.com
Recent graduate seeking entry-level opportunities.
SKILLS
Python, JavaScript, Git
    `;

    const profile = workerResumeEngine.heuristicParse(resumeText);
    assert.strictEqual(profile.experiences.length, 0, 'Must have 0 experiences');
    assert.strictEqual(profile.totalExperienceYears, 0, 'Must not assume arbitrary 3 years experience');
    assert.strictEqual(profile.education.length, 0, 'Must never invent Bachelor Degree at University');
  });

  it('9. Ambiguous OCR text: flags uncertain dates without crashing', () => {
    const dates = parseEmploymentDates('Date: [unclear scan // 20??]');
    assert.strictEqual(dates.isDateUncertain, true);
    assert.strictEqual(dates.current, false);
    assert.ok(dates.dateWarning);
  });

  it('10. Existing verified profile data and incomplete extracted dates: does not overwrite verified facts', () => {
    const existingProfile: UserProfile = {
      id: 'usr_verified_1',
      fullName: 'Verified Veteran',
      email: 'verified@example.com',
      phone: '+1-555-0199',
      location: 'San Francisco, CA',
      currentTitle: 'Principal Architect',
      currentEmployer: 'Stripe',
      totalExperienceYears: 12,
      professionalSummary: 'Over a decade of high-throughput distributed systems experience.',
      education: [
        { id: 'edu_1', degree: 'M.S. Computer Science', institution: 'Stanford', fieldOfStudy: 'Distributed Systems', graduationYear: '2012' }
      ],
      certifications: [],
      skills: [{ name: 'Distributed Systems', category: 'backend', proficiency: 'expert', yearsExperience: 10, verified: true }],
      experiences: [
        {
          id: 'exp_1',
          company: 'Stripe',
          role: 'Principal Architect',
          startDate: '2019',
          endDate: 'Present',
          current: true,
          location: 'SF',
          description: '',
          achievements: [],
          verifiedSkillsUsed: ['Distributed Systems'],
        }
      ],
      languages: ['English'],
      masterResumeLastUpdated: '2026-01-01T00:00:00Z',
    };

    // Scanned resume with sparse / missing work history
    const badScanText = `
Candidate
Email: unreadable
Experience
Junior Dev (2025 - )
    `;

    const merged = workerResumeEngine.heuristicParse(badScanText, existingProfile);
    // Verified profile facts MUST NOT be overwritten
    assert.strictEqual(merged.fullName, 'Verified Veteran');
    assert.strictEqual(merged.email, 'verified@example.com');
    assert.strictEqual(merged.currentTitle, 'Principal Architect');
    assert.strictEqual(merged.currentEmployer, 'Stripe');
    assert.strictEqual(merged.totalExperienceYears, 12);
    assert.strictEqual(merged.education[0].degree, 'M.S. Computer Science');
    assert.strictEqual(merged.experiences[0].company, 'Stripe');
  });
});
