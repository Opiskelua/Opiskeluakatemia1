// Pure URL checks (no React Native imports) so they can be unit tested in Node.

const SUPPORT_MAIL = /^mailto:[a-z0-9._%+-]{1,64}@opiskeluakatemia\.fi$/i;

/**
 * Only URLs on this allowlist may leave the app through Linking.openURL: HTTPS pages on the
 * given origins (the website) and mail to an @opiskeluakatemia.fi address. Anything else,
 * including other schemes (tel:, sms:, intent:, javascript:) and embedded credentials, is refused.
 */
export function isAllowedExternalUrl(raw: string, allowedOrigins: readonly string[]): boolean {
  if (typeof raw !== 'string' || !raw || raw.length > 2048) return false;
  if (SUPPORT_MAIL.test(raw)) return true;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return false;
    return allowedOrigins.includes(url.origin);
  } catch { return false; }
}

/**
 * Resolve a server-provided media URL (exercise audio). Root-relative paths are served by the API
 * origin; absolute URLs must be HTTPS (plain HTTP only in development). Protocol-relative and
 * backslash tricks, other schemes and embedded credentials return null.
 */
export function resolveMediaUrl(raw: string, apiOrigin: string, development: boolean): string | null {
  if (typeof raw !== 'string' || !raw || raw.length > 2048) return null;
  if (raw.startsWith('/')) {
    if (raw.startsWith('//') || raw.includes('\\') || !apiOrigin) return null;
    return `${apiOrigin}${raw}`;
  }
  try {
    const url = new URL(raw);
    if (url.username || url.password) return null;
    if (url.protocol === 'https:' || (development && url.protocol === 'http:')) return raw;
    return null;
  } catch { return null; }
}
