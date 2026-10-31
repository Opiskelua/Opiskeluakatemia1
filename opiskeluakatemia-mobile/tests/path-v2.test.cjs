const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '../src/lib', file);
  const mod = new Module(filename, module);
  mod.require = id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    throw new Error(`Unexpected import: ${id}`);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return mod.exports;
}
const types = load('path-v2-types.ts');
const m = load('path-v2-model.ts', { './path-v2-types': types });
const { sanitizeDeepLink } = load('deep-link.ts');
const courses = load('courses.ts');

const choice = { id: 'l-q1', kind: 'choice', instruction: '', prompt: 'I saw ___ owl.', options: ['a', 'an', 'the'] };
const gap = { id: 'l-q2', kind: 'gap', instruction: '', prompt: 'She ___ (write) daily.', hint: 'write', maxLength: 80 };
const order = { id: 'l-q3', kind: 'order', instruction: '', prompt: 'Olen asunut täällä.', tokens: ['here', 'I', 'lived', 'have'] };
const items = [choice, gap, order];

test('mirrored contract keeps the server rules', () => {
  assert.equal(types.PATH_V2_VERSION, 'v2-2026');
  assert.equal(types.PATH_V2_RULES.passScore, 80);
  assert.equal(types.PATH_V2_RULES.dailyGoalXp, 20);
  assert.equal(types.PATH_V2_RULES.levels.length, 10);
  // PATH_V2_WEBSITE_TYPES=/abs/path/to/types.ts compares against another website checkout
  // (e.g. a feature worktree) instead; a set override must exist, so it cannot skip the check.
  const override = process.env.PATH_V2_WEBSITE_TYPES;
  const website = override ? path.resolve(override) : path.resolve(__dirname, '../../opiskeluakatemia/src/lib/learning-path-v2/types.ts');
  if (override) assert.ok(fs.existsSync(website), `PATH_V2_WEBSITE_TYPES does not exist: ${website}`);
  if (fs.existsSync(website)) {
    const strip = text => text.replace(/^\/\/ Mirrored from[\s\S]*?\n\n/, '');
    assert.equal(strip(fs.readFileSync(path.resolve(__dirname, '../src/lib/path-v2-types.ts'), 'utf8')), fs.readFileSync(website, 'utf8'), 'path-v2-types.ts differs from the website contract');
  }
});

test('ordering items build the answer from tapped token indices', () => {
  let answer = m.orderAppend(undefined, 1, 4);
  answer = m.orderAppend(answer, 3, 4);
  answer = m.orderAppend(answer, 3, 4); // the same token cannot be used twice
  answer = m.orderAppend(answer, 9, 4); // out of range is ignored
  assert.deepEqual(answer, [1, 3]);
  assert.deepEqual(m.orderRemaining(order.tokens, answer), [0, 2]);
  assert.equal(m.orderSentence(order.tokens, answer), 'I have');
  answer = m.orderAppend(m.orderAppend(answer, 2, 4), 0, 4);
  assert.deepEqual(answer, [1, 3, 2, 0]);
  assert.equal(m.orderSentence(order.tokens, answer), 'I have lived here');
  assert.equal(m.isAnswered(order, answer), true);
  assert.deepEqual(m.orderRemoveAt(answer, 1), [1, 2, 0]);
  assert.deepEqual(m.orderRemoveAt(answer, 7), answer);
  assert.equal(m.isAnswered(order, [1, 3, 2]), false, 'partial orderings are drafts, not answers');
  assert.equal(m.isAnswered(order, [1, 1, 2, 0]), false);
});

