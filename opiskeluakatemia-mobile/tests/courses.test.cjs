const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(filename, mocks = {}) {
  const mod = new Module(filename, module);
  mod.require = id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    throw new Error(`Unexpected import: ${id}`);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return mod.exports;
}
const lib = file => path.resolve(__dirname, '../src/lib', file);
const c = load(lib('courses.ts'));

test('the registry follows the build contract identifiers', () => {
  assert.deepEqual(c.COURSE_IDS, ['en', 'sv'], 'English first: owners of both land on English');
  assert.equal(c.DEFAULT_COURSE, 'en');
  assert.equal(c.COURSES.en.courseType, 'abikurssi');
  assert.equal(c.COURSES.sv.courseType, 'ruotsin-abikurssi');
  assert.equal(c.COURSES.en.label, 'Englannin abikurssi');
  assert.equal(c.COURSES.sv.label, 'Ruotsin abikurssi');
  assert.equal(c.COURSES.en.pathBase, '/api/abikurssi/path');
  assert.equal(c.COURSES.sv.pathBase, '/api/abikurssi/ruotsi/path');
  for (const id of c.COURSE_IDS) assert.equal(c.COURSES[id].id, id);
  assert.ok(Object.values(c.COURSES.en.features).every(Boolean), 'English keeps every area');
  assert.deepEqual(Object.entries(c.COURSES.sv.features).filter(([, on]) => on).map(([name]) => name), ['path', 'theory'], 'Swedish: Polku and theory only');
  assert.equal(c.COURSES.en.homeNote, null);
  // App Store 3.1.3(b): no purchase prompt, price or link anywhere in the course copy.
  const copy = JSON.stringify(c.COURSES);
  for (const word of ['osta', 'hinta', '€', 'hankki', 'http']) assert.ok(!copy.toLowerCase().includes(word), word);
  assert.equal(c.isCourseId('sv'), true);
  for (const value of ['SV', 'fi', '', null, undefined, 'toString', 1]) assert.equal(c.isCourseId(value), false, String(value));
});

test('URLs per course: access check, content, Polku and the dev preview', () => {
  assert.equal(c.accessCheckUrl('en'), '/api/courses/check-access?courseType=abikurssi');
  assert.equal(c.accessCheckUrl('sv'), '/api/courses/check-access?courseType=ruotsin-abikurssi');
  assert.equal(c.contentUrl('en'), '/api/abikurssi/content', 'English unchanged, as old builds call it');
  assert.equal(c.contentUrl('sv'), '/api/abikurssi/content?course=sv');
  assert.equal(c.pathUrl('en'), '/api/abikurssi/path');
  assert.equal(c.pathUrl('en', '/review'), '/api/abikurssi/path/review');
  assert.equal(c.pathUrl('en', '/target'), '/api/abikurssi/path/target');
  assert.equal(c.pathUrl('sv'), '/api/abikurssi/ruotsi/path');
  assert.equal(c.pathUrl('sv', '/review'), '/api/abikurssi/ruotsi/path/review');
  assert.equal(c.pathUrl('sv', '/target'), '/api/abikurssi/ruotsi/path/target');
  // One preview endpoint; Swedish adds course=sv instead of rewriting its production base.
  assert.equal(c.previewPathUrl('en'), '/api/abikurssi/path-preview');
  assert.equal(c.previewPathUrl('en', '/target'), '/api/abikurssi/path-preview/target');
  assert.equal(c.previewPathUrl('en', '', 'fresh'), '/api/abikurssi/path-preview?scenario=fresh');
  assert.equal(c.previewPathUrl('sv'), '/api/abikurssi/path-preview?course=sv');
  assert.equal(c.previewPathUrl('sv', '/review'), '/api/abikurssi/path-preview/review?course=sv');
  assert.equal(c.previewPathUrl('sv', '/target', 'complete'), '/api/abikurssi/path-preview/target?course=sv&scenario=complete');
});

