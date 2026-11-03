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
const root = path.resolve(__dirname, '..');
const lib = file => path.join(root, 'src/lib', file);
const courses = load(lib('courses.ts'));
const store = load(lib('store.ts'), { './courses': courses });
const origin = load(lib('api-origin.ts'));
const signup = load(lib('signup.ts'), { './api-origin': origin, './store': store });
const { createPurchaseService } = load(lib('iap-service.ts'), { './store': store });

const EN = 'fi.opiskeluakatemia.app.englannin_abikurssi';
const SV = 'fi.opiskeluakatemia.app.ruotsin_abikurssi';
const NOW = Date.parse('2026-11-02T12:00:00Z');
const JWS = 'eyJhbGciOiJFUzI1NiJ9.eyJ0cmFuc2FjdGlvbklkIjoiMSJ9.c2lnbmF0dXJl';
const ACCESS_BODY = { courses: { abikurssi: true, 'ruotsin-abikurssi': false }, paid: { abikurssi: true, 'ruotsin-abikurssi': false }, trials: { abikurssi: { remainingMs: 0 } } };

test('product ids follow the contract and map back to courses', () => {
  assert.deepEqual({ ...store.APPLE_PRODUCT_IDS }, { abikurssi: EN, 'ruotsin-abikurssi': SV });
  assert.equal(store.productIdFor('en'), EN);
  assert.equal(store.productIdFor('sv'), SV);
  assert.deepEqual([...store.STORE_SKUS], [EN, SV]);
  assert.equal(store.courseForProductId(SV), 'sv');
  for (const other of ['fi.opiskeluakatemia.app.other', '', null, undefined, 'abikurssi']) assert.equal(store.courseForProductId(other), null);
  assert.equal(store.CLAIM_PATH, '/api/iap/apple/claim');
  assert.equal(store.CATALOG_PATH, '/api/iap/apple/catalog');
  assert.equal(store.ACCESS_ALL_PATH, '/api/courses/check-access?courseType=all');
  assert.equal(store.LINK_PURCHASES_PATH, '/api/courses/link-purchases');
  assert.equal(store.TRIAL_PATH, '/api/courses/trial');
});

test('only iOS gets a store, prices, a trial button or sign-up; Android and web get none', () => {
  assert.equal(store.storeEnabled('ios'), true);
  assert.equal(signup.signUpEnabled('ios'), true);
  const access = store.parseStoreAccess({ courses: { abikurssi: false, 'ruotsin-abikurssi': false }, paid: { abikurssi: false, 'ruotsin-abikurssi': false }, trials: {} }, NOW);
  const catalog = { en: { productId: EN, accessUntil: '2027-03-22', onSale: true }, sv: { productId: SV, accessUntil: '2027-09-27', onSale: true } };
  for (const platform of ['android', 'web', 'windows', 'macos', '', undefined]) {
    assert.equal(store.storeEnabled(platform), false, String(platform));
    assert.equal(signup.signUpEnabled(platform), false, String(platform));
    assert.equal(store.storeOffers(platform, access, catalog, NOW), null, `${platform}: no offers at all`);
  }
  const ios = store.storeOffers('ios', access, catalog, NOW);
  assert.equal(ios.en.state, 'trial-available');
  assert.equal(ios.sv.showBuy, true);
});