test('answered checks follow the answer formats', () => {
  assert.equal(m.isAnswered(choice, 1), true);
  assert.equal(m.isAnswered(choice, 3), false);
  assert.equal(m.isAnswered(choice, '1'), false);
  assert.equal(m.isAnswered(gap, '  '), false);
  assert.equal(m.isAnswered(gap, 'writes'), true);
  const answers = { 'l-q1': 0, 'l-q2': 'writes', 'l-q3': [1, 3] };
  assert.equal(m.answeredCount(items, answers), 2);
  assert.equal(m.allAnswered(items, answers), false);
  assert.equal(m.firstUnanswered(items, answers), 2);
  assert.deepEqual(m.answersForSubmit(items, answers), { 'l-q1': 0, 'l-q2': 'writes' });
  assert.equal(m.allAnswered([], {}), false);
});

test('drafts are sanitized against the current items', () => {
  const draft = { 'l-q1': 7, 'l-q2': 'x'.repeat(100), 'l-q3': [3, 1], 'gone-q9': 1 };
  assert.deepEqual(m.sanitizeDraft(items, draft), { 'l-q2': 'x'.repeat(80), 'l-q3': [3, 1] });
  assert.deepEqual(m.sanitizeDraft(items, { 'l-q3': [0, 0] }), {});
  assert.deepEqual(m.sanitizeDraft(items, null), {});
  assert.deepEqual(m.sanitizeDraft(items, [1, 2]), {});
});

test('prompts split on the blank and wrong answers are described', () => {
  assert.deepEqual(m.splitPrompt('I saw ___ owl.'), { before: 'I saw ', after: ' owl.', blank: true });
  assert.deepEqual(m.splitPrompt('No blank'), { before: 'No blank', after: '', blank: false });
  assert.equal(m.describeAnswer(choice, 1), 'an');
  assert.equal(m.describeAnswer(gap, ' wrote '), 'wrote');
  assert.equal(m.describeAnswer(order, [1, 3, 2, 0]), 'I have lived here');
  assert.equal(m.describeAnswer(gap, undefined), 'Ei vastausta');
});

test('progress formatting', () => {
  const level = { level: 2, title: 'Assistentti', xp: 45, levelStartXp: 40, nextLevelXp: 100, nextLevelTitle: 'Nuorempi asiantuntija', progress: 0.083 };
  assert.equal(m.formatXp(45), '45 XP');
  assert.equal(m.formatXp(Number.NaN), '0 XP');
  assert.equal(m.levelRemainingLabel(level), '55 XP seuraavaan tasoon');
  assert.equal(m.levelSpanLabel(level), '5 / 60 XP');
  assert.equal(m.levelRemainingLabel({ ...level, nextLevelXp: null, nextLevelTitle: null }), 'Korkein taso saavutettu');
  assert.equal(m.percent(0.083), 8);
  assert.equal(m.percent(4), 100);
  const goal = { date: '2026-10-28', targetXp: 20, earnedXp: 15, reached: false, lessonsCompletedToday: 1, reviewItemsToday: 0 };
  assert.equal(m.dailyGoalFraction(goal), 0.75);
  assert.equal(m.dailyGoalLabel(goal), '15 / 20 XP');
  assert.equal(m.dailyGoalLabel({ ...goal, earnedXp: 45, reached: true }), 'Tavoite täynnä · 45 XP');
  assert.equal(m.streakLabel({ current: 1, longest: 1, practicedToday: true }), '1 päivä putkeen');
  assert.equal(m.streakLabel({ current: 4, longest: 5, practicedToday: false }), '4 päivää putkeen');
  assert.equal(m.streakLabel({ current: 0, longest: 5, practicedToday: false }), 'Ei putkea vielä');
});

