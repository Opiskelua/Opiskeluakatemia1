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
const tg = load('target-grade.ts', { './path-v2-types': types });

const target = {
  grade: 'E', passMark: 85, lessonsMet: 14, lessonsRequired: 20, belowTarget: ['articles-2'], examSeason: 'K2027',
  examDate: '2027-03-22', weeksLeft: 21, lessonsPerWeek: 3, estimate: { points: 244, grade: 'M', confidence: 62 }, targetPoints: 259,
};

test('season options: K listed through March, S through September, three seasons', () => {
  assert.deepEqual(tg.upcomingExamSeasons('2026-10-30'), ['K2027', 'S2027', 'K2028']);
  assert.deepEqual(tg.upcomingExamSeasons('2027-01-15'), ['K2027', 'S2027', 'K2028']);
  assert.deepEqual(tg.upcomingExamSeasons('2027-03-31'), ['K2027', 'S2027', 'K2028'], 'K stays through the end of March');
  assert.deepEqual(tg.upcomingExamSeasons('2027-04-01'), ['S2027', 'K2028', 'S2028']);
  assert.deepEqual(tg.upcomingExamSeasons('2027-09-30'), ['S2027', 'K2028', 'S2028'], 'S stays through the end of September');
  assert.deepEqual(tg.upcomingExamSeasons('2027-10-01'), ['K2028', 'S2028', 'K2029']);
  assert.deepEqual(tg.upcomingExamSeasons('not a date'), []);
  assert.deepEqual(tg.seasonOptions('2027-10-01', 'S2027'), ['S2027', 'K2028', 'S2028', 'K2029'], 'a chosen past season stays selectable');
  assert.deepEqual(tg.seasonOptions('2027-10-01', 'K2028'), ['K2028', 'S2028', 'K2029']);
  assert.deepEqual(tg.seasonOptions('2027-10-01', 'X1'), ['K2028', 'S2028', 'K2029']);
  assert.equal(tg.seasonLabel('K2027'), 'Kevät 2027');
  assert.equal(tg.seasonLabel('S2027'), 'Syksy 2027');
  for (const season of tg.upcomingExamSeasons('2026-10-30', 10)) assert.match(season, tg.EXAM_SEASON);
});

test('request building and revision handling', () => {
  assert.deepEqual(tg.buildTargetRequest({ version: types.PATH_V2_VERSION, targetRevision: 4 }, 'E', 'K2027'),
    { version: 'v2-2026', revision: 4, targetGrade: 'E', examSeason: 'K2027' });
  assert.deepEqual(tg.buildTargetRequest({ version: types.PATH_V2_VERSION }, 'C', null),
    { version: 'v2-2026', revision: 0, targetGrade: 'C', examSeason: null }, 'missing targetRevision sends 0');
  assert.equal(tg.buildTargetRequest({ version: types.PATH_V2_VERSION, targetRevision: 2 }, null, 'K2027').examSeason, null, 'clearing drops the season');
  assert.equal(tg.buildTargetRequest({ version: types.PATH_V2_VERSION, targetRevision: 2 }, 'M', 'K27').examSeason, null, 'an invalid season is never sent');
  assert.equal(tg.targetRevision({ targetRevision: 7 }), 7);
  assert.equal(tg.targetRevision({}), 0);
  assert.equal(tg.targetRevision({ targetRevision: -1 }), 0);
  assert.equal(tg.targetRevision({ targetRevision: 1.5 }), 0);
  assert.equal(tg.currentTarget({}), null);
  assert.equal(tg.currentTargetGrade({}), null);
  assert.equal(tg.currentTargetGrade({ targetGrade: 'L' }), 'L');
});

test('feature detection needs targetRevision on the summary', () => {
  assert.equal(tg.supportsTarget({ targetRevision: 0 }), true);
  assert.equal(tg.supportsTarget({ targetRevision: 0, targetGrade: null, target: null }), true);
  assert.equal(tg.supportsTarget({ targetGrade: null, target: null }), false, 'an older server omits targetRevision');
  assert.equal(tg.supportsTarget({}), false);
  assert.equal(tg.supportsTarget(null), false);
  assert.equal(tg.supportsTarget(Object.create({ targetRevision: 1 })), false, 'own property only');
});