test('the server catalog is parsed strictly; the app holds no season dates of its own', () => {
  const catalog = store.parseCatalog({ products: [
    { courseType: 'abikurssi', productId: EN, accessUntil: '2027-03-22', onSale: true },
    { courseType: 'ruotsin-abikurssi', productId: SV, accessUntil: '2027-09-27', onSale: false },
    { courseType: 'abikurssit-en-sv', productId: 'x', accessUntil: '2027-09-27', onSale: true },
  ] });
  assert.deepEqual(catalog, { en: { productId: EN, accessUntil: '2027-03-22', onSale: true, trial: true }, sv: { productId: SV, accessUntil: '2027-09-27', onSale: false, trial: true } });
  // App Review fallback: the server can switch the iOS trial off per course without a new binary.
  const noTrial = store.parseCatalog({ products: [{ courseType: 'abikurssi', productId: EN, accessUntil: '2027-03-22', onSale: true, trial: false }] });
  assert.equal(noTrial.en.trial, false);
  const fresh = { courses: { en: false, sv: false }, paid: { en: false, sv: false }, trials: { en: { kind: 'none' }, sv: { kind: 'none' } } };
  const offer = store.offerForCourse('en', fresh, noTrial.en, NOW);
  assert.deepEqual([offer.state, offer.showBuy, offer.showTrial], ['buy', true, false]);
  assert.deepEqual(store.parseCatalog({ products: [{ courseType: 'abikurssi', productId: SV, accessUntil: '2027-03-22', onSale: true }] }), {}, 'another course\'s product id is dropped');
  assert.deepEqual(store.parseCatalog({ products: [{ courseType: 'abikurssi', productId: EN, accessUntil: '22.3.2027', onSale: true }] }), {});
  assert.deepEqual(store.parseCatalog({ products: [{ courseType: 'abikurssi', productId: EN, accessUntil: '2027-03-22', onSale: 'yes' }] }), {});
  assert.throws(() => store.parseCatalog({}), /Kurssikaupan tietoja/);
  assert.throws(() => store.parseCatalog(null));
  const source = fs.readFileSync(lib('store.ts'), 'utf8');
  assert.ok(!/20\d\d-\d\d-\d\d['"]/.test(source), 'no season date literal in store.ts');
});

test('check-access?courseType=all: paid, trials (none, running, used) and malformed answers', () => {
  const body = {
    courses: { abikurssi: true, 'ruotsin-abikurssi': false },
    paid: { abikurssi: false, 'ruotsin-abikurssi': false },
    trials: { abikurssi: { startedAt: 'a', endsAt: 'b', remainingMs: 25 * 60000 }, 'ruotsin-abikurssi': { startedAt: 'a', endsAt: 'b', remainingMs: 0 } },
  };
  const access = store.parseStoreAccess(body, NOW);
  assert.deepEqual(access.courses, { en: true, sv: false });
  assert.deepEqual(access.trials.en, { kind: 'running', endsAtMs: NOW + 25 * 60000 });
  assert.deepEqual(access.trials.sv, { kind: 'used' });
  assert.deepEqual(store.parseStoreAccess({ ...body, trials: { abikurssi: null } }, NOW).trials, { en: { kind: 'none' }, sv: { kind: 'none' } });
  assert.throws(() => store.parseStoreAccess({ courses: body.courses }, NOW), /Palvelimen vastausta/, 'missing paid never shows Buy to an owner');
  assert.throws(() => store.parseStoreAccess({ courses: { abikurssi: 'true' }, paid: body.paid }, NOW));
});

test('the store links web guest checkouts before checking access; a failed link never blocks the check', async () => {
  const LINK = store.LINK_PURCHASES_PATH; const ACCESS = store.ACCESS_ALL_PATH; const CATALOG = store.CATALOG_PATH;
  const catalogBody = { products: [{ courseType: 'abikurssi', productId: EN, accessUntil: '2027-03-22', onSale: true }] };
  // A guest checkout on the web: pending_activation until link-purchases attaches it.
  let linked = false;
  const calls = [];
  let finishLink;
  const request = (path, options = {}) => {
    calls.push([path, options.method ?? 'GET', options.timeout]);
    if (path === LINK) return new Promise(resolve => { finishLink = () => { linked = true; resolve({ linked: 1 }); }; });
    if (path === ACCESS) return Promise.resolve({ courses: { abikurssi: linked, 'ruotsin-abikurssi': false }, paid: { abikurssi: linked, 'ruotsin-abikurssi': false }, trials: {} });
    if (path === CATALOG) return Promise.resolve(catalogBody);
    return Promise.reject(new Error(path));
  };
  const loading = store.fetchStoreState(request, () => NOW);
  await new Promise(resolve => setTimeout(resolve, 1));
  assert.deepEqual(calls, [[LINK, 'POST', store.LINK_TIMEOUT_MS], [CATALOG, 'GET', undefined]], 'check-access waits for link-purchases; the catalog does not');
  assert.ok(store.LINK_TIMEOUT_MS <= 10000, 'a short timeout of its own');
  finishLink();
  const state = await loading;
  assert.deepEqual(calls.map(call => call[0]), [LINK, CATALOG, ACCESS]);
  assert.equal(state.receivedAt, NOW);
  assert.equal(store.offerForCourse('en', state.access, state.catalog.en, NOW).state, 'owned', 'no Buy for a course bought on the web');

  // link-purchases fails (5xx, network, timeout): check-access runs anyway.
  for (const failure of [httpError(500), new Error('Palvelu ei vastannut ajoissa.')]) {
    const seen = [];
    const failing = (path) => {
      seen.push(path);
      if (path === LINK) return Promise.reject(failure);
      return Promise.resolve(path === ACCESS ? ACCESS_BODY : catalogBody);
    };
    const result = await store.fetchStoreState(failing, () => NOW);
    assert.deepEqual(seen, [LINK, CATALOG, ACCESS]);
    assert.equal(result.access.paid.en, true);
  }
  // A failed or malformed access check is still an error: never a Buy on a guess.
  await assert.rejects(store.fetchStoreState(path => path === ACCESS ? Promise.reject(httpError(500)) : Promise.resolve(catalogBody)));
  await assert.rejects(store.fetchStoreState(path => Promise.resolve(path === ACCESS ? { courses: {} } : catalogBody)), /Palvelimen vastausta/);
});

test('CTA mapping: owned, trial running, trial available, buy, not on sale', () => {
  const access = (paid, trial) => ({ courses: { en: false, sv: false }, paid: { en: paid, sv: false }, trials: { en: trial, sv: { kind: 'none' } } });
  const onSale = { productId: EN, accessUntil: '2027-03-22', onSale: true };
  const closed = { ...onSale, onSale: false };
  const offer = (a, c) => store.offerForCourse('en', a, c, NOW);

  let o = offer(access(true, { kind: 'none' }), onSale);
  assert.deepEqual([o.state, o.showBuy, o.showTrial], ['owned', false, false], 'an owner is never offered a second purchase');
  assert.equal(o.accessUntilLabel, null, "an owner is not told the catalog's season end as their own");
  o = offer(access(false, { kind: 'running', endsAtMs: NOW + 90_001 }), onSale);
  assert.deepEqual([o.state, o.showBuy, o.showTrial, o.trialMinutesLeft], ['trial-running', true, false, 2]);
  assert.equal(o.accessUntilLabel, '22.3.2027');
  o = offer(access(false, { kind: 'running', endsAtMs: NOW + 1000 }), closed);
  assert.deepEqual([o.state, o.showBuy, o.accessUntilLabel], ['trial-running', false, null], 'a running trial stays visible after the sale ends, without Buy or purchase terms');
  o = offer(access(false, { kind: 'running', endsAtMs: NOW - 1 }), onSale);
  assert.equal(o.state, 'buy', 'an ended trial (local clock) is a plain Buy');
  o = offer(access(false, { kind: 'none' }), onSale);
  assert.deepEqual([o.state, o.showBuy, o.showTrial, o.accessUntilLabel], ['trial-available', true, true, '22.3.2027']);
  o = offer(access(false, { kind: 'used' }), onSale);
  assert.deepEqual([o.state, o.showBuy, o.showTrial], ['buy', true, false]);
  for (const catalog of [closed, null, undefined]) {
    o = offer(access(false, { kind: 'none' }), catalog);
    assert.deepEqual([o.state, o.showBuy, o.showTrial, o.accessUntilLabel], ['not-on-sale', false, false, null]);
  }
  o = offer(null, onSale);
  assert.deepEqual([o.state, o.showBuy], ['not-on-sale', false], 'nothing is sold before access is known');
  assert.equal(store.finnishDate('2027-09-27'), '27.9.2027');
  assert.equal(store.finnishDate('soon'), null);
  assert.equal(store.accessLine('22.3.2027'), 'Käyttöoikeus 22.3.2027 asti · kertaosto, ei uusiudu');
});

test('the trial disclosure states the duration, what happens after it and the StoreKit price', () => {
  const text = store.trialDisclosure('sv', '49,99 €');
  for (const part of ['60 minuutiksi', 'lukittuu', '49,99 €', 'Ruotsin abikurssi', 'kerran']) assert.ok(text.includes(part), part);
  assert.equal(store.TRIAL_MINUTES, 60);
});

test('no price is written in the app: it always comes from StoreKit', () => {
  const files = ['App.tsx', 'src/app/store.tsx', 'src/app/settings.tsx', 'src/lib/store.ts', 'src/lib/signup.ts', 'src/lib/iap-service.ts', 'src/providers/IapProvider.tsx', 'src/lib/iap-native.ios.ts'];
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(!/\d+[,.]\d\d\s*(€|EUR|euroa)/i.test(source), `${file} has a hard-coded price`);
    assert.ok(!/hankki-paasy|stripe|44,99|49,99/i.test(source), `${file} mentions a web price or checkout`);
  }
  // Store copy stays out of the course registry that Android renders.
  const registry = JSON.stringify(courses.COURSES).toLowerCase();
  for (const line of Object.values(store.STORE_COPY).flatMap(entry => entry.includes)) assert.ok(!registry.includes(line.toLowerCase()), line);
});

test('purchase, claim and trial outcomes have Finnish copy; cancel is silent', () => {
  assert.equal(store.purchaseErrorMessage('user-cancelled'), null);
  assert.match(store.purchaseErrorMessage('deferred-payment').text, /odottaa huoltajan hyväksyntää/);
  assert.equal(store.purchaseErrorMessage('deferred-payment').tone, 'info');
  assert.match(store.purchaseErrorMessage('iap-not-available').text, /Ruutuajan/);
  assert.match(store.purchaseErrorMessage('network-error').text, /verkkoyhteys/);
  assert.match(store.purchaseErrorMessage('network').text, /verkkoyhteys/);
  assert.match(store.purchaseErrorMessage('sku-not-found').text, /App Storesta/);
  assert.match(store.purchaseErrorMessage('anything-else').text, /Osto ei onnistunut/);

  assert.match(store.claimErrorMessage(409, 'account_mismatch').text, /toiseen Opiskeluakatemia-tiliin/);
  assert.match(store.claimErrorMessage(400, 'invalid_transaction').text, /ei voitu vahvistaa/);
  assert.match(store.claimErrorMessage(503, 'unavailable').text, /Maksu on tallessa/);
  assert.match(store.claimErrorMessage(undefined, undefined).text, /Maksu on tallessa/, 'a network failure keeps the purchase');
  assert.match(store.claimErrorMessage(500, undefined).text, /Maksu on tallessa/);

  assert.deepEqual(store.parseClaimResponse({ ok: true, courseType: 'abikurssi', environment: 'Sandbox', status: 'active', access: {} }, NOW), { courseType: 'abikurssi', environment: 'Sandbox', status: 'active', access: null }, 'unreadable access is null, not an error');
  assert.deepEqual(store.parseClaimResponse({ ok: true, courseType: 'abikurssi', environment: 'Production', status: 'active', access: ACCESS_BODY }, NOW).access,
    { courses: { en: true, sv: false }, paid: { en: true, sv: false }, trials: { en: { kind: 'used' }, sv: { kind: 'none' } } });
  assert.equal(store.parseClaimResponse({ ok: true, courseType: 'abikurssi', environment: 'Production', status: 'active', access: null }, NOW).access, null);
  const before = { courses: { en: false, sv: true }, paid: { en: false, sv: false }, trials: { en: { kind: 'used' }, sv: { kind: 'running', endsAtMs: NOW + 1 } } };
  assert.deepEqual(store.markOwned(before, 'en'), { courses: { en: true, sv: true }, paid: { en: true, sv: false }, trials: before.trials });
  assert.equal(before.paid.en, false, 'markOwned does not mutate');
  assert.equal(store.parseClaimResponse({ ok: false }), null);
  assert.equal(store.parseClaimResponse({ ok: true, courseType: 'abikurssi', status: 'pending' }), null);
  assert.match(store.claimSuccessMessage({ courseType: 'ruotsin-abikurssi', environment: 'Production', status: 'active' }, true).text, /Ruotsin abikurssi on nyt käytössäsi/);
  assert.equal(store.claimSuccessMessage({ courseType: 'ruotsin-abikurssi', environment: 'Production', status: 'active' }, true).course, 'sv', 'shown only on its own course home');
  assert.equal(store.trialStartedMessage('en').course, 'en');
  assert.match(store.claimSuccessMessage({ courseType: 'abikurssi', environment: 'Production', status: 'expired' }, false).text, /kurssikausi on jo päättynyt/);

  assert.match(store.trialErrorMessage(403, 'email_unconfirmed').text, /Vahvista ensin sähköpostiosoitteesi/);
  assert.match(store.trialErrorMessage(409, 'trial_used').text, /jo käyttänyt/);
  assert.match(store.trialErrorMessage(409, 'already_owned').text, /jo käytössäsi/);
  assert.match(store.trialErrorMessage(503, 'unavailable').text, /hetken päästä/);
  assert.match(store.trialErrorMessage(undefined, undefined).text, /verkkoyhteys/);
  assert.match(store.trialStartedMessage('en').text, /60 minuuttia/);

  assert.equal(store.isJws(JWS), true);
  for (const token of ['2000000123456789', 'a.b', '', null, 'a.b.c.d', 'a.b.c d']) assert.equal(store.isJws(token), false, String(token));
});

test('sign-up: website password rule, Finnish errors, the confirmation page and the existing-account case', () => {
  assert.equal(signup.EMAIL_CONFIRMED_URL, 'https://opiskeluakatemia.fi/sahkoposti-vahvistettu');
  assert.equal(signup.MIN_PASSWORD_LENGTH, 6);
  assert.equal(signup.signUpProblem('a@b.fi', 'salasana', 'salasana'), null);
  assert.match(signup.signUpProblem('', 'x', 'x'), /Täytä/);
  assert.match(signup.signUpProblem('ab.fi', 'salasana', 'salasana'), /sähköpostiosoite/);
  assert.match(signup.signUpProblem('a@b.fi', '12345', '12345'), /vähintään 6/);
  assert.match(signup.signUpProblem('a@b.fi', 'salasana', 'salasanA'), /eivät täsmää/);
  assert.match(signup.signUpErrorMessage({ code: 'user_already_exists' }), /on jo tili/);
  assert.match(signup.signUpErrorMessage({ code: 'weak_password' }), /liian heikko/);
  assert.match(signup.signUpErrorMessage({ code: 'over_email_send_rate_limit', status: 429 }), /Liian monta/);
  assert.match(signup.signUpErrorMessage({ message: 'User already registered' }), /on jo tili/);
  assert.match(signup.signUpErrorMessage(new Error('boom')), /epäonnistui/);
  assert.equal(signup.signUpOutcome({ user: { identities: [{}] }, session: null }), 'confirm');
  assert.equal(signup.signUpOutcome({ user: { identities: [] }, session: null }), 'exists');
  assert.equal(signup.signUpOutcome({ user: {}, session: { access_token: 'x' } }), 'signed-in');
  assert.deepEqual(signup.signInErrorMessage({ code: 'email_not_confirmed' }).unconfirmed, true);
  assert.equal(signup.signInErrorMessage({ code: 'invalid_credentials' }).text, 'Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana sekä verkkoyhteys.', 'the old copy is kept');
  assert.match(signup.resendErrorMessage({ status: 429 }), /Liian monta/);
});

// A StoreKit stand-in: records finished transactions and calls.
function fakeNative({ pending = [], entitlements = [[]], buyError = null, buyResult = [], syncError = null } = {}) {
  const calls = { finished: [], synced: 0, entitlements: 0, bought: [] };
  return {
    calls,
    connect: async () => true,
    disconnect: async () => undefined,
    prices: async () => ({}),
    buy: async (sku, token) => { calls.bought.push([sku, token]); if (buyError) throw buyError; return buyResult; },
    finish: async purchase => { calls.finished.push(purchase.transactionId); },
    pending: async () => pending,
    entitlements: async () => entitlements[Math.min(calls.entitlements++, entitlements.length - 1)],
    sync: async () => { calls.synced++; if (syncError) throw syncError; },
    onPurchase: () => ({ remove() {} }),
    onError: () => ({ remove() {} }),
    errorCode: error => error?.code,
  };
}
const purchase = (transactionId, extra = {}) => ({ transactionId, productId: EN, token: JWS, state: 'purchased', transactionDate: 0, raw: {}, ...extra });
const httpError = (status, code) => Object.assign(new Error('failed'), { status, code });
function service(native, claim) {
  const said = []; const grants = []; const claims = []; const activity = []; const unsettled = [];
  let clock = 0;
  const s = createPurchaseService({
    native, say: message => said.push(message), verifying: value => activity.push(value), now: () => clock, eventWaitMs: 20,
    granted: (course, access) => { grants.push({ course, access }); activity.push(`granted:${course}`); },
    unsettled: courses => { unsettled.push(courses); activity.push(`unsettled:${courses.join(',')}`); },
    claim: async token => { claims.push(token); return claim(token, claims.length); },
  });
  return { s, said, claims, activity, grants, unsettled, granted: () => grants.length, tick: ms => { clock += ms; } };
}
const OK = { ok: true, courseType: 'abikurssi', environment: 'Production', status: 'active', access: {} };

test('a purchase is finished only after the server answered 2xx, once per transaction', async () => {
  const native = fakeNative();
  const t = service(native, async () => OK);
  // requestPurchase resolving and the listener firing for the same transaction: one claim.
  const [a, b] = await Promise.all([t.s.process(purchase('t1'), 'live'), t.s.process(purchase('t1'), 'live')]);
  assert.equal(a.outcome, 'active'); assert.equal(b.outcome, 'active');
  assert.deepEqual(t.claims, [JWS]);
  assert.deepEqual(native.calls.finished, ['t1']);
  assert.equal(t.granted(), 1);
  assert.deepEqual(t.grants, [{ course: 'en', access: null }]);
  assert.deepEqual(t.activity, [true, 'granted:en', false], 'the course is marked owned before verifying ends (no window with Buy enabled)');
  assert.equal(t.said.length, 1);
  assert.equal(t.said[0].tone, 'success');
  await t.s.process(purchase('t1'), 'live');
  assert.deepEqual(t.claims, [JWS], 'a finished transaction is not claimed again in this session');

  // Already recorded on the server (idempotent 200): still finished.
  const again = fakeNative();
  const u = service(again, async () => ({ ...OK }));
  await u.s.process(purchase('t2'), 'quiet');
  assert.deepEqual(again.calls.finished, ['t2']);
});

test("the claim answer's access reaches the store before verifying ends", async () => {
  const native = fakeNative();
  const t = service(native, async () => ({ ...OK, access: ACCESS_BODY }));
  await t.s.process(purchase('t9'), 'live');
  assert.deepEqual(t.activity, [true, 'granted:en', false]);
  assert.equal(t.grants[0].access.paid.en, true, 'the owned course hides Buy at once, even if the later refresh fails');
});

test("a recorded claim opens the course only when the answer's access says paid, not by the row status", async () => {
  // Recorded as 'active', but access is closed (the Sandbox 14-day cap or the season's access_until passed).
  const closed = { courses: { abikurssi: false, 'ruotsin-abikurssi': false }, paid: { abikurssi: false, 'ruotsin-abikurssi': false }, trials: {} };
  const native = fakeNative();
  const t = service(native, async () => ({ ...OK, access: closed }));
  const result = await t.s.process(purchase('c1'), 'live');
  assert.equal(result.outcome, 'expired');
  assert.deepEqual(native.calls.finished, ['c1'], 'a settled 2xx is finished even when it opens nothing');
  assert.equal(t.granted(), 0, 'the course is not marked owned');
  assert.equal(t.said.length, 1);
  assert.equal(t.said[0].tone, 'info');
  assert.match(t.said[0].text, /Ostos löytyi, mutta sen käyttöoikeus on jo päättynyt/);
  assert.doesNotMatch(t.said[0].text, /käytössäsi/);
  assert.equal(t.said[0].course, 'en');

  // "Palauta ostokset" with such a purchase: no "Kurssi on käytössäsi".
  const restoring = fakeNative({ entitlements: [[purchase('c2')]] });
  const u = service(restoring, async () => ({ ...OK, access: closed }));
  await u.s.restore();
  assert.deepEqual(restoring.calls.finished, ['c2']);
  assert.equal(u.granted(), 0);
  assert.equal(u.said.length, 1);
  assert.match(u.said[0].text, /käyttöoikeus on jo päättynyt/);
  assert.doesNotMatch(u.said[0].text, /Ostot palautettu|käytössäsi/);

  // Paid access decides; the status only when the answer has no readable access.
  const opens = (status, access, course = 'en') => store.claimOpensCourse(store.parseClaimResponse({ ...OK, status, access }, NOW), course);
  assert.equal(opens('active', closed), false);
  assert.equal(opens('active', ACCESS_BODY), true);
  assert.equal(opens('active', ACCESS_BODY, 'sv'), false, 'per course');
  assert.equal(opens('expired', ACCESS_BODY), true, 'owned another way (web, bundle): the course is open');
  assert.equal(opens('active', null), true);
  assert.equal(opens('expired', null), false);
  assert.equal(opens('active', { courses: {} }), true, 'unreadable access falls back to the status');
  assert.equal(store.claimOpensCourse(null, 'en'), true, 'a 2xx without a readable body counts as recorded, as before');
  const opened = store.claimSuccessMessage({ courseType: 'abikurssi', environment: 'Sandbox', status: 'expired' }, true);
  assert.deepEqual([opened.tone, /on nyt käytössäsi/.test(opened.text)], ['success', true]);
  assert.match(store.restoreMessage(['expired'], null).text, /käyttöoikeus on jo päättynyt/);
  assert.match(store.restoreMessage(['expired', 'active'], null).text, /Ostot palautettu/);
});

test('400, 401, 409 without account_mismatch, 429, 5xx, timeouts and network failures never finish the transaction', async () => {
  for (const [error, pattern] of [
    // invalid_transaction is the server's only 400 code: a revoked transaction and a server
    // misconfiguration (bundle id, app id, product catalog) look the same, so a 400 is never settled.
    [httpError(400, 'invalid_transaction'), /ei voitu vahvistaa/],
    [httpError(400), /ei voitu vahvistaa/],
    [httpError(401), /Kirjaudu uudelleen/],
    [httpError(409), /toiseen Opiskeluakatemia-tiliin/],
    [httpError(429, 'rate_limited'), /Maksu on tallessa/],
    [httpError(503, 'unavailable'), /Maksu on tallessa/],
    [httpError(500), /Maksu on tallessa/],
    [new Error('Palvelu ei vastannut ajoissa. Tarkista verkkoyhteys ja yritä uudelleen.'), /Maksu on tallessa/],
    [new Error('Yhteys palvelimeen ei onnistunut.'), /Maksu on tallessa/],
  ]) {
    const native = fakeNative();
    const t = service(native, async () => { throw error; });
    const result = await t.s.process(purchase('t1'), 'live');
    assert.equal(result.outcome, 'failed');
    assert.deepEqual(native.calls.finished, [], `${error.status} ${error.code}`);
    assert.equal(t.granted(), 0);
    assert.match(t.said[0].text, pattern);
    assert.deepEqual(t.unsettled.at(-1), ['en'], 'Buy stays off for a payment the server has not confirmed');
    // A quiet retry in the same session (a return to the app) does not claim it again...
    await t.s.process(purchase('t1'), 'quiet');
    assert.equal(t.claims.length, 1);
    // ...but "Palauta ostokset" does, and the next launch (a new service) does.
    await t.s.process(purchase('t1'), 'restore');
    assert.equal(t.claims.length, 2);
    assert.equal(t.said.length, 1, 'retries fail quietly');
    const next = service(native, async () => { throw error; });
    await next.s.process(purchase('t1'), 'quiet');
    assert.equal(next.claims.length, 1);
    assert.deepEqual(native.calls.finished, []);
  }
});

test("a 409 account_mismatch (another account's purchase) is settled: finished once, never claimed again this session", async () => {
  for (const mode of ['live', 'quiet', 'restore']) {
    const native = fakeNative();
    const t = service(native, async () => { throw httpError(409, 'account_mismatch'); });
    const result = await t.s.process(purchase('m1'), mode);
    assert.equal(result.outcome, 'failed');
    assert.match(result.error.text, /toiseen Opiskeluakatemia-tiliin.*Palauta ostokset/);
    assert.deepEqual(native.calls.finished, ['m1'], `${mode}: finished, so StoreKit stops offering it on every launch`);
    assert.equal(t.granted(), 0);
    assert.deepEqual(t.unsettled.at(-1) ?? [], [], `${mode}: Buy is not held back for another account's purchase`);
    await t.s.process(purchase('m1'), 'quiet');
    assert.equal(t.claims.length, 1);
    assert.deepEqual(native.calls.finished, ['m1']);
  }
  // recoverPending on every return to the app: no claim, no "Vahvistetaan ostoa…" flash.
  const native = fakeNative({ pending: [purchase('m2')] });
  const t = service(native, async () => { throw httpError(409, 'account_mismatch'); });
  await t.s.recoverPending();
  const first = ['unsettled:en', true, 'unsettled:', false];
  assert.deepEqual(t.activity, first, 'Buy is off while the unfinished transaction is claimed, and back once it is settled');
  native.calls.finished.length = 0; // StoreKit would drop it now; this fake keeps offering it.
  await t.s.recoverPending();
  await t.s.recoverPending();
  assert.equal(t.claims.length, 1);
  assert.deepEqual(t.activity, first, 'later scans neither claim nor show verifying');
  assert.deepEqual(t.unsettled.at(-1), []);
  // A Buy on this account still works (its own, new purchase).
  await t.s.buy(EN, 'user-uuid');
  assert.deepEqual(native.calls.bought, [[EN, 'user-uuid']]);
  assert.equal(store.claimSettled(409, 'account_mismatch'), true);
  for (const [status, code] of [[409, undefined], [400, 'invalid_transaction'], [400, undefined], [401, undefined], [429, 'rate_limited'], [503, 'unavailable'], [500, undefined], [undefined, undefined]]) {
    assert.equal(store.claimSettled(status, code), false, `${status} ${code}`);
  }
});

test('an unfinished transaction whose claim fails is claimed quietly once per session, not on every return to the app', async () => {
  const native = fakeNative({ pending: [purchase('u1')], entitlements: [[purchase('u1')]] });
  let fail = true;
  const t = service(native, async () => { if (fail) throw httpError(503, 'unavailable'); return OK; });
  // Launch: StoreKit's listener replay and the launch scan see the same transaction; one claim.
  await t.s.onPurchase(purchase('u1'));
  await t.s.recoverPending();
  assert.equal(t.claims.length, 1);
  const afterLaunch = [...t.activity];
  for (let i = 0; i < 3; i++) await t.s.recoverPending(); // AppState 'active'
  assert.equal(t.claims.length, 1);
  assert.deepEqual(t.activity, afterLaunch, 'no "Vahvistetaan ostoa…" flash, Buy and restore stay usable');
  assert.deepEqual(native.calls.finished, []);
  assert.deepEqual(t.said, [], 'quiet');
  // "Palauta ostokset" still claims it; the 2xx finishes it and releases Buy.
  fail = false;
  await t.s.restore();
  assert.equal(t.claims.length, 2);
  assert.deepEqual(native.calls.finished, ['u1']);
  assert.deepEqual(t.unsettled.at(-1), []);
  assert.match(t.said.at(-1).text, /Ostot palautettu/);
});

test('non-JWS tokens, other products and Ask to Buy pending transactions are not claimed', async () => {
  const native = fakeNative();
  const t = service(native, async () => OK);
  assert.equal((await t.s.process(purchase('t1', { token: '2000000123' }), 'live')).outcome, 'failed');
  assert.equal((await t.s.process(purchase('t2', { productId: 'com.other' }), 'live')).outcome, 'skipped');
  assert.equal((await t.s.process(purchase('t3', { state: 'pending' }), 'live')).outcome, 'skipped');
  assert.deepEqual(t.claims, []);
  assert.deepEqual(native.calls.finished, []);
});

test('errors reach the user once; cancel is silent and Ask to Buy waits for approval', async () => {
  const cancelled = fakeNative({ buyError: { code: 'user-cancelled' } });
  let t = service(cancelled, async () => OK);
  await t.s.buy(EN, 'user-uuid');
  t.s.onError('user-cancelled');
  assert.deepEqual(t.said, []);
  assert.deepEqual(cancelled.calls.bought, [[EN, 'user-uuid']]);

  const deferred = fakeNative({ buyError: { code: 'deferred-payment' } });
  t = service(deferred, async () => OK);
  await t.s.buy(EN, 'user-uuid');
  t.s.onError('deferred-payment'); // expo-iap throws AND emits the same error
  assert.equal(t.said.length, 1);
  assert.match(t.said[0].text, /huoltajan hyväksyntää/);
  t.tick(5000);
  t.s.onError('deferred-payment');
  assert.equal(t.said.length, 2, 'a later, separate error is shown again');
});

test('launch recovery claims unfinished transactions through the same path', async () => {
  const native = fakeNative({ pending: [purchase('p1'), purchase('p2', { productId: SV })] });
  const t = service(native, async () => ({ ...OK, courseType: 'ruotsin-abikurssi' }));
  await t.s.recoverPending();
  assert.deepEqual(native.calls.finished, ['p1', 'p2']);
  assert.equal(t.claims.length, 2);
});

test('restore claims current entitlements; AppStore.sync only when nothing was found', async () => {
  let native = fakeNative({ entitlements: [[purchase('r1')]] });
  let t = service(native, async () => OK);
  await t.s.restore();
  assert.equal(native.calls.synced, 0, 'no Apple ID prompt when entitlements are already there');
  assert.deepEqual(native.calls.finished, ['r1']);
  assert.match(t.said.at(-1).text, /Ostot palautettu/);

  native = fakeNative({ entitlements: [[], [purchase('r2', { productId: SV })]] });
  t = service(native, async () => ({ ...OK, courseType: 'ruotsin-abikurssi', status: 'expired' }));
  await t.s.restore();
  assert.equal(native.calls.synced, 1);
  assert.equal(t.granted(), 0, 'an expired season opens nothing');
  assert.match(t.said.at(-1).text, /päättynyt/);

  native = fakeNative({ entitlements: [[], []] });
  t = service(native, async () => OK);
  await t.s.restore();
  assert.match(t.said.at(-1).text, /ei löytynyt palautettavia/);

  native = fakeNative({ entitlements: [[purchase('r3'), purchase('r4', { productId: SV })]] });
  t = service(native, async () => { throw httpError(409, 'account_mismatch'); });
  await t.s.restore();
  assert.deepEqual(native.calls.finished, ['r3', 'r4'], 'settled: another account\'s purchases are finished');
  assert.match(t.said.at(-1).text, /toiseen Opiskeluakatemia-tiliin/);
  assert.equal(t.said.length, 1, 'one summary, not one message per transaction');
  // A second tap in the same session answers the same without asking the server again.
  await t.s.restore();
  assert.equal(t.claims.length, 2);
  assert.match(t.said.at(-1).text, /toiseen Opiskeluakatemia-tiliin/);
});

test('Buy stays busy until the returned transaction is verified and the course is marked owned', async () => {
  const native = fakeNative({ buyResult: [purchase('b1')] });
  let release;
  const t = service(native, () => new Promise(resolve => { release = () => resolve({ ...OK, access: ACCESS_BODY }); }));
  let settled = false;
  const buying = t.s.buy(EN, 'user-uuid').then(() => { settled = true; });
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(settled, false, 'requestPurchase resolved, but the claim is still running: Buy stays busy');
  assert.deepEqual(t.claims, [JWS]);
  release();
  await buying;
  assert.deepEqual(t.activity, [true, 'granted:en', false]);
  assert.equal(t.grants[0].access.paid.en, true);
  assert.deepEqual(native.calls.finished, ['b1']);
  // The listener's copy of the same transaction is not claimed again.
  await t.s.onPurchase(purchase('b1'));
  assert.equal(t.claims.length, 1);
});

test('after a failed claim Buy stays off for that course until a claim for it answers 2xx', async () => {
  for (const error of [httpError(503, 'unavailable'), httpError(500), httpError(429, 'rate_limited'), new Error('Palvelu ei vastannut ajoissa.'), new Error('Yhteys palvelimeen ei onnistunut.')]) {
    const native = fakeNative({ buyResult: [purchase('f1')], entitlements: [[purchase('f1')]] });
    let fail = true;
    const t = service(native, async () => { if (fail) throw error; return { ...OK, access: ACCESS_BODY }; });
    await t.s.buy(EN, 'user-uuid');
    assert.match(t.said.at(-1).text, /Maksu on tallessa/);
    assert.deepEqual(t.activity, [true, 'unsettled:en', false], 'marked before verifying ends: no moment with Buy enabled');
    // Another tap never opens the App Store sheet again (the store disables the button too).
    await t.s.buy(EN, 'user-uuid');
    assert.equal(native.calls.bought.length, 1);
    // The other course is not held back.
    await t.s.buy(SV, 'user-uuid');
    assert.equal(native.calls.bought.length, 2);
    // "Palauta ostokset" claims it again; the 2xx releases the mark.
    fail = false;
    await t.s.restore();
    assert.deepEqual(native.calls.finished, ['f1']);
    assert.deepEqual(t.unsettled.at(-1), []);
    assert.equal(t.granted(), 1);
  }
});

test('an unfinished transaction found at recovery holds Buy back while it is claimed and after a failure', async () => {
  const native = fakeNative({ pending: [purchase('p9', { productId: SV }), purchase('ask', { state: 'pending' })] });
  let reject;
  const t = service(native, () => new Promise((_, no) => { reject = no; }));
  const recovering = t.s.recoverPending();
  await new Promise(resolve => setTimeout(resolve, 1));
  assert.deepEqual(t.unsettled.at(-1), ['sv'], 'an Ask to Buy still waiting is not a payment');
  await t.s.buy(SV, 'user-uuid');
  assert.deepEqual(native.calls.bought, []);
  reject(httpError(503, 'unavailable'));
  await recovering;
  assert.deepEqual(t.unsettled.at(-1), ['sv'], 'still unconfirmed after the failed claim');
  // A new session (the next launch) claims it again; a 2xx that opens nothing still releases Buy.
  const closed = { courses: { abikurssi: false, 'ruotsin-abikurssi': false }, paid: { abikurssi: false, 'ruotsin-abikurssi': false }, trials: {} };
  const next = service(native, async () => ({ ...OK, courseType: 'ruotsin-abikurssi', access: closed }));
  await next.s.recoverPending();
  assert.deepEqual(next.activity, ['unsettled:sv', true, 'unsettled:', false]);
  assert.equal(next.granted(), 0);
});

test('Buy with no transaction returned waits for the listener (or a short timeout)', async () => {
  const native = fakeNative({ buyResult: [] });
  const t = service(native, async () => OK);
  const buying = t.s.buy(EN, 'user-uuid');
  await new Promise(resolve => setTimeout(resolve, 1));
  await t.s.onPurchase(purchase('l1'));
  await buying;
  assert.equal(t.granted(), 1);
  // Nothing arrives at all: buy still ends (eventWaitMs).
  const quiet = service(fakeNative({ buyResult: [] }), async () => OK);
  await quiet.s.buy(SV, 'user-uuid');
  assert.equal(quiet.granted(), 0);
});

test('store errors outside a purchase are not shown as a failed purchase; Ask to Buy always is', async () => {
  const t = service(fakeNative(), async () => OK);
  for (const code of ['query-product', 'init-connection', 'transaction-validation-failed', 'empty-sku-list', 'not-prepared', 'user-cancelled', undefined]) t.s.onError(code);
  assert.deepEqual(t.said, [], 'a failed price fetch at launch says nothing');
  t.s.onError('deferred-payment');
  assert.match(t.said[0].text, /huoltajan hyväksyntää/);

  // During a Buy the listener's error is the purchase's own: shown (once, with the thrown one).
  const failing = fakeNative({ buyError: { code: 'network-error' } });
  const u = service(failing, async () => OK);
  const buying = u.s.buy(EN, 'user-uuid');
  u.s.onError('network-error');
  await buying;
  assert.equal(u.said.length, 1);
  assert.match(u.said[0].text, /verkkoyhteys/);
});

test("launch replays of old transactions verify quietly; only this session's Buy shows errors", async () => {
  // A replay through the listener with no Buy tapped: a 409 account_mismatch is settled silently.
  const native = fakeNative();
  const t = service(native, async () => { throw httpError(409, 'account_mismatch'); });
  const replay = await t.s.onPurchase(purchase('old1', { transactionDate: 1000 }));
  assert.equal(replay.outcome, 'failed');
  assert.deepEqual(t.said, []);
  assert.deepEqual(native.calls.finished, ['old1']);

  // A transaction older than the Buy tap (beyond the clock allowance) is a replay too.
  t.tick(2 * 3600_000);
  const buying = t.s.buy(EN, 'user-uuid');
  await t.s.onPurchase(purchase('old2', { transactionDate: 1000 }));
  assert.deepEqual(t.said, []);
  // The new purchase (dated after the tap) is live: its error is shown.
  await t.s.onPurchase(purchase('new1', { transactionDate: 2 * 3600_000 + 500 }));
  await buying;
  assert.equal(t.said.length, 1);
  assert.match(t.said[0].text, /toiseen Opiskeluakatemia-tiliin/);

  // A success is still announced for a quiet replay (e.g. an Ask to Buy approval after a relaunch).
  const ok = service(fakeNative(), async () => OK);
  await ok.s.onPurchase(purchase('approved', { transactionDate: 1000 }));
  assert.equal(ok.said[0].tone, 'success');
});

test('an Ask to Buy approval after the deferred Buy is live', async () => {
  const native = fakeNative({ buyError: { code: 'deferred-payment' } });
  const t = service(native, async () => { throw httpError(503, 'unavailable'); });
  await t.s.buy(EN, 'user-uuid');
  assert.match(t.said[0].text, /huoltajan hyväksyntää/);
  t.tick(60_000);
  await t.s.onPurchase(purchase('ask1', { transactionDate: 30_000 }));
  assert.match(t.said.at(-1).text, /Maksu on tallessa/);
});

test('restore: a failed AppStore.sync with nothing found is an error, not "no purchases"', async () => {
  const native = fakeNative({ entitlements: [[], []], syncError: { code: 'service-error' } });
  const t = service(native, async () => OK);
  await t.s.restore();
  assert.equal(native.calls.synced, 1);
  assert.match(t.said.at(-1).text, /Ostojen palautus ei onnistunut/);
  assert.equal(t.said.at(-1).tone, 'error');
  // Cancelling the Apple ID prompt stays silent.
  const cancelled = service(fakeNative({ entitlements: [[], []], syncError: { code: 'user-cancelled' } }), async () => OK);
  await cancelled.s.restore();
  assert.deepEqual(cancelled.said, []);
  // A failed sync that still finds the purchase restores it.
  const found = fakeNative({ entitlements: [[], [purchase('r9')]], syncError: { code: 'service-error' } });
  const u = service(found, async () => OK);
  await u.s.restore();
  assert.match(u.said.at(-1).text, /Ostot palautettu/);
});

test('the provider never enables Buy on a stale or failed access check', () => {
  const provider = fs.readFileSync(path.join(root, 'src/providers/IapProvider.tsx'), 'utf8');
  assert.match(provider, /storeState !== 'ready' \|\| !access \|\| access\.paid\[course\] \|\| unsettled\.includes\(course\)\) return/,
    'no Buy while an App Store payment for the course waits for the server');
  assert.match(provider, /unsettled: courses => \{ if \(!cancelled\) setUnsettled\(courses\); \}/);
  assert.match(provider, /purchases\.onPurchase\(purchase\)/, 'the listener goes through the replay-aware path');
  assert.match(provider, /await fetchStoreState\(apiRequest\)/, 'the store refresh links web purchases first');
  assert.doesNotMatch(provider, /ACCESS_ALL_PATH/, 'no access check that skips link-purchases');
  const screen = fs.readFileSync(path.join(root, 'src/app/store.tsx'), 'utf8');
  assert.match(screen, /busyAny=\{busyAny \|\| !storeReady\}/);
  assert.match(screen, /unsettled=\{iap\.unsettled\.includes\(id\)\}/);
  assert.match(screen, /disabled=\{!price \|\| busyAny \|\| unsettled\} onPress=\{onBuy\}/);
  assert.match(screen, /\{unsettled && <Text style=\{type\.caption\}>\{UNSETTLED_PURCHASE_NOTE\}<\/Text>\}/);
  assert.match(store.UNSETTLED_PURCHASE_NOTE, /”Palauta ostokset”/);
});

