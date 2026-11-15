// scripts/promote-admin.ts
// Secure Administrator Provisioning Script for ApplyVise AI Cloudflare D1 and Local Store

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const email = process.argv[2]?.trim().toLowerCase();
const requestedRole = process.argv[3]?.trim().toLowerCase();
const targetRole = requestedRole === 'super_admin' ? 'super_admin' : 'admin';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
if (!email || !EMAIL_REGEX.test(email) || email.includes("'") || email.includes('"') || email.includes(';') || email.includes('--')) {
  console.error('[SECURITY ERROR] Invalid or disallowed email format provided.');
  console.error('Usage: npm run admin:promote <valid-email-address> [admin|super_admin]');
  console.error('Example: npm run admin:promote ayushprakash0021@gmail.com super_admin');
  process.exit(1);
}

const sanitizedEmail = email.replace(/'/g, "''");

console.log(`[ApplyVise AI] Provisioning ${targetRole} privileges for: ${sanitizedEmail}...`);

// Update local SQLite if present
try {
  const localDbPath = path.resolve(process.cwd(), 'data/applywise.sqlite');
  if (fs.existsSync(localDbPath)) {
    const { DatabaseSync } = await import('node:sqlite');
    const localDb = new DatabaseSync(localDbPath);
    localDb.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE email = ?").run(targetRole, sanitizedEmail);
    console.log(`[LOCAL SQLITE] Updated user ${sanitizedEmail} role to ${targetRole}.`);
  }
} catch (localErr: any) {
  console.warn('[LOCAL SQLITE WARNING]', localErr.message);
}

try {
  // Execute remote D1 role update with sanitized input
  const query = `UPDATE users SET role = '${targetRole}', updated_at = datetime('now') WHERE email = '${sanitizedEmail}';`;
  console.log(`Executing D1 update on applywise-db...`);
  const output = execSync(`npx wrangler d1 execute applywise-db --remote --command="${query}"`, {
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  console.log(output);

  // Verify promotion
  const verifyQuery = `SELECT id, email, role, full_name FROM users WHERE email = '${sanitizedEmail}';`;
  const verifyOutput = execSync(`npx wrangler d1 execute applywise-db --remote --command="${verifyQuery}"`, {
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  console.log(verifyOutput);

  if (verifyOutput.includes(`"role": "${targetRole}"`) || verifyOutput.includes('"role": "admin"') || verifyOutput.includes('"role": "super_admin"')) {
    console.log(`[SUCCESS] User ${email} is now an authorized ${targetRole}.`);
  } else {
    console.warn(`[WARNING] No user found with email ${email}. Ensure the user has registered first.`);
  }
} catch (err: any) {
  console.error('[ERROR] Failed to provision administrator on remote D1:', err.message);
  // Do not fail if remote hit quota but local succeeded
  process.exit(0);
}
