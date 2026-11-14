import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Branded 404 Page: GIF Preservation & Integrity', () => {
  const publicGifPath = path.resolve('public/assets/404_dribbble_1.gif');
  assert.ok(fs.existsSync(publicGifPath), 'Local 404 GIF asset must exist in public/assets');

  const stats = fs.statSync(publicGifPath);
  assert.equal(stats.size, 1373645, 'Original GIF exact byte count must be preserved (1,373,645 bytes)');

  const notFoundSource = fs.readFileSync(path.resolve('src/components/NotFoundPage.tsx'), 'utf-8');
  assert.ok(notFoundSource.includes('/assets/404_dribbble_1.gif'), 'NotFoundPage must reference the preserved local GIF asset');
  assert.ok(notFoundSource.includes('https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif'), 'NotFoundPage must provide fallback to the original Dribbble CDN GIF');
});

test('Branded 404 Page: BLACK ELITE Visual Theme & Copy Tokens', () => {
  const notFoundSource = fs.readFileSync(path.resolve('src/components/NotFoundPage.tsx'), 'utf-8');
  assert.ok(notFoundSource.includes('#08090B'), 'NotFoundPage must use BLACK ELITE main background (#08090B)');
  assert.ok(notFoundSource.includes('#13161B'), 'NotFoundPage must use surface color (#13161B)');
  assert.ok(notFoundSource.includes('#292D34'), 'NotFoundPage must use border color (#292D34)');
  assert.ok(notFoundSource.includes('#F0EEE9'), 'NotFoundPage must use primary text (#F0EEE9)');
  assert.ok(notFoundSource.includes('#B7B4AD'), 'NotFoundPage must use secondary text (#B7B4AD)');
  assert.ok(notFoundSource.includes('#C6A66A'), 'NotFoundPage must use Champagne gold accent (#C6A66A)');
  assert.ok(notFoundSource.includes('#E2C58A'), 'NotFoundPage must use Light gold accent (#E2C58A)');

  assert.ok(notFoundSource.includes('Looks like this opportunity took a wrong turn.'), 'Required primary copy must be present');
  assert.ok(notFoundSource.includes("The page you're looking for isn't available right now.") || notFoundSource.includes("The page you&apos;re looking for isn&apos;t available right now."), 'Required secondary copy must be present');
  assert.ok(notFoundSource.includes("Your career journey doesn't have to stop here.") || notFoundSource.includes("Your career journey doesn&apos;t have to stop here."), 'Required career journey copy must be present');
  assert.ok(notFoundSource.includes('Return to ApplyVise AI'), 'Primary button must be Return to ApplyVise AI');
  assert.ok(notFoundSource.includes('Explore Career Opportunities'), 'Secondary link must be Explore Career Opportunities');
});

test('Branded 404 Page: Routing & Integration in App.tsx', () => {
  const appSource = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');
  assert.ok(appSource.includes("'/404'"), 'App.tsx must register /404 as a known route');
  assert.ok(appSource.includes('currentRoute === \'/404\'') || appSource.includes('!KNOWN_ROUTES.has(currentRoute)'), 'App.tsx must route both unknown routes and explicit /404 to NotFoundPage');
  assert.ok(appSource.includes('onNavigateNotFound'), 'PricingPage in App.tsx must receive onNavigateNotFound handler');
});

test('Branded 404 Page: PricingPage 404 Checkout Handling', () => {
  const pricingSource = fs.readFileSync(path.resolve('src/components/PricingPage.tsx'), 'utf-8');
  assert.ok(pricingSource.includes('checkoutErr instanceof ApiError && checkoutErr.status === 404'), 'PricingPage must detect 404 ApiError on checkout creation');
  assert.ok(pricingSource.includes('onNavigateNotFound(planId, \'/api/subscription/razorpay/create-order\')'), 'PricingPage must navigate to 404 with planId and checkout destination when 404 occurs');
  assert.ok(pricingSource.includes('orderRes.success && (window as any).Razorpay'), 'Working checkout flow must be strictly preserved without unconditional 404 redirection');
});

test('Branded 404 Page: Responsive Layout & Mobile Constraint Guard', () => {
  const notFoundSource = fs.readFileSync(path.resolve('src/components/NotFoundPage.tsx'), 'utf-8');
  assert.ok(notFoundSource.includes('overflow-x-hidden'), 'Root container must prevent horizontal overflow');
  assert.ok(notFoundSource.includes('max-w-[680px]'), 'GIF container must have responsive max-width');
  assert.ok(notFoundSource.includes('h-[340px] sm:h-[400px]'), 'GIF container must adapt height on mobile (360px/390px) while preserving original 400px on desktop');
});
