// src/utils/emailProviders.ts
// Least-Privilege Gmail & Microsoft Outlook OAuth 2.0 + Mail API Provider Abstraction
// Uses standard Web Fetch API so it executes cleanly in both Node.js and Cloudflare Workers.
// Real sending requires configured OAuth client credentials; automated tests use the MockEmailProviderAdapter.

import { EmailAccountProvider } from '../types/index.ts';

export const GMAIL_LEAST_PRIVILEGE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

export const OUTLOOK_LEAST_PRIVILEGE_SCOPES = [
  'offline_access',
  'User.Read',
  'Mail.Send',
  'Mail.Read',
];

export interface ProviderOAuthConfig {
  googleClientId?: string;
  googleClientSecret?: string;
  microsoftClientId?: string;
  microsoftClientSecret?: string;
  microsoftTenantId?: string;
}

export interface SendEmailPayload {
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  toName?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachment?: {
    fileName: string;
    mimeType: string;
    contentBase64: string;
  };
}

export interface SendEmailProviderResult {
  ok: boolean;
  provider: EmailAccountProvider | 'mock';
  providerMessageId?: string;
  providerThreadId?: string;
  acceptedAt?: string;
  error?: string;
  errorCode?: string;
}

export interface InboundReplyItem {
  providerMessageId: string;
  providerThreadId: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  receivedAt: string;
}

export interface OAuthTokenExchangeResult {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds: number;
  email: string;
  displayName?: string;
  scopes: string[];
}

export interface EmailProviderAdapter {
  provider: EmailAccountProvider;
  isConfigured(cfg: ProviderOAuthConfig): boolean;
  getAuthorizationUrl(params: { state: string; redirectUri: string; cfg: ProviderOAuthConfig }): string;
  exchangeCode(params: { code: string; redirectUri: string; cfg: ProviderOAuthConfig }): Promise<OAuthTokenExchangeResult>;
  refreshAccessToken(params: { refreshToken: string; cfg: ProviderOAuthConfig }): Promise<{ accessToken: string; refreshToken?: string; expiresInSeconds: number }>;
  revokeToken(token: string): Promise<boolean>;
  sendEmail(accessToken: string, payload: SendEmailPayload): Promise<SendEmailProviderResult>;
  fetchRepliesForThreads(accessToken: string, threadIds: string[], senderEmail: string): Promise<InboundReplyItem[]>;
}

function encodeBase64UrlUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Builds an RFC 2822 MIME message (with optional PDF/DOCX attachment) encoded as base64url for Gmail API.
 */
