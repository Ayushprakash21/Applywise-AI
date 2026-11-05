import fs from 'fs';

const BASE_URL = 'http://localhost:3000';

async function runAdversarialVerification() {
  console.log('================================================================');
  console.log('   APPLYVISE AI — ADVERSARIAL RELEASE VERIFICATION SUITE       ');
  console.log('================================================================\n');

  const results = {
    p1_runtime_parity: [],
    p2_gemini_evaluation: [],
    p3_admin_resume_security: [],
    database_persistence: [],
  };

  // Helper to register user
  async function registerUser(fullName, email, password) {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password, confirmPassword: password }),
    });
    return await res.json();
  }

  // Helper to login user
  async function loginUser(email, password) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return await res.json();
  }

  console.log('--- Step 1: Provisioning Test Actors ---');
  const timestamp = Date.now();
  const aliceEmail = `alice_adv_${timestamp}@applyvise.com`;
  const bobEmail = `bob_adv_${timestamp}@applyvise.com`;
  const password = 'StrongPassword123!';

  const regAlice = await registerUser('Alice Architect', aliceEmail, password);
  const tokenAlice = regAlice.token;
  console.log(`[Actor 1] Alice registered. ID: ${regAlice.user?.id}, Token present: ${Boolean(tokenAlice)}`);

  const regBob = await registerUser('Bob Developer', bobEmail, password);
  const tokenBob = regBob.token;
  console.log(`[Actor 2] Bob registered. ID: ${regBob.user?.id}, Token present: ${Boolean(tokenBob)}`);

  // --- PHASE 1 & 3: BACKEND RUNTIME PARITY & USER ISOLATION ---
  console.log('\n--- Step 2: Testing P1 Runtime Parity & User Isolation ---');

  // Test 1: Opportunity Signals
  {
    console.log('\n[Test 1.1] GET /api/opportunity-signals (Unauthenticated)');
    const resUnauth = await fetch(`${BASE_URL}/api/opportunity-signals`);
    const dataUnauth = await resUnauth.json();
    console.log(`Status: ${resUnauth.status}, Body:`, dataUnauth);
    const passUnauth = resUnauth.status === 401 && !dataUnauth.success;

    console.log('\n[Test 1.2] GET /api/opportunity-signals (Authenticated Alice)');
    const resAuth = await fetch(`${BASE_URL}/api/opportunity-signals`, {
      headers: { Authorization: `Bearer ${tokenAlice}` },
    });
    const dataAuth = await resAuth.json();
    console.log(`Status: ${resAuth.status}, Count: ${dataAuth.signals?.length}`);
    const passAuth = resAuth.status === 200 && dataAuth.success && Array.isArray(dataAuth.signals) && dataAuth.signals.length > 0;

    results.p1_runtime_parity.push({
      test: 'Opportunity Signals Auth & Schema',
      passed: passUnauth && passAuth,
      evidence: { unauthStatus: resUnauth.status, authCount: dataAuth.signals?.length },
    });
  }

  // Test 2: Mock Interview Sessions Write, Read & Isolation
  {
    console.log('\n[Test 2.1] Alice creates a mock interview session');
    const aliceSessionPayload = {
      roleTitle: 'Principal Distributed Systems Engineer',
      companyName: 'Stripe',
      interviewType: 'technical',
      questions: [{ id: 'q1', question: 'Explain consensus protocols', category: 'technical' }],
      answers: [{ questionId: 'q1', answerText: 'Raft uses leader election and log replication', timestamp: new Date().toISOString() }],
      feedback: {
        relevanceScore: 24,
        structureScore: 24,
        clarityScore: 19,
        evidenceScore: 28,
        overallFeedback: 'Deep distributed systems architectural command',
      },
      overallScore: 95,
    };

    const resAliceSave = await fetch(`${BASE_URL}/api/interviews/mock-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAlice}`,
      },
      body: JSON.stringify(aliceSessionPayload),
    });
    const dataAliceSave = await resAliceSave.json();
    console.log(`Save Status: ${resAliceSave.status}, Session ID: ${dataAliceSave.session?.id}`);

    // Alice reads her sessions
    const resAliceGet = await fetch(`${BASE_URL}/api/interviews/mock-sessions`, {
      headers: { Authorization: `Bearer ${tokenAlice}` },
    });
    const dataAliceGet = await resAliceGet.json();
    console.log(`Alice Sessions Count: ${dataAliceGet.sessions?.length}`);

    // Bob reads his sessions (MUST BE EMPTY - USER ISOLATION CHECK)
    const resBobGet = await fetch(`${BASE_URL}/api/interviews/mock-sessions`, {
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    const dataBobGet = await resBobGet.json();
    console.log(`Bob Sessions Count (Isolation check): ${dataBobGet.sessions?.length}`);

    const passIsolation = dataAliceGet.sessions?.length >= 1 && dataBobGet.sessions?.length === 0;
    results.p1_runtime_parity.push({
      test: 'Mock Interview Sessions Persistence & Cross-User Isolation',
      passed: resAliceSave.status === 200 && passIsolation,
      evidence: { aliceSessions: dataAliceGet.sessions?.length, bobSessions: dataBobGet.sessions?.length },
    });
  }

  // Test 3: Career Atlas Trajectories Write, Read & Isolation
  {
    console.log('\n[Test 3.1] Alice creates a career trajectory');
    const aliceTrajPayload = {
      trajectoryTitle: 'Enterprise Technology Executive',
      targetRole: 'VP of Architecture',
      currentAlignmentScore: 84,
      transferableSkills: ['Systems Reliability', 'Domain Modeling'],
      missingSkills: ['Board Communication'],
      requiredExperienceYears: 10,
    };

    const resAliceTraj = await fetch(`${BASE_URL}/api/career-atlas/trajectories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAlice}`,
      },
      body: JSON.stringify(aliceTrajPayload),
    });
    const dataAliceTraj = await resAliceTraj.json();
    console.log(`Save Trajectory Status: ${resAliceTraj.status}, ID: ${dataAliceTraj.trajectory?.id}`);

    // Bob reads his trajectories (MUST BE EMPTY - USER ISOLATION CHECK)
    const resBobTraj = await fetch(`${BASE_URL}/api/career-atlas/trajectories`, {
      headers: { Authorization: `Bearer ${tokenBob}` },
    });
    const dataBobTraj = await resBobTraj.json();
    console.log(`Bob Trajectories Count (Isolation check): ${dataBobTraj.trajectories?.length}`);

    const passTraj = resAliceTraj.status === 200 && dataBobTraj.trajectories?.length === 0;
    results.p1_runtime_parity.push({
      test: 'Career Trajectories Persistence & Cross-User Isolation',
      passed: passTraj,
      evidence: { aliceTrajSaved: Boolean(dataAliceTraj.trajectory?.id), bobTrajCount: dataBobTraj.trajectories?.length },
    });
  }

  // Test 4: Recruiter Review Screening Non-Existent Record & Missing Record Handling
  {
    console.log('\n[Test 4.1] Request recruiter review for non-existent application');
    const resMissing = await fetch(`${BASE_URL}/api/applications/non_existent_app_999/recruiter-review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAlice}` },
    });
    const dataMissing = await resMissing.json();
    console.log(`Non-existent App Status: ${resMissing.status}, Body:`, dataMissing);

    const passMissing = resMissing.status === 404 && !dataMissing.success;
    results.p1_runtime_parity.push({
      test: 'Recruiter Review 404 on Missing Application',
      passed: passMissing,
      evidence: { status: resMissing.status, error: dataMissing.error },
    });
  }

  // --- PHASE 4: GEMINI EVALUATION INTEGRITY ---
  console.log('\n--- Step 3: Testing P2 Gemini Evaluation Integrity ---');

  // Test 5: Empty Question/Answer Validation
  {
    console.log('\n[Test 5.1] POST /api/interviews/mock-sessions/evaluate with empty answer');
    const resEmpty = await fetch(`${BASE_URL}/api/interviews/mock-sessions/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAlice}`,
      },
      body: JSON.stringify({ question: 'Tell me about yourself', answer: '   ' }),
    });
    const dataEmpty = await resEmpty.json();
    console.log(`Empty Answer Status: ${resEmpty.status}, Error:`, dataEmpty.error);

    const passEmpty = resEmpty.status === 400 && dataEmpty.error?.includes('required');
    results.p2_gemini_evaluation.push({
      test: 'Empty Answer Rejection (400 Bad Request)',
      passed: passEmpty,
      evidence: { status: resEmpty.status, error: dataEmpty.error },
    });
  }

  // Test 6: Provider Fallback on Invalid/Placeholder API Key
  {
    console.log('\n[Test 6.1] Evaluation with current environment key (placeholder MY_GEMINI_API_KEY)');
    const resEval = await fetch(`${BASE_URL}/api/interviews/mock-sessions/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAlice}`,
      },
      body: JSON.stringify({
        question: 'How do you design a zero-downtime database migration?',
        answer: 'I use the expand-and-contract pattern with dual writes and feature flags.',
        roleTitle: 'Principal Infrastructure Engineer',
      }),
    });
    const dataEval = await resEval.json();
    console.log(`Evaluation Status: ${resEval.status}, Body:`, dataEval);

    // CRITICAL: When provider fails or has invalid key, it MUST return:
    // "Evaluation unavailable — retry required." with status 502/503.
    // It must NEVER fabricate synthetic numbers (like 88 or 92) or fake success.
    const passFallback = (resEval.status === 502 || resEval.status === 503) &&
      !dataEval.success &&
      dataEval.error === 'Evaluation unavailable — retry required.';

    results.p2_gemini_evaluation.push({
      test: 'Fail-Safe Fallback Contract (Never Fabricate Numbers)',
      passed: passFallback,
      evidence: { status: resEval.status, error: dataEval.error, noSyntheticScores: !dataEval.evaluation },
    });
  }

  // --- PHASE 5: ADMIN RESUME MANAGEMENT SECURITY ---
  console.log('\n--- Step 4: Testing P3 Admin Resume Management Security ---');

  // Test 7: Unauthorized Access Rejection
  {
    console.log('\n[Test 7.1] Unauthenticated GET /api/admin/resumes');
    const resNoAuth = await fetch(`${BASE_URL}/api/admin/resumes`);
    const dataNoAuth = await resNoAuth.json();
    console.log(`Unauthenticated Status: ${resNoAuth.status}`);

    console.log('\n[Test 7.2] Standard User (Alice) GET /api/admin/resumes');
    const resUserAuth = await fetch(`${BASE_URL}/api/admin/resumes`, {
      headers: { Authorization: `Bearer ${tokenAlice}` },
    });
    const dataUserAuth = await resUserAuth.json();
    console.log(`Standard User Status: ${resUserAuth.status}, Error:`, dataUserAuth.error);

    const passRbac = resNoAuth.status === 401 && resUserAuth.status === 403;
    results.p3_admin_resume_security.push({
      test: 'Admin Resumes RBAC Protection (401 unauth / 403 non-admin)',
      passed: passRbac,
      evidence: { unauthStatus: resNoAuth.status, userStatus: resUserAuth.status },
    });
  }

  // Test 8: Promoted Admin Access
  {
    console.log('\n[Test 8.1] Promoting an operator to admin and querying inventory');
    const adminEmail = `admin_operator_${timestamp}@applyvise.com`;
    const regAdmin = await registerUser('Lead Admin Operator', adminEmail, password);

    // Promote in SQLite
    const { authAndStore } = await import('../server/authAndStore.ts');
    authAndStore.updateUserRole(regAdmin.user.id, 'admin');

    // Login to get fresh admin session token
    const loginAdmin = await loginUser(adminEmail, password);
    const adminToken = loginAdmin.token;

    const resAdminResumes = await fetch(`${BASE_URL}/api/admin/resumes`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataAdminResumes = await resAdminResumes.json();
    console.log(`Admin Status: ${resAdminResumes.status}, Total Documents: ${dataAdminResumes.total}`);

    // Test 8.2: Guessed / Non-existent Resume ID
    const resGuessed = await fetch(`${BASE_URL}/api/admin/resumes/guessed_fake_id_999`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataGuessed = await resGuessed.json();
    console.log(`Guessed Resume ID Status: ${resGuessed.status}`);

    const passAdmin = resAdminResumes.status === 200 && dataAdminResumes.success && resGuessed.status === 404;
    results.p3_admin_resume_security.push({
      test: 'Authorized Admin Access & 404 on Guessed Resume ID',
      passed: passAdmin,
      evidence: { adminStatus: resAdminResumes.status, guessedStatus: resGuessed.status, total: dataAdminResumes.total },
    });
  }

  // --- SUMMARY RESULTS PRINTING ---
  console.log('\n================================================================');
  console.log('                 ADVERSARIAL VERIFICATION SUMMARY              ');
  console.log('================================================================');
  for (const [category, tests] of Object.entries(results)) {
    console.log(`\nCategory: ${category}`);
    tests.forEach(t => {
      console.log(`  ${t.passed ? '✔ PASS' : '✖ FAIL'}: ${t.test}`);
      console.log(`     Evidence:`, JSON.stringify(t.evidence));
    });
  }

  const allPassed = Object.values(results).flat().every(t => t.passed);
  console.log(`\nOverall Adversarial Verdict: ${allPassed ? 'ALL VERIFICATIONS PASSED' : 'DEFECTS DETECTED'}`);
  return { allPassed, results };
}

runAdversarialVerification().then(({ allPassed }) => {
  process.exit(allPassed ? 0 : 1);
});
