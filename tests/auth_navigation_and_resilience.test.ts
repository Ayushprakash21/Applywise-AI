import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Auth Resilience: 1. ErrorBoundary exists, is imported and wraps App in main.tsx', () => {
  assert.ok(fs.existsSync('src/components/ErrorBoundary.tsx'), 'ErrorBoundary component must exist');
  const mainSrc = fs.readFileSync('src/main.tsx', 'utf8');
  assert.ok(mainSrc.includes('ErrorBoundary'), 'main.tsx must import ErrorBoundary');
  assert.ok(mainSrc.includes('<ErrorBoundary>'), 'main.tsx must wrap <App /> in <ErrorBoundary>');
});

test('Auth Resilience: 2. FlowLogin isolates Google button container from React reconciliation', () => {
  const loginSrc = fs.readFileSync('src/components/FlowLogin.tsx', 'utf8');
  // Check that googleBtnRef container is empty and does not wrap React children
  const isolatedMount = /<div\s+ref=\{googleBtnRef\}\s+className=\{`[^`]*min-h-\[44px\][^`]*`\}\s*\/>/;
  assert.ok(isolatedMount.test(loginSrc), 'FlowLogin must mount Google script to empty container without React children');
  assert.ok(!loginSrc.includes('googleBtnRef}>\n                        {!googleButtonRendered'), 'React must not nest conditional children inside googleBtnRef');
});

test('Auth Resilience: 3. FlowSignup isolates Google button container from React reconciliation', () => {
  const signupSrc = fs.readFileSync('src/components/FlowSignup.tsx', 'utf8');
  const isolatedMount = /<div\s+ref=\{googleBtnRef\}\s+className=\{`[^`]*min-h-\[44px\][^`]*`\}\s*\/>/;
  assert.ok(isolatedMount.test(signupSrc), 'FlowSignup must mount Google script to empty container without React children');
  assert.ok(!signupSrc.includes('googleBtnRef}>\n                        {!googleButtonRendered'), 'React must not nest conditional children inside googleBtnRef');
});

test('Auth Resilience: 4. Google Auth rendering is wrapped in safe exception handler', () => {
  const gAuthSrc = fs.readFileSync('src/services/googleAuth.ts', 'utf8');
  assert.ok(gAuthSrc.includes('try {'), 'renderGoogleButton must include try-catch safety wrapper');
  assert.ok(gAuthSrc.includes('google.accounts.id.renderButton'), 'renderGoogleButton must call official GSI renderButton');
});

test('Auth Resilience: 5. NotFoundPage (404) exists and is registered in App.tsx routing', () => {
  assert.ok(fs.existsSync('src/components/NotFoundPage.tsx'), 'NotFoundPage component must exist');
  const appSrc = fs.readFileSync('src/App.tsx', 'utf8');
  assert.ok(appSrc.includes('NotFoundPage'), 'App.tsx must import and use NotFoundPage');
  assert.ok(appSrc.includes('!KNOWN_ROUTES.has(currentRoute)'), 'App.tsx must check for unknown routes');
});

test('Auth Resilience: 6. Protected routes redirect unauthenticated users to /login', () => {
  const appSrc = fs.readFileSync('src/App.tsx', 'utf8');
  assert.ok(appSrc.includes('PROTECTED_ROUTES'), 'App.tsx must define PROTECTED_ROUTES');
  assert.ok(appSrc.includes('navigateTo(\'/login\')'), 'App.tsx must navigate to /login for unauthenticated protected route access');
  assert.ok(appSrc.includes('PROTECTED_ROUTES.has(currentRoute)'), 'App.tsx must check PROTECTED_ROUTES in routing');
});