test('lesson states, next step and failure mapping', () => {
  const base = { lessonId: 'x', status: 'available', bestScore: null, lastScore: null, attempts: 0, completedAt: null, draft: {}, revision: 0, xpEarned: 0 };
  assert.equal(m.lessonState(undefined), 'locked');
  assert.equal(m.lessonState(base), 'available');
  assert.equal(m.lessonState({ ...base, draft: { a: 1 } }), 'in_progress');
  assert.equal(m.lessonState({ ...base, attempts: 1, lastScore: 50 }), 'in_progress');
  assert.equal(m.lessonState({ ...base, status: 'completed' }), 'completed');
  const lesson = { id: 'tenses-2', unitId: 'tenses', kind: 'lesson', order: 2, title: 'Past vs perfect', subtitle: '', estimatedMinutes: 4, maxXp: 15, guide: null, items: [] };
  const units = [{ id: 'tenses', order: 2, title: 'Verbien aikamuodot', subtitle: '', skill: 'grammar', comingSoon: false, plannedLessons: [], lessons: [lesson], resources: [] }];
  assert.deepEqual(m.nextStepLabel({ nextLessonId: 'tenses-2', content: { units }, review: { pendingItems: 0 } }), { title: 'Past vs perfect', detail: 'Verbien aikamuodot · Oppitunti 2' });
  assert.equal(m.nextStepLabel({ nextLessonId: null, content: { units }, review: { pendingItems: 3 } }).title, 'Kertaa virheesi');
  assert.equal(m.nextStepLabel({ nextLessonId: null, content: { units }, review: { pendingItems: 0 } }).title, 'Kaikki tehty – kertaa korteilla');
  assert.equal(m.findLesson(units, 'nope'), null);
  // A checkpoint promises the next part only when a unit follows it; the last unit's ends the path.
  const path = [{ id: 'sv-pronomen' }, { id: 'sv-ordforrad' }, { id: 'sv-ordkunskap' }];
  assert.equal(m.checkpointGoal(path, 'sv-ordforrad'), 'seuraava osa avautuu');
  assert.equal(m.checkpointGoal(path, 'sv-ordkunskap'), 'suoritat koko polun');
  assert.equal(m.checkpointGoal([...path, { id: 'planned', comingSoon: true }], 'sv-ordkunskap'), 'seuraava osa avautuu', 'a coming-soon unit still follows (English)');
  assert.equal(m.checkpointGoal(path, 'nope'), 'seuraava osa avautuu');
  assert.equal(m.pathFailure(409), 'conflict');
  assert.equal(m.pathFailure(403), 'locked');
  assert.equal(m.pathFailure(400), 'invalid');
  assert.equal(m.pathFailure(503), 'retry');
  assert.equal(m.pathFailure(undefined), 'retry');
  for (let i = -3; i < 20; i++) assert.ok(Math.abs(m.windingOffset(i)) <= 1);
});

test('unit resources map to in-app screens', () => {
  const catalogue = [
    { id: 'reading-static-climate', category: 'reading', path: '/data/reading/climate-article.json' },
    { id: 'reading-static-climate-mc', category: 'reading', path: '/data/reading/climate-article.json', multipleChoiceOnly: true },
    { id: 'listening-static-marathon-runner', category: 'listening', path: '/data/listening-exercises-mc/marathon-runner.json' },
  ];
  assert.deepEqual(m.resourceRoute({ kind: 'theory', id: 'artikkelit', label: '', href: '' }, catalogue), { pathname: '/theory', params: { section: 'artikkelit' } });
  assert.deepEqual(m.resourceRoute({ kind: 'reading', id: 'climate-article', label: '', href: '' }, catalogue), { pathname: '/exercise', params: { id: 'reading-static-climate' } });
  assert.deepEqual(m.resourceRoute({ kind: 'listening-mc', id: 'marathon-runner', label: '', href: '' }, catalogue), { pathname: '/exercise', params: { id: 'listening-static-marathon-runner' } });
  assert.deepEqual(m.resourceRoute({ kind: 'grammar', id: 'unknown', label: '', href: '' }, catalogue), { pathname: '/exercises' });
  assert.deepEqual(m.resourceRoute({ kind: 'essay', id: '', label: '', href: '' }, catalogue), { pathname: '/essays' });
});

