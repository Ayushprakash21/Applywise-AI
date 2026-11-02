// scripts/promote-admin.ts
// Secure Administrator Provisioning Script for ApplyWise AI Cloudflare D1

import { execSync } from 'child_process';

const email = process.argv[2]?.trim().toLowerCase();

if (!email || !email.includes('@')) {
  console.error('Usage: npm run admin:promote <email-address>');
  console.error('Example: npm run admin:promote ayushprakash0021@gmail.com');
  process.exit(1);
}

console.log(`[ApplyWise AI] Provisioning administrator privileges for: ${email}...`);

try {
  // Execute remote D1 role update
  const query = `UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE email = '${email}';`;
  console.log(`Executing D1 update on applywise-db...`);
  const output = execSync(`npx wrangler d1 execute applywise-db --remote --command="${query}"`, {
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  console.log(output);

  // Verify promotion
  const verifyQuery = `SELECT id, email, role, full_name FROM users WHERE email = '${email}';`;
  const verifyOutput = execSync(`npx wrangler d1 execute applywise-db --remote --command="${verifyQuery}"`, {
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  console.log(verifyOutput);

  if (verifyOutput.includes('"role": "admin"')) {
    console.log(`[SUCCESS] User ${email} is now an authorized administrator.`);
  } else {
    console.warn(`[WARNING] No user found with email ${email}. Ensure the user has registered first.`);
  }
} catch (err: any) {
  console.error('[ERROR] Failed to provision administrator:', err.message);
  process.exit(1);
}
