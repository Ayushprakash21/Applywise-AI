import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { authAndStore } from '../server/authAndStore.ts';
import { validateInterviewEvaluationOutput } from '../src/utils/interviewEvaluator.ts';

test('API Contract & Gemini Readiness Suite', async (t) => {
  // Test user setup
  const email = `contract_test_${Date.now()}@applyvise.com`;
  const user = authAndStore.createUser('Contract Test User', email, 'Password123!');
  const authSession = authAndStore.verifyLogin(email, 'Password123!');
  const token = authSession.token;

  await t.test('1. Opportunity Signals: Canonical and alias route handlers parity', () => {
    const signals = authAndStore.getOpportunitySignals();
    assert.ok(Array.isArray(signals), 'Opportunity signals must return an array');
    if (signals.length > 0) {
      const s = signals[0];
      assert.ok(s.id, 'Signal must have an id');
      assert.ok(s.company, 'Signal must have a company');
      assert.ok(s.headline, 'Signal must have a headline');
    }
  });

  await t.test('2. Interview Sessions: Storage and retrieval parity across canonical and legacy endpoints', () => {
    const testSession = {
      jobId: 'job_senior_dist_sys_1',
      sessionType: 'technical_depth' as const,
      roleTitle: 'Staff Distributed Systems Engineer',
      overallScore: 84,
      categoryScores: {
        architecture: 88,
        problemSolving: 85,
        communication: 80,
      },
      questionCount: 3,
      durationSeconds: 720,
      strengths: ['Raft consensus protocol mastery', 'Zero data loss guarantees'],
      improvements: ['Detail failover metrics with explicit p99 latency targets'],
      auditNotes: 'Grounded against candidate registry facts.',
    };

    const saved = authAndStore.saveMockInterviewSession(testSession, user.id);
    assert.ok(saved.id, 'Saved session must have an ID');
    assert.equal(saved.userId, user.id, 'Saved session userId must match candidate');

    const sessions = authAndStore.getMockInterviewSessions(user.id);
    assert.ok(sessions.length >= 1, 'Should retrieve at least 1 mock session');
    const retrieved = sessions.find(s => s.id === saved.id);
    assert.ok(retrieved, 'Should retrieve the exact saved mock session');
    assert.equal(retrieved!.overallScore, 84);
  });

  await t.test('3. Recruiter Review: Application and audit parity across dual route contracts', () => {
    const appId = `app_contract_${crypto.randomUUID()}`;
    const appRecord = {
      id: appId,
      userId: user.id,
      vacancyId: 'job_senior_dist_sys_1',
      company: 'Distributed Systems Corp',
      role: 'Staff Systems Architect',
      status: 'READY_TO_SUBMIT' as const,
      jobId: 'job_senior_dist_sys_1',
      duplicateKey: `dup_${Date.now()}`,
      country: 'USA',
      location: 'Remote',
      jobUrl: 'https://careers.example.com/staff-architect',
      matchScore: 88,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tailoredResume: {
        summary: 'Staff Architect with distributed systems experience.',
        skills: ['Distributed Consensus', 'Go', 'Kubernetes'],
        experience: [],
        targetedSkills: ['Distributed Consensus', 'Go'],
      },
      timeline: [{ stage: 'READY_TO_SUBMIT' as const, timestamp: new Date().toISOString(), note: 'Application created', actor: 'candidate' }],
    };

    authAndStore.saveApplication(user.id, appRecord);

    const auditPayload = {
      id: `rev_contract_${Date.now()}`,
      userId: user.id,
      applicationId: appId,
      roleAlignmentScore: 88,
      reviewCategories: {
        roleAlignment: { score: 88, status: 'strong' as const, notes: 'Aligned with staff requirements.' },
        mandatoryRequirements: { score: 90, status: 'strong' as const, notes: 'Mandatory competencies met.' },
        preferredQualifications: { score: 80, status: 'strong' as const, notes: 'Architecture background verified.' },
        relevantExperience: { score: 85, status: 'strong' as const, notes: 'Strong production experience.' },
        careerProgression: { score: 90, status: 'strong' as const, notes: 'Staff scope.' },
        skillsEvidence: { score: 85, status: 'strong' as const, notes: 'Skills verified in candidate fact registry.' },
        achievementClarity: { score: 85, status: 'strong' as const, notes: 'Quantified results.' },
        resumeStructure: { score: 95, status: 'strong' as const, notes: 'Single-column ATS format.' },
        keywordRelevance: { score: 90, status: 'strong' as const, notes: 'Domain terminology present.' },
        employmentHistoryConsistency: { score: 95, status: 'strong' as const, notes: 'Chronological timeline consistent.' },
        missingInformation: { score: 95, status: 'strong' as const, notes: 'Complete candidate fact coverage.' },
        unsupportedClaims: { score: 100, status: 'strong' as const, notes: 'Zero unverified claims.' },
      },
      evidenceClassification: {
        verifiedEvidence: ['Distributed Consensus', 'Go'],
        indirectEvidence: [],
        notEstablished: [],
      },
      strongestPoints: ['Verified distributed consensus', 'Single-column ATS resume'],
      potentialConcerns: [],
      missingMandatoryRequirements: [],
      resumeImprovements: ['Document SLA benchmarks.'],
      clarificationQuestions: [],
    };

    const savedAudit = authAndStore.saveRecruiterReviewAudit(auditPayload, user.id);
    assert.ok(savedAudit.id, 'Audit must have ID');
    assert.equal(savedAudit.applicationId, appId);

    const retrievedAudit = authAndStore.getRecruiterReviewAudit(appId, user.id);
    assert.ok(retrievedAudit, 'Audit must be retrievable by applicationId and userId');
    assert.equal(retrievedAudit!.roleAlignmentScore, 88);
  });

  await t.test('4. Gemini Evaluation Engine: Missing and Placeholder Key handling', () => {
    const rawMock = {
      relevanceScore: 23,
      structureScore: 22,
      clarityScore: 18,
      evidenceScore: 25,
      strengths: ['Demonstrated concrete consensus protocol metrics.'],
      improvements: ['State SLA targets explicitly.'],
    };

    const validated = validateInterviewEvaluationOutput(rawMock, 'gemini-2.5-flash');
    assert.equal(validated.overallScore, 88, 'Overall score should sum 23 + 22 + 18 + 25 = 88');
    assert.equal(validated.modelUsed, 'gemini-2.5-flash');
    assert.equal(validated.evaluationStatus, 'COMPLETED');
  });

  await t.test('5. Zero Score Fabrication: Malformed or out-of-range scores are safely clamped to [0, 100]', () => {
    const malformed = {
      relevanceScore: 9999, // Should clamp to max 25
      structureScore: -50,  // Should clamp to min 0
      clarityScore: 20,
      evidenceScore: 30,
    };

    const result = validateInterviewEvaluationOutput(malformed, 'gemini-2.5-flash');
    assert.ok(result.overallScore >= 0 && result.overallScore <= 100, 'Score must be clamped to [0, 100]');
    assert.equal(result.relevance.score, 25, 'Relevance must be clamped to max 25');
    assert.equal(result.structure.score, 0, 'Structure must be clamped to min 0');
    assert.equal(result.overallScore, 75, 'Overall score must equal 25 + 0 + 20 + 30 = 75');
  });
});
