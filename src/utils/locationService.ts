import {
  searchLocations,
  getCountries,
  getStatesByCountry,
  getCitiesByState,
  parseLocationString,
  LocationSuggestion,
  LocationEntityType,
} from '../data/globalLocations.ts';
import { getPlatformOptionsCatalog } from '../data/platformOptions.ts';
import type { StructuredLocation, UserProfile, CareerPreferences } from '../types/index.ts';

const VALID_LOCATION_TYPES = new Set<LocationEntityType>(['city', 'region', 'country', 'remote']);

export function handleLocationSearchRequest(params: {
  q?: string | null;
  type?: string | null;
  countryCode?: string | null;
  includeRemote?: string | null;
  limit?: string | null;
}): { success: true; query: string; results: LocationSuggestion[]; total: number } {
  const query = String(params.q || '').slice(0, 120);
  const requestedTypes = String(params.type || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t): t is LocationEntityType => VALID_LOCATION_TYPES.has(t as LocationEntityType));
  const limitRaw = Number.parseInt(String(params.limit || '15'), 10);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 50)) : 15;
  const includeRemote =
    params.includeRemote === 'true' || params.includeRemote === '1' || requestedTypes.includes('remote');

  const results = searchLocations(query, {
    types: requestedTypes.length > 0 ? requestedTypes : undefined,
    countryCode: params.countryCode ? String(params.countryCode).trim() : undefined,
    includeRemote,
    limit,
  });

  return {
    success: true,
    query,
    results,
    total: results.length,
  };
}

export function handleCountriesRequest(includeRemote?: string | null) {
  const countries = getCountries({
    includeRemote: includeRemote === 'true' || includeRemote === '1',
  });
  return { success: true, countries, total: countries.length };
}

export function handleStatesRequest(countryParam?: string | null) {
  const country = String(countryParam || '').trim();
  const states = country ? getStatesByCountry(country) : [];
  return { success: true, country, states, total: states.length };
}

export function handleCitiesRequest(params: {
  country?: string | null;
  state?: string | null;
  q?: string | null;
}) {
  const country = String(params.country || '').trim();
  const state = params.state ? String(params.state).trim() : undefined;
  const q = params.q ? String(params.q).trim() : undefined;
  const cities = country ? getCitiesByState(country, state, q) : [];
  return { success: true, country, state: state || null, cities, total: cities.length };
}

export function handleOptionsCatalogRequest() {
  return {
    success: true,
    catalog: getPlatformOptionsCatalog(),
  };
}

export function normalizeProfileLocationUpdates(
  current: UserProfile,
  updates: Partial<UserProfile>
): UserProfile {
  const merged: UserProfile = {
    ...current,
    ...updates,
    masterResumeLastUpdated: new Date().toISOString(),
  };

  if (updates.structuredLocation && !updates.location) {
    merged.location = updates.structuredLocation.formattedAddress;
  } else if (typeof updates.location === 'string') {
    const trimmed = updates.location.trim();
    merged.location = trimmed;
    if (updates.structuredLocation) {
      merged.structuredLocation = updates.structuredLocation;
    } else if (!trimmed) {
      merged.structuredLocation = undefined;
    } else {
      const parsed = parseLocationString(trimmed);
      if (parsed) {
        merged.structuredLocation = parsed;
      } else if (
        merged.structuredLocation &&
        merged.structuredLocation.formattedAddress !== trimmed
      ) {
        // User edited to a custom location string that didn't match a structured record
        merged.structuredLocation = undefined;
      }
    }
  }

  return merged;
}

export function normalizePreferencesLocationUpdates(
  current: CareerPreferences,
  updates: Partial<CareerPreferences>
): CareerPreferences {
  const merged: CareerPreferences = { ...current, ...updates };

  if (Array.isArray(updates.targetStructuredLocations)) {
    const locs: StructuredLocation[] = updates.targetStructuredLocations;
    const derivedCountries = new Set(merged.targetCountries || []);
    const derivedCities = new Set(merged.targetCities || []);
    for (const loc of locs) {
      if (loc.country) derivedCountries.add(loc.country);
      if (loc.city) derivedCities.add(loc.city);
    }
    if (!updates.targetCountries) merged.targetCountries = Array.from(derivedCountries);
    if (!updates.targetCities) merged.targetCities = Array.from(derivedCities);
  }

  return merged;
}
