const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
function load(file) {
  const source = path.resolve(__dirname, '../src/lib', file);
  const loaded = new Module(source, module);
  loaded._compile(ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, source);
  return loaded.exports;
}
const { resolveApiOrigin, isAllowedOrigin, PRODUCTION_ORIGIN } = load('api-origin.ts');
const { sanitizeDeepLink } = load('deep-link.ts');
const { createChunkedSecureStorage } = load('chunked-storage.ts');

test('release builds default to the HTTPS production API and refuse plain-HTTP internet origins', () => {
  assert.equal(resolveApiOrigin('', undefined, false, 'ios'), PRODUCTION_ORIGIN);
  assert.equal(resolveApiOrigin('https://opiskeluakatemia.fi/', undefined, false, 'android'), 'https://opiskeluakatemia.fi');
  assert.equal(resolveApiOrigin('http://opiskeluakatemia.fi', undefined, false, 'ios'), '');
  assert.equal(resolveApiOrigin('http://192.168.1.20:3000', undefined, false, 'ios'), 'http://192.168.1.20:3000');
  assert.equal(resolveApiOrigin('ftp://example.com', undefined, false, 'ios'), '');
  assert.equal(resolveApiOrigin('', '192.168.1.50:8081', true, 'ios'), '');
  assert.equal(isAllowedOrigin('https://user:pw@example.com', false), false);
  assert.equal(isAllowedOrigin('http://evil.example', true), true);
});

test('deep links only open known screens and never carry task IDs', () => {
  assert.equal(sanitizeDeepLink('opiskeluakatemia://history'), '/history');
  assert.equal(sanitizeDeepLink('opiskeluakatemia:///settings?delete=1'), '/settings');
  assert.equal(sanitizeDeepLink('/exercise?id=present-perfect&difficulty=advanced&taskId=x'), '/exercise?id=present-perfect&difficulty=advanced');
  assert.equal(sanitizeDeepLink('opiskeluakatemia://exercise?id=../../etc&difficulty=hack'), '/exercises');
  assert.equal(sanitizeDeepLink('opiskeluakatemia://exercise?id=abc&difficulty=hack'), '/exercise?id=abc');
  assert.equal(sanitizeDeepLink('opiskeluakatemia://essays?taskId=foreign'), '/essays');
  assert.equal(sanitizeDeepLink('opiskeluakatemia://reset?access_token=abc#refresh_token=x'), '/');
  assert.equal(sanitizeDeepLink('/+not-found'), '/');
  assert.equal(sanitizeDeepLink('https://evil.example/exercise'), null);
  assert.equal(sanitizeDeepLink('exp+opiskeluakatemia-mobile://expo-development-client/?url=x'), null);
});

function fakeSecure() {
  const map = new Map();
  return { map, getItemAsync: async k => map.has(k) ? map.get(k) : null, setItemAsync: async (k, v) => { if (!/^[A-Za-z0-9._-]+$/.test(k)) throw new Error('bad key'); if (v.length > 2048) throw new Error('too big'); map.set(k, v); }, deleteItemAsync: async k => { map.delete(k); } };
}
function fakeLegacy(initial = {}) {
  const map = new Map(Object.entries(initial));
  return { map, getItem: async k => map.has(k) ? map.get(k) : null, setItem: async (k, v) => { map.set(k, v); }, removeItem: async k => { map.delete(k); } };
}

test('session storage chunks large values into the keychain and cleans up', async () => {
  const secure = fakeSecure(); const legacy = fakeLegacy();
  const storage = createChunkedSecureStorage(secure, legacy);
  const session = JSON.stringify({ access_token: 'a'.repeat(5000), refresh_token: 'r' });
  await storage.setItem('sb-ref-auth-token', session);
  assert.equal(secure.map.get('sb-ref-auth-token.n'), '3');
  assert.equal(await storage.getItem('sb-ref-auth-token'), session);
  await storage.setItem('sb-ref-auth-token', 'short');
  assert.equal(secure.map.has('sb-ref-auth-token.1'), false);
  assert.equal(await storage.getItem('sb-ref-auth-token'), 'short');
  await storage.removeItem('sb-ref-auth-token');
  assert.equal(secure.map.size, 0);
  assert.equal(await storage.getItem('sb-ref-auth-token'), null);
});

