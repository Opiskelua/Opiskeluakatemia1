const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '../../opiskeluakatemia/src', file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = new Module(filename, module);
  const requireFrom = Module.createRequire(filename);
  mod.require = id => Object.hasOwn(mocks, id) ? mocks[id] : requireFrom(id);
  mod._compile(compiled, filename);
  return mod.exports;
}
const response = { 'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } } };
test('course content access fails closed on denial and database outage', async () => {
  for (const [data, error, status] of [[false, null, 403], [true, { code: 'offline' }, 503], [null, null, 403], [true, null, 200]]) {
    const calls = [];
    const auth = { success: true, user: { id: 'owner' }, serviceClient: { rpc: async (...args) => { calls.push(args); return { data, error }; } } };
    const { requireCourseAccess } = load('lib/require-course-access.ts', { ...response, './apiAuth': { requireAuth: async () => auth } });
    const result = await requireCourseAccess({});
    assert.equal(result.success ? 200 : result.response.status, status);
    assert.deepEqual(calls[0], ['has_active_course_access', { input_user_id: 'owner', input_course_type: 'abikurssi' }]);
  }
});
test('course pack install meets shared database constraints and retries reuse IDs', async () => {
  const writes = [];
  const auth = { success: true, user: { id: 'owner' }, serviceClient: { from: table => ({ upsert: async (rows, options) => { writes.push({ table, rows, options }); return { error: null }; } }) } };
  const { POST } = load('app/api/abikurssi/flashcards/route.ts', {
    ...response,
    '@/lib/require-course-access': { requireCourseAccess: async () => auth },
    '@/data/course-flashcards': { INITIAL_DECKS: [{ id: 'verbs', title: 'Verbit' }], COURSE_CARDS: { verbs: [{ id: 'one', front: 'go', back: 'mennä' }] } },
    '@/lib/course-srs': load('lib/course-srs.ts'),
  });
  for (let i = 0; i < 2; i++) assert.equal((await POST({ json: async () => ({ action: 'install', templateId: 'verbs' }) })).status, 200);
  const deck = writes[0].rows;
  assert.equal(deck.user_id, 'owner');
  assert.equal(deck.source_text.trim(), 'abikurssi:verbs');
  assert.ok(deck.source_text.length >= 100 && deck.source_text.length <= 2000);
  assert.equal(writes[1].rows[0].interval_days, 1);
  assert.ok(writes[1].rows[0].front.length >= 10);
  assert.ok(writes[1].rows[0].back.length >= 10);
  assert.equal(writes[1].rows[0].back.trim(), 'mennä');
  assert.equal(writes[2].rows.id, deck.id);
  assert.equal(writes[3].rows[0].id, writes[1].rows[0].id);
  assert.ok(writes.every(write => write.options.ignoreDuplicates));
});
test('review scheduling preserves progression and resets failed recall', () => {
  const { nextReview } = load('lib/course-srs.ts');
  const now = new Date('2026-10-26T10:00:00Z');
  const card = { interval_days: 6, repetitions: 2, ease_factor: 2.5 };
  const success = nextReview(card, 5, now);
  assert.equal(success.interval_days, 15);
  assert.equal(success.next_review_at, '2026-11-10T10:00:00.000Z');
  const retry = nextReview(card, 1, now);
  assert.equal(retry.repetitions, 0);
  assert.equal(retry.interval_days, 1);
  assert.throws(() => nextReview(card, 6, now));
});