test('expo-iap is reachable only from the iOS bridge and excluded from Android autolinking', () => {
  const files = [];
  const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full); } };
  walk(path.join(root, 'src'));
  files.push(path.join(root, 'App.tsx'));
  const importers = files.filter(file => /['"]expo-iap['"]/.test(fs.readFileSync(file, 'utf8'))).map(file => path.relative(root, file));
  assert.deepEqual(importers, ['src/lib/iap-native.ios.ts']);
  const stub = load(lib('iap-native.ts'));
  assert.equal(stub.iapNative, null, 'Android and web bundles get the null stub');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.expo.autolinking.android.exclude, ['expo-iap']);
  assert.equal(pkg.dependencies['expo-iap'], '6.4.1', 'native module pinned exactly: a newer pod must come with a new app version, never over the air');
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
  assert.ok(app.plugins.includes('expo-iap'));
  assert.equal(app.version, '1.2.0', 'a new runtime: IAP JavaScript never reaches 1.1.0 binaries over the air');
  const purchaseHistory = app.ios.privacyManifests.NSPrivacyCollectedDataTypes.find(item => item.NSPrivacyCollectedDataType === 'NSPrivacyCollectedDataTypePurchaseHistory');
  assert.deepEqual(purchaseHistory, {
    NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePurchaseHistory', NSPrivacyCollectedDataTypeLinked: true, NSPrivacyCollectedDataTypeTracking: false,
    NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
  });
});
