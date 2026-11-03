import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Google Auth P0 Repair: 1. Official Google button is visible click target without hidden class', () => {
  const loginSrc = fs.readFileSync('src/components/FlowLogin.tsx', 'utf8');
  const signupSrc = fs.readFileSync('src/components/FlowSignup.tsx', 'utf8');

  // Verify googleBtnRef is not hidden
  assert.ok(!loginSrc.includes('min-h-[44px] hidden'), 'FlowLogin must not hide googleBtnRef with hidden class');
  assert.ok(!signupSrc.includes('min-h-[44px] hidden'), 'FlowSignup must not hide googleBtnRef with hidden class');
  assert.ok(!loginSrc.includes('display: none'), 'FlowLogin must not set display: none on google auth container');
  assert.ok(!signupSrc.includes('display: none'), 'FlowSignup must not set display: none on google auth container');

  // Verify container is mounted visibly inside GoogleAuthButton wrapper
  const visibleLoginMount = /<GoogleAuthButton[^>]*mode="signin"[^>]*>[\s\S]*?<div\s+ref=\{googleBtnRef\}\s+className=\{`[^`]*min-h-\[44px\][^`]*`\}\s*\/>/;
  const visibleSignupMount = /<GoogleAuthButton[^>]*mode="signup"[^>]*>[\s\S]*?<div\s+ref=\{googleBtnRef\}\s+className=\{`[^`]*min-h-\[44px\][^`]*`\}\s*\/>/;

  assert.ok(visibleLoginMount.test(loginSrc), 'FlowLogin must render visible googleBtnRef inside GoogleAuthButton');
  assert.ok(visibleSignupMount.test(signupSrc), 'FlowSignup must render visible googleBtnRef inside GoogleAuthButton');
});

test('Google Auth P0 Repair: 2. Removal of One Tap triggerGooglePrompt from button click handlers', () => {
  const loginSrc = fs.readFileSync('src/components/FlowLogin.tsx', 'utf8');
  const signupSrc = fs.readFileSync('src/components/FlowSignup.tsx', 'utf8');

  // Must NOT import or invoke triggerGooglePrompt
  assert.ok(!loginSrc.includes('triggerGooglePrompt'), 'FlowLogin must not call triggerGooglePrompt');
  assert.ok(!signupSrc.includes('triggerGooglePrompt'), 'FlowSignup must not call triggerGooglePrompt');
});

test('Google Auth P0 Repair: 3. Designated signin_with and signup_with official GIS button modes', () => {
  const loginSrc = fs.readFileSync('src/components/FlowLogin.tsx', 'utf8');
  const signupSrc = fs.readFileSync('src/components/FlowSignup.tsx', 'utf8');
  const gAuthSrc = fs.readFileSync('src/services/googleAuth.ts', 'utf8');

  // FlowLogin renders signin mode
  assert.ok(loginSrc.includes("mode: 'signin'"), 'FlowLogin must configure mode: signin for renderGoogleButton');
  // FlowSignup renders signup mode
  assert.ok(signupSrc.includes("mode: 'signup'"), 'FlowSignup must configure mode: signup for renderGoogleButton');

  // googleAuth maps mode to official GIS text parameters
  assert.ok(
    gAuthSrc.includes("text: options.mode === 'signup' ? 'signup_with' : 'signin_with'"),
    'renderGoogleButton must translate mode to official GIS text parameters'
  );
  assert.ok(gAuthSrc.includes('theme: options.theme || \'outline\''), 'renderGoogleButton must use outline theme');
});

test('Google Auth P0 Repair: 4. Credential callback validation and token storage contracts', () => {
  const loginSrc = fs.readFileSync('src/components/FlowLogin.tsx', 'utf8');
  const signupSrc = fs.readFileSync('src/components/FlowSignup.tsx', 'utf8');

  for (const [name, src] of [['FlowLogin', loginSrc], ['FlowSignup', signupSrc]]) {
    // Validates credential existence
    assert.ok(src.includes('if (!response?.credential) return;'), `${name} must validate credential existence`);
    // Guards against duplicate submissions
    assert.ok(src.includes('if (isSubmittingRef.current) return;'), `${name} must prevent duplicate submissions`);
    assert.ok(src.includes('isSubmittingRef.current = true;'), `${name} must lock submission flag`);
    // Calls backend Google auth API
    assert.ok(src.includes('api.loginWithGoogle(response.credential)'), `${name} must submit credential to backend`);
    // Stores all tokens and user entries
    assert.ok(src.includes("localStorage.setItem('applyvise_token', res.token);"), `${name} must store applyvise_token`);
    assert.ok(src.includes("localStorage.setItem('applywise_token', res.token);"), `${name} must store applywise_token`);
    assert.ok(src.includes("localStorage.setItem('applyvise_user', JSON.stringify(res.user));"), `${name} must store applyvise_user`);
    assert.ok(src.includes("localStorage.setItem('applywise_user', JSON.stringify(res.user));"), `${name} must store applywise_user`);
    // Triggers onSuccess callback
    assert.ok(src.includes('onSuccessRef.current(res.user, res.token)'), `${name} must trigger onSuccess callback`);
  }
});

test('Google Auth P0 Repair: 5. Unconfigured provider and script failure resilience', () => {
  const loginSrc = fs.readFileSync('src/components/FlowLogin.tsx', 'utf8');
  const signupSrc = fs.readFileSync('src/components/FlowSignup.tsx', 'utf8');

  // Explains unconfigured deployment
  assert.ok(
    loginSrc.includes('Google Sign-In is not configured for this deployment. Please sign in with email.'),
    'FlowLogin must provide unconfigured guidance'
  );
  assert.ok(
    signupSrc.includes('Google Sign-Up is not configured for this deployment. Please register using the form below.'),
    'FlowSignup must provide unconfigured guidance'
  );

  // Provides adblocker / network resilience guidance
  const gAuthSrc = fs.readFileSync('src/services/googleAuth.ts', 'utf8');
  assert.ok(gAuthSrc.includes('accounts.google.com'), 'googleAuth must mention accounts.google.com for adblockers');
  assert.ok(gAuthSrc.includes('timeoutId = setTimeout'), 'googleAuth must set fallback timeout');
});

test('Google Auth P0 Repair: 6. Backend and Worker configuration verification', () => {
  const workerSrc = fs.readFileSync('worker/index.ts', 'utf8');

  // Verify GET /api/auth/config route
  assert.ok(workerSrc.includes("app.get('/api/auth/config'"), 'Worker must define GET /api/auth/config');
  assert.ok(workerSrc.includes('googleClientId'), 'Worker must return googleClientId');
  assert.ok(workerSrc.includes('googleAuthEnabled: Boolean(googleClientId)'), 'Worker must return boolean googleAuthEnabled');

  // Verify POST /api/auth/google verification route
  assert.ok(workerSrc.includes("app.post('/api/auth/google'"), 'Worker must define POST /api/auth/google');
  assert.ok(workerSrc.includes('oauth2.googleapis.com/tokeninfo'), 'Worker must verify token with Google');
  assert.ok(workerSrc.includes('payload.aud?.trim() !== configuredAud'), 'Worker must enforce audience matching');
  assert.ok(workerSrc.includes('validIssuers.includes(payload.iss)'), 'Worker must enforce trusted Google issuers');
});
