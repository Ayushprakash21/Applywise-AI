import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildInterviewEvaluationPrompt,
  validateInterviewEvaluationOutput
} from '../src/utils/interviewEvaluator.ts';
import { authAndStore } from '../server/authAndStore.ts';
import { CandidateFact } from '../src/types/index.ts';

describe('ApplyVise AI — P1: Backend Runtime Parity Verification', () => {
  it('authAndStore has all Six-Pillar persistence methods matching D1Store', () => {
    assert.strictEqual(typeof authAndStore.getOpportunitySignals, 'function');
    assert.strictEqual(typeof authAndStore.getMockInterviewSessions, 'function');
    assert.strictEqual(typeof authAndStore.saveMockInterviewSession, 'function');
    assert.strictEqual(typeof authAndStore.getRecruiterReviewAudit, 'function');
    assert.strictEqual(typeof authAndStore.saveRecruiterReviewAudit, 'function');
    assert.strictEqual(typeof authAndStore.getCareerTrajectories, 'function');
    assert.strictEqual(typeof authAndStore.saveCareerTrajectory, 'function');
  });

  it('Opportunity signals persistence returns structured signals with required fields', () => {
    const signals = authAndStore.getOpportunitySignals();
    assert.ok(Array.isArray(signals));
    assert.ok(signals.length > 0, 'Should return opportunity signals');
    const signal = signals[0];
    assert.ok(signal.id, 'Signal must have id');
    assert.ok(signal.company, 'Signal must have company');
    assert.ok(signal.signalType, 'Signal must have signalType');
    assert.ok(signal.headline, 'Signal must have headline');
  });

  it('Mock Interview session can be saved and retrieved by user and jobId', () => {
    const user = authAndStore.createUser('Parity Candidate One', `mock_sess_${Date.now()}@applyvise.com`, 'SecurePass123!');
    const testUserId = user.id;

    const testSession = {
      id: `sess_${Date.now()}`,
      jobId: 'job_123',
      roleTitle: 'Staff Backend Architect',
      companyName: 'Stripe',
      interviewType: 'technical' as const,
      questions: [{ id: 'q1', question: 'How do you handle idempotency?', category: 'technical' }],
      answers: [{ questionId: 'q1', answerText: 'Using unique idempotency keys in Redis.', timestamp: new Date().toISOString() }],
      feedback: {
        relevanceScore: 24,
        structureScore: 23,
        clarityScore: 19,
        evidenceScore: 28,
        overallFeedback: 'Exemplary technical architecture depth.',
      },
      overallScore: 94,
    };

    const saved = authAndStore.saveMockInterviewSession(testSession, testUserId);
    assert.ok(saved);
    assert.strictEqual(saved.userId, testUserId);
    assert.strictEqual(saved.overallScore, 94);

    const retrieved = authAndStore.getMockInterviewSessions(testUserId, 'job_123');
    assert.ok(Array.isArray(retrieved));
    assert.strictEqual(retrieved.length, 1);
    assert.strictEqual(retrieved[0].roleTitle, 'Staff Backend Architect');
  });

  it('Recruiter review audit can be saved and retrieved by application and user ID', () => {
    const user = authAndStore.createUser('Parity Candidate Two', `rec_audit_${Date.now()}@applyvise.com`, 'SecurePass123!');
    const testUserId = user.id;
    const testAppId = `app_${Date.now()}`;

    authAndStore.saveApplication(testUserId, {
      id: testAppId,
      vacancyId: 'vac_test',
      company: 'Stripe',
      role: 'Staff Infrastructure Engineer',
      status: 'INTERVIEW',
      country: 'US',
      location: 'Remote',
      jobUrl: 'https://stripe.com/jobs/123',
      matchScore: 92,
      tailoredResume: {
        summary: 'Staff Infrastructure Engineer with deep experience.',
        targetedSkills: ['TypeScript', 'Distributed Systems'],
        tailoredExperiences: [],
      },
      timeline: [],
      duplicateKey: `stripe_staff_infra_${testAppId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const testAudit = {
      id: `rev_${Date.now()}`,
      userId: testUserId,
      applicationId: testAppId,
      roleAlignmentScore: 89,
      reviewCategories: {
        roleAlignment: { score: 89, status: 'strong', notes: 'Strong fit' },
        mandatoryRequirements: { score: 90, status: 'strong', notes: 'All met' },
      },
      evidenceClassification: {
        verifiedEvidence: ['TypeScript', 'Distributed Systems'],
        indirectEvidence: [],
        notEstablished: [],
      },
      strongestPoints: ['Grounded technical track record'],
      potentialConcerns: [],
      missingMandatoryRequirements: [],
      resumeImprovements: ['Add quantitative baseline metrics'],
      clarificationQuestions: [],
    };

    const saved = authAndStore.saveRecruiterReviewAudit(testAudit, testUserId);
    assert.ok(saved);
    assert.strictEqual(saved.applicationId, testAppId);

    const retrieved = authAndStore.getRecruiterReviewAudit(testAppId, testUserId);
    assert.ok(retrieved);
    assert.strictEqual(retrieved.roleAlignmentScore, 89);
    assert.strictEqual(retrieved.evidenceClassification.verifiedEvidence[0], 'TypeScript');
  });

  it('Career trajectories can be saved and retrieved per candidate', () => {
    const user = authAndStore.createUser('Parity Candidate Three', `traj_${Date.now()}@applyvise.com`, 'SecurePass123!');
    const testUserId = user.id;

    const testTraj = {
      id: `traj_${Date.now()}`,
      userId: testUserId,
      trajectoryTitle: 'Engineering Leadership',
      targetRole: 'VP of Engineering',
      currentAlignmentScore: 82,
      transferableSkills: ['System Design', 'Strategic Planning'],
      missingSkills: ['Executive Budgeting'],
      requiredExperienceYears: 8,
      recommendedCertifications: [],
      learningPath: [],
      isActive: true,
    };

    const saved = authAndStore.saveCareerTrajectory(testTraj, testUserId);
    assert.ok(saved);
    assert.strictEqual(saved.targetRole, 'VP of Engineering');

    const retrieved = authAndStore.getCareerTrajectories(testUserId);
    assert.ok(Array.isArray(retrieved));
    assert.strictEqual(retrieved.length, 1);
    assert.strictEqual(retrieved[0].currentAlignmentScore, 82);
  });

  it('server.ts declares all four Six-Pillar endpoint paths', () => {
    const serverCode = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
    assert.ok(serverCode.includes("app.get('/api/opportunity-signals'"), 'server.ts must have GET /api/opportunity-signals');
    assert.ok(serverCode.includes("app.get('/api/interviews/mock-sessions'"), 'server.ts must have GET /api/interviews/mock-sessions');
    assert.ok(serverCode.includes("app.post('/api/interviews/mock-sessions'"), 'server.ts must have POST /api/interviews/mock-sessions');
    assert.ok(serverCode.includes("app.post('/api/interviews/mock-sessions/evaluate'"), 'server.ts must have POST /api/interviews/mock-sessions/evaluate');
    assert.ok(serverCode.includes("app.get('/api/applications/:id/recruiter-review'"), 'server.ts must have GET /api/applications/:id/recruiter-review');
    assert.ok(serverCode.includes("app.post('/api/applications/:id/recruiter-review'"), 'server.ts must have POST /api/applications/:id/recruiter-review');
    assert.ok(serverCode.includes("app.get('/api/career-atlas/trajectories'"), 'server.ts must have GET /api/career-atlas/trajectories');
    assert.ok(serverCode.includes("app.post('/api/career-atlas/trajectories'"), 'server.ts must have POST /api/career-atlas/trajectories');
  });

  it('worker/index.ts declares all four Six-Pillar endpoint paths including evaluate', () => {
    const workerCode = fs.readFileSync(path.join(process.cwd(), 'worker', 'index.ts'), 'utf8');
    assert.ok(workerCode.includes("app.get('/api/opportunity-signals'"), 'worker must have GET /api/opportunity-signals');
    assert.ok(workerCode.includes("app.get('/api/interviews/mock-sessions'"), 'worker must have GET /api/interviews/mock-sessions');
    assert.ok(workerCode.includes("app.post('/api/interviews/mock-sessions'"), 'worker must have POST /api/interviews/mock-sessions');
    assert.ok(workerCode.includes("app.post('/api/interviews/mock-sessions/evaluate'"), 'worker must have POST /api/interviews/mock-sessions/evaluate');
    assert.ok(workerCode.includes("app.get('/api/applications/:id/recruiter-review'"), 'worker must have GET /api/applications/:id/recruiter-review');
    assert.ok(workerCode.includes("app.post('/api/applications/:id/recruiter-review'"), 'worker must have POST /api/applications/:id/recruiter-review');
    assert.ok(workerCode.includes("app.get('/api/career-atlas/trajectories'"), 'worker must have GET /api/career-atlas/trajectories');
    assert.ok(workerCode.includes("app.post('/api/career-atlas/trajectories'"), 'worker must have POST /api/career-atlas/trajectories');
  });
});

describe('ApplyVise AI — P2: 100-Point Interview Evaluation Engine', () => {
  it('Prompt builder embeds candidate ground-truth facts from registry', () => {
    const facts: CandidateFact[] = [
      {
        id: 'f1',
        userId: 'u1',
        category: 'SKILL',
        field: 'Distributed Systems',
        value: 'Distributed Systems',
        originalSource: 'resume_upload',
        verificationStatus: 'USER_CONFIRMED',
        confidence: 0.95,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'f2',
        userId: 'u1',
        category: 'EMPLOYMENT',
        field: 'Staff Engineer',
        value: 'Led transaction pipeline at ScalePay processing $2B annually',
        originalSource: 'resume_upload',
        verificationStatus: 'USER_CONFIRMED',
        confidence: 0.98,
        lastUpdated: new Date().toISOString(),
      },
    ];

    const prompt = buildInterviewEvaluationPrompt({
      question: 'Describe your experience scaling financial infrastructure.',
      answer: 'At ScalePay, I re-architected our transaction pipeline which processed $2B annually.',
      roleTitle: 'Principal Architect',
      companyName: 'FinTech Global',
      category: 'behavioral',
      verifiedFacts: facts,
    });

    assert.ok(prompt.includes('Distributed Systems'), 'Prompt must contain verified candidate skill');
    assert.ok(prompt.includes('ScalePay'), 'Prompt must contain verified candidate employment fact');
    assert.ok(prompt.includes('EVALUATION RUBRIC (100 TOTAL POINTS)'), 'Prompt must specify 100-point rubric');
    assert.ok(prompt.includes('RELEVANCE TO QUESTION (Max 25 points)'), 'Relevance must be 25 points');
    assert.ok(prompt.includes('STRUCTURE & STAR FRAMEWORK (Max 25 points)'), 'Structure must be 25 points');
    assert.ok(prompt.includes('CLARITY & COMMUNICATION (Max 20 points)'), 'Clarity must be 20 points');
    assert.ok(prompt.includes('EVIDENCE & FACTUAL SUPPORT (Max 30 points)'), 'Evidence must be 30 points');
  });

  it('validateInterviewEvaluationOutput enforces strict 100-point bounds and schema', () => {
    const rawAiOutput = {
      relevanceScore: 24,
      relevanceExplanation: 'Direct and nuanced answer addressing high-scale architecture.',
      structureScore: 22,
      structureExplanation: 'Clear Situation, Task, Action, Result framework.',
      missingStarElements: [],
      clarityScore: 19,
      clarityExplanation: 'Articulate and concise technical vocabulary.',
      evidenceScore: 28,
      evidenceExplanation: 'Strong alignment with verified registry achievements.',
      verifiedClaims: ['ScalePay $2B transaction volume'],
      unsupportedClaims: [],
      strengths: ['Quantitative outcome reporting', 'Accurate technical framing'],
      improvementOpportunities: ['Provide deeper insight into initial failure modes'],
      evaluationConfidence: 'HIGH',
    };

    const output = validateInterviewEvaluationOutput(rawAiOutput, 'gemini-2.5-flash');

    assert.strictEqual(output.relevance.score, 24);
    assert.strictEqual(output.relevance.maxScore, 25);
    assert.strictEqual(output.structure.score, 22);
    assert.strictEqual(output.structure.maxScore, 25);
    assert.strictEqual(output.clarity.score, 19);
    assert.strictEqual(output.clarity.maxScore, 20);
    assert.strictEqual(output.evidence.score, 28);
    assert.strictEqual(output.evidence.maxScore, 30);
    assert.strictEqual(output.overallScore, 93);
    assert.strictEqual(output.evaluationStatus, 'COMPLETED');
    assert.strictEqual(output.evaluationConfidence, 'HIGH');
    assert.strictEqual(output.modelUsed, 'gemini-2.5-flash');
  });

  it('validateInterviewEvaluationOutput clamps out-of-range scores and handles malformed data safely', () => {
    const malformed = {
      relevanceScore: 999, // Should clamp to 25
      structureScore: -10, // Should clamp to 0
      clarityScore: 'not_a_number', // Should fallback to 0
      evidenceScore: 50, // Should clamp to 30
      evaluationConfidence: 'UNKNOWN_VALUE', // Should fallback to HIGH
    };

    const output = validateInterviewEvaluationOutput(malformed);
    assert.strictEqual(output.relevance.score, 25);
    assert.strictEqual(output.structure.score, 0);
    assert.strictEqual(output.clarity.score, 0);
    assert.strictEqual(output.evidence.score, 30);
    assert.strictEqual(output.overallScore, 55);
    assert.strictEqual(output.evaluationConfidence, 'HIGH');
  });

  it('InterviewStudio.tsx does NOT contain client-side hardcoded scores or fake feedback', () => {
    const studioCode = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'InterviewStudio.tsx'), 'utf8');
    assert.strictEqual(studioCode.includes('relevanceScore: 88'), false, 'Hardcoded relevanceScore: 88 must be removed');
    assert.strictEqual(studioCode.includes('structureScore: 92'), false, 'Hardcoded structureScore: 92 must be removed');
    assert.strictEqual(studioCode.includes('clarityScore: 85'), false, 'Hardcoded clarityScore: 85 must be removed');
    assert.strictEqual(studioCode.includes('overallScore: 88,'), false, 'Hardcoded overallScore: 88 must be removed');
    assert.ok(studioCode.includes('runEvaluation'), 'InterviewStudio must trigger server-side evaluation');
    assert.ok(studioCode.includes('Evaluation unavailable — retry required.'), 'InterviewStudio must provide fallback retry UI');
    assert.ok(studioCode.includes('Retry Evaluation'), 'InterviewStudio must render Retry button');
  });
});

describe('ApplyVise AI — P3: Admin Resume Management Integration', () => {
  it('AdminConsole.tsx incorporates the resumes tab and imports AdminResumeManagement', () => {
    const consoleCode = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'AdminConsole.tsx'), 'utf8');
    assert.ok(consoleCode.includes("import { AdminResumeManagement } from './AdminResumeManagement.tsx';"), 'Must import AdminResumeManagement');
    assert.ok(consoleCode.includes("type AdminTab = 'overview' | 'users' | 'resumes' | 'sources' | 'audit' | 'system' | 'founder';"), 'AdminTab must include resumes');
    assert.ok(consoleCode.includes("setActiveTab('resumes')"), 'Must have activeTab resumes button');
    assert.ok(consoleCode.includes("<AdminResumeManagement onRefreshOverview={loadData} />"), 'Must render AdminResumeManagement');
  });

  it('AdminResumeManagement.tsx renders inventory, filters, drawer, and safe reprocessing', () => {
    const mgmtCode = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'AdminResumeManagement.tsx'), 'utf8');
    assert.ok(mgmtCode.includes('api.getAdminResumes'), 'Must query inventory via api.getAdminResumes');
    assert.ok(mgmtCode.includes('api.getAdminResumeById'), 'Must query resume details via api.getAdminResumeById');
    assert.ok(mgmtCode.includes('api.getAdminResumeText'), 'Must query text preview via api.getAdminResumeText');
    assert.ok(mgmtCode.includes('api.reprocessAdminResume'), 'Must trigger safe reprocess via api.reprocessAdminResume');
    assert.ok(mgmtCode.includes('statusFilter'), 'Must support status filtering');
    assert.ok(mgmtCode.includes('formatFilter'), 'Must support format filtering');
    assert.ok(mgmtCode.includes('handleInspectResume'), 'Must support drawer inspection');
  });
});
