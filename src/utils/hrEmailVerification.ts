// src/utils/hrEmailVerification.ts
// 8-Step HR Email Verification Pipeline
// Strictly distinguishes Domain MX validation from Mailbox Confirmation.

import { EmailVerificationStatus } from '../types/index.ts';

export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.info',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'yopmail.com',
  'sharklasers.com',
  'trashmail.com',
  'getnada.com',
  'maildrop.cc',
  'dispostable.com',
  'fakeinbox.com',
  'mintemail.com',
  'emailondeck.com',
  'mohmal.com',
]);

export const ROLE_BASED_LOCAL_PREFIXES = new Set([
  'careers',
  'career',
  'jobs',
  'job',
  'hr',
  'recruiting',
  'recruitment',
  'talent',
  'talentacquisition',
  'talent-acquisition',
  'hiring',
  'people',
  'peopleops',
  'people-ops',
  'apply',
  'applications',
  'info',
  'contact',
  'hello',
  'support',
  'admin',
  'office',
  'team',
  'noreply',
  'no-reply',
  'do-not-reply',
]);

export const RESERVED_INVALID_TLDS = [
  '.localhost',
  '.local',
  '.internal',
  '.test',
  '.example',
  '.invalid',
  '.home',
  '.corp',
  '.lan',
];

export interface EmailVerificationInput {
  email: string;
  sourceUrl?: string;
  evidence?: string;
  lastVerifiedAt?: string;
  externalDeliverabilityConfirmed?: boolean;
}

export interface EmailVerificationResult {
  normalizedEmail: string;
  syntaxValid: boolean;
  domainValid: boolean;
  mxValid: boolean | null; // null if lookup failed/unavailable
  mxHosts: string[];
  isDisposable: boolean;
  isRoleBased: boolean;
  hasPublicEvidence: boolean;
  isStale: boolean;
  status: EmailVerificationStatus;
  reasons: string[];
  checkedAt: string;
}

export type MxResolverFn = (domain: string) => Promise<{ ok: boolean; hosts: string[]; error?: string }>;

/**
 * Default DNS-over-HTTPS MX resolver (compatible with Cloudflare Workers & Node fetch).
 */
export const dohMxResolver: MxResolverFn = async (domain: string) => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { Accept: 'application/dns-json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) {
      return { ok: false, hosts: [], error: `DoH HTTP ${resp.status}` };
    }
    const json = (await resp.json()) as { Status?: number; Answer?: Array<{ type: number; data: string }> };
    if (json.Status === 3) {
      // NXDOMAIN
      return { ok: false, hosts: [], error: 'NXDOMAIN: Domain does not exist' };
    }
    const hosts = (json.Answer || [])
      .filter((a) => a.type === 15 && typeof a.data === 'string')
      .map((a) => a.data.split(/\s+/).pop()?.replace(/\.$/, '') || '')
      .filter(Boolean);
    return { ok: hosts.length > 0, hosts };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, hosts: [], error: msg };
  }
};

export function validateEmailSyntax(email: string): { valid: boolean; normalized: string; local: string; domain: string; reason?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, normalized: '', local: '', domain: '', reason: 'Email is missing.' };
  }
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254) {
    return { valid: false, normalized, local: '', domain: '', reason: 'Email exceeds RFC 254 character limit.' };
  }
  if (/[\s\r\n<>()[\]\\,;:]/.test(normalized)) {
    return { valid: false, normalized, local: '', domain: '', reason: 'Email contains whitespace or illegal characters.' };
  }
  const atParts = normalized.split('@');
  if (atParts.length !== 2) {
    return { valid: false, normalized, local: '', domain: '', reason: 'Email must contain exactly one @ symbol.' };
  }
  const [local, domain] = atParts;
  if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return { valid: false, normalized, local, domain, reason: 'Invalid email local part.' };
  }
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) {
    return { valid: false, normalized, local, domain, reason: 'Invalid characters in email local part.' };
  }
  if (!domain || domain.length > 253 || !domain.includes('.') || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return { valid: false, normalized, local, domain, reason: 'Invalid email domain format.' };
  }
  const labels = domain.split('.');
  const tld = labels[labels.length - 1];
  if (!tld || tld.length < 2 || !/^[a-z]{2,24}$/.test(tld)) {
    return { valid: false, normalized, local, domain, reason: 'Invalid top-level domain.' };
  }
  for (const label of labels) {
    if (!label || label.length > 63 || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label)) {
      return { valid: false, normalized, local, domain, reason: `Malformed domain label "${label}".` };
    }
  }
  return { valid: true, normalized, local, domain };
}

export function isRoleBasedEmailAddress(localPart: string): boolean {
  const clean = localPart.toLowerCase().trim().split('+')[0];
  return ROLE_BASED_LOCAL_PREFIXES.has(clean);
}

export function isStaleVerification(lastVerifiedAt?: string, maxAgeDays = 30): boolean {
  if (!lastVerifiedAt) return false;
  const parsed = Date.parse(lastVerifiedAt);
  if (Number.isNaN(parsed)) return true;
  const ageMs = Date.now() - parsed;
  return ageMs > maxAgeDays * 24 * 60 * 60 * 1000;
}

/**
 * Executes the complete 8-step verification pipeline.
 * IMPORTANT: Never elevates a domain-level MX check to "Verified" unless explicit external mailbox/reply confirmation exists.
 */