test('Polku deep links open screens only, never a lesson', () => {
  assert.equal(sanitizeDeepLink('opiskeluakatemia://path'), '/path');
  assert.equal(sanitizeDeepLink('opiskeluakatemia://path?previewScenario=complete'), '/path');
  assert.equal(sanitizeDeepLink('opiskeluakatemia://path-review'), '/path-review');
  assert.equal(sanitizeDeepLink('opiskeluakatemia://path-lesson?lessonId=articles-1'), '/path');
  assert.equal(sanitizeDeepLink('opiskeluakatemia://path-preview'), '/');
});

test('server error codes decide the failure, the HTTP status is the fallback', () => {
  assert.equal(m.pathFailure(400, 'invalid_request'), 'invalid');
  assert.equal(m.pathFailure(400, 'incomplete'), 'incomplete');
  assert.equal(m.pathFailure(403, 'locked'), 'locked');
  assert.equal(m.pathFailure(409, 'conflict'), 'conflict');
  assert.equal(m.pathFailure(409, 'nothing_to_review'), 'conflict');
  assert.equal(m.pathFailure(503, 'unavailable'), 'retry');
  assert.equal(m.pathFailure(404, 'not_found'), 'invalid');
  // The code wins over a status that would map differently.
  assert.equal(m.pathFailure(400, 'locked'), 'locked');
  // Unknown or missing codes fall back to the status.
  assert.equal(m.pathFailure(409, 'something_new'), 'conflict');
  assert.equal(m.pathFailure(403, undefined), 'locked');
  assert.equal(m.pathFailure(500, 'toString'), 'retry');
  for (const code of ['invalid_request', 'incomplete', 'locked', 'conflict', 'nothing_to_review', 'unavailable', 'not_found']) {
    assert.match(m.pathErrorMessage(code), /\S/);
  }
  assert.equal(m.pathErrorMessage(undefined), undefined);
  assert.equal(m.pathErrorMessage('constructor'), undefined);
});

test('API errors keep the server code from the JSON body', async () => {
  const api = load('api.ts', { './config': { config: { apiUrl: '' } }, './courses': courses, './supabase': { supabase: null } });
  const body = value => ({ json: async () => value });
  assert.equal(await api.errorCode(body({ error: 'Lukittu', code: 'locked' })), 'locked');
  assert.equal(await api.errorCode(body({ error: 'Kurssioikeus puuttuu.' })), undefined);
  assert.equal(await api.errorCode(body({ code: 7 })), undefined);
  assert.equal(await api.errorCode(body({ code: '<script>' })), undefined);
  assert.equal(await api.errorCode({ json: async () => { throw new SyntaxError('not json'); } }), undefined);
  assert.equal(new api.RequestError('x', 409, 'conflict').code, 'conflict');
});

test('draft autosave runs only when the draft changed and nothing else is saving', () => {
  const saved = m.draftKey(items, { 'l-q1': 1 });
  assert.equal(m.draftKey(items, { 'l-q2': 'writes', 'l-q1': 1 }), m.draftKey(items, { 'l-q1': 1, 'l-q2': 'writes' }), 'key ignores property order');
  assert.equal(m.draftKey(items, { 'l-q1': 1, 'l-q2': '  ', unknown: 3 }), saved, 'key ignores what a save would not send');
  const current = m.draftKey(items, { 'l-q1': 1, 'l-q3': [2] });
  assert.equal(m.shouldAutosaveDraft({ enabled: true, busy: false, current, saved }), true);
  assert.equal(m.shouldAutosaveDraft({ enabled: true, busy: false, current: saved, saved }), false, 'unchanged');
  assert.equal(m.shouldAutosaveDraft({ enabled: true, busy: true, current, saved }), false, 'manual save or submit running');
  assert.equal(m.shouldAutosaveDraft({ enabled: false, busy: false, current, saved }), false, 'locked lesson or result view');
  assert.equal(m.shouldAutosaveDraft({ enabled: true, busy: false, current: m.draftKey(items, {}), saved: m.draftKey(items, undefined) }), false, 'nothing answered yet');
});

