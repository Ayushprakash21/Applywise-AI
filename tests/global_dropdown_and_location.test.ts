import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  searchLocations,
  getCountries,
  getStatesByCountry,
  getCitiesByState,
  parseLocationString,
  locationMatchesFilter,
} from '../src/data/globalLocations.ts';
import {
  handleLocationSearchRequest,
  handleCountriesRequest,
  handleStatesRequest,
  handleCitiesRequest,
  handleOptionsCatalogRequest,
  normalizeProfileLocationUpdates,
  normalizePreferencesLocationUpdates,
} from '../src/utils/locationService.ts';
import {
  SearchableSelect,
  MultiSelect,
  Autocomplete,
  LocationAutocomplete,
  CountrySelect,
  StateSelect,
  CitySelect,
  DateSelect,
  FilterSelect,
  AsyncSelect,
  computePopoverPlacement,
  resolveNextCascadingState,
} from '../src/components/ui/SelectSystem.tsx';
import workerApp from '../worker/index.ts';
import type { UserProfile, CareerPreferences } from '../src/types/index.ts';

test('Location search: typing "indore" surfaces Indore, Madhya Pradesh, India with structured fields', () => {
  const results = searchLocations('indore');
  assert.ok(results.length >= 1);
  const top = results[0];
  assert.equal(top.city, 'Indore');
  assert.equal(top.region, 'Madhya Pradesh');
  assert.equal(top.country, 'India');
  assert.equal(top.countryCode, 'IN');
  assert.equal(top.formattedAddress, 'Indore, Madhya Pradesh, India');
  assert.equal(top.locationType, 'city');
});

test('Location search: global cities, aliases, multi-token, diacritics, deduplication, and empty/zero states', () => {
  // Aliases & diacritics
  const bangalore = searchLocations('Bangalore');
  assert.equal(bangalore[0]?.city, 'Bengaluru');

  const munich = searchLocations('München');
  assert.equal(munich[0]?.city, 'Munich');
  assert.equal(munich[0]?.countryCode, 'DE');

  const saoPaulo = searchLocations('sao paulo');
  assert.equal(saoPaulo[0]?.city, 'Sao Paulo');

  // International hubs
  for (const [q, expectedCity] of [
    ['amsterdam', 'Amsterdam'],
    ['tokyo', 'Tokyo'],
    ['singapore', 'Singapore'],
    ['luxembourg', 'Luxembourg City'],
    ['san francisco', 'San Francisco'],
  ] as const) {
    const res = searchLocations(q);
    assert.ok(res.some((r) => r.city === expectedCity), `Expected ${expectedCity} for query "${q}"`);
  }

  // Multi-token partial matching
  const multi = searchLocations('indore india');
  assert.equal(multi[0]?.formattedAddress, 'Indore, Madhya Pradesh, India');

  // Deduplication guarantee
  const seen = new Set<string>();
  for (const r of searchLocations('new')) {
    assert.ok(!seen.has(r.formattedAddress), `Duplicate formattedAddress: ${r.formattedAddress}`);
    seen.add(r.formattedAddress);
  }

  // Zero results & empty query behavior
  assert.deepEqual(searchLocations('AtlantisNonExistent999'), []);
  const emptyWithRemote = searchLocations('', { includeRemote: true, limit: 5 });
  assert.equal(emptyWithRemote[0]?.locationType, 'remote');
});

test('Cascading Country -> State -> City dataset and stale state reset logic', () => {
  const countries = getCountries({ includeRemote: true });
  assert.ok(countries.length > 50);
  assert.equal(countries[0].code, 'REMOTE');
  assert.ok(countries.some((c) => c.code === 'IN' && c.name === 'India'));

  const indiaStates = getStatesByCountry('India');
  assert.ok(indiaStates.some((s) => s.name === 'Madhya Pradesh'));
  assert.ok(indiaStates.length >= 36);

  const mpCities = getCitiesByState('IN', 'Madhya Pradesh');
  assert.ok(mpCities.some((c) => c.name === 'Indore'));
  assert.ok(mpCities.some((c) => c.name === 'Bhopal'));

  // Stale reset when switching parent country
  const afterSwitch = resolveNextCascadingState('Germany', 'Madhya Pradesh', 'Indore');
  assert.deepEqual(afterSwitch, { state: '', city: '' });

  // Keeps valid state when valid
  const sameCountry = resolveNextCascadingState('India', 'Madhya Pradesh', 'Indore');
  assert.deepEqual(sameCountry, { state: 'Madhya Pradesh', city: 'Indore' });
});