test('a session left in AsyncStorage by an earlier version moves to secure storage', async () => {
  const secure = fakeSecure(); const legacy = fakeLegacy({ 'sb-ref-auth-token': '{"old":true}' });
  const storage = createChunkedSecureStorage(secure, legacy);
  assert.equal(await storage.getItem('sb-ref-auth-token'), '{"old":true}');
  assert.equal(legacy.map.size, 0);
  assert.equal(secure.map.get('sb-ref-auth-token.0'), '{"old":true}');
});

test('overlapping writes are serialized per key', async () => {
  const storage = createChunkedSecureStorage(fakeSecure(), fakeLegacy());
  await Promise.all([storage.setItem('k', 'x'.repeat(4000)), storage.setItem('k', 'y'), storage.removeItem('k'), storage.setItem('k', 'z'.repeat(1900))]);
  assert.equal(await storage.getItem('k'), 'z'.repeat(1900));
});

const { isAllowedExternalUrl, safeExternalUrl, resolveMediaUrl } = load('external-links.ts');

test('external links open only the website over HTTPS and the support address', () => {
  const origins = ['https://opiskeluakatemia.fi'];
  assert.equal(isAllowedExternalUrl('https://opiskeluakatemia.fi/kayttoehdot?app=1', origins), true);
  assert.equal(isAllowedExternalUrl('mailto:support@opiskeluakatemia.fi', origins), true);
  assert.equal(isAllowedExternalUrl('http://opiskeluakatemia.fi/kayttoehdot', origins), false);
  assert.equal(isAllowedExternalUrl('https://opiskeluakatemia.fi.evil.example/', origins), false);
  assert.equal(isAllowedExternalUrl('https://user:pw@opiskeluakatemia.fi/', origins), false);
  assert.equal(isAllowedExternalUrl('mailto:someone@evil.example', origins), false);
  assert.equal(isAllowedExternalUrl('mailto:support@opiskeluakatemia.fi?body=x', origins), false);
  assert.equal(isAllowedExternalUrl('javascript:alert(1)', origins), false);
  assert.equal(isAllowedExternalUrl('tel:+358000', origins), false);
  assert.equal(isAllowedExternalUrl('', origins), false);
});

test('exercise audio loads only HTTPS or API-relative URLs', () => {
  const api = 'https://opiskeluakatemia.fi';
  assert.equal(resolveMediaUrl('/audio/a.mp3', api, false), 'https://opiskeluakatemia.fi/audio/a.mp3');
  assert.equal(resolveMediaUrl('https://cdn.example/a.mp3', api, false), 'https://cdn.example/a.mp3');
  assert.equal(resolveMediaUrl('//evil.example/a.mp3', api, false), null);
  assert.equal(resolveMediaUrl('/\\evil.example/a.mp3', api, false), null);
  assert.equal(resolveMediaUrl('http://cdn.example/a.mp3', api, false), null);
  assert.equal(resolveMediaUrl('http://192.168.1.2:3000/a.mp3', api, true), 'http://192.168.1.2:3000/a.mp3');
  assert.equal(resolveMediaUrl('file:///etc/passwd', api, true), null);
  assert.equal(resolveMediaUrl('https://u:p@cdn.example/a.mp3', api, false), null);
  assert.equal(resolveMediaUrl('/audio/a.mp3', '', false), null);
});

