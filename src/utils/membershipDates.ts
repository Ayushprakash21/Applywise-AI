// src/utils/membershipDates.ts
// Accurate UTC Calendar Date Arithmetic & Membership Expiry Calculations for ApplyVise AI

import { MembershipValidityType, MembershipStatus } from '../types/index.ts';

/**
 * Adds calendar months to a UTC Date, handling month-end clamping and leap years.
 * Prevents JavaScript Date rollover bugs (e.g., adding 6 months to Aug 31 becoming Mar 2/3 instead of Feb 28).
 *
 * Examples:
 * - 2026-08-31 + 6 months -> 2027-02-28
 * - 2023-08-31 + 6 months -> 2024-02-29 (2024 is a leap year)
 * - 2024-02-29 + 12 months -> 2025-02-28
 * - 2024-02-29 + 24 months -> 2026-02-28
 * - 2024-02-29 + 48 months -> 2028-02-29
 */
export function addCalendarMonthsUTC(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();

  const totalMonths = month + months;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;

  // Day 0 of next month gives the last valid day of targetMonth
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, daysInTargetMonth);

  return new Date(Date.UTC(targetYear, targetMonth, targetDay, hours, minutes, seconds, ms));
}

/**
 * Calculates the exact UTC expiration timestamp string based on activation date and validity type.
 * Returns null for lifetime memberships.
 */
export function calculateMembershipExpiry(
  startDate: Date | string,
  validityType: MembershipValidityType
): string | null {
  if (validityType === 'lifetime') {
    return null;
  }

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  if (isNaN(start.getTime())) {
    throw new Error('Invalid start date provided for membership calculation');
  }

  let monthsToAdd = 0;
  switch (validityType) {
    case '6_months':
      monthsToAdd = 6;
      break;
    case '12_months':
      monthsToAdd = 12;
      break;
    case '24_months':
      monthsToAdd = 24;
      break;
    default:
      throw new Error(`Unsupported validity type: ${validityType}`);
  }

  return addCalendarMonthsUTC(start, monthsToAdd).toISOString();
}

/**
 * Calculates remaining days until expiration from a given reference time (defaults to Date.now()).
 * Returns null for lifetime memberships.
 */
export function calculateRemainingDays(
  expiresAt: string | null,
  nowTime: number = Date.now()
): number | null {
  if (!expiresAt) return null;
  const expiryTime = new Date(expiresAt).getTime();
  if (isNaN(expiryTime)) return null;

  const diffMs = expiryTime - nowTime;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Computes deterministic user-facing membership status based on timestamps and grant status.
 */
export function deriveMembershipStatus(
  startsAt: string,
  expiresAt: string | null,
  rawStatus: string = 'active',
  nowTime: number = Date.now()
): MembershipStatus {
  if (rawStatus === 'suspended') return 'suspended';
  if (rawStatus === 'revoked') return 'revoked';

  if (!expiresAt) {
    return 'lifetime';
  }

  const startTime = new Date(startsAt).getTime();
  const expiryTime = new Date(expiresAt).getTime();

  if (nowTime < startTime) {
    return 'scheduled';
  }

  if (nowTime >= expiryTime) {
    return 'expired';
  }

  const remainingDays = Math.ceil((expiryTime - nowTime) / (1000 * 60 * 60 * 24));
  if (remainingDays <= 30) {
    return 'expiring_soon';
  }

  return 'active';
}
