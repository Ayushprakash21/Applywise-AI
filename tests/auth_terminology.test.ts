import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Auth Terminology: 1. Zero occurrences of deprecated authentication labels in src/', () => {
  function scanDir(dir: string, results: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, results);
      } else if (/\.(tsx|ts|html|json)$/.test(entry.name)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const files = scanDir(path.resolve(process.cwd(), 'src'));
  const deprecatedLabels = [
    'Create Candidate Account',
    'Candidate Account Sign In',
    'Candidate Registration',
  ];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const label of deprecatedLabels) {
      assert.ok(
        !content.includes(label),
        `Found deprecated auth label "${label}" in ${filePath}`
      );
    }
  }
});

test('Auth Terminology: 2. FlowLogin uses exact "Sign In" label without "Candidate" prefix', () => {
  const loginSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/FlowLogin.tsx'), 'utf8');
  assert.ok(loginSrc.includes('Sign In'), 'FlowLogin must feature exact "Sign In"');
  assert.ok(!loginSrc.includes('Candidate Account Sign In'), 'FlowLogin must not include "Candidate Account Sign In"');
  assert.ok(loginSrc.includes('primaryText = \'Sign In\''), 'FlowLogin default primary CTA must be "Sign In"');
});

test('Auth Terminology: 3. FlowSignup uses exact "Create Account" label without "Candidate" prefix', () => {
  const signupSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/FlowSignup.tsx'), 'utf8');
  assert.ok(signupSrc.includes('Create Account'), 'FlowSignup must feature exact "Create Account"');
  assert.ok(!signupSrc.includes('Candidate Registration'), 'FlowSignup must not include "Candidate Registration"');
  assert.ok(signupSrc.includes('primaryText = \'Create Account\''), 'FlowSignup default primary CTA must be "Create Account"');
});

test('Auth Terminology: 4. AboutPage CTA button uses exact "Create Account"', () => {
  const aboutSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/AboutPage.tsx'), 'utf8');
  assert.ok(aboutSrc.includes('Create Account'), 'AboutPage must feature exact "Create Account"');
  assert.ok(!aboutSrc.includes('Create Candidate Account'), 'AboutPage must not include "Create Candidate Account"');
});

test('Auth Terminology: 5. AuthHeader and Navigation menus use clean "Sign In" and "Sign Up"', () => {
  const authHeaderSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/AuthHeader.tsx'), 'utf8');
  assert.ok(authHeaderSrc.includes('Sign In'), 'AuthHeader must include Sign In');
  assert.ok(authHeaderSrc.includes('Sign Up'), 'AuthHeader must include Sign Up');
  assert.ok(!authHeaderSrc.includes('Candidate Account'), 'AuthHeader must not include Candidate Account');
});

test('Auth Terminology: 6. Preserves authentication logic, OAuth, and API integration', () => {
  const loginSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/FlowLogin.tsx'), 'utf8');
  const signupSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/FlowSignup.tsx'), 'utf8');

  // Login contracts
  assert.ok(loginSrc.includes('api.login'), 'FlowLogin must preserve api.login call');
  assert.ok(loginSrc.includes('api.loginWithGoogle'), 'FlowLogin must preserve Google OAuth');
  assert.ok(loginSrc.includes('api.recoverPassword'), 'FlowLogin must preserve password recovery');

  // Signup contracts
  assert.ok(signupSrc.includes('api.signup'), 'FlowSignup must preserve api.signup call');
  assert.ok(signupSrc.includes('api.loginWithGoogle'), 'FlowSignup must preserve Google OAuth');
  assert.ok(signupSrc.includes('getPasswordStrength'), 'FlowSignup must preserve password validation');
});
