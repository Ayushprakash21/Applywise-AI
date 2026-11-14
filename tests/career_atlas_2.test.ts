import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  calculateTotalVerifiedExperience,
  discoverCareerPaths,
  generateTransitionAssessment,
  generatePersonalizedRoadmap,
  getMarketAndSalarySnapshot,
  getLearningRecommendations,
  simulateCareerScenario,
  mapOpportunitiesToCareerPath,
  buildAtlasOverviewData,
} from '../src/services/careerAtlasEngine.ts';
import { UserProfile, Vacancy } from '../src/types/index.ts';
import { CareerScenarioConfig } from '../src/types/careerAtlas.ts';

describe('APPLYVISE CAREER ATLAS 2.0 — Comprehensive Intelligence & Transition Suite', () => {
  // Test Candidate 1: Complete verified employment history (Supply Chain Operations)
  const candidateComplete: UserProfile = {
    id: 'user_complete',
    fullName: 'Ayush Prakash',
    email: 'ayush@example.com',
    currentTitle: 'Senior Process Associate — Supply Chain Operations',
    totalExperienceYears: 4.5,
    skills: [
      { name: 'Supply Chain Operations', level: 'advanced' },
      { name: 'ERP Systems', level: 'advanced' },
      { name: 'Process Improvement', level: 'intermediate' },
      { name: 'Vendor Management', level: 'intermediate' },
      { name: 'Data Analysis', level: 'intermediate' },
    ],
    employmentHistory: [
      {
        company: 'Tata Consultancy Services (TCS)',
        title: 'Senior Process Associate — Supply Chain Operations',
        startDate: '2022-01',
        endDate: 'Present',
        isCurrent: true,
      },
      {
        company: 'ESP Softtech Pvt. Ltd.',
        title: 'Process Associate',
        startDate: '2020-06',
        endDate: '2021-12',
        isCurrent: false,
      },
    ],
  };

  // Test Candidate 2: Incomplete profile (0 skills, 0 history)
  const candidateIncomplete: UserProfile = {
    id: 'user_incomplete',
    fullName: 'New User',
    email: 'newuser@example.com',
    currentTitle: '',
    skills: [],
    employmentHistory: [],
  };

  // Test Candidate 3: Software Engineer targeting Management & Staff Specialization
  const candidateSoftware: UserProfile = {
    id: 'user_software',
    fullName: 'Dev Lead',
    email: 'dev@example.com',
    currentTitle: 'Software Engineer',
    totalExperienceYears: 5,
    skills: [
      { name: 'TypeScript / Node.js', level: 'advanced' },
      { name: 'System Design & Distributed Systems', level: 'intermediate' },
      { name: 'Database Architecture (SQL / NoSQL)', level: 'intermediate' },
    ],
    employmentHistory: [
      {
        company: 'Cloud Scale Inc.',
        title: 'Software Engineer',
        startDate: '2019-01',
        endDate: 'Present',
        isCurrent: true,
      },
    ],
  };

  // Mock GCDE Vacancies
  const mockVacancies: Vacancy[] = [
    {
      id: 'vac_1',
      title: 'Lead Supply Chain Specialist',
      company: 'Logistics Global Inc.',
      location: 'Remote',
      isRemote: true,
      category: 'Supply Chain',
      salaryMin: 80000,
      salaryMax: 105000,
      applicationUrl: 'https://logistics.example.com/careers/lead',
    },
    {
      id: 'vac_2',
      title: 'Supply Chain Operations Manager',
      company: 'Enterprise Freight Corp',
      location: 'Chicago, IL',
      isRemote: false,
      category: 'Operations',
      salaryMin: 115000,
      salaryMax: 145000,
      applicationUrl: 'https://freight.example.com/apply/mgr',
    },
    {
      id: 'vac_3',
      title: 'Senior Software Engineer',
      company: 'Tech Scale',
      location: 'Remote',
      isRemote: true,
      category: 'Engineering',
      salaryMin: 135000,
      salaryMax: 170000,
      applicationUrl: 'https://techscale.example.com/jobs/sr-eng',
    },
  ];

  it('1. Accurate Non-Overlapping Experience Calculation', () => {
    const history = [
      { startDate: '2020-01', endDate: '2021-12', isCurrent: false },
      { startDate: '2021-06', endDate: '2022-12', isCurrent: false }, // 6-month overlap with previous
    ];
    const exp = calculateTotalVerifiedExperience(history);
    // 2020 (12 mo) + 2021 (12 mo) + 2022 (12 mo) = 36 months = 3.0 years
    assert.strictEqual(exp, 3.0, 'Must accurately deduplicate overlapping employment months');
  });

  it('2. Discovers multiple relevant career paths across distinct categories', () => {
    const paths = discoverCareerPaths(candidateComplete, mockVacancies);

    assert.ok(paths.length >= 4, 'Must discover at least 4 realistic pathways');
    const categories = new Set(paths.map(p => p.category));
    assert.ok(categories.has('vertical'), 'Must include vertical progression');
    assert.ok(categories.has('adjacent'), 'Must include adjacent transition');
    assert.ok(categories.has('management'), 'Must include management pathway');

    // Every path has required properties
    for (const p of paths) {
      assert.ok(p.targetRole, 'Path must define target role');
      assert.ok(p.roleDescription, 'Path must describe role');
      assert.ok(p.whyRelevant, 'Path must explain relevance');
      assert.ok(p.alignmentScore >= 0 && p.alignmentScore <= 100, 'Score must be within 0-100');
      assert.ok(['ready_now', 'achievable_prep', 'long_term', 'not_recommended'].includes(p.readinessStatus));
      assert.ok(p.requiredQualifications.length > 0, 'Path must state required qualifications');
      assert.ok(p.experienceRequirements.length > 0, 'Path must state experience requirements');
    }
  });

  it('3. Generates transparent, evidence-backed Transition Assessment without fabricated scores', () => {
    const assessment = generateTransitionAssessment(candidateComplete, 'Lead Supply Chain Specialist');

    assert.strictEqual(assessment.targetRole, 'Lead Supply Chain Specialist');
    assert.ok(assessment.overallReadinessScore >= 60, 'Complete candidate should have strong readiness');
    assert.ok(assessment.readinessExplanation.whatIsMeasured.length > 0, 'Must explain what is being measured');
    assert.ok(assessment.readinessExplanation.dataUsed.length > 0, 'Must list data sources used');
    assert.ok(assessment.readinessExplanation.supportingEvidence.length > 0, 'Must provide supporting evidence');
    assert.ok(assessment.readinessExplanation.howToImprove.length > 0, 'Must outline score improvement steps');

    // Matching vs missing competencies
    assert.ok(assessment.matchingCompetencies.length > 0, 'Must identify matching competencies');
    for (const comp of assessment.matchingCompetencies) {
      assert.strictEqual(comp.evidenceLevel, 'strong');
      assert.ok(comp.candidateEvidence.includes('Verified in profile'), 'Must cite factual profile evidence');
    }

    // Candidate confirmations required
    assert.ok(Array.isArray(assessment.candidateConfirmationsRequired), 'Must provide confirmation requests array');
  });

  it('4. Classifies skills into Essential, Important, Supporting, Preferred, and Optional', () => {
    const assessment = generateTransitionAssessment(candidateComplete, 'Supply Chain Operations Manager');

    const allSkills = [...assessment.matchingCompetencies, ...assessment.missingCompetencies];
    const importances = new Set(allSkills.map(s => s.importance));

    assert.ok(importances.has('essential'), 'Must classify essential skills');
    assert.ok(importances.has('important'), 'Must classify important skills');

    // Every skill specifies practical assignment and project
    for (const s of allSkills) {
      assert.ok(s.whyItMatters, 'Skill must explain why it matters');
      assert.ok(s.learningApproach, 'Skill must specify learning approach');
      assert.ok(s.practicalAssignment, 'Skill must provide practical assignment');
      assert.ok(s.recommendedProject, 'Skill must provide recommended project');
    }
  });

  it('5. Personalized Roadmap generates structured 30d, 90d, 6m, and 12m plans', () => {
    const roadmap = generatePersonalizedRoadmap(candidateComplete, 'Lead Supply Chain Specialist', 8);

    assert.ok(roadmap.milestones.length >= 4, 'Must have at least 4 milestones');
    const horizons = new Set(roadmap.milestones.map(m => m.horizon));
    assert.ok(horizons.has('30_day'), 'Must include 30-day plan');
    assert.ok(horizons.has('90_day'), 'Must include 90-day plan');
    assert.ok(horizons.has('6_month'), 'Must include 6-month plan');
    assert.ok(horizons.has('12_month'), 'Must include 12-month plan');

    for (const m of roadmap.milestones) {
      assert.ok(m.title, 'Milestone must have title');
      assert.ok(m.objective, 'Milestone must have objective');
      assert.ok(m.reason, 'Milestone must have reason');
      assert.ok(m.estimatedHours > 0, 'Estimated hours must be positive');
      assert.ok(m.targetCompletionDate, 'Must have target completion date');
      assert.ok(m.completionCriteria, 'Must have clear completion criteria');
    }
  });

  it('6. Market and Salary intelligence integrates with GCDE and states sources honestly', () => {
    const market = getMarketAndSalarySnapshot('Lead Supply Chain Specialist', mockVacancies);

    assert.strictEqual(market.targetRole, 'Lead Supply Chain Specialist');
    assert.ok(market.activeMatchingVacancies >= 1, 'Must find matching GCDE vacancies');
    assert.ok(market.topHiringCompanies.includes('Logistics Global Inc.'));
    assert.strictEqual(market.remotePercentage, 100, 'Vacancies in mock are remote');

    // Sourced salary metadata
    assert.ok(market.salaryIntelligence.currency === 'USD');
    assert.ok(market.salaryIntelligence.sampleSize > 0);
    assert.ok(market.salaryIntelligence.source.includes('Global Career Discovery Engine'));
    assert.ok(market.salaryIntelligence.dataFreshness.includes('10 minutes'));
  });

  it('7. Scenario Simulation Lab evaluates what-if assumptions without mutating Fact Registry', () => {
    const config: CareerScenarioConfig = {
      id: 'scen_test',
      scenarioName: 'Director Transition',
      targetRole: 'Director of Global Operations',
      targetCountry: 'United States',
      remoteOnly: false,
      careerPriority: 'management',
      weeklyLearningHours: 12, // accelerated
      hypotheticalSkillsAdded: ['Global Operations Strategy', 'Capital Allocation & P&L'],
      hypotheticalQualificationsAdded: ['Executive MBA'],
    };

    const res = simulateCareerScenario(candidateComplete, config, mockVacancies);

    assert.ok(res.projectedSkillAlignment > 0);
    assert.ok(res.projectedTransitionMonths > 0);
    assert.ok(res.overallScenarioFeasibilityScore > 0);
    assert.ok(res.explanation.includes('12 hours/week'));

    // Fact registry invariant: Candidate's original profile remains unmodified
    assert.strictEqual(candidateComplete.skills?.length, 5, 'Fact registry skills must not be mutated');
    assert.ok(!candidateComplete.skills?.some(s => s.name === 'Executive MBA'), 'Simulated qualifications must not leak into fact registry');
  });

  it('8. Opportunity Mapping classifies vacancies into Target Now, Requires Prep, and Aspirational', () => {
    const opps = mapOpportunitiesToCareerPath('Supply Chain Operations Manager', mockVacancies);

    assert.ok(opps.length > 0);
    for (const opp of opps) {
      assert.ok(['target_now', 'requires_prep', 'aspirational'].includes(opp.opportunityTier));
      assert.ok(opp.applicationUrl.startsWith('http'), 'Must provide direct portal application URL');
      assert.ok(opp.matchReasons.length > 0, 'Must explain match reasons');
    }
  });

  it('9. Profile Incomplete Candidate shows profile-completion requirement without fake intelligence', () => {
    const overview = buildAtlasOverviewData(candidateIncomplete, mockVacancies);

    assert.strictEqual(overview.currentProfile.totalVerifiedExperienceYears, 0);
    assert.strictEqual(overview.currentProfile.verifiedSkillsCount, 0);
    assert.strictEqual(overview.currentProfile.verifiedSkillNames.length, 0);
  });

  it('10. Technical candidate discovers Software Engineering Pathways (Staff vs EM)', () => {
    const paths = discoverCareerPaths(candidateSoftware, mockVacancies);

    const targetRoles = paths.map(p => p.targetRole);
    assert.ok(targetRoles.includes('Senior Software Engineer'), 'Must discover Senior SE path');
    assert.ok(targetRoles.includes('Engineering Manager'), 'Must discover Engineering Manager path');
    assert.ok(targetRoles.includes('Staff / Principal Software Architect'), 'Must discover Staff Architect path');
  });

  it('11. Learning recommendations prioritize free resources before paid credentials', () => {
    const learning = getLearningRecommendations('Lead Supply Chain Specialist');

    assert.ok(learning.length >= 3);
    assert.strictEqual(learning[0].tierPriority, 1, 'First resource must be Tier 1 (Free)');
    assert.strictEqual(learning[0].isFree, true);
    assert.strictEqual(learning[1].tierPriority, 2, 'Second resource must be Tier 2 (Low Cost)');
  });

  it('12. Canonical API Endpoints and Admin Diagnostics are declared in server.ts', () => {
    const serverSrc = fs.readFileSync(path.resolve('server.ts'), 'utf8');

    assert.ok(serverSrc.includes('/api/career-atlas/overview'), 'Must declare overview endpoint');
    assert.ok(serverSrc.includes('/api/career-atlas/paths'), 'Must declare paths endpoint');
    assert.ok(serverSrc.includes('/api/career-atlas/assessment'), 'Must declare assessment endpoint');
    assert.ok(serverSrc.includes('/api/career-atlas/roadmap'), 'Must declare roadmap endpoint');
    assert.ok(serverSrc.includes('/api/career-atlas/milestones/:id'), 'Must declare milestones endpoint');
    assert.ok(serverSrc.includes('/api/career-atlas/market'), 'Must declare market endpoint');
    assert.ok(serverSrc.includes('/api/career-atlas/learning'), 'Must declare learning endpoint');
    assert.ok(serverSrc.includes('/api/career-atlas/scenarios/simulate'), 'Must declare scenarios endpoint');
    assert.ok(serverSrc.includes('/api/admin/career-atlas/health'), 'Must declare admin health endpoint');
  });

  it('13. Canonical API Endpoints are declared in worker/index.ts for runtime parity', () => {
    const workerSrc = fs.readFileSync(path.resolve('worker/index.ts'), 'utf8');

    assert.ok(workerSrc.includes('/api/career-atlas/overview'), 'Worker must declare overview endpoint');
    assert.ok(workerSrc.includes('/api/career-atlas/paths'), 'Worker must declare paths endpoint');
    assert.ok(workerSrc.includes('/api/career-atlas/assessment'), 'Worker must declare assessment endpoint');
    assert.ok(workerSrc.includes('/api/career-atlas/roadmap'), 'Worker must declare roadmap endpoint');
    assert.ok(workerSrc.includes('/api/career-atlas/market'), 'Worker must declare market endpoint');
    assert.ok(workerSrc.includes('/api/career-atlas/scenarios/simulate'), 'Worker must declare scenarios endpoint');
    assert.ok(workerSrc.includes('/api/admin/career-atlas/health'), 'Worker must declare admin health endpoint');
  });

  it('14. CareerAtlas.tsx provides all 10 core functional tabs and accessible list view', () => {
    const atlasSrc = fs.readFileSync(path.resolve('src/components/CareerAtlas.tsx'), 'utf8');

    // All core tab keys
    const expectedTabs = [
      'overview',
      'explorer',
      'transition',
      'skills',
      'roadmap',
      'market',
      'learning',
      'scenarios',
      'opportunities',
      'progress',
      'map',
    ];

    for (const tab of expectedTabs) {
      assert.ok(atlasSrc.includes(`activeTab === '${tab}'`), `Must support tab ${tab}`);
    }

    // Accessible list view toggle
    assert.ok(atlasSrc.includes('Accessible List View'), 'Must provide accessible list view');
    assert.ok(atlasSrc.includes("mapViewMode === 'table'"), 'Must render table/list alternative');
  });
});
