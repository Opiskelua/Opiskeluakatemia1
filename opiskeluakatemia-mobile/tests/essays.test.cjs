const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/lib/essays.ts');
const model = new Module(filename, module);
model.require = id => {
  if (id === './api') return { apiRequest: () => { throw new Error('Unexpected network request'); } };
  throw new Error(`Unexpected import: ${id}`);
};
model._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { essayCounts } = model.exports;

// YTL (EA grading instructions): spaces and line breaks are not counted; punctuation is.
test('essay counts exclude only whitespace; punctuation counts like in the YO exam', () => {
  assert.deepEqual(essayCounts('Sun shines.\nNext lesson!'), { charCount: 21, wordCount: 4 });
  assert.deepEqual(essayCounts('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'), { charCount: 52, wordCount: 1 });
  assert.deepEqual(essayCounts('.,/#!$%^&*;:{}=-_`~()?'), { charCount: 22, wordCount: 1 });
});

test('essay words split on spaces, tabs, newlines and Unicode whitespace', () => {
  assert.deepEqual(essayCounts('  one\ttwo\r\nthree\u00a0four  '), { charCount: 15, wordCount: 4 });
  assert.deepEqual(essayCounts(' \t\r\n\u00a0'), { charCount: 0, wordCount: 0 });
  assert.deepEqual(essayCounts(''), { charCount: 0, wordCount: 0 });
});

test('essay eligibility uses 700 counted characters independently of spacing', () => {
  assert.equal(essayCounts('n'.repeat(699)).charCount, 699);
  assert.equal(essayCounts('n'.repeat(700)).charCount, 700);
  assert.deepEqual(essayCounts('Sun shines!\n'.repeat(70)), { charCount: 700, wordCount: 140 });
});

test('essay limits match the YO exam: 700 minimum, 1300 maximum', () => {
  const { ESSAY_MIN_CHARS, ESSAY_MAX_CHARS } = model.exports;
  assert.equal(ESSAY_MIN_CHARS, 700);
  assert.equal(ESSAY_MAX_CHARS, 1300);
  assert.equal(essayCounts('word, '.repeat(260)).charCount, 1300);
});
