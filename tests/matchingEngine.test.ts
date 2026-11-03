import test from 'node:test';
import assert from 'node:assert/strict';
import { matchingEngine } from '../server/matchingEngine.ts';
import { UserProfile, CareerPreferences, JobVacancy } from '../src/types/index.ts';

test('Matching Engine: Cross-Industry Evaluation (Business, Supply Chain, and Technical)', async () => {
  // 1. Supply Chain & Procurement Candidate
  const supplyChainProfile: UserProfile = {
    id: 'user_sc',
    fullName: 'Marcus Vance',
    email: 'marcus@example.com',
    phone: '555-0144',
    location: 'Chicago, IL',
    totalExperienceYears: 6,
    currentEmployer: 'Global Freight Logistics',
    currentTitle: 'Senior Procurement Specialist',
    professionalSummary: 'Supply chain professional specializing in vendor management and strategic sourcing.',
    education: [
      { id: 'edu_1', degree: 'Bachelor of Business Administration', institution: 'University of Illinois', fieldOfStudy: 'Supply Chain Management', graduationYear: '2018' }
    ],
    certifications: [],
    skills: [
      { name: 'Procurement', category: 'general', proficiency: 'expert', yearsExperience: 6, verified: true },
      { name: 'Vendor Management', category: 'general', proficiency: 'expert', yearsExperience: 6, verified: true },
      { name: 'Contract Negotiation', category: 'general', proficiency: 'proficient', yearsExperience: 4, verified: true },
      { name: 'SAP', category: 'general', proficiency: 'proficient', yearsExperience: 5, verified: true },
    ],
    experiences: [],
    masterResumeLastUpdated: new Date().toISOString(),
  };

  const supplyChainPrefs: CareerPreferences = {
    targetRoles: ['Procurement Manager', 'Supply Chain Lead'],
    targetCountries: ['United States'],
    targetCities: ['Chicago'],
    preferredTitles: ['Procurement Manager'],
    preferredIndustries: ['Logistics'],
    workArrangement: ['remote', 'hybrid'],
    workArrangements: ['remote', 'hybrid'],
    minSalaryUSD: 90000,
    minSalaryByCurrency: { USD: 90000 },
    preferredEmploymentType: ['full-time'],
    willingnessToRelocate: 'no',
    visaSponsorshipRequired: false,
    requiresVisaSponsorship: false,
    preferredCompanies: [],
    excludedCompanies: ['Blocked Logistics Co'],
    excludedKeywords: ['internship'],
  };

  const supplyChainVacancy: JobVacancy = {
    id: 'vac_sc_1',
    source: 'arbeitnow',
    title: 'Lead Procurement Manager',
    company: 'Nexus Supply Chain Inc',
    location: 'Chicago, IL',
    country: 'United States',
    remote: false,
    arrangement: 'hybrid',
    url: 'https://example.com/procurement-job',
    description: 'Seeking a Lead Procurement Manager with 5+ years experience in Vendor Management, Contract Negotiation, and SAP.',
    requirements: ['Procurement', 'Vendor Management', 'SAP', 'Contract Negotiation'],
    tags: ['Supply Chain', 'Procurement'],
    publishedAt: new Date().toISOString(),
    salaryRange: { min: 105000, max: 130000, raw: '$105,000 - $130,000' },
    visaSponsorship: 'supported',
    retrievedAt: new Date().toISOString(),
    isActive: true,
  };

  const scMatch = await matchingEngine.evaluateMatch(supplyChainProfile, supplyChainPrefs, supplyChainVacancy);
  assert.equal(scMatch.isEligible, true);
  assert.ok(scMatch.score >= 80, `Expected score >= 80 for aligned Supply Chain role, got ${scMatch.score}`);
  assert.ok(scMatch.breakdown.skills >= 20, 'Expected high skills breakdown points');
  assert.equal(scMatch.breakdown.titleAlignment, 20, 'Direct title match should receive full 20 pts');

  // 2. Business / Project Management Role
  const pmProfile: UserProfile = {
    id: 'user_pm',
    fullName: 'Elena Rostova',
    email: 'elena@example.com',
    phone: '555-0177',
    location: 'Remote',
    totalExperienceYears: 4,
    currentEmployer: 'Innovate LLC',
    currentTitle: 'Agile Project Manager',
    professionalSummary: 'Certified Scrum Master and Project Manager leading agile delivery teams.',
    education: [
      { id: 'edu_2', degree: 'Bachelor of Arts', institution: 'Boston University', fieldOfStudy: 'Communications', graduationYear: '2020' }
    ],
    certifications: [
      { id: 'cert_1', name: 'Certified Scrum Master (CSM)', issuingOrg: 'Scrum Alliance', issueYear: '2021' }
    ],
    skills: [
      { name: 'Project Management', category: 'general', proficiency: 'expert', yearsExperience: 4, verified: true },
      { name: 'Agile', category: 'general', proficiency: 'expert', yearsExperience: 4, verified: true },
      { name: 'Scrum', category: 'general', proficiency: 'expert', yearsExperience: 4, verified: true },
      { name: 'Risk Management', category: 'general', proficiency: 'proficient', yearsExperience: 3, verified: true },
    ],
    experiences: [],
    masterResumeLastUpdated: new Date().toISOString(),
  };

  const pmPrefs: CareerPreferences = {
    targetRoles: ['Project Manager', 'Program Manager'],
    targetCountries: ['United States', 'Canada', 'Remote'],
    targetCities: [],
    preferredTitles: ['Project Manager'],
    preferredIndustries: ['Technology', 'Consulting'],
    workArrangement: ['remote'],
    workArrangements: ['remote'],
    minSalaryUSD: 80000,
    minSalaryByCurrency: { USD: 80000 },
    preferredEmploymentType: ['full-time'],
    willingnessToRelocate: 'no',
    visaSponsorshipRequired: false,
    requiresVisaSponsorship: false,
    preferredCompanies: [],
    excludedCompanies: [],
    excludedKeywords: [],
  };

  const pmVacancy: JobVacancy = {
    id: 'vac_pm_1',
    source: 'remotive',
    title: 'Senior Project Manager',
    company: 'Apex Digital Solutions',
    location: 'Worldwide Remote',
    country: 'Remote',
    remote: true,
    arrangement: 'remote',
    url: 'https://example.com/pm-job',
    description: 'Looking for a Senior Project Manager with 3+ years experience in Agile, Scrum, and cross-functional leadership.',
    requirements: ['Project Management', 'Agile', 'Scrum'],
    tags: ['Project Management'],
    publishedAt: new Date().toISOString(),
    salaryRange: { min: 95000, max: 115000, raw: '$95,000 - $115,000' },
    visaSponsorship: 'unknown',
    retrievedAt: new Date().toISOString(),
    isActive: true,
  };

  const pmMatch = await matchingEngine.evaluateMatch(pmProfile, pmPrefs, pmVacancy);
  assert.equal(pmMatch.isEligible, true);
  assert.ok(pmMatch.score >= 75, `Expected high PM score, got ${pmMatch.score}`);

  // 3. Ineligibility Check: Excluded Company
  const excludedVacancy: JobVacancy = {
    ...supplyChainVacancy,
    id: 'vac_sc_blocked',
    company: 'Blocked Logistics Co',
  };
  const blockedMatch = await matchingEngine.evaluateMatch(supplyChainProfile, supplyChainPrefs, excludedVacancy);
  assert.equal(blockedMatch.isEligible, false);
  assert.ok(blockedMatch.eligibilityConcerns.some((c: string) => c.toLowerCase().includes('excluded company')));
  assert.ok(blockedMatch.score <= 35, 'Ineligible application score must be clamped');

  // 4. Unknown Qualifications: Must NOT award positive points
  const candidateWithoutEducation: UserProfile = {
    ...pmProfile,
    education: [],
  };
  const matchNoEdu = await matchingEngine.evaluateMatch(candidateWithoutEducation, pmPrefs, pmVacancy);
  assert.equal(matchNoEdu.breakdown.qualifications, 0, 'No positive points must be awarded to missing/unknown qualifications');
});
