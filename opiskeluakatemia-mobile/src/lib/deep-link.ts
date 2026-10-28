const SCHEME = 'opiskeluakatemia';
const ROUTES = new Set(['/', '/exercises', '/exercise', '/flashcards', '/daily', '/theory', '/progress', '/essays', '/history', '/settings']);
const DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced']);

function param(query: string, name: string) {
  for (const pair of query.split('&')) {
    const [key, value = ''] = pair.split('=');
    if (key !== name) continue;
    try { return decodeURIComponent(value.replace(/\+/g, ' ')); } catch { return undefined; }
  }
  return undefined;
}

/**
 * Reduce an incoming system URL to a known in-app route. External links may only open screens:
 * they never carry task IDs, tokens or other state, and every screen still requires a session.
 * Returns null for URLs from other schemes (for example development-client URLs).
 */
export function sanitizeDeepLink(path: string): string | null {
  const scheme = /^([a-z][a-z0-9+.-]*):(\/\/)?(.*)$/i.exec(path);
  if (scheme && scheme[1].toLowerCase() !== SCHEME) return null;
  const rest = (scheme ? scheme[3] : path).split('#')[0];
  const queryStart = rest.indexOf('?');
  const route = `/${(queryStart < 0 ? rest : rest.slice(0, queryStart)).replace(/^\/+|\/+$/g, '')}`;
  const query = queryStart < 0 ? '' : rest.slice(queryStart + 1);
  if (!ROUTES.has(route)) return '/';
  if (route !== '/exercise') return route;
  const id = param(query, 'id');
  if (!id || !/^[a-z0-9-]{1,80}$/i.test(id)) return '/exercises';
  const difficulty = param(query, 'difficulty');
  return `/exercise?id=${encodeURIComponent(id)}${difficulty && DIFFICULTIES.has(difficulty) ? `&difficulty=${difficulty}` : ''}`;
}