function loadClient() {
  globalThis.__DEV__ = false;
  const calls = [];
  const replies = [];
  const state = () => ({ content: { units: [] }, level: { level: 1 }, progress: { n: calls.length } });
  const api = {
    RequestError: class extends Error {}, errorCode: async () => undefined,
    apiRequest: async (url, options) => { calls.push({ url, method: options.method ?? 'GET' }); const next = replies.shift(); if (next instanceof Error) throw next; return next ?? state(); },
  };
  const client = load('path-v2.ts', { './api': api, './config': { config: { apiUrl: '' } }, './courses': courses, './path-v2-types': types, './path-v2-model': m });
  return { client, calls, replies };
}

test('the path cache serves fresh data for 60 s and drops it after any mutation', async t => {
  let now = 1_000_000;
  t.mock.method(Date, 'now', () => now);
  const { client, calls, replies } = loadClient();
  assert.equal(client.PATH_CACHE_TTL_MS, 60_000);
  const first = await client.loadPath('en');
  assert.equal(await client.loadPathCached('en'), first, 'reused right after the map loaded it');
  now += 59_999;
  assert.equal(await client.loadPathCached('en'), first);
  assert.equal(calls.length, 1);
  now += 1;
  const second = await client.loadPathCached('en');
  assert.notEqual(second, first, 'expired after 60 s');
  assert.equal(calls.length, 2);
  assert.equal(await client.loadPathCached('en'), second, 'a cached load refreshes the cache');

  replies.push({ summary: {}, revision: 1 });
  await client.saveLesson('en', 'save', 'articles-1', {}, 0);
  await client.loadPathCached('en');
  assert.equal(calls.filter(c => c.method === 'GET').length, 3, 'a lesson save invalidates');

  replies.push({ result: {}, summary: {} });
  await client.submitReview('en', {}, 0);
  await client.loadPathCached('en');
  assert.equal(calls.filter(c => c.method === 'GET').length, 4, 'a review submit invalidates');

  replies.push(new Error('offline'));
  await assert.rejects(client.saveLesson('en', 'submit', 'articles-1', {}, 0));
  await client.loadPathCached('en');
  assert.equal(calls.filter(c => c.method === 'GET').length, 5, 'a failed mutation invalidates too');

  client.clearPathCache();
  await client.loadPathCached('en');
  assert.equal(calls.filter(c => c.method === 'GET').length, 6, 'sign-in changes clear it');

  // The clock moving backwards never serves an entry from the "future".
  now -= 10_000;
  await client.loadPathCached('en');
  assert.equal(calls.filter(c => c.method === 'GET').length, 7);
  assert.deepEqual([...new Set(calls.map(c => c.url))], ['/api/abikurssi/path', '/api/abikurssi/path/review'], 'English stays on the English routes');
});

test('a path load that races with a mutation is not cached', async () => {
  const { client, calls, replies } = loadClient();
  let release;
  replies.push(new Promise(resolve => { release = resolve; }).then(() => ({ content: { units: [] }, level: {}, progress: { stale: true } })));
  // apiRequest mock returns the promise itself; await it inside loadPath.
  const pending = client.loadPath('en');
  replies.push({ summary: {}, revision: 1 });
  await client.saveLesson('en', 'save', 'articles-1', {}, 0);
  release();
  assert.equal((await pending).progress.stale, true);
  const next = await client.loadPathCached('en');
  assert.notEqual(next.progress.stale, true, 'the stale response was not cached');
  assert.equal(calls.filter(c => c.method === 'GET').length, 2);
});

