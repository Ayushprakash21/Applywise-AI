import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('AdminResumeManagement UI repair specifications check', () => {
  const filePath = path.resolve('src/components/AdminResumeManagement.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // 1. Theme hook import and usage
  assert.match(content, /import\s+\{\s*useTheme\s*\}\s+from\s+'\.\.\/context\/ThemeContext\.tsx'/);
  assert.match(content, /const\s+\{\s*isDark\s*\}\s*=\s*useTheme\(\)/);

  // 2. Light Mode & Dark Mode Table tokens
  // Light: Table header bg: #F3F7FC, text: #334155, border: #E2E8F0
  assert.match(content, /bg-\[#F3F7FC\]/);
  assert.match(content, /text-\[#334155\]/);
  assert.match(content, /border-\[#E2E8F0\]/);

  // Dark: Table header bg: #202C3D, text: #9FB1C8, border: #34445B
  assert.match(content, /dark:bg-\[#202C3D\]/);
  assert.match(content, /dark:text-\[#9FB1C8\]/);
  assert.match(content, /dark:border-\[#34445B\]/);

  // Table row backgrounds & Alternating rows:
  // Light: Even #FFFFFF, Odd #F8FAFC, Hover #EFF6FF
  assert.match(content, /bg-\[#FFFFFF\]\s+dark:bg-\[#182437\]/);
  assert.match(content, /bg-\[#F8FAFC\]\s+dark:bg-\[#1D2A3C\]/);
  assert.match(content, /hover:bg-\[#EFF6FF\]/);
  assert.match(content, /dark:hover:bg-\[#223147\]/);

  // Primary text, secondary text, metadata text
  // Light: Primary #101D30, Secondary #64748B, Metadata #475569
  assert.match(content, /text-\[#101D30\]/);
  assert.match(content, /text-\[#64748B\]/);
  assert.match(content, /text-\[#475569\]/);

  // Dark: Primary #F3F7FC, Secondary #B9C8DA, Metadata #9FB1C8
  assert.match(content, /dark:text-\[#F3F7FC\]/);
  assert.match(content, /dark:text-\[#B9C8DA\]/);
  assert.match(content, /dark:text-\[#9FB1C8\]/);

  // 3. Status Badges:
  // SUCCESS (green)
  assert.match(content, /bg-\[#DCFCE7\]\s+text-\[#15803D\]\s+border\s+border-\[#86EFAC\]/);
  // FAILED (red)
  assert.match(content, /bg-\[#FEE2E2\]\s+text-\[#B91C1C\]\s+border\s+border-\[#FCA5A5\]/);
  // PARTIAL (cyan)
  assert.match(content, /bg-\[#CFFAFE\]\s+text-\[#0E7490\]\s+border\s+border-\[#67E8F9\]/);
  // PENDING (amber)
  assert.match(content, /bg-\[#FEF3C7\]\s+text-\[#B45309\]\s+border\s+border-\[#FCD34D\]/);
  // PROCESSING / SCANNED (blue)
  assert.match(content, /bg-\[#DBEAFE\]\s+text-\[#1D4ED8\]\s+border\s+border-\[#93C5FD\]/);

  // 4. Six KPI Cards:
  assert.match(content, /Total Ingested/);
  assert.match(content, /Processed/);
  assert.match(content, /Extraction Failed/);
  assert.match(content, /Pending Queue/);
  assert.match(content, /Scanned \/ OCR/);
  assert.match(content, /Partial Extractions/);

  // 5. Action Buttons:
  // Inspect button styled cleanly
  assert.match(content, /bg-\[#2563EB\]\s+hover:bg-\[#1D4ED8\]/);
  assert.match(content, /<span>Inspect<\/span>/);
  // Reprocess button not disabled when active
  assert.match(content, /<span>\{isReprocessing \? 'Running\.\.\.' : 'Reprocess'\}<\/span>/);

  // 6. FilterSelect theme dynamic
  assert.match(content, /theme=\{isDark \? 'dark' : 'light'\}/);
});
