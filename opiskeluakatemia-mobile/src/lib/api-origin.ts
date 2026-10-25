/** Resolve localhost to the Expo development machine on a physical phone, only in development. */
export function resolveApiOrigin(configured: string, hostUri: string | undefined, development: boolean, platform: string) {
  const origin = configured.replace(/\/$/, '');
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
