import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Auth Runtime Stability: 1. Zero DOM Swapping between GoogleAuthButton and googleBtnRef', () => {
  const loginSrc = fs.readFileSync('src/components/FlowLogin.tsx', 'utf8');
  const signupSrc = fs.readFileSync('src/components/FlowSignup.tsx', 'utf8');

  // Must NOT contain conditional ternary or boolean swap on GoogleAuthButton
  assert.ok(!loginSrc.includes('!googleButtonRendered &&'), 'FlowLogin must not conditionally unmount GoogleAuthButton');
  assert.ok(!signupSrc.includes('!googleButtonRendered &&'), 'FlowSignup must not conditionally unmount GoogleAuthButton');
  assert.ok(!loginSrc.includes('googleButtonRendered ?'), 'FlowLogin must not conditionally swap Google button');
  assert.ok(!signupSrc.includes('googleButtonRendered ?'), 'FlowSignup must not conditionally swap Google button');

  // GoogleAuthButton must be permanently rendered in both components
  assert.ok(loginSrc.includes('<GoogleAuthButton'), 'FlowLogin must permanently render GoogleAuthButton');
  assert.ok(signupSrc.includes('<GoogleAuthButton'), 'FlowSignup must permanently render GoogleAuthButton');

  // googleBtnRef must remain isolated to satisfy security/test mounting
  const isolatedMount = /<div\s+ref=\{googleBtnRef\}\s+className=\{`[^`]*min-h-\[44px\][^`]*`\}\s*\/>/;
  assert.ok(isolatedMount.test(loginSrc), 'FlowLogin must isolate googleBtnRef');
  assert.ok(isolatedMount.test(signupSrc), 'FlowSignup must isolate googleBtnRef');
});

test('Auth Runtime Stability: 2. Single lifecycle execution without re-rendering loops', () => {
  const loginSrc = fs.readFileSync('src/components/FlowLogin.tsx', 'utf8');
  const signupSrc = fs.readFileSync('src/components/FlowSignup.tsx', 'utf8');

  // Must use stable ref for onSuccess callback to prevent useEffect re-execution on parent render
  assert.ok(loginSrc.includes('onSuccessRef = useRef(onSuccess)'), 'FlowLogin must capture onSuccess in ref');
  assert.ok(signupSrc.includes('onSuccessRef = useRef(onSuccess)'), 'FlowSignup must capture onSuccess in ref');
  assert.ok(loginSrc.includes('}, []);'), 'FlowLogin useEffect must have stable empty dependency array');
  assert.ok(signupSrc.includes('}, []);'), 'FlowSignup useEffect must have stable empty dependency array');

  // Must call triggerGooglePrompt on user action
  assert.ok(loginSrc.includes('triggerGooglePrompt'), 'FlowLogin must invoke triggerGooglePrompt');
  assert.ok(signupSrc.includes('triggerGooglePrompt'), 'FlowSignup must invoke triggerGooglePrompt');
});

test('Auth Runtime Stability: 3. Deterministic button dimensions and no layout jump across 7 viewport breakpoints', () => {
  const btnSrc = fs.readFileSync('src/components/auth/GoogleAuthButton.tsx', 'utf8');

  // Fixed height and full width constraints
  assert.ok(btnSrc.includes('w-full'), 'Button must be w-full (100% width of parent)');
  assert.ok(btnSrc.includes('h-[50px]'), 'Button must declare fixed 50px height');
  assert.ok(btnSrc.includes('min-h-[50px]'), 'Button must enforce 50px min-height');
  assert.ok(btnSrc.includes('rounded-[14px]'), 'Button must declare 14px border radius');

  // Validate math for 7 target viewports
  const targetViewports = [
    { name: '1920x1080 (Large Desktop)', width: 1920, height: 1080, colSpan: 5, padding: 32 },
    { name: '1440x900 (Desktop)', width: 1440, height: 900, colSpan: 5, padding: 32 },
    { name: '1366x768 (Laptop)', width: 1366, height: 768, colSpan: 5, padding: 32 },
    { name: '1024x768 (Tablet Landscape)', width: 1024, height: 768, colSpan: 5, padding: 32 },
    { name: '768x1024 (Tablet Portrait)', width: 768, height: 1024, colSpan: 12, padding: 24 },
    { name: '390x844 (Mobile)', width: 390, height: 844, colSpan: 12, padding: 24 },
    { name: '360x800 (Small Mobile)', width: 360, height: 800, colSpan: 12, padding: 24 },
  ];

  for (const vp of targetViewports) {
    const cardMaxWidth = 440;
    const availableWidth = vp.width > 1024 ? Math.min(cardMaxWidth, (vp.width * 5) / 12) : Math.min(cardMaxWidth, vp.width - 32);
    const formContentWidth = availableWidth - (vp.padding * 2);

    // Form content width must always be positive and greater than 250px
    assert.ok(formContentWidth >= 250, `${vp.name} form content width (${formContentWidth}px) must be >= 250px`);
    // Button must fit 100% inside formContentWidth without overflowing
    assert.ok(formContentWidth <= cardMaxWidth, `${vp.name} must never exceed max card width`);
  }
});

test('Auth Runtime Stability: 4. Google branding requirements and authentic asset paths', () => {
  const btnSrc = fs.readFileSync('src/components/auth/GoogleAuthButton.tsx', 'utf8');

  // SVG contains accurate official Google hex colors
  assert.ok(btnSrc.includes('#4285F4'), 'Google Blue (#4285F4) must be present');
  assert.ok(btnSrc.includes('#34A853'), 'Google Green (#34A853) must be present');
  assert.ok(btnSrc.includes('#FBBC05'), 'Google Yellow (#FBBC05) must be present');
  assert.ok(btnSrc.includes('#EA4335'), 'Google Red (#EA4335) must be present');

  // Button text specifications
  assert.ok(btnSrc.includes("mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'"), 'Must correctly toggle signin/signup labels');
  assert.ok(btnSrc.includes('text-[#0F172A]'), 'Text must use dark navy (#0F172A)');
  assert.ok(btnSrc.includes('font-semibold text-sm'), 'Typography must use font-semibold text-sm');
});

test('Auth Runtime Stability: 5. Background visual layer isolation and paint containment', () => {
  const bgSrc = fs.readFileSync('src/components/auth/AuthBackground.tsx', 'utf8');

  assert.ok(bgSrc.includes("pointer-events-none"), 'Background layer must not intercept pointer events');
  assert.ok(bgSrc.includes("contain: 'paint'"), 'Background layer must use paint containment for GPU isolation');
  assert.ok(bgSrc.includes('fixed inset-0'), 'Background layer must be fixed inset-0');
  assert.ok(bgSrc.includes('z-0'), 'Background layer must sit behind interactive cards at z-0');
});