test('saving the target invalidates the cache and retries a 409 once with the reloaded revision', async () => {
  globalThis.__DEV__ = false;
  class RequestError extends Error { constructor(message, status, code) { super(message); this.status = status; this.code = code; } }
  const calls = [];
  const replies = [];
  const api = {
    RequestError, errorCode: async () => undefined,
    apiRequest: async (url, options) => {
      calls.push({ url, method: options.method ?? 'GET', body: options.body });
      const next = replies.shift();
      if (next instanceof Error) throw next;
      return next ?? { content: { units: [] }, level: {}, progress: {}, targetRevision: 0 };
    },
  };
  const client = load('path-v2.ts', { './api': api, './config': { config: { apiUrl: '' } }, './courses': courses, './path-v2-types': types, './path-v2-model': m });
  const body = { version: types.PATH_V2_VERSION, revision: 2, targetGrade: 'E', examSeason: 'K2027' };

  await client.loadPath('en');
  replies.push({ revision: 3, summary: { targetRevision: 3 } });
  assert.equal((await client.saveTarget('en', body)).revision, 3);
  assert.deepEqual(calls.at(-1), { url: '/api/abikurssi/path/target', method: 'POST', body });
  await client.loadPathCached('en');
  assert.equal(calls.filter(c => c.method === 'GET').length, 2, 'a target save invalidates the path cache');

  calls.length = 0;
  replies.push(new RequestError('x', 409, 'conflict'), { content: { units: [] }, level: {}, progress: {}, targetRevision: 5 }, { revision: 6, summary: {} });
  assert.equal((await client.saveTarget('en', body)).revision, 6);
  assert.deepEqual(calls.map(c => `${c.method} ${c.url}`), ['POST /api/abikurssi/path/target', 'GET /api/abikurssi/path', 'POST /api/abikurssi/path/target']);
  assert.equal(calls[2].body.revision, 5, 'retried with the reloaded targetRevision');
  assert.equal(calls[2].body.targetGrade, 'E');

  calls.length = 0;
  replies.push(new RequestError('x', 409, 'conflict'), { content: { units: [] }, level: {}, progress: {} }, new RequestError('x', 409, 'conflict'));
  await assert.rejects(client.saveTarget('en', body), error => error.status === 409);
  assert.equal(calls.length, 3, 'only one reload and retry');
  assert.equal(calls[2].body.revision, 0, 'a reload without targetRevision means 0');

  for (const [status, code] of [[400, 'invalid_request'], [503, 'unavailable']]) {
    calls.length = 0;
    replies.push(new RequestError('x', status, code));
    await assert.rejects(client.saveTarget('en', body), error => error.code === code);
    assert.equal(calls.length, 1, `${code} is not retried`);
  }
});

test('saving the target uses the preview route in preview mode', async t => {
  globalThis.__DEV__ = true;
  const previous = process.env.EXPO_PUBLIC_PATH_PREVIEW;
  process.env.EXPO_PUBLIC_PATH_PREVIEW = '1';
  t.after(() => { globalThis.__DEV__ = false; if (previous === undefined) delete process.env.EXPO_PUBLIC_PATH_PREVIEW; else process.env.EXPO_PUBLIC_PATH_PREVIEW = previous; });
  const urls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => { urls.push(`${init.method} ${url}`); return { ok: true, json: async () => ({ revision: 1, summary: {} }) }; });
  const api = { RequestError: class extends Error {}, errorCode: async () => undefined, apiRequest: async () => { throw new Error('not used in preview'); } };
  const client = load('path-v2.ts', { './api': api, './config': { config: { apiUrl: 'http://dev' } }, './courses': courses, './path-v2-types': types, './path-v2-model': m });
  assert.equal(client.PATH_PREVIEW, true);
  await client.saveTarget('en', { version: types.PATH_V2_VERSION, revision: 0, targetGrade: 'C', examSeason: null });
  assert.deepEqual(urls, ['POST http://dev/api/abikurssi/path-preview/target?user=mobile']);
});

// ---------------------------------------------------------------------------
// Courses: Ruotsin abikurssi uses its own Polku routes with the same contract.
// ---------------------------------------------------------------------------

