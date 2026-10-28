/** Public website/backend used by release builds when no API origin is configured. */
export const PRODUCTION_ORIGIN = 'https://opiskeluakatemia.fi';
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|[a-z0-9-]+\.local)$/i;

/**
 * Release builds only talk to HTTPS origins. Plain HTTP is accepted in release builds
 * only for local-network test servers, and never with embedded credentials.
 */
export function isAllowedOrigin(origin: string, development: boolean) {
  try {
    const url = new URL(origin);
    if (url.username || url.password) return false;
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && (development || LOCAL_HOST.test(url.hostname));
  } catch { return false; }
}

/** Resolve localhost to the Expo development machine on a physical phone, only in development. */
export function resolveApiOrigin(configured: string, hostUri: string | undefined, development: boolean, platform: string) {
  const origin = (configured.trim() || (development ? '' : PRODUCTION_ORIGIN)).replace(/\/+$/, '');
  if (!origin || !isAllowedOrigin(origin, development)) return '';
  if (!development || platform === 'web' || !hostUri) return origin;
  try {
    const url = new URL(origin);
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return origin;
    const host = hostUri.split(':')[0];
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) && /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      url.hostname = host;
      return url.toString().replace(/\/$/, '');
    }
    return origin;
  } catch { return origin; }
}