export function buildRfc2822MimeMessage(payload: SendEmailPayload): string {
  const safeSubject = payload.subject.replace(/[\r\n]+/g, ' ').trim();
  const boundary = `----=_ApplyVise_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const fromHeader = payload.fromName ? `"${payload.fromName.replace(/"/g, '')}" <${payload.fromEmail}>` : payload.fromEmail;
  const toHeader = payload.toName ? `"${payload.toName.replace(/"/g, '')}" <${payload.toEmail}>` : payload.toEmail;

  const lines: string[] = [
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    `Subject: ${safeSubject}`,
    'MIME-Version: 1.0',
  ];

  if (payload.attachment) {
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: 7bit');
    lines.push('');
    lines.push(payload.bodyText);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: ${payload.attachment.mimeType}; name="${payload.attachment.fileName}"`);
    lines.push('Content-Transfer-Encoding: base64');
    lines.push(`Content-Disposition: attachment; filename="${payload.attachment.fileName}"`);
    lines.push('');
    lines.push(payload.attachment.contentBase64.replace(/(.{76})/g, '$1\r\n'));
    lines.push(`--${boundary}--`);
  } else {
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push('');
    lines.push(payload.bodyText);
  }

  return encodeBase64UrlUtf8(lines.join('\r\n'));
}

export const gmailProviderAdapter: EmailProviderAdapter = {
  provider: 'gmail',

  isConfigured(cfg) {
    return Boolean(cfg.googleClientId && cfg.googleClientSecret && cfg.googleClientId.trim().length > 10);
  },

  getAuthorizationUrl({ state, redirectUri, cfg }) {
    if (!this.isConfigured(cfg)) {
      throw new Error('Google OAuth credentials (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET) are not configured.');
    }
    const qs = new URLSearchParams({
      client_id: cfg.googleClientId!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GMAIL_LEAST_PRIVILEGE_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${qs.toString()}`;
  },

  async exchangeCode({ code, redirectUri, cfg }) {
    if (!this.isConfigured(cfg)) {
      throw new Error('Google OAuth credentials are not configured.');
    }
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: cfg.googleClientId!,
        client_secret: cfg.googleClientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const data = (await resp.json()) as any;
    if (!resp.ok || !data.access_token) {
      throw new Error(data.error_description || data.error || 'Google OAuth code exchange failed.');
    }

    const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const userJson = (await userResp.json()) as any;
    if (!userResp.ok || !userJson.email) {
      throw new Error('Failed to retrieve Gmail account email address.');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresInSeconds: Number(data.expires_in || 3600),
      email: String(userJson.email).toLowerCase(),
      displayName: userJson.name || undefined,
      scopes: typeof data.scope === 'string' ? data.scope.split(' ') : GMAIL_LEAST_PRIVILEGE_SCOPES,
    };
  },

  async refreshAccessToken({ refreshToken, cfg }) {
    if (!this.isConfigured(cfg)) {
      throw new Error('Google OAuth credentials are not configured.');
    }
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: cfg.googleClientId!,
        client_secret: cfg.googleClientSecret!,
        grant_type: 'refresh_token',
      }),
    });
    const data = (await resp.json()) as any;
    if (!resp.ok || !data.access_token) {
      throw new Error(data.error_description || data.error || 'Failed to refresh Gmail access token.');
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresInSeconds: Number(data.expires_in || 3600),
    };
  },

  async revokeToken(token: string) {
    if (!token) return true;
    try {
      const resp = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST',
      });
      return resp.ok;
    } catch {
      return false;
    }
  },

  async sendEmail(accessToken: string, payload: SendEmailPayload): Promise<SendEmailProviderResult> {
    const raw = buildRfc2822MimeMessage(payload);
    const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });
    const data = (await resp.json()) as any;
    if (!resp.ok || !data.id) {
      return {
        ok: false,
        provider: 'gmail',
        error: data?.error?.message || `Gmail API returned HTTP ${resp.status}`,
        errorCode: String(resp.status),
      };
    }
    return {
      ok: true,
      provider: 'gmail',
      providerMessageId: String(data.id),
      providerThreadId: data.threadId ? String(data.threadId) : String(data.id),
      acceptedAt: new Date().toISOString(),
    };
  },

  async fetchRepliesForThreads(accessToken: string, threadIds: string[], senderEmail: string): Promise<InboundReplyItem[]> {
    const replies: InboundReplyItem[] = [];
    for (const threadId of threadIds.slice(0, 20)) {
      if (!threadId) continue;
      const resp = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=metadata`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!resp.ok) continue;
      const thread = (await resp.json()) as any;
      const messages = Array.isArray(thread.messages) ? thread.messages : [];
      for (const m of messages) {
        const headers: Array<{ name: string; value: string }> = m.payload?.headers || [];
        const fromHeader = headers.find((h) => h.name.toLowerCase() === 'from')?.value || '';
        const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '';
        if (fromHeader && !fromHeader.toLowerCase().includes(senderEmail.toLowerCase())) {
          replies.push({
            providerMessageId: String(m.id),
            providerThreadId: threadId,
            fromEmail: fromHeader,
            subject,
            snippet: String(m.snippet || ''),
            receivedAt: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : new Date().toISOString(),
          });
        }
      }
    }
    return replies;
  },
};

export const outlookProviderAdapter: EmailProviderAdapter = {
  provider: 'outlook',

  isConfigured(cfg) {
    return Boolean(cfg.microsoftClientId && cfg.microsoftClientSecret && cfg.microsoftClientId.trim().length > 10);
  },

  getAuthorizationUrl({ state, redirectUri, cfg }) {
    if (!this.isConfigured(cfg)) {
      throw new Error('Microsoft OAuth credentials (MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET) are not configured.');
    }
    const tenant = cfg.microsoftTenantId || 'common';
    const qs = new URLSearchParams({
      client_id: cfg.microsoftClientId!,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: OUTLOOK_LEAST_PRIVILEGE_SCOPES.join(' '),
      state,
    });
    return `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize?${qs.toString()}`;
  },

  async exchangeCode({ code, redirectUri, cfg }) {
    if (!this.isConfigured(cfg)) {
      throw new Error('Microsoft OAuth credentials are not configured.');
    }
    const tenant = cfg.microsoftTenantId || 'common';
    const resp = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.microsoftClientId!,
        client_secret: cfg.microsoftClientSecret!,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const data = (await resp.json()) as any;
    if (!resp.ok || !data.access_token) {
      throw new Error(data.error_description || data.error || 'Microsoft OAuth code exchange failed.');
    }

    const meResp = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const meJson = (await meResp.json()) as any;
    const email = String(meJson.mail || meJson.userPrincipalName || '').toLowerCase();
    if (!meResp.ok || !email) {
      throw new Error('Failed to retrieve Microsoft Outlook account email address.');
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresInSeconds: Number(data.expires_in || 3600),
      email,
      displayName: meJson.displayName || undefined,
      scopes: typeof data.scope === 'string' ? data.scope.split(' ') : OUTLOOK_LEAST_PRIVILEGE_SCOPES,
    };
  },

  async refreshAccessToken({ refreshToken, cfg }) {
    if (!this.isConfigured(cfg)) {
      throw new Error('Microsoft OAuth credentials are not configured.');
    }
    const tenant = cfg.microsoftTenantId || 'common';
    const resp = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.microsoftClientId!,
        client_secret: cfg.microsoftClientSecret!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = (await resp.json()) as any;
    if (!resp.ok || !data.access_token) {
      throw new Error(data.error_description || data.error || 'Failed to refresh Microsoft Outlook token.');
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresInSeconds: Number(data.expires_in || 3600),
    };
  },

  async revokeToken() {
    // Microsoft Graph tokens are revoked server-side via sign-out / enterprise admin; we purge stored tokens locally.
    return true;
  },

  async sendEmail(accessToken: string, payload: SendEmailPayload): Promise<SendEmailProviderResult> {
    // Use Graph draft -> send so we capture an immutable Graph Message ID and conversationId
    const draftPayload: any = {
      subject: payload.subject,
      body: {
        contentType: 'Text',
        content: payload.bodyText,
      },
      toRecipients: [
        {
          emailAddress: {
            address: payload.toEmail,
            name: payload.toName || payload.toEmail,
          },
        },
      ],
    };

    if (payload.attachment) {
      draftPayload.attachments = [
        {
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: payload.attachment.fileName,
          contentType: payload.attachment.mimeType,
          contentBytes: payload.attachment.contentBase64,
        },
      ];
    }

    const createResp = await fetch('https://graph.microsoft.com/v1.0/me/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(draftPayload),
    });
    const created = (await createResp.json()) as any;
    if (!createResp.ok || !created.id) {
      return {
        ok: false,
        provider: 'outlook',
        error: created?.error?.message || `Microsoft Graph returned HTTP ${createResp.status}`,
        errorCode: String(createResp.status),
      };
    }

    const sendResp = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(created.id)}/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!sendResp.ok) {
      const errData = (await sendResp.json().catch(() => ({}))) as any;
      return {
        ok: false,
        provider: 'outlook',
        error: errData?.error?.message || `Microsoft Graph send returned HTTP ${sendResp.status}`,
        errorCode: String(sendResp.status),
      };
    }

    return {
      ok: true,
      provider: 'outlook',
      providerMessageId: String(created.internetMessageId || created.id),
      providerThreadId: created.conversationId ? String(created.conversationId) : String(created.id),
      acceptedAt: new Date().toISOString(),
    };
  },

  async fetchRepliesForThreads(accessToken: string, threadIds: string[], senderEmail: string): Promise<InboundReplyItem[]> {
    const replies: InboundReplyItem[] = [];
    for (const convId of threadIds.slice(0, 20)) {
      if (!convId) continue;
      const filter = encodeURIComponent(`conversationId eq '${convId.replace(/'/g, "''")}'`);
      const resp = await fetch(`https://graph.microsoft.com/v1.0/me/messages?$filter=${filter}&$top=10`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!resp.ok) continue;
      const data = (await resp.json()) as any;
      for (const m of data.value || []) {
        const fromAddr = String(m.from?.emailAddress?.address || '').toLowerCase();
        if (fromAddr && fromAddr !== senderEmail.toLowerCase()) {
          replies.push({
            providerMessageId: String(m.internetMessageId || m.id),
            providerThreadId: convId,
            fromEmail: fromAddr,
            subject: String(m.subject || ''),
            snippet: String(m.bodyPreview || ''),
            receivedAt: m.receivedDateTime || new Date().toISOString(),
          });
        }
      }
    }
    return replies;
  },
};

// Mock Provider Registry strictly for automated tests (never enabled in production)
let activeMockAdapter: EmailProviderAdapter | null = null;

export function setTestMockEmailProvider(adapter: EmailProviderAdapter | null): void {
  if (adapter && typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    throw new Error('Mock email provider cannot be enabled in production.');
  }
  activeMockAdapter = adapter;
}

export function getEmailProviderAdapter(provider: EmailAccountProvider): EmailProviderAdapter {
  if (activeMockAdapter && (typeof process === 'undefined' || process.env?.NODE_ENV !== 'production')) {
    return activeMockAdapter;
  }
  return provider === 'outlook' ? outlookProviderAdapter : gmailProviderAdapter;
}