test('card text matches the web copy', () => {
  assert.equal(tg.targetTitle(target), '14/20 oppituntia vähintään 85 %');
  assert.equal(tg.targetPercent(target), 70);
  assert.equal(tg.targetPercent({ ...target, lessonsRequired: 0, lessonsMet: 0 }), 0);
  assert.equal(tg.targetEyebrow(target), 'Tavoite / Kevät 2027');
  assert.equal(tg.targetEyebrow({ examSeason: null }), 'Tavoite');

  assert.equal(tg.paceLine(target), '3 oppituntia viikossa · 21 vk kokeeseen');
  assert.equal(tg.paceLine({ ...target, lessonsPerWeek: 1, weeksLeft: 2 }), '1 oppitunti viikossa · 2 vk kokeeseen');
  assert.equal(tg.paceLine({ ...target, lessonsPerWeek: 0 }), 'Kaikki tavoitteen oppitunnit tehty.');
  assert.equal(tg.paceLine({ ...target, lessonsPerWeek: null, weeksLeft: null }), 'Koepäivää ei vielä tiedetä.');
  assert.equal(tg.paceLine({ ...target, lessonsPerWeek: null, weeksLeft: null, examSeason: null }), 'Valitse koekerta, niin näet tahdin.');

  assert.equal(tg.estimateLine(target), '244 p (M) · tavoite 259 p');
  assert.equal(tg.estimateLine({ ...target, estimate: null }), 'Tee vielä lukemisen ja kuuntelun tehtäviä, jotta arvio tarkentuu.');

  assert.equal(tg.raiseRowLabel('Artikkelit 2', 'articles-2', 82), 'Artikkelit 2 · paras 82 %');
  assert.equal(tg.raiseRowLabel(undefined, 'gone-1', undefined), 'gone-1 · paras 0 %');

  assert.deepEqual(tg.TARGET_GRADE_OPTIONS.map(g => `${g.grade} ${g.label} ${g.points}`), ['C Cum laude 218', 'M Magna 241', 'E Eximia 259', 'L Laudatur 278']);
  assert.equal(tg.TARGET_COPY.coverage, 'Polku kattaa nyt rakenteet ja sanaston, noin 11 % kokeen pisteistä. Arvio perustuu myös luetun ja kuullun ymmärtämisen ja kirjoittamisen harjoituksiin.');
});

test('save errors use target wording', () => {
  assert.equal(tg.targetErrorMessage('conflict', 'conflict', 'x'), 'Tavoite muuttui toisessa istunnossa. Lataa polku uudelleen.');
  assert.equal(tg.targetErrorMessage('invalid', 'invalid_request', 'x'), 'Tavoitearvosana tai koekerta on virheellinen.');
  assert.equal(tg.targetErrorMessage('retry', 'unavailable', 'x'), 'Oppimispolku ei ole juuri nyt käytettävissä. Yritä hetken päästä uudelleen.');
  assert.equal(tg.targetErrorMessage('retry', undefined, 'Yhteys katkesi.'), 'Yhteys katkesi.');
});

// The web strings are the source of truth; check them when the website worktree is next to the app.
test('copy is taken from the web target card', () => {
  const web = process.env.PATH_V2_WEBSITE_TYPES
    ? path.resolve(path.dirname(process.env.PATH_V2_WEBSITE_TYPES), '../../components/course/path-v2')
    : path.resolve(__dirname, '../../opiskeluakatemia/src/components/course/path-v2');
  const card = path.join(web, 'TargetCard.tsx');
  if (!fs.existsSync(card)) return;
  const source = fs.readFileSync(card, 'utf8');
  for (const text of Object.values(tg.TARGET_COPY)) assert.ok(source.includes(text), `missing from the web card: ${text}`);
  for (const g of tg.TARGET_GRADE_OPTIONS) assert.ok(source.includes(`share: '${g.share}'`), `share differs: ${g.share}`);
  for (const line of ['Koepäivää ei vielä tiedetä.', 'Valitse koekerta, niin näet tahdin.', 'Kaikki tavoitteen oppitunnit tehty.', 'Tee vielä lukemisen ja kuuntelun tehtäviä, jotta arvio tarkentuu.']) {
    assert.ok(source.includes(line), `missing from the web card: ${line}`);
  }
});
