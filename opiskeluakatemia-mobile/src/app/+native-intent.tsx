import { sanitizeDeepLink } from '../lib/deep-link';

// Every link opened from outside the app (opiskeluakatemia://…) passes through this allowlist.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const safe = sanitizeDeepLink(path);
    if (safe !== null) return safe;
    // Expo Go / development-client URLs belong to the tooling during development only.
    return __DEV__ ? path : '/';
  } catch {
    return '/';
  }
}