test('Location filter matching handles country, city, structured string, and Remote Worldwide', () => {
  assert.equal(locationMatchesFilter('Indore, Madhya Pradesh, India', 'India', 'India'), true);
  assert.equal(locationMatchesFilter('Bengaluru, India', '', 'India'), true);
  assert.equal(locationMatchesFilter('Indore, India', 'India', 'Indore, Madhya Pradesh, India'), true);
  assert.equal(locationMatchesFilter('Berlin, Germany', 'Germany', 'India'), false);
  assert.equal(locationMatchesFilter('Remote - Worldwide', 'Remote', 'Remote Worldwide'), true);
  assert.equal(locationMatchesFilter('Berlin, Germany', 'Germany', 'All Locations'), true);
});

test('Location service handlers and Worker API routes return structured results & cache headers', async () => {
  const directSearch = handleLocationSearchRequest({ q: 'indore' });
  assert.equal(directSearch.success, true);
  assert.equal(directSearch.results[0]?.formattedAddress, 'Indore, Madhya Pradesh, India');

  assert.ok(handleCountriesRequest('true').countries.some((c) => c.code === 'IN'));
  assert.ok(handleStatesRequest('US').states.some((s) => s.name === 'California'));
  assert.ok(handleCitiesRequest({ country: 'India', state: 'Madhya Pradesh' }).cities.some((c) => c.name === 'Indore'));
  assert.ok(handleOptionsCatalogRequest().catalog.currencies.some((c) => c.value === 'INR'));

  // Test real Hono Worker endpoints via Worker fetch entrypoint
  const dummyCtx = { waitUntil: () => {}, passThroughOnException: () => {} } as any;
  const searchRes = await workerApp.fetch(new Request('http://localhost/api/locations/search?q=indore'), {} as any, dummyCtx);
  assert.equal(searchRes.status, 200);
  const searchJson: any = await searchRes.json();
  assert.equal(searchJson.success, true);
  assert.equal(searchJson.results[0].formattedAddress, 'Indore, Madhya Pradesh, India');

  const statesRes = await workerApp.fetch(new Request('http://localhost/api/locations/states?countryCode=IN'), {} as any, dummyCtx);
  assert.equal(statesRes.status, 200);
  const statesJson: any = await statesRes.json();
  assert.ok(statesJson.states.some((s: any) => s.name === 'Madhya Pradesh'));

  const catalogRes = await workerApp.fetch(new Request('http://localhost/api/options/catalog'), {} as any, dummyCtx);
  assert.equal(catalogRes.status, 200);
});

test('Profile and Preferences structuredLocation normalization preserves backward compatibility', () => {
  const baseProfile: UserProfile = {
    id: 'u1',
    fullName: 'Test Candidate',
    email: 'test@example.com',
    phone: '+91-9999999999',
    location: '',
    totalExperienceYears: 4,
    currentEmployer: 'Acme',
    currentTitle: 'Analyst',
    professionalSummary: 'Summary',
    education: [],
    certifications: [],
    skills: [],
    experiences: [],
  };

  // Explicit structured pick syncs location string
  const withStructured = normalizeProfileLocationUpdates(baseProfile, {
    structuredLocation: {
      city: 'Indore',
      region: 'Madhya Pradesh',
      country: 'India',
      countryCode: 'IN',
      formattedAddress: 'Indore, Madhya Pradesh, India',
      locationType: 'city',
    },
  });
  assert.equal(withStructured.location, 'Indore, Madhya Pradesh, India');
  assert.equal(withStructured.structuredLocation?.countryCode, 'IN');

  // Legacy plain string "Indore, India" auto-parses into structuredLocation
  const legacyParsed = normalizeProfileLocationUpdates(baseProfile, { location: 'Indore, India' });
  assert.equal(legacyParsed.structuredLocation?.formattedAddress, 'Indore, Madhya Pradesh, India');
  assert.equal(parseLocationString('Berlin, Germany')?.countryCode, 'DE');

  // Preferences sync derived countries & cities from targetStructuredLocations
  const basePrefs: CareerPreferences = {
    targetCountries: [],
    targetCities: [],
    preferredTitles: [],
    preferredIndustries: [],
    workArrangement: ['remote'],
    minSalaryByCurrency: {},
    preferredEmploymentType: ['full-time'],
    willingnessToRelocate: 'negotiable',
    visaSponsorshipRequired: false,
    preferredCompanies: [],
    excludedCompanies: [],
    excludedKeywords: [],
  };
  const updatedPrefs = normalizePreferencesLocationUpdates(basePrefs, {
    targetStructuredLocations: [
      {
        city: 'Indore',
        region: 'Madhya Pradesh',
        country: 'India',
        countryCode: 'IN',
        formattedAddress: 'Indore, Madhya Pradesh, India',
        locationType: 'city',
      },
    ],
  });
  assert.ok(updatedPrefs.targetCountries.includes('India'));
  assert.ok(updatedPrefs.targetCities.includes('Indore'));
});

