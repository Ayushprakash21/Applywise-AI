import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('APPLYVISE AI — Premium Global Search Bar Redesign Suite', () => {
  const searchBarPath = path.resolve('src/components/GlobalSearchBar.tsx');
  const shellPath = path.resolve('src/components/DashboardShell.tsx');
  const adminPath = path.resolve('src/components/AdminConsole.tsx');

  it('1. GlobalSearchBar component exists and provides clean TypeScript interface', () => {
    assert.ok(fs.existsSync(searchBarPath), 'GlobalSearchBar.tsx must exist');
    const src = fs.readFileSync(searchBarPath, 'utf8');

    assert.ok(src.includes('export interface GlobalSearchBarProps'), 'Must export GlobalSearchBarProps');
    assert.ok(src.includes('export const GlobalSearchBar'), 'Must export GlobalSearchBar component');
    assert.ok(src.includes('Search verified opportunities, skills, companies...'), 'Must provide canonical placeholder');
  });

  it('2. Integrated Keyboard Shortcut Indicator: Compact, palette-aware, and not an oversized generic button', () => {
    const src = fs.readFileSync(searchBarPath, 'utf8');

    // kbd element is used
    assert.ok(src.includes('<kbd'), 'Must use semantic <kbd> element');

    // Dynamic OS detection for Mac vs Windows/Linux
    assert.ok(
      src.includes("isMac ? '⌘ K' : 'Ctrl K'") || src.includes("isMac ? '⌘ K' : 'Ctrl K'"),
      'Must dynamically detect OS and render ⌘ K on Mac and Ctrl K on Windows/Linux'
    );

    // Muted background and palette-aware champagne accent
    assert.ok(src.includes('var(--be-accent-primary'), 'Shortcut must use palette-aware champagne accent');
    assert.ok(src.includes('var(--be-border-subtle'), 'Shortcut must use subtle palette border');
    assert.ok(src.includes('bg-white/[0.04]') || src.includes('rgba(255, 255, 255, 0.04)'), 'Must use refined muted semi-transparent background');

    // Compact typography and no bulky padding
    assert.ok(src.includes('text-[10px]'), 'Must use compact 10px typography');
    assert.ok(src.includes('px-1.5 py-0.5'), 'Must use restrained compact padding');

    // Does not have bulky button classes
    assert.ok(!src.includes('px-4 py-2.5 rounded-full flex items-center justify-between cursor-pointer <kbd'), 'Kbd must not be an oversized button');
  });

  it('3. Keyboard listeners: Global ⌘K / Ctrl+K shortcut and Escape dismissal', () => {
    const src = fs.readFileSync(searchBarPath, 'utf8');

    // Global keydown listener
    assert.ok(src.includes("e.key.toLowerCase() === 'k'"), 'Must detect K key press');
    assert.ok(src.includes('e.metaKey || e.ctrlKey'), 'Must handle Meta (⌘) or Control key');
    assert.ok(src.includes('inputRef.current?.focus()'), 'Must focus search input on shortcut trigger');

    // Escape listener
    assert.ok(src.includes("e.key === 'Escape'"), 'Must handle Escape to close search');
  });

  it('4. Autocomplete and instant discovery: Verified opportunities, skills, and arrow navigation', () => {
    const src = fs.readFileSync(searchBarPath, 'utf8');

    // Grounded suggestions categories
    assert.ok(src.includes('candidateSuggestions'), 'Must define grounded candidate suggestions');
    assert.ok(src.includes('filteredSuggestions'), 'Must filter suggestions dynamically on input');
    assert.ok(src.includes('ArrowDown') && src.includes('ArrowUp'), 'Must support keyboard arrow key navigation');
    assert.ok(src.includes('selectedIndex'), 'Must track selected item index');
  });

  it('5. Integration in DashboardShell: Desktop alignment, mobile drawer, and test preservation', () => {
    const shellSrc = fs.readFileSync(shellPath, 'utf8');

    // Search role and component integration
    assert.ok(shellSrc.includes('role="search"'), 'DashboardShell must declare role="search"');
    assert.ok(shellSrc.includes('<GlobalSearchBar'), 'DashboardShell must render GlobalSearchBar');
    assert.ok(shellSrc.includes('Search verified opportunities, skills, companies...'), 'Must preserve exact placeholder in DashboardShell');

    // Preserves ⌘K test expectation
    assert.ok(shellSrc.includes('⌘K'), 'DashboardShell must include ⌘K');
    assert.ok(shellSrc.includes('<kbd'), 'DashboardShell must include <kbd>');

    // Mobile responsive search toggle
    assert.ok(shellSrc.includes('mobileSearchOpen'), 'Must provide responsive mobile search toggle state');
    assert.ok(shellSrc.includes('Toggle mobile search'), 'Must provide mobile search button');
  });

  it('6. Consistency: AdminConsole embeds the same GlobalSearchBar interface', () => {
    const adminSrc = fs.readFileSync(adminPath, 'utf8');

    assert.ok(adminSrc.includes('<GlobalSearchBar'), 'AdminConsole must embed GlobalSearchBar');
    assert.ok(adminSrc.includes('isAdmin={true}'), 'AdminConsole must configure search for admin context');
  });

  it('7. Multi-theme & Curated Palettes Support (Ocean, Dune, Dusk, Silk, Aurora)', () => {
    const src = fs.readFileSync(searchBarPath, 'utf8');

    // CSS variables usage
    assert.ok(src.includes('var(--be-bg-input'), 'Must bind to --be-bg-input');
    assert.ok(src.includes('var(--be-border-subtle'), 'Must bind to --be-border-subtle');
    assert.ok(src.includes('var(--be-accent-primary'), 'Must bind to --be-accent-primary');
    assert.ok(src.includes('var(--be-text-primary'), 'Must bind to --be-text-primary');

    // Light mode styling
    assert.ok(src.includes('bg-white/80') || src.includes('bg-slate-100'), 'Must support light mode styling');
  });
});
