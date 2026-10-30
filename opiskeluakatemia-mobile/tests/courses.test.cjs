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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
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