export async function runEmailVerificationPipeline(
  input: EmailVerificationInput,
  mxResolver: MxResolverFn = dohMxResolver
): Promise<EmailVerificationResult> {
  const checkedAt = new Date().toISOString();
  const reasons: string[] = [];

  // Step 1: Syntax validation
  const syntax = validateEmailSyntax(input.email);
  if (!syntax.valid) {
    return {
      normalizedEmail: syntax.normalized,
      syntaxValid: false,
      domainValid: false,
      mxValid: null,
      mxHosts: [],
      isDisposable: false,
      isRoleBased: false,
      hasPublicEvidence: false,
      isStale: false,
      status: 'Invalid',
      reasons: [syntax.reason || 'Failed syntax validation.'],
      checkedAt,
    };
  }

  // Step 2: Domain validation
  const isReservedDomain =
    syntax.domain === 'localhost' || RESERVED_INVALID_TLDS.some((tld) => syntax.domain.endsWith(tld));
  if (isReservedDomain) {
    reasons.push(`Domain "${syntax.domain}" is reserved or non-routable.`);
    return {
      normalizedEmail: syntax.normalized,
      syntaxValid: true,
      domainValid: false,
      mxValid: false,
      mxHosts: [],
      isDisposable: false,
      isRoleBased: isRoleBasedEmailAddress(syntax.local),
      hasPublicEvidence: Boolean(input.sourceUrl && input.evidence),
      isStale: false,
      status: 'Invalid',
      reasons,
      checkedAt,
    };
  }

  // Step 4: Disposable email detection
  const isDisposable = DISPOSABLE_EMAIL_DOMAINS.has(syntax.domain);
  if (isDisposable) {
    reasons.push(`Domain "${syntax.domain}" is a disposable/temporary email provider.`);
    return {
      normalizedEmail: syntax.normalized,
      syntaxValid: true,
      domainValid: false,
      mxValid: null,
      mxHosts: [],
      isDisposable: true,
      isRoleBased: isRoleBasedEmailAddress(syntax.local),
      hasPublicEvidence: Boolean(input.sourceUrl && input.evidence),
      isStale: false,
      status: 'Invalid',
      reasons,
      checkedAt,
    };
  }

  // Reject no-reply mailboxes for HR outreach
  if (['noreply', 'no-reply', 'do-not-reply', 'donotreply'].includes(syntax.local)) {
    reasons.push('Address is an unmonitored no-reply mailbox.');
    return {
      normalizedEmail: syntax.normalized,
      syntaxValid: true,
      domainValid: true,
      mxValid: null,
      mxHosts: [],
      isDisposable: false,
      isRoleBased: true,
      hasPublicEvidence: Boolean(input.sourceUrl && input.evidence),
      isStale: false,
      status: 'Invalid',
      reasons,
      checkedAt,
    };
  }

  // Step 5: Role-based address classification
  const isRoleBased = isRoleBasedEmailAddress(syntax.local);
  if (isRoleBased) {
    reasons.push(`Role-based recruitment inbox detected ("${syntax.local}@").`);
  }

  // Step 6: Public-source evidence validation
  const hasPublicEvidence = Boolean(
    input.sourceUrl &&
      input.sourceUrl.startsWith('http') &&
      input.evidence &&
      input.evidence.trim().length >= 8
  );
  if (!hasPublicEvidence) {
    reasons.push('Limited public source attribution evidence.');
  }

  // Step 8: Freshness tracking
  const stale = isStaleVerification(input.lastVerifiedAt);
  if (stale) {
    reasons.push('Verification timestamp exceeds 30-day freshness window.');
  }

  // Step 3: MX record validation
  const mxRes = await mxResolver(syntax.domain);
  if (!mxRes.ok) {
    if (mxRes.error?.includes('NXDOMAIN')) {
      reasons.push(mxRes.error);
      return {
        normalizedEmail: syntax.normalized,
        syntaxValid: true,
        domainValid: false,
        mxValid: false,
        mxHosts: [],
        isDisposable: false,
        isRoleBased,
        hasPublicEvidence,
        isStale: stale,
        status: 'Invalid',
        reasons,
        checkedAt,
      };
    }

    reasons.push(mxRes.error || 'No valid MX mail exchange records returned for domain.');
    return {
      normalizedEmail: syntax.normalized,
      syntaxValid: true,
      domainValid: true,
      mxValid: false,
      mxHosts: [],
      isDisposable: false,
      isRoleBased,
      hasPublicEvidence,
      isStale: stale,
      status: mxRes.error ? 'Verification Failed' : 'Invalid',
      reasons,
      checkedAt,
    };
  }

  reasons.push(`MX records confirmed (${mxRes.hosts.slice(0, 2).join(', ')}). Note: MX confirms domain mail acceptance, not individual mailbox existence.`);

  let finalStatus: EmailVerificationStatus;
  if (input.externalDeliverabilityConfirmed) {
    finalStatus = 'Verified';
    reasons.push('Deliverability or direct reply confirmed.');
  } else if (isRoleBased) {
    finalStatus = 'Role-Based';
  } else if (hasPublicEvidence) {
    finalStatus = 'Domain Valid';
  } else {
    finalStatus = 'Unverified';
  }

  return {
    normalizedEmail: syntax.normalized,
    syntaxValid: true,
    domainValid: true,
    mxValid: true,
    mxHosts: mxRes.hosts,
    isDisposable: false,
    isRoleBased,
    hasPublicEvidence,
    isStale: stale,
    status: finalStatus,
    reasons,
    checkedAt,
  };
}
