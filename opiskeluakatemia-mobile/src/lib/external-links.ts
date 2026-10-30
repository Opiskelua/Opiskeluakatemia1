// Pure URL checks (no React Native imports) so they can be unit tested in Node.

const SUPPORT_MAIL = /^mailto:[a-z0-9._%+-]{1,64}@opiskeluakatemia\.fi$/i;
// Whitespace, control characters and backslashes are normalised differently by the WHATWG parser
// and by iOS/Android URL parsers; refuse them instead of guessing which reading wins.
const UNSAFE_CHARS = /[\u0000- \u007f\\]/;

/**
 * Only URLs on this allowlist may leave the app through Linking.openURL: HTTPS pages on the
 * given origins (the website) and mail to an @opiskeluakatemia.fi address. Anything else,
 * including other schemes (tel:, sms:, intent:, javascript:, data:) and embedded credentials,
 * returns null. The returned string is the canonical form, so the native side opens exactly
 * the URL that was checked.
 */
export function safeExternalUrl(raw: string, allowedOrigins: readonly string[]): string | null {
  if (typeof raw !== 'string' || !raw || raw.length > 2048 || UNSAFE_CHARS.test(raw)) return null;
  if (SUPPORT_MAIL.test(raw)) return `mailto:${raw.slice(7).toLowerCase()}`;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    // "https:host/x" (no slashes) parses, but native parsers treat it as opaque: require the authority form.
    if (!/^https:\/\//i.test(raw)) return null;
    return allowedOrigins.includes(url.origin) ? url.href : null;
  } catch { return null; }
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