test('the selected course: remembered when owned, else the first owned course', () => {
  const owned = (en, sv) => ({ en, sv });
  assert.equal(c.COURSE_STORAGE_KEY, 'oa.course.v1');
  assert.equal(c.resolveCourse(null, c.UNKNOWN_OWNERSHIP), 'en', 'nothing known yet');
  assert.equal(c.resolveCourse('sv', c.UNKNOWN_OWNERSHIP), 'sv', 'the remembered course while access loads');
  assert.equal(c.resolveCourse(null, owned(true, true)), 'en', 'owners of both land on English');
  assert.equal(c.resolveCourse('sv', owned(true, true)), 'sv');
  assert.equal(c.resolveCourse(null, owned(false, true)), 'sv', 'Swedish-only owner');
  assert.equal(c.resolveCourse('en', owned(false, true)), 'sv', 'a remembered course without access falls back');
  assert.equal(c.resolveCourse('sv', owned(true, false)), 'en', 'lost Swedish access never shows a locked screen');
  assert.equal(c.resolveCourse(null, owned(false, null)), 'sv', 'the course still being checked before a no-access screen');
  assert.equal(c.resolveCourse('sv', owned(true, null)), 'sv', 'a failed check does not move the student');
  assert.equal(c.resolveCourse('sv', owned(false, false)), 'en', 'no course: the English no-access state');

  assert.deepEqual(c.mergeOwnership(owned(true, null), { sv: false }), owned(true, false));
  assert.deepEqual(c.mergeOwnership(owned(true, true), {}), owned(true, true), 'failed checks keep the last known value');
  assert.deepEqual(c.mergeOwnership(owned(true, true), { en: false, sv: undefined }), owned(false, true));
  assert.deepEqual(c.ownedCourses(owned(true, true)), ['en', 'sv']);
  assert.deepEqual(c.ownedCourses(owned(null, true)), ['sv']);
  assert.deepEqual(c.ownedCourses(c.UNKNOWN_OWNERSHIP), []);

  assert.equal(c.parseStoredCourse('sv'), 'sv');
  assert.equal(c.parseStoredCourse(null), null);
  assert.equal(c.parseStoredCourse('de'), null, 'a value from a future build is ignored');
});

test('checkCourseAccess asks the server about the given course only', async t => {
  const requests = [];
  let reply = { hasAccess: true, courseType: 'ruotsin-abikurssi' };
  t.mock.method(globalThis, 'fetch', async (url, init) => { requests.push({ url, method: init.method, auth: init.headers.Authorization }); return { ok: true, status: 200, json: async () => reply }; });
  const supabase = { auth: { getSession: async () => ({ data: { session: { access_token: 'token' } }, error: null }) } };
  const api = load(lib('api.ts'), { './config': { config: { apiUrl: 'https://api.test' } }, './courses': c, './supabase': { supabase } });
  assert.equal(await api.checkCourseAccess('sv'), true);
  reply = { hasAccess: false, courseType: 'abikurssi' };
  assert.equal(await api.checkCourseAccess('en'), false);
  assert.deepEqual(requests, [
    { url: 'https://api.test/api/courses/check-access?courseType=ruotsin-abikurssi', method: 'GET', auth: 'Bearer token' },
    { url: 'https://api.test/api/courses/check-access?courseType=abikurssi', method: 'GET', auth: 'Bearer token' },
  ]);
  reply = { courses: { abikurssi: true } };
  await assert.rejects(api.checkCourseAccess('en'), /Palvelimen vastausta ei voitu lukea/, 'a malformed answer is an error, never access');
});

test('theory loads the selected course from the content route', async () => {
  const urls = [];
  const course = load(lib('course.ts'), { './api': { apiRequest: async url => { urls.push(url); return { theory: [], topics: [] }; } }, './courses': c });
  await course.loadContent('en');
  await course.loadContent('sv');
  assert.deepEqual(urls, ['/api/abikurssi/content', '/api/abikurssi/content?course=sv']);
});

// The website's catalogue is the source of truth; check it when the website checkout is next to the app.
test('the registry matches the website course catalogue', () => {
  const file = path.resolve(__dirname, '../../opiskeluakatemia/src/lib/courses.ts');
  if (!fs.existsSync(file)) return;
  const web = load(file, { './constants': { ABIKURSSI_ACCESS_UNTIL: '2027-03-22', RUOTSI_ACCESS_UNTIL: '2027-09-27' } });
  assert.deepEqual([...web.COURSE_IDS], [...c.COURSE_IDS]);
  for (const id of c.COURSE_IDS) {
    assert.equal(c.COURSES[id].courseType, web.COURSES[id].courseType, `${id} course type`);
    assert.equal(c.COURSES[id].label, web.COURSES[id].name, `${id} name`);
    assert.equal(c.COURSES[id].pathBase, web.COURSES[id].pathApiBase, `${id} Polku base`);
  }
});

