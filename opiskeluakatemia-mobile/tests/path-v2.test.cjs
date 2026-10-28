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

const choice = { id: 'l-q1', kind: 'choice', instruction: '', prompt: 'I saw ___ owl.', options: ['a', 'an', 'the'] };
const gap = { id: 'l-q2', kind: 'gap', instruction: '', prompt: 'She ___ (write) daily.', hint: 'write', maxLength: 80 };
const order = { id: 'l-q3', kind: 'order', instruction: '', prompt: 'Olen asunut täällä.', tokens: ['here', 'I', 'lived', 'have'] };
const items = [choice, gap, order];

test('mirrored contract keeps the server rules', () => {
  assert.equal(types.PATH_V2_VERSION, 'v2-2026');
  assert.equal(types.PATH_V2_RULES.passScore, 80);
  assert.equal(types.PATH_V2_RULES.dailyGoalXp, 20);
  assert.equal(types.PATH_V2_RULES.levels.length, 10);
  const website = path.resolve(__dirname, '../../opiskeluakatemia/src/lib/learning-path-v2/types.ts');
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