test('external links survive userinfo, case, port and parser-differential tricks', () => {
  const origins = ['https://opiskeluakatemia.fi'];
  // Userinfo: the real host is after the @.
  assert.equal(safeExternalUrl('https://opiskeluakatemia.fi@evil.com/', origins), null);
  assert.equal(safeExternalUrl('https://evil.com@opiskeluakatemia.fi/', origins), null);
  // Case and default port are canonicalised; the canonical form is what gets opened.
  assert.equal(safeExternalUrl('HTTPS://OPISKELUAKATEMIA.FI/Kayttoehdot', origins), 'https://opiskeluakatemia.fi/Kayttoehdot');
  assert.equal(safeExternalUrl('https://opiskeluakatemia.fi:443/x', origins), 'https://opiskeluakatemia.fi/x');
  assert.equal(safeExternalUrl('https://opiskeluakatemia.fi:8443/x', origins), null);
  // Trailing-dot FQDN and look-alike hosts are different origins.
  assert.equal(safeExternalUrl('https://opiskeluakatemia.fi./x', origins), null);
  assert.equal(safeExternalUrl('https://opiskeluakatemia.fi.evil.com/', origins), null);
  // Inputs the WHATWG parser "repairs" but native parsers may read differently.
  assert.equal(safeExternalUrl(' https://opiskeluakatemia.fi/', origins), null);
  assert.equal(safeExternalUrl('https://opiskeluakatemia.fi\\@evil.com', origins), null);
  assert.equal(safeExternalUrl('https:opiskeluakatemia.fi/x', origins), null);
  assert.equal(safeExternalUrl('https://opiskeluakatemia.fi/\nx', origins), null);
  assert.equal(safeExternalUrl('https://opiskeluakatemia.fi/\tx', origins), null);
  // Script and data schemes, in any case.
  for (const url of ['javascript:alert(1)', 'JavaScript://opiskeluakatemia.fi/%0aalert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:x', 'intent://opiskeluakatemia.fi#Intent;end', 'file:///etc/hosts']) {
    assert.equal(safeExternalUrl(url, origins), null, url);
  }
  // Mail: only one @opiskeluakatemia.fi recipient, no header injection, canonical lower case.
  assert.equal(safeExternalUrl('MAILTO:Support@OPISKELUAKATEMIA.FI', origins), 'mailto:support@opiskeluakatemia.fi');
  assert.equal(safeExternalUrl('mailto:support@opiskeluakatemia.fi%0d%0abcc:x@evil.com', origins), null);
  assert.equal(safeExternalUrl('mailto:a@evil.com,support@opiskeluakatemia.fi', origins), null);
  assert.equal(safeExternalUrl('mailto:support@opiskeluakatemia.fi.evil.com', origins), null);
  // Oversized and non-string input.
  assert.equal(safeExternalUrl(`https://opiskeluakatemia.fi/${'a'.repeat(2100)}`, origins), null);
  assert.equal(safeExternalUrl(undefined, origins), null);
  assert.equal(isAllowedExternalUrl('https://opiskeluakatemia.fi/', []), false);
});

test('media URLs stay on the API origin when relative and are returned canonical', () => {
  const api = 'https://opiskeluakatemia.fi';
  assert.equal(resolveMediaUrl('/audio/a b.mp3', api, false), null);
  assert.equal(resolveMediaUrl('/audio/a%20b.mp3', api, false), 'https://opiskeluakatemia.fi/audio/a%20b.mp3');
  assert.equal(resolveMediaUrl('/\t/evil.example', api, false), null);
  assert.equal(resolveMediaUrl(' /a.mp3', api, false), null);
  assert.equal(resolveMediaUrl('HTTPS://CDN.EXAMPLE/a.mp3', api, false), 'https://cdn.example/a.mp3');
  assert.equal(resolveMediaUrl('https:cdn.example/a.mp3', api, false), null);
  assert.equal(resolveMediaUrl('https://opiskeluakatemia.fi@evil.example/a.mp3', api, false), null);
  assert.equal(resolveMediaUrl('data:audio/mpeg;base64,AAAA', api, false), null);
  assert.equal(resolveMediaUrl('javascript:alert(1)', api, true), null);
  assert.equal(resolveMediaUrl('/a.mp3', 'not a url', false), null);
});