test('the mascot intro is dismissed per course and English keeps its stored flag', async () => {
  const store = new Map([['mascot.introDismissed', '1']]);
  const writes = [];
  const AsyncStorage = {
    multiGet: async keys => keys.map(key => [key, store.has(key) ? store.get(key) : null]),
    multiSet: async pairs => { writes.push(...pairs); for (const [key, value] of pairs) store.set(key, value); },
  };
  const react = { useEffect: effect => { effect(); }, useState: value => [value, () => undefined] };
  const mascot = { introDismissedKey: id => (id === 'en' ? 'mascot.introDismissed' : `mascot.introDismissed.${id}`) };
  const flags = load(path.resolve(__dirname, '../src/hooks/useMascotFlags.ts'), {
    react, '@react-native-async-storage/async-storage': { __esModule: true, default: AsyncStorage }, '../lib/courses': c, '../lib/mascot': mascot,
  });
  flags.useMascotFlags();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(flags.useMascotFlags().introDismissed, { en: true, sv: false }, 'skipping the English intro still greets a Swedish beginner');
  flags.dismissIntro('sv');
  assert.deepEqual(flags.useMascotFlags().introDismissed, { en: true, sv: true });
  assert.deepEqual(writes, [['mascot.introDismissed.sv', '1']]);
});

// Replays CourseProvider transitions: [signed-in user, action?] per step.
function replay(steps, state = c.INITIAL_SELECTION) {
  const writes = [];
  for (const [userId, action] of steps) {
    const step = c.courseSelectionStep(state, userId, action);
    if (step.write !== undefined) writes.push(step.write);
    state = step.state;
  }
  return { state, writes, course: c.resolveCourse(state.preferred, state.owned) };
}
const loaded = course => ({ type: 'loaded', course });
const chosen = course => ({ type: 'chosen', course });
const access = (userId, results) => ({ type: 'access', userId, results });
const both = { en: true, sv: true };

test('course selection: the stored course, access and the switcher', () => {
  let r = replay([['A'], ['A', loaded('sv')], ['A', access('A', both)]]);
  assert.equal(r.course, 'sv');
  assert.deepEqual(r.writes, [], 'an owned stored course is not rewritten');
  r = replay([['A'], ['A', loaded('sv')], ['A', access('A', { en: true, sv: false })]]);
  assert.equal(r.course, 'en');
  assert.deepEqual(r.writes, ['en'], 'a stored Swedish course without access falls back and is overwritten');
  r = replay([['A'], ['A', loaded(null)], ['A', access('A', { en: false, sv: true })]]);
  assert.equal(r.course, 'sv');
  assert.deepEqual(r.writes, ['sv'], 'a Swedish-only owner is remembered once access confirms it');

  r = replay([['A'], ['A', access('A', both)]]);
  assert.deepEqual(r.writes, [], 'nothing is written before the stored course is read');
  r = replay([['A', loaded('sv')]], r.state);
  assert.equal(r.course, 'sv', 'a fast access check never overwrites the remembered course');
  assert.deepEqual(r.writes, []);

  r = replay([['A'], ['A', chosen('sv')], ['A', loaded('en')], ['A', access('A', both)]]);
  assert.equal(r.course, 'sv', 'a choice made before the storage read finishes wins');
  assert.deepEqual(r.writes, ['sv']);
  r = replay([['A', access('A', {})]], r.state);
  assert.equal(r.course, 'sv', 'a failed check keeps the last known access');
  assert.deepEqual(r.writes, []);
  r = replay([['A', chosen('en')]], r.state);
  assert.equal(r.course, 'en');
  assert.deepEqual(r.writes, ['en']);

  r = replay([[null], [null, loaded('sv')], [null, access('A', both)]]);
  assert.deepEqual(r.state.owned, c.UNKNOWN_OWNERSHIP, 'no access is taken while signed out');
  assert.deepEqual(r.writes, [], 'a signed-out device stores nothing');

  const settled = replay([['A'], ['A', loaded('sv')], ['A', access('A', both)]]).state;
  assert.equal(c.courseSelectionStep(settled, 'A').state, settled, 'no change, same state: the provider does not re-render');
  assert.equal(c.courseSelectionStep(settled, 'A', access('B', { sv: false })).state, settled, "another user's report is ignored");
});

