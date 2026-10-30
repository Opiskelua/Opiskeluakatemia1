// Pure URL checks (no React Native imports) so they can be unit tested in Node.

// One @opiskeluakatemia.fi recipient, optionally followed by a query. No % in the local part (no encoded @ or comma).
const SUPPORT_MAIL = /^mailto:([a-z0-9._+-]{1,64}@opiskeluakatemia\.fi)(?:\?(.*))?$/i;
// Query values must already be percent-encoded: no raw &, =, # or spaces inside a value.
const ENCODED_VALUE = /^[A-Za-z0-9\-_.!~*'()%]*$/;
// Whitespace, control characters and backslashes are normalised differently by the WHATWG parser
// and by iOS/Android URL parsers; refuse them instead of guessing which reading wins.
const UNSAFE_CHARS = /[\u0000-\u0020\u007f\\]/;

/**
 * Only URLs on this allowlist may leave the app through Linking.openURL: HTTPS pages on the
 * given origins (the website) and mail to an @opiskeluakatemia.fi address. Anything else,
 * including other schemes (tel:, sms:, intent:, javascript:, data:) and embedded credentials,
 * returns null. The returned string is the canonical form, so the native side opens exactly
 * the URL that was checked.
 */
export function safeExternalUrl(raw: string, allowedOrigins: readonly string[]): string | null {
  if (typeof raw !== 'string' || !raw || raw.length > 2048 || UNSAFE_CHARS.test(raw)) return null;
  const mail = SUPPORT_MAIL.exec(raw);
  if (mail) return safeMailto(mail[1], mail[2]);
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    // "https:host/x" (no slashes) parses, but native parsers treat it as opaque: require the authority form.
    if (!/^https:\/\//i.test(raw)) return null;
    return allowedOrigins.includes(url.origin) ? url.href : null;
  } catch { return null; }
}

/**
 * Rebuild a support mailto: with at most one subject and one body. Any other header (to, cc, bcc,
 * from…), a repeated key, malformed percent-encoding or a line break in the subject is refused.
 * Line breaks are allowed in the body (RFC 6068 encodes them as %0D%0A).
 */
function safeMailto(address: string, query: string | undefined): string | null {
  const base = `mailto:${address.toLowerCase()}`;
  if (query === undefined || query === '') return query === undefined ? base : null;
  const fields: Record<string, string> = {};
  for (const pair of query.split('&')) {
    const eq = pair.indexOf('=');
    if (eq < 1) return null;
    const key = pair.slice(0, eq).toLowerCase();
    const value = pair.slice(eq + 1);
    if ((key !== 'subject' && key !== 'body') || key in fields || !ENCODED_VALUE.test(value)) return null;
    try { fields[key] = decodeURIComponent(value); } catch { return null; }
  }
  if (/[\r\n]/.test(fields.subject ?? '')) return null;
  const parts = (['subject', 'body'] as const).filter(key => key in fields).map(key => `${key}=${encodeURIComponent(fields[key])}`);
  return `${base}?${parts.join('&')}`;
}

/** Drop lone UTF-16 surrogates, which make encodeURIComponent throw a URIError. */
export function wellFormed(value: string): string {
  return Array.from(value).filter(char => char.length > 1 || char < '\uD800' || char > '\uDFFF').join('');
}

/** Cut to at most `max` code points (never inside an emoji's surrogate pair), adding "…" when cut. */
export function truncateText(value: unknown, max: number): string {
  const chars = Array.from(wellFormed(typeof value === 'string' ? value : String(value ?? '')));
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : chars.join('');
}

/** Build a mailto: for reporting a problem; the subject is kept to one line. Never throws on odd text. */
export function supportMailto(address: string, subject: string, body: string): string {
  const oneLine = wellFormed(subject).replace(/[\r\n]+/g, ' ').trim();
  body = wellFormed(body);
  return `mailto:${address}?subject=${encodeURIComponent(oneLine)}&body=${encodeURIComponent(body.replace(/\r?\n/g, '\r\n'))}`;
}

export function isAllowedExternalUrl(raw: string, allowedOrigins: readonly string[]): boolean {
  return safeExternalUrl(raw, allowedOrigins) !== null;
}

/**
 * Resolve a server-provided media URL (exercise audio). Root-relative paths are served by the API
 * origin; absolute URLs must be HTTPS (plain HTTP only in development). Protocol-relative and
 * backslash tricks, other schemes and embedded credentials return null. Returns the canonical URL.
 */
export function resolveMediaUrl(raw: string, apiOrigin: string, development: boolean): string | null {
  if (typeof raw !== 'string' || !raw || raw.length > 2048 || UNSAFE_CHARS.test(raw)) return null;
  try {
    if (raw.startsWith('/')) {
      if (raw.startsWith('//') || !apiOrigin) return null;
      const base = new URL(apiOrigin);
      const url = new URL(raw, base);
      return url.origin === base.origin ? url.href : null;
    }
    const url = new URL(raw);
    if (url.username || url.password || !/^https?:\/\//i.test(raw)) return null;
    if (url.protocol === 'https:' || (development && url.protocol === 'http:')) return url.href;
    return null;
  } catch { return null; }
}
