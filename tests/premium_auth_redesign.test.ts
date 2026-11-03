import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Premium Auth Redesign: 1. AuthHeader component structure and contracts', () => {
  assert.ok(fs.existsSync('src/components/AuthHeader.tsx'), 'AuthHeader must exist');
  const src = fs.readFileSync('src/components/AuthHeader.tsx', 'utf8');

  // Must include BrandLogo on left
  assert.ok(src.includes('<BrandLogo'), 'AuthHeader must render BrandLogo');

  // Must include centered navigation links
  assert.ok(src.includes('Features'), 'Must include Features link');
  assert.ok(src.includes('How it Works'), 'Must include How it Works link');
  assert.ok(src.includes('Pricing'), 'Must include Pricing link');
  assert.ok(src.includes('Support'), 'Must include Support link');

  // Must include right-aligned auth switchers
  assert.ok(src.includes('Sign In'), 'Must include Sign In switcher');
  assert.ok(src.includes('Sign Up'), 'Must include Sign Up switcher');
  assert.ok(src.includes('activePage === \'login\''), 'Must highlight active login state');
  assert.ok(src.includes('activePage === \'signup\''), 'Must highlight active signup state');
});

test('Premium Auth Redesign: 2. AuthVisualCanvas 3D environment & graceful fallback', () => {
  assert.ok(fs.existsSync('src/components/AuthVisualCanvas.tsx'), 'AuthVisualCanvas must exist');
  const src = fs.readFileSync('src/components/AuthVisualCanvas.tsx', 'utf8');

  // WebGL & Reduced motion safety
  assert.ok(src.includes('prefers-reduced-motion'), 'Must check for reduced motion preference');
  assert.ok(src.includes('getContext(\'webgl\')'), 'Must detect WebGL capability');
  assert.ok(src.includes('Fallback Glass'), 'Must provide graceful fallback visual');

  // Three.js 3D elements
  assert.ok(src.includes('TorusKnotGeometry') || src.includes('Parametric'), 'Must sculpt organic curved glass geometry for sign in');
  assert.ok(src.includes('MeshPhysicalMaterial'), 'Must use transmission physical glass material');
  assert.ok(src.includes('CylinderGeometry'), 'Must model studio pedestal base');
  assert.ok(src.includes('TorusGeometry'), 'Must model illuminated orbital light rings');
  assert.ok(src.includes('mouse'), 'Must implement interactive pointer parallax');
  assert.ok(src.includes('cancelAnimationFrame'), 'Must cleanly dispose animation loop on unmount');
});

test('Premium Auth Redesign: 3. AuthFeatureCards communicates genuine ApplyVise AI features', () => {
  assert.ok(fs.existsSync('src/components/AuthFeatureCards.tsx'), 'AuthFeatureCards must exist');
  const src = fs.readFileSync('src/components/AuthFeatureCards.tsx', 'utf8');

  // Sign in highlights
  assert.ok(src.includes('Discover Real Jobs'), 'Sign in must feature Discover Real Jobs');
  assert.ok(src.includes('Tailor & Apply'), 'Sign in must feature Tailor & Apply');
  assert.ok(src.includes('Track Your Growth'), 'Sign in must feature Track Your Growth');

  // Sign up highlights
  assert.ok(src.includes('AI Resume Intelligence'), 'Sign up must feature AI Resume Intelligence');
  assert.ok(src.includes('Smart Job Matching'), 'Sign up must feature Smart Job Matching');
  assert.ok(src.includes('Verified Career Profile'), 'Sign up must feature Verified Career Profile');
});

test('Premium Auth Redesign: 4. FlowLogin satisfies glassmorphism and functional contracts', () => {
  const src = fs.readFileSync('src/components/FlowLogin.tsx', 'utf8');

  assert.ok(src.includes('AuthHeader'), 'FlowLogin must embed AuthHeader');
  assert.ok(src.includes('AuthVisualCanvas'), 'FlowLogin must embed 3D AuthVisualCanvas');
  assert.ok(src.includes('AuthFeatureCards'), 'FlowLogin must embed AuthFeatureCards');
  assert.ok(src.includes('#E9EEF6'), 'FlowLogin must use pearl-white brand background');
  assert.ok(src.includes('from-blue-600') && src.includes('to-[#8065F5]'), 'CTA must use Blue to Violet gradient');
  assert.ok(src.includes('Welcome Back'), 'Must display Welcome Back badge');
  assert.ok(src.includes('Sign In to ApplyVise AI'), 'Must display official page heading');
});

test('Premium Auth Redesign: 5. FlowSignup satisfies glassmorphism and functional contracts', () => {
  const src = fs.readFileSync('src/components/FlowSignup.tsx', 'utf8');

  assert.ok(src.includes('AuthHeader'), 'FlowSignup must embed AuthHeader');
  assert.ok(src.includes('AuthVisualCanvas'), 'FlowSignup must embed 3D AuthVisualCanvas');
  assert.ok(src.includes('AuthFeatureCards'), 'FlowSignup must embed AuthFeatureCards');
  assert.ok(src.includes('#E9EEF6'), 'FlowSignup must use pearl-white brand background');
  assert.ok(src.includes('from-blue-600') && src.includes('to-[#8065F5]'), 'CTA must use Blue to Violet gradient');
  assert.ok(src.includes('Get Started'), 'Must display Get Started badge');
  assert.ok(src.includes('Create Your Account'), 'Must display official page heading');
  assert.ok(src.includes('getPasswordStrength'), 'Must feature dynamic password strength indicator');
});