test('course selection: sign-out and another account never keep or write the previous course', () => {
  const settled = replay([['A'], ['A', loaded('sv')], ['A', access('A', both)]]).state;
  let r = replay([[null]], settled);
  assert.deepEqual(r.writes, [null], 'sign-out removes the stored course');
  assert.equal(r.state.preferred, null);
  assert.deepEqual(r.state.owned, c.UNKNOWN_OWNERSHIP);
  r = replay([['B'], ['B', access('B', both)]], r.state);
  assert.equal(r.course, 'en', "the next account starts from its own first owned course, not the previous user's");
  assert.deepEqual(r.writes, ['en']);

  // A direct account switch (no signed-out state in between).
  r = replay([['B']], settled);
  assert.deepEqual(r.writes, [null], "only a removal: the previous user's course is never written back");
  assert.equal(r.course, 'en');
  assert.deepEqual(r.state.owned, c.UNKNOWN_OWNERSHIP);
  r = replay([['B', access('A', both)], ['B', loaded('sv')]], r.state);
  assert.deepEqual(r.state.owned, c.UNKNOWN_OWNERSHIP, "a late report for the previous user is ignored");
  assert.equal(r.state.preferred, null, 'a storage read finishing after the switch is ignored');
  assert.deepEqual(r.writes, []);
  // The switch while the stored course is still being read.
  r = replay([['A'], ['B'], ['B', loaded('sv')], ['B', access('B', both)]]);
  assert.equal(r.course, 'en');
  assert.deepEqual(r.writes, [null, 'en']);
});

test('home access checks map per course; a failed check is left out of the trusted results', () => {
  assert.deepEqual(c.CHECKING_ACCESS, { en: 'loading', sv: 'loading' });
  let r = c.accessFromChecks([{ status: 'fulfilled', value: true }, { status: 'rejected', reason: new Error('Palvelin ei vastannut.') }]);
  assert.deepEqual(r.access, { en: 'active', sv: 'error' }, 'a failing Swedish check never hides an active English course');
  assert.deepEqual(r.errors, { sv: 'Palvelin ei vastannut.' });
  assert.deepEqual(r.known, { en: true });
  r = c.accessFromChecks([{ status: 'rejected', reason: 'offline' }, { status: 'fulfilled', value: false }]);
  assert.deepEqual(r.access, { en: 'error', sv: 'inactive' });
  assert.deepEqual(r.errors, { en: 'Yhteys ei onnistunut. Tarkista verkkoyhteys ja yritä uudelleen.' });
  assert.deepEqual(r.known, { sv: false });
});

test('the English exercise history reads only English attempts', async () => {
  const calls = [];
  let missingColumn = false;
  let failure = null;
  const from = table => {
    const filters = [];
    const query = {
      select: () => query,
      eq: (column, value) => { filters.push([column, value]); return query; },
      order: () => query,
      limit: async () => {
        calls.push([table, filters]);
        if (failure) return { data: null, error: failure };
        if (missingColumn && filters.some(([column]) => column === 'course_type')) return { data: null, error: { code: '42703', message: `column ${table}.course_type does not exist` } };
        return { data: [{ id: table, submitted_at: '2026-10-30T09:05:00Z', score_percentage: 70 }], error: null };
      },
    };
    return query;
  };
  const supabase = { auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) }, from };
  const exercises = load(lib('exercises.ts'), { './api': {}, './courses': c, './exercise-model': {}, './supabase': { supabase } });
  const english = [['user_id', 'u1'], ['course_type', 'abikurssi']];
  let rows = await exercises.loadHistory();
  assert.deepEqual(calls, [['grammar_attempts', english], ['reading_attempts', english], ['listening_attempts', english]]);
  assert.deepEqual(rows.map(row => row.category).sort(), ['grammar', 'listening', 'reading']);

  // Before the course migration every attempt is English: the read is retried without the column.
  missingColumn = true; calls.length = 0;
  rows = await exercises.loadHistory();
  assert.equal(rows.length, 3);
  assert.deepEqual(calls.filter(([, filters]) => filters.length === 1).map(([table]) => table).sort(), ['grammar_attempts', 'listening_attempts', 'reading_attempts']);

  failure = { code: 'PGRST301', message: 'JWT expired' };
  await assert.rejects(exercises.loadHistory(), /Historiaa ei voitu hakea/, 'other errors still fail');
});

