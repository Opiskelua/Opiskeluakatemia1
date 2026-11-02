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
  assert.deepEqual(catalog, { en: { productId: EN, accessUntil: '2027-03-22', onSale: true }, sv: { productId: SV, accessUntil: '2027-09-27', onSale: false } });
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

test('CTA mapping: owned, trial running, trial available, buy, not on sale', () => {
  const access = (paid, trial) => ({ courses: { en: false, sv: false }, paid: { en: paid, sv: false }, trials: { en: trial, sv: { kind: 'none' } } });
  const onSale = { productId: EN, accessUntil: '2027-03-22', onSale: true };
  const closed = { ...onSale, onSale: false };
  const offer = (a, c) => store.offerForCourse('en', a, c, NOW);

  let o = offer(access(true, { kind: 'none' }), onSale);
  assert.deepEqual([o.state, o.showBuy, o.showTrial], ['owned', false, false], 'an owner is never offered a second purchase');
  o = offer(access(false, { kind: 'running', endsAtMs: NOW + 90_001 }), onSale);
  assert.deepEqual([o.state, o.showBuy, o.showTrial, o.trialMinutesLeft], ['trial-running', true, false, 2]);
  o = offer(access(false, { kind: 'running', endsAtMs: NOW + 1000 }), closed);
  assert.deepEqual([o.state, o.showBuy], ['trial-running', false], 'a running trial stays visible after the sale ends, without Buy');
  o = offer(access(false, { kind: 'running', endsAtMs: NOW - 1 }), onSale);
  assert.equal(o.state, 'buy', 'an ended trial (local clock) is a plain Buy');
  o = offer(access(false, { kind: 'none' }), onSale);
  assert.deepEqual([o.state, o.showBuy, o.showTrial, o.accessUntilLabel], ['trial-available', true, true, '22.3.2027']);
  o = offer(access(false, { kind: 'used' }), onSale);
  assert.deepEqual([o.state, o.showBuy, o.showTrial], ['buy', true, false]);
  for (const catalog of [closed, null, undefined]) {
    o = offer(access(false, { kind: 'none' }), catalog);
    assert.deepEqual([o.state, o.showBuy, o.showTrial], ['not-on-sale', false, false]);
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

  assert.deepEqual(store.parseClaimResponse({ ok: true, courseType: 'abikurssi', environment: 'Sandbox', status: 'active', access: {} }), { courseType: 'abikurssi', environment: 'Sandbox', status: 'active' });
  assert.equal(store.parseClaimResponse({ ok: false }), null);
  assert.equal(store.parseClaimResponse({ ok: true, courseType: 'abikurssi', status: 'pending' }), null);
  assert.match(store.claimSuccessMessage({ courseType: 'ruotsin-abikurssi', environment: 'Production', status: 'active' }).text, /Ruotsin abikurssi on nyt käytössäsi/);
  assert.match(store.claimSuccessMessage({ courseType: 'abikurssi', environment: 'Production', status: 'expired' }).text, /kurssikausi on jo päättynyt/);

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
function fakeNative({ pending = [], entitlements = [[]], buyError = null } = {}) {
  const calls = { finished: [], synced: 0, entitlements: 0, bought: [] };
  return {
    calls,
    connect: async () => true,
    disconnect: async () => undefined,
    prices: async () => ({}),
    buy: async (sku, token) => { calls.bought.push([sku, token]); if (buyError) throw buyError; },
    finish: async purchase => { calls.finished.push(purchase.transactionId); },
    pending: async () => pending,
    entitlements: async () => entitlements[Math.min(calls.entitlements++, entitlements.length - 1)],
    sync: async () => { calls.synced++; },
    onPurchase: () => ({ remove() {} }),
    onError: () => ({ remove() {} }),
    errorCode: error => error?.code,
  };
}
const purchase = (transactionId, extra = {}) => ({ transactionId, productId: EN, token: JWS, state: 'purchased', raw: {}, ...extra });
const httpError = (status, code) => Object.assign(new Error('failed'), { status, code });
function service(native, claim) {
  const said = []; let granted = 0; const claims = []; const activity = [];
  let clock = 0;
  const s = createPurchaseService({
    native, say: message => said.push(message), granted: () => { granted++; }, verifying: value => activity.push(value), now: () => clock,
    claim: async token => { claims.push(token); return claim(token, claims.length); },
  });
  return { s, said, claims, activity, granted: () => granted, tick: ms => { clock += ms; } };
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
  assert.deepEqual(t.activity, [true, false]);
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

test('409, 400, 5xx and network failures never finish the transaction', async () => {
  for (const [error, pattern] of [
    [httpError(409, 'account_mismatch'), /toiseen Opiskeluakatemia-tiliin/],
    [httpError(400, 'invalid_transaction'), /ei voitu vahvistaa/],
    [httpError(503, 'unavailable'), /Maksu on tallessa/],
    [httpError(500), /Maksu on tallessa/],
    [new Error('Yhteys palvelimeen ei onnistunut.'), /Maksu on tallessa/],
  ]) {
    const native = fakeNative();
    const t = service(native, async () => { throw error; });
    const result = await t.s.process(purchase('t1'), 'live');
    assert.equal(result.outcome, 'failed');
    assert.deepEqual(native.calls.finished, [], String(error.status));
    assert.equal(t.granted(), 0);
    assert.match(t.said[0].text, pattern);
    // The next attempt (e.g. the next launch) claims again.
    await t.s.process(purchase('t1'), 'quiet');
    assert.equal(t.claims.length, 2);
    assert.equal(t.said.length, 1, 'the launch scan fails quietly');
  }
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

  native = fakeNative({ entitlements: [[purchase('r3')]] });
  t = service(native, async () => { throw httpError(409, 'account_mismatch'); });
  await t.s.restore();
  assert.deepEqual(native.calls.finished, []);
  assert.match(t.said.at(-1).text, /toiseen Opiskeluakatemia-tiliin/);
  assert.equal(t.said.length, 1, 'one summary, not one message per transaction');
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
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
  assert.ok(app.plugins.includes('expo-iap'));
  assert.equal(app.version, '1.2.0', 'a new runtime: IAP JavaScript never reaches 1.1.0 binaries over the air');
  const purchaseHistory = app.ios.privacyManifests.NSPrivacyCollectedDataTypes.find(item => item.NSPrivacyCollectedDataType === 'NSPrivacyCollectedDataTypePurchaseHistory');
  assert.deepEqual(purchaseHistory, {
    NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePurchaseHistory', NSPrivacyCollectedDataTypeLinked: true, NSPrivacyCollectedDataTypeTracking: false,
    NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
  });
});