function loadCourseClient() {
  globalThis.__DEV__ = false;
  class RequestError extends Error { constructor(message, status, code) { super(message); this.status = status; this.code = code; } }
  const calls = [];
  const replies = [];
  const api = {
    RequestError, errorCode: async () => undefined,
    apiRequest: async (url, options) => {
      calls.push({ url, method: options.method ?? 'GET', body: options.body });
      const next = replies.shift();
      if (next instanceof Error) throw next;
      return next ?? { content: { units: [] }, level: {}, progress: {}, items: [], targetRevision: 0, n: calls.length };
    },
  };
  const client = load('path-v2.ts', { './api': api, './config': { config: { apiUrl: '' } }, './courses': courses, './path-v2-types': types, './path-v2-model': m });
  return { client, calls, replies, RequestError };
}

test('Swedish Polku calls use /api/abikurssi/ruotsi/path* and keep the contract version', async () => {
  const { client, calls, replies, RequestError } = loadCourseClient();
  await client.loadPath('sv');
  replies.push({ summary: {}, revision: 1 });
  await client.saveLesson('sv', 'submit', 'sv-verb-1', { 'sv-verb-1-q1': 0 }, 0);
  await client.loadReview('sv');
  replies.push({ result: {}, summary: {} });
  await client.submitReview('sv', { 'sv-verb-1-q1': 1 }, 3);
  const target = { version: types.PATH_V2_VERSION, revision: 0, targetGrade: 'M', examSeason: 'S2027' };
  replies.push(new RequestError('x', 409, 'conflict'), { content: { units: [] }, level: {}, progress: {}, targetRevision: 4 }, { revision: 5, summary: {} });
  await client.saveTarget('sv', target);
  assert.deepEqual(calls.map(c => `${c.method} ${c.url}`), [
    'GET /api/abikurssi/ruotsi/path',
    'POST /api/abikurssi/ruotsi/path',
    'GET /api/abikurssi/ruotsi/path/review',
    'POST /api/abikurssi/ruotsi/path/review',
    'POST /api/abikurssi/ruotsi/path/target',
    'GET /api/abikurssi/ruotsi/path',
    'POST /api/abikurssi/ruotsi/path/target',
  ], 'the 409 retry reloads the same course');
  for (const call of calls.filter(c => c.method === 'POST')) assert.equal(call.body.version, 'v2-2026', 'the server keeps courses apart by route, not by version');
  assert.deepEqual(calls[1].body, { action: 'submit', version: 'v2-2026', lessonId: 'sv-verb-1', answers: { 'sv-verb-1-q1': 0 }, revision: 0 });
  assert.equal(calls.at(-1).body.revision, 4);
});

test('the path cache is kept per course and any mutation drops every course', async t => {
  const now = 2_000_000;
  t.mock.method(Date, 'now', () => now);
  const { client, calls, replies } = loadCourseClient();
  const en = await client.loadPath('en');
  const sv = await client.loadPathCached('sv');
  assert.notEqual(sv, en, 'a Swedish load never returns the English path');
  assert.equal(await client.loadPathCached('en'), en);
  assert.equal(await client.loadPathCached('sv'), sv);
  assert.deepEqual(calls.map(c => c.url), ['/api/abikurssi/path', '/api/abikurssi/ruotsi/path']);

  // The streak is shared across courses, so a Swedish lesson also makes the English copy stale.
  replies.push({ summary: {}, revision: 1 });
  await client.saveLesson('sv', 'submit', 'sv-verb-1', {}, 0);
  await client.loadPathCached('en');
  await client.loadPathCached('sv');
  assert.deepEqual(calls.filter(c => c.method === 'GET').map(c => c.url).slice(2), ['/api/abikurssi/path', '/api/abikurssi/ruotsi/path']);

  client.clearPathCache();
  await client.loadPathCached('sv');
  assert.equal(calls.at(-1).url, '/api/abikurssi/ruotsi/path', 'sign-in changes clear every course');
});

