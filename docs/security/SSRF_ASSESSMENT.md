# APPLYVISE AI — SERVER-SIDE REQUEST FORGERY (SSRF) ASSESSMENT

**Scope:** URL Import, Job Scrapers, Webhook Handlers, and External HTTP Requests  
**Runtime:** Node.js (`server/jobImportEngine.ts`) and Cloudflare Workers (`worker/jobImportEngine.ts`)  
**Verdict:** **SECURE — COMPREHENSIVE SSRF DEFENSE ACTIVE**

---

## 1. SSRF ATTACK VECTORS EVALUATED

1. **Cloud Metadata Services:**
   - AWS / GCP / Azure Instance Metadata endpoint (`http://169.254.169.254/latest/meta-data/`).
   - DigitalOcean metadata (`http://169.254.169.254/metadata/v1/`).
2. **Loopback & Local Interface Exploitation:**
   - `http://127.0.0.1`, `http://localhost`, `http://0.0.0.0`, `http://[::1]`.
3. **Private Subnet Pivoting (RFC 1918 & RFC 4193):**
   - Class A: `10.0.0.0/8`
   - Class B: `172.16.0.0/12`
   - Class C: `192.168.0.0/16`
   - Carrier Grade NAT: `100.64.0.0/10`
   - IPv6 link-local: `fe80::/10`
4. **Dangerous URI Schemes:**
   - `file:///`, `gopher://`, `ftp://`, `data:`, `ldap://`.
5. **Redirect-Based SSRF Bypasses:**
   - External public URL redirecting to private IP or cloud metadata.

---

## 2. DEFENSIVE ARCHITECTURE: `validateSafePublicUrl`

All external URL ingestion flows must pass through `validateSafePublicUrl`:

```typescript
export async function validateSafePublicUrl(urlStr: string): Promise<{
  safe: boolean;
  canonicalUrl: string;
  sourceDomain: string;
  error?: string;
}> {
  const norm = normalizeJobUrl(urlStr);
  if (!norm.valid) {
    return { safe: false, canonicalUrl: '', sourceDomain: '', error: norm.error };
  }

  const hostname = norm.hostname;

  // 1. Block local hostnames & special suffixes
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.corp')
  ) {
    return { safe: false, canonicalUrl: '', sourceDomain: '', error: 'Internal hostnames not permitted' };
  }

  // 2. Block IP literals (IPv4 & IPv6) matching private/loopback/cloud metadata
  const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipMatch) {
    const [_, a, b, c, d] = ipMatch.map(Number);
    if (
      a === 127 || // Loopback
      a === 10 ||  // Class A
      (a === 172 && b >= 16 && b <= 31) || // Class B
      (a === 192 && b === 168) || // Class C
      (a === 169 && b === 254) || // Link-local / Cloud metadata (169.254.169.254)
      a === 0 || a >= 224 // Reserved / Broadcast
    ) {
      return { safe: false, canonicalUrl: '', sourceDomain: '', error: 'Private or reserved IP addresses not permitted' };
    }
  }

  // 3. Allowed schemes restricted strictly to http and https
  if (norm.protocol !== 'http:' && norm.protocol !== 'https:') {
    return { safe: false, canonicalUrl: '', sourceDomain: '', error: 'Protocol must be HTTP or HTTPS' };
  }

  // 4. Ports restricted strictly to standard web ports (80, 443)
  if (norm.port && norm.port !== '80' && norm.port !== '443') {
    return { safe: false, canonicalUrl: '', sourceDomain: '', error: 'Non-standard ports are disallowed' };
  }

  return { safe: true, canonicalUrl: norm.canonicalUrl, sourceDomain: norm.hostname };
}
```

### Redirect Safety
When fetching content, `redirect: 'manual'` is enforced. Every hop is inspected with `validateSafePublicUrl` before following, preventing open redirect SSRF attacks.