test('CourseProvider applies the stored course, choices and an account switch in order', async () => {
  let session = { user: { id: 'A' } };
  let finishRead;
  const writes = [];
  const AsyncStorage = {
    getItem: () => new Promise(resolve => { finishRead = resolve; }),
    setItem: async (key, value) => { writes.push([key, value]); },
    removeItem: async key => { writes.push([key, null]); },
  };
  // A minimal hooks runtime for one component: state, refs, memos, and effects after each render.
  const slots = [];
  let index = 0;
  let pending = [];
  const same = (a, b) => a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const memo = (make, deps) => { const i = index++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: make(), deps }; return slots[i].value; };
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useContext: () => null,
    useState: initial => { const i = index++; slots[i] ??= { value: initial }; const slot = slots[i]; return [slot.value, value => { slot.value = typeof value === 'function' ? value(slot.value) : value; }]; },
    useRef: initial => { const i = index++; slots[i] ??= { current: initial }; return slots[i]; },
    useMemo: memo,
    useCallback: (fn, deps) => memo(() => fn, deps),
    useEffect: (effect, deps) => {
      const i = index++; const previous = slots[i];
      if (previous && same(previous.deps, deps)) return;
      const slot = slots[i] = { deps };
      pending.push(() => { previous?.cleanup?.(); slot.cleanup = effect(); });
    },
  };
  const { CourseProvider } = load(path.resolve(__dirname, '../src/providers/CourseProvider.tsx'), {
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    '@react-native-async-storage/async-storage': { __esModule: true, default: AsyncStorage },
    './SessionProvider': { useSession: () => ({ session }) }, '../lib/courses': c,
  });
  // One render and its effects; returns the context value that render provided.
  const render = () => {
    index = 0; pending = [];
    const value = CourseProvider({ children: null }).props.value;
    const effects = pending; pending = [];
    for (const effect of effects) effect();
    return value;
  };
  const settle = async () => { await new Promise(resolve => setImmediate(resolve)); render(); return render(); };

  let value = render();
  assert.equal(value.course, 'en');
  finishRead('sv');
  value = await settle();
  assert.equal(value.course, 'sv', 'the remembered course opens');
  value.reportAccess('A', both);
  value = await settle();
  assert.equal(value.course, 'sv');
  assert.deepEqual(value.owned, both);
  assert.deepEqual(writes, []);
  value.reportAccess('B', { sv: false });
  value.choose('en');
  value = await settle();
  assert.equal(value.course, 'en');
  assert.deepEqual(value.owned, both, "another user's report is ignored");
  value.choose('sv');
  value = await settle();
  assert.deepEqual(writes, [['oa.course.v1', 'en'], ['oa.course.v1', 'sv']]);

  // Another account without signing out: the first render already shows the reset state, and
  // the only write removes the previous user's course.
  session = { user: { id: 'B' } };
  value = render();
  assert.equal(value.course, 'en');
  assert.deepEqual(value.owned, c.UNKNOWN_OWNERSHIP);
  value = await settle();
  value.reportAccess('A', both);
  value = await settle();
  assert.deepEqual(value.owned, c.UNKNOWN_OWNERSHIP);
  assert.deepEqual(writes.slice(2), [['oa.course.v1', null]]);
  value.reportAccess('B', { en: false, sv: true });
  value = await settle();
  assert.equal(value.course, 'sv');
  session = null;
  value = await settle();
  assert.deepEqual(writes.slice(2), [['oa.course.v1', null], ['oa.course.v1', 'sv'], ['oa.course.v1', null]], 'sign-out removes it again');
  assert.deepEqual(value.owned, c.UNKNOWN_OWNERSHIP);
});
