import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('ApplyWise AI — Job Details View Centered Modal Redesign', async (t) => {
  const filePath = path.resolve('src/components/JobDetailDrawer.tsx');
  const src = fs.readFileSync(filePath, 'utf-8');

  await t.test('1. Modal is centered in viewport and no longer anchored as a right-side drawer', () => {
    // Must be centered horizontally and vertically
    assert.ok(
      src.includes('flex items-center justify-center'),
      'Modal wrapper must use flex items-center justify-center to center horizontally & vertically'
    );
    // Must NOT have justify-end which was anchoring to the right edge
    assert.ok(
      !src.includes('justify-end'),
      'Modal wrapper must not use justify-end (which anchored to right edge)'
    );
    // Must NOT have slide-in-from-right animation
    assert.ok(
      !src.includes('slide-in-from-right'),
      'Modal card must not use slide-in-from-right animation'
    );
  });

  await t.test('2. Modal card dimensions, rounded corners, shadows, and surfaces', () => {
    // Max width 1100-1200px
    assert.ok(
      src.includes('max-w-[1150px]'),
      'Modal card must have max-w-[1150px] (desktop 1100-1200px range)'
    );
    // Max height 88-90vh
    assert.ok(
      src.includes('max-h-[88vh]') || src.includes('sm:max-h-[88vh]'),
      'Modal card must have max-h-[88vh] (desktop 88-90vh range)'
    );
    // Rounded corners
    assert.ok(
      src.includes('rounded-2xl') && src.includes('sm:rounded-3xl'),
      'Modal card must feature rounded corners (rounded-2xl sm:rounded-3xl)'
    );
    // Subtle deep shadow
    assert.ok(
      src.includes('shadow-2xl'),
      'Modal card must feature shadow-2xl'
    );
    // Theme surfaces: light white and dark slate
    assert.ok(
      src.includes('bg-white dark:bg-[#161D2A]'),
      'Modal card must support clean white in light mode and deep slate #161D2A in dark mode'
    );
    // Overlay backdrop
    assert.ok(
      src.includes('bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs'),
      'Overlay must feature restrained dark overlay and backdrop blur'
    );
  });

  await t.test('3. Modal header structure: sticky top bar with Back, Bookmark, Share, Close', () => {
    assert.ok(
      src.includes('Back to Opportunities'),
      'Header must include Back to Opportunities navigation'
    );
    assert.ok(
      src.includes('sticky top-0') && src.includes('bg-white/95 dark:bg-[#161D2A]/95'),
      'Header must be sticky while content scrolls'
    );
    assert.ok(
      src.includes('Bookmark') && src.includes('Share2') && src.includes('X'),
      'Header must include Bookmark, Share, and Close actions'
    );
  });

  await t.test('4. Two-column desktop layout with left description and right overview cards', () => {
    assert.ok(
      src.includes('grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'),
      'Desktop layout must use 12-column responsive grid'
    );
    assert.ok(
      src.includes('lg:col-span-8'),
      'Left column must use lg:col-span-8 for Job Description (~68%)'
    );
    assert.ok(
      src.includes('Original Job Description'),
      'Left column must preserve Original Job Description'
    );
    assert.ok(
      src.includes('lg:col-span-4'),
      'Right column must use lg:col-span-4 (~32%)'
    );
    assert.ok(
      src.includes('Job Overview Details'),
      'Right column must include Job Overview Details'
    );
    assert.ok(
      src.includes('Company Profile'),
      'Right column must include Company Profile'
    );
    assert.ok(
      src.includes('Hiring Team & Outreach'),
      'Right column must include Hiring Team & Outreach'
    );
  });

  await t.test('5. Sticky bottom dock with View Original Listing, Assisted Apply, and Tailor & Apply', () => {
    assert.ok(
      src.includes('sticky bottom-0'),
      'Bottom dock must be sticky at the bottom of the modal card'
    );
    assert.ok(
      src.includes('View Original Listing'),
      'Bottom dock must include View Original Listing'
    );
    assert.ok(
      src.includes('Assisted Apply'),
      'Bottom dock must include Assisted Apply'
    );
    assert.ok(
      src.includes('Tailor & Apply'),
      'Bottom dock must include Tailor & Apply'
    );
  });

  await t.test('6. Scroll architecture and body scroll lock / ESC listeners', () => {
    assert.ok(
      src.includes('flex-1 overflow-y-auto min-h-0'),
      'Middle content must have its own scrollable area so bottom dock never overlaps content'
    );
    assert.ok(
      src.includes("document.body.style.overflow = 'hidden'"),
      'Must lock background body scroll while modal is active'
    );
    assert.ok(
      src.includes("e.key === 'Escape'"),
      'Must dismiss modal when Escape key is pressed'
    );
  });
});