test('Auth Resilience: 7. Getting Started and Sign In buttons in LandingPage update routes correctly', () => {
  const landingSrc = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');
  assert.ok(landingSrc.includes('data-testid="getting-started-button"'), 'LandingPage must have getting-started-button testid');
  assert.ok(landingSrc.includes('data-testid="sign-in-button"'), 'LandingPage must have sign-in-button testid');
  assert.ok(landingSrc.includes('aria-label="Getting Started"'), 'LandingPage must have accessible label Getting Started');
  assert.ok(landingSrc.includes('aria-label="Sign In"'), 'LandingPage must have accessible label Sign In');

  const appSrc = fs.readFileSync('src/App.tsx', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(appSrc.includes("if (mode === 'signup') {\n              navigateTo('/signup');\n            } else {\n              navigateTo('/login');\n            }"), 'App.tsx LandingPage onOpenAuth must navigate to /signup and /login');
});

test('Auth Resilience: 8. Direct /login and /signup routes are declared without crashing', () => {
  const appSrc = fs.readFileSync('src/App.tsx', 'utf8');
  assert.ok(appSrc.includes("currentRoute === '/signup'"), 'App.tsx must support /signup');
  assert.ok(appSrc.includes("currentRoute === '/login'"), 'App.tsx must support /login');
  assert.ok(appSrc.includes("currentRoute === '/signin'"), 'App.tsx must support /signin alias');
  assert.ok(appSrc.includes("currentRoute === '/register'"), 'App.tsx must support /register alias');
});

test('Auth Resilience: 9. Route normalizer sanitizes trailing slashes and query strings', () => {
  const appSrc = fs.readFileSync('src/App.tsx', 'utf8');
  assert.ok(appSrc.includes('normalizePath'), 'App.tsx must define normalizePath');
  assert.ok(appSrc.includes("split('?')[0]"), 'normalizePath must strip query string');
  assert.ok(appSrc.includes("endsWith('/')"), 'normalizePath must strip trailing slash');
});

test('Auth Resilience: 10. Form validation displays human-readable error messages without blank screens', () => {
  const loginSrc = fs.readFileSync('src/components/FlowLogin.tsx', 'utf8');
  assert.ok(loginSrc.includes('Please enter a valid email address'), 'FlowLogin must validate email format');
  assert.ok(loginSrc.includes('Please enter your password'), 'FlowLogin must validate password presence');
  assert.ok(loginSrc.includes('<AlertCircle'), 'FlowLogin must render visible error box when error exists');

  const signupSrc = fs.readFileSync('src/components/FlowSignup.tsx', 'utf8');
  assert.ok(signupSrc.includes('Please enter your full name'), 'FlowSignup must validate full name');
  assert.ok(signupSrc.includes('Password must be at least 8 characters'), 'FlowSignup must validate min password length');
  assert.ok(signupSrc.includes('Passwords do not match'), 'FlowSignup must validate password match');
});

test('Auth Resilience: 11. ErrorBoundary safely displays fallback without exposing sensitive stacks to users', () => {
  const errBoundarySrc = fs.readFileSync('src/components/ErrorBoundary.tsx', 'utf8');
  assert.ok(errBoundarySrc.includes('Something went wrong'), 'ErrorBoundary must present comforting headline');
  assert.ok(errBoundarySrc.includes('Return to Home'), 'ErrorBoundary must provide home recovery button');
  assert.ok(errBoundarySrc.includes('Try Again'), 'ErrorBoundary must provide reload button');
  assert.ok(!errBoundarySrc.includes('error.stack'), 'ErrorBoundary must not dump raw stack traces directly into user-facing DOM');
});

test('Auth Resilience: 12. Password recovery mode exists and is recoverable inside login flow', () => {
  const loginSrc = fs.readFileSync('src/components/FlowLogin.tsx', 'utf8');
  assert.ok(loginSrc.includes('isForgotMode'), 'FlowLogin must support forgot password mode');
  assert.ok(loginSrc.includes('recoverPassword'), 'FlowLogin must connect to api.recoverPassword');
  assert.ok(loginSrc.includes('Return to sign in'), 'FlowLogin must allow returning to sign in');
});