test('preview mode maps each course explicitly to the preview endpoint', async t => {
  globalThis.__DEV__ = true;
  const previous = process.env.EXPO_PUBLIC_PATH_PREVIEW;
  process.env.EXPO_PUBLIC_PATH_PREVIEW = '1';
  t.after(() => { globalThis.__DEV__ = false; if (previous === undefined) delete process.env.EXPO_PUBLIC_PATH_PREVIEW; else process.env.EXPO_PUBLIC_PATH_PREVIEW = previous; });
  const urls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    urls.push(`${init.method} ${url}`);
    return { ok: true, json: async () => ({ content: { units: [] }, level: {}, progress: {}, items: [], revision: 1, summary: {}, result: {} }) };
  });
  const api = { RequestError: class extends Error {}, errorCode: async () => undefined, apiRequest: async () => { throw new Error('a preview call reached the production API'); } };
  const client = load('path-v2.ts', { './api': api, './config': { config: { apiUrl: 'http://dev' } }, './courses': courses, './path-v2-types': types, './path-v2-model': m });
  await client.loadPath('en', 'fresh');
  await client.loadPath('sv', 'midway');
  await client.loadPath('sv');
  await client.saveLesson('sv', 'save', 'sv-verb-1', {}, 0);
  await client.loadReview('sv');
  await client.submitReview('sv', {}, 0);
  await client.saveTarget('sv', { version: types.PATH_V2_VERSION, revision: 0, targetGrade: 'E', examSeason: null });
  assert.deepEqual(urls, [
    'GET http://dev/api/abikurssi/path-preview?scenario=fresh&user=mobile',
    'GET http://dev/api/abikurssi/path-preview?course=sv&scenario=midway&user=mobile',
    'GET http://dev/api/abikurssi/path-preview?course=sv&user=mobile',
    'POST http://dev/api/abikurssi/path-preview?course=sv&user=mobile',
    'GET http://dev/api/abikurssi/path-preview/review?course=sv&user=mobile',
    'POST http://dev/api/abikurssi/path-preview/review?course=sv&user=mobile',
    'POST http://dev/api/abikurssi/path-preview/target?course=sv&user=mobile',
  ]);
  assert.ok(urls.every(url => !url.includes('/ruotsi/')), 'the Swedish production base is never rewritten into a preview path');
});

test('a course without flashcards in the app never points to cards', () => {
  const lesson = { id: 'sv-verb-1', unitId: 'sv-verb', kind: 'lesson', order: 1, title: 'Preesens', subtitle: '', estimatedMinutes: 4, maxXp: 15, guide: null, items: [] };
  const units = [{ id: 'sv-verb', order: 1, title: 'Verbit', subtitle: '', skill: 'grammar', comingSoon: false, plannedLessons: [], lessons: [lesson], resources: [] }];
  const done = { nextLessonId: null, content: { units }, review: { pendingItems: 0 } };
  assert.equal(m.nextStepLabel(done).title, 'Kaikki tehty – kertaa korteilla', 'English keeps its copy');
  assert.deepEqual(m.nextStepLabel(done, false), { title: 'Kaikki tehty', detail: 'Voit tehdä oppitunteja uudelleen ja kerrata teoriaa.' });
  assert.equal(m.nextStepLabel({ ...done, review: { pendingItems: 2 } }, false).title, 'Kertaa virheesi');
  assert.equal(m.nextStepLabel({ ...done, nextLessonId: 'sv-verb-1' }, false).title, 'Preesens');

  const sv = courses.COURSES.sv.features;
  const en = courses.COURSES.en.features;
  for (const kind of ['theory', 'reading', 'listening', 'listening-mc', 'grammar', 'flashcards', 'essay']) assert.equal(m.resourceAvailable({ kind }, en), true, kind);
  assert.equal(m.resourceAvailable({ kind: 'theory' }, sv), true);
  for (const kind of ['reading', 'listening', 'listening-mc', 'grammar', 'flashcards', 'essay']) assert.equal(m.resourceAvailable({ kind }, sv), false, `${kind} would open an English screen`);
});