test('Popover collision placement flips upward near viewport bottom and clamps horizontal overflow', () => {
  const below = computePopoverPlacement(
    { top: 100, bottom: 140, left: 20, width: 260 },
    { width: 1280, height: 800 },
    280
  );
  assert.equal(below.direction, 'down');
  assert.equal(below.top, 146);

  const flipUp = computePopoverPlacement(
    { top: 680, bottom: 720, left: 1150, width: 260 },
    { width: 1280, height: 800 },
    280
  );
  assert.equal(flipUp.direction, 'up');
  assert.ok(flipUp.left + flipUp.width <= 1270);
});

test('All 10 shared dropdown primitives render cleanly with ARIA roles and themes (light & black-elite)', () => {
  const noop = () => {};
  const html = renderToStaticMarkup(
    React.createElement(
      'div',
      null,
      React.createElement(SearchableSelect, {
        value: 'usd',
        onChange: noop,
        options: [{ value: 'usd', label: 'USD ($)' }],
        theme: 'black-elite',
        ariaLabel: 'Currency Select',
      }),
      React.createElement(FilterSelect, {
        value: 'all',
        onChange: noop,
        options: [{ value: 'all', label: 'All Items' }],
        theme: 'light',
      }),
      React.createElement(MultiSelect, {
        values: ['Technology'],
        onChange: noop,
        options: [{ value: 'Technology', label: 'Technology' }],
        theme: 'black-elite',
      }),
      React.createElement(Autocomplete, {
        value: 'React',
        onChange: noop,
        options: [{ value: 'React', label: 'React' }],
      }),
      React.createElement(LocationAutocomplete, {
        value: 'Indore, Madhya Pradesh, India',
        onChange: noop,
        theme: 'black-elite',
      }),
      React.createElement(CountrySelect, {
        value: 'India',
        onChange: noop,
      }),
      React.createElement(StateSelect, {
        country: '',
        value: '',
        onChange: noop,
      }),
      React.createElement(CitySelect, {
        country: 'India',
        state: 'Madhya Pradesh',
        value: 'Indore',
        onChange: noop,
      }),
      React.createElement(DateSelect, {
        value: '2024-09',
        onChange: noop,
        allowPresent: true,
      }),
      React.createElement(AsyncSelect, {
        value: '',
        onChange: noop,
        loadOptions: async () => [],
      })
    )
  );

  assert.ok(html.includes('role="combobox"'));
  assert.ok(html.includes('aria-haspopup="listbox"'));
  assert.ok(html.includes('USD ($)'));
  assert.ok(html.includes('Indore, Madhya Pradesh, India'));
  // Empty parent country disables StateSelect cleanly
  assert.ok(html.includes('Select country first...'));
});

test('UI inventory guard: zero raw native <select> tags remain in src/components', () => {
  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(full));
      else if (entry.name.endsWith('.tsx')) out.push(full);
    }
    return out;
  };
  const files = walk(join(process.cwd(), 'src', 'components'));
  const offenders: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    if (/<select\b/.test(src)) offenders.push(f);
  }
  assert.deepEqual(offenders, [], `Found native <select> elements in: ${offenders.join(', ')}`);
});
