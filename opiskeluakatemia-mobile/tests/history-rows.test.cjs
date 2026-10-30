const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const source = path.resolve(__dirname, '../src/lib/history-rows.ts');
const loaded = new Module(source, module);
loaded._compile(ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, source);
const { formatAttemptDate, historyRow, averagePercentage } = loaded.exports;
const TZ = 'Europe/Helsinki';
const attempt = (over = {}) => ({ id: '1', exercise_id: 'grammar-synonym', exercise_title: 'Synonyymit', total_score: 7, max_score: 10, score_percentage: 70, submitted_at: '2026-10-30T09:05:00Z', category: 'grammar', ...over });

test('attempt dates are Finnish local time and never "Invalid Date"', () => {
  assert.equal(formatAttemptDate('2026-10-30T09:05:00Z', TZ), '30.10.2026 klo 11.05');
  assert.equal(formatAttemptDate('2026-07-01T21:30:00Z', TZ), '2.7.2026 klo 00.30'); // summer time, crosses midnight
  for (const bad of ['', 'not a date', undefined, null]) assert.equal(formatAttemptDate(bad, TZ), '');
});

test('history rows carry badge, score and a spoken label with the date', () => {
  assert.deepEqual(historyRow(attempt(), TZ), {
    key: 'grammar-1', badge: 'K', title: 'Synonyymit', subtitle: 'Kielioppi · 30.10.2026 klo 11.05', trailing: '7/10',
    label: 'Synonyymit, Kielioppi, 30.10.2026 klo 11.05, 7 / 10 pistettä',
  });
  const reading = historyRow(attempt({ category: 'reading', id: '1' }), TZ);
  assert.equal(reading.key, 'reading-1'); // same id in another category stays unique
  assert.equal(reading.badge, 'L');
});

test('history rows degrade gracefully on missing fields', () => {
  const row = historyRow(attempt({ exercise_title: '', submitted_at: 'garbage', total_score: null, max_score: undefined }), TZ);
  assert.equal(row.title, 'grammar-synonym');
  assert.equal(row.subtitle, 'Kielioppi');
  assert.equal(row.trailing, '0/0');
  assert.equal(row.label, 'grammar-synonym, Kielioppi, 0 / 0 pistettä');
  assert.equal(historyRow(attempt({ exercise_title: '', exercise_id: '' }), TZ).title, 'Harjoitus');
});

test('average percentage ignores non-numeric values and handles no rows', () => {
  assert.equal(averagePercentage([]), 0);
  assert.equal(averagePercentage([{ score_percentage: 50 }, { score_percentage: '100' }]), 75);
  assert.equal(averagePercentage([{ score_percentage: 'n/a' }, { score_percentage: 80 }]), 40);
});
