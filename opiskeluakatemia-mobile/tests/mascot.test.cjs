const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const specFile = path.resolve(__dirname, '../src/lib/mascot-states.json');
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const assetRequires = [];
function load(file) {
  const filename = path.resolve(__dirname, '../src/lib', file);
  const mod = new Module(filename, module);
  mod.require = id => {
    if (id === './mascot-states.json') return spec;
    if (id.endsWith('.webp')) { assetRequires.push(id); return `asset:${path.basename(id)}`; }
    throw new Error(`Unexpected import: ${id}`);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}
const m = load('mascot.ts');

test('spec copy matches the shared spec', () => {
  const shared = path.resolve(__dirname, '../../assets/mascot/mascot-states.json');
  if (fs.existsSync(shared)) assert.equal(fs.readFileSync(specFile, 'utf8'), fs.readFileSync(shared, 'utf8'), 'src/lib/mascot-states.json differs from ../assets/mascot/mascot-states.json');
  for (const [name, entry] of Object.entries(spec.moments)) assert.ok(spec.poses[entry.pose], `${name} uses an unknown pose`);
  assert.equal(m.MAX_BIG_CELEBRATIONS_PER_DAY, spec.rules.maxBigCelebrationsPerDay);
});

test('every pose and size is bundled and exists on disk', () => {
  const sizes = spec.sizes;
  for (const pose of Object.keys(spec.poses)) {
    for (const size of sizes) {
      const expected = spec.poses[pose].mobile.replace('web/', '').replace('{size}', size);
      assert.equal(m.MASCOT_ASSETS[pose][size], `asset:${expected}`);
    }
  }
  assert.equal(assetRequires.length, Object.keys(spec.poses).length * sizes.length);
  for (const id of assetRequires) assert.ok(fs.existsSync(path.resolve(__dirname, '../src/lib', id)), `${id} is missing`);
  const shared = path.resolve(__dirname, '../../assets/mascot/web');
  if (fs.existsSync(shared)) {
    for (const file of fs.readdirSync(shared).filter(f => f.endsWith('.webp'))) {
      assert.ok(fs.readFileSync(path.resolve(__dirname, '../assets/mascot', file)).equals(fs.readFileSync(path.join(shared, file))), `assets/mascot/${file} differs from the shared asset`);
    }
  }
  assert.equal(m.assetPixels(48, 3), 256);
  assert.equal(m.assetPixels(88, 3), 512);
  assert.equal(m.assetPixels(88, 2), 256);
  assert.equal(m.mascotAsset('cheer', 'lg', 2), 'asset:cheer-512.webp');
  assert.equal(m.altFor('think'), 'Abi miettii.');
});

test('FNV-1a hash and the shared fixed vector', () => {
  assert.equal(m.fnv1a(''), 0x811c9dc5);
  assert.equal(m.fnv1a('a'), 0xe40c292c);
  assert.equal(m.fnv1a('foobar'), 0xbf9cf968);
  // Cross-platform vector: the website must return the same line for these inputs.
  assert.equal(m.pickLine('lessonPassed', '2026-10-30', 'anon'), spec.moments.lessonPassed.lines[m.fnv1a('lessonPassed|2026-10-30|anon') % 3]);
  assert.equal(m.pickLine('lessonPassed', '2026-10-30', 'anon'), FIXED_LESSON_PASSED);
});
// hash 2762856003 % 3 = 0
const FIXED_LESSON_PASSED = 'Hyvä veto.';

test('a value ending in punctuation swallows the period after its placeholder', () => {
  const lines = spec.moments.nextUpDaily.lines;
  for (const userId of ['anon', 'u1', 'u2', 'u3', 'u4', 'u5']) {
    const line = m.pickLine('nextUpDaily', '2026-10-30', userId, { lesson: 'A vai an?' });
    assert.ok(!line.includes('?.'), line);
    assert.ok(lines.some(l => l.includes('{lesson}')) || line);
  }
  assert.ok(m.pickLine('nextUpDaily', '2026-10-30', 'anon', { lesson: 'Artikkelit' }).includes('Artikkelit'));
});

test('pickLine rotates daily, is stable, and fills placeholders', () => {
  const a = m.pickLine('reviewEmpty', '2026-10-30', 'user-1');
  assert.equal(m.pickLine('reviewEmpty', '2026-10-30', 'user-1'), a, 'stable for the same day and user');
  const days = new Set(Array.from({ length: 20 }, (_, i) => m.pickLine('reviewEmpty', `2026-11-${String(i + 1).padStart(2, '0')}`, 'user-1')));
  assert.equal(days.size, 2, 'both lines appear over a few weeks');
  assert.equal(m.pickLine('pathHere', '2026-10-30', 'anon'), null, 'no lines');
  assert.equal(m.pickLine('levelUp', '2026-10-30', 'anon'), null, 'all lines need {level}');
  assert.match(m.pickLine('levelUp', '2026-10-30', 'anon', { level: 'Assistentti' }), /Assistentti/);
  // Without {lesson}, only the placeholder-free line is eligible.
  assert.equal(m.pickLine('nextUpDaily', '2026-10-30', 'anon'), 'Yksi oppitunti tänään riittää pitämään putken käynnissä.');
  for (let i = 0; i < 30; i++) {
    const line = m.pickLine('streakAtRisk', `2026-12-${String(i + 1).padStart(2, '0')}`, 'u', { streak: 4 });
    assert.ok(!line.includes('{'), line);
  }
  const all = new Set(Array.from({ length: 40 }, (_, i) => m.pickLine('streakAtRisk', `d${i}`, 'u', { streak: 4 })));
  assert.ok(all.has('4 päivän putki jatkuu, kun teet tänään yhden oppitunnin.'));
});

test('momentForResult order and the daily big-celebration cap', () => {
  const pass = { score: 90, passed: true };
  const none = { unitCompleted: null, leveledUp: false, dailyGoalReached: false };
  assert.equal(m.momentForResult({ score: 50, passed: false }, { ...none, unitCompleted: 'u', leveledUp: true, dailyGoalReached: true }, 0), 'lessonFailed');
  assert.equal(m.momentForResult(pass, { ...none, unitCompleted: 'u', leveledUp: true }, 0), 'unitCompleted');
  assert.equal(m.momentForResult(pass, { ...none, leveledUp: true, dailyGoalReached: true }, 1), 'levelUp');
  assert.equal(m.momentForResult(pass, { ...none, leveledUp: true, dailyGoalReached: true }, 2), 'dailyGoalReached', 'over the cap falls through');
  assert.equal(m.momentForResult({ score: 100, passed: true }, { ...none, unitCompleted: 'u' }, 2), 'lessonPerfect');
  assert.equal(m.momentForResult(pass, { ...none, unitCompleted: 'u' }, 5), 'lessonPassed');
  assert.equal(m.momentForResult({ score: 100, passed: true }, none, 0), 'lessonPerfect');
  assert.equal(m.momentForResult(pass, null, 0), 'lessonPassed');
  assert.equal(m.isBigCelebration('unitCompleted'), true);
  assert.equal(m.isBigCelebration('levelUp'), true);
  assert.equal(m.isBigCelebration('dailyGoalReached'), false);
});

test('streakAtRisk uses the Helsinki evening', () => {
  const risky = { streak: { current: 3, longest: 3, practicedToday: false } };
  // Winter time (UTC+2) after 25.10.2026.
  assert.equal(m.streakAtRisk(risky, new Date('2026-10-30T16:00:00Z')), true);
  assert.equal(m.streakAtRisk(risky, new Date('2026-10-30T15:59:00Z')), false);
  // Summer time (UTC+3).
  assert.equal(m.streakAtRisk(risky, new Date('2026-07-01T15:00:00Z')), true);
  assert.equal(m.streakAtRisk(risky, new Date('2026-07-01T14:59:00Z')), false);
  assert.equal(m.streakAtRisk(risky, new Date('2026-10-30T21:30:00Z')), true, '23:30 local');
  assert.equal(m.streakAtRisk(risky, new Date('2026-10-30T22:30:00Z')), false, '00:30 local, a new day');
  assert.equal(m.streakAtRisk({ streak: { ...risky.streak, practicedToday: true } }, new Date('2026-10-30T18:00:00Z')), false);
  assert.equal(m.streakAtRisk({ streak: { ...risky.streak, current: 0 } }, new Date('2026-10-30T18:00:00Z')), false);
});

test('Helsinki fallback agrees with Intl across DST changes', () => {
  const start = Date.parse('2026-03-28T00:00:00Z');
  for (let t = start; t < start + 3 * 86400000; t += 15 * 60000) {
    const now = new Date(t);
    assert.equal(m.helsinkiHourFallback(now), m.helsinkiHour(now), now.toISOString());
    assert.equal(m.helsinkiDateFallback(now), m.helsinkiDate(now), now.toISOString());
  }
  const autumn = Date.parse('2026-10-24T00:00:00Z');
  for (let t = autumn; t < autumn + 3 * 86400000; t += 15 * 60000) assert.equal(m.helsinkiHourFallback(new Date(t)), m.helsinkiHour(new Date(t)), new Date(t).toISOString());
  assert.equal(m.helsinkiDate(new Date('2026-10-30T22:30:00Z')), '2026-10-31');
});

test('allDone and onboarding conditions', () => {
  assert.equal(m.allDone({ nextLessonId: null, content: { units: [{ comingSoon: false }, { comingSoon: true }] } }), true);
  assert.equal(m.allDone({ nextLessonId: 'x', content: { units: [{ comingSoon: true }] } }), false);
  assert.equal(m.allDone({ nextLessonId: null, content: { units: [{ comingSoon: false }] } }), false);
  assert.equal(m.showOnboarding({ xp: { total: 0, today: 0 } }, false), true);
  assert.equal(m.showOnboarding({ xp: { total: 0, today: 0 } }, true), false);
  assert.equal(m.showOnboarding({ xp: { total: 10, today: 0 } }, false), false);
});

test('mascot copy never guilts', () => {
  const text = Object.values(spec.moments).flatMap(entry => [entry.title ?? '', ...entry.lines]).join(' ').toLowerCase();
  for (const word of ['harmi', 'pettymys', 'surullinen', 'menetät', 'epäonnistuit']) assert.ok(!text.includes(word), word);
});
