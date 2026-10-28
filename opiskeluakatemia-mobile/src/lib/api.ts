import { config } from './config';
import { supabase } from './supabase';

export class RequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function apiRequest(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal; timeout?: number } = {}): Promise<unknown> {
  if (!supabase) throw new Error('Sovelluksen yhteyttä ei ole määritetty.');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new RequestError('Kirjaudu uudelleen jatkaaksesi.', 401);
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', abort);
  const timeout = setTimeout(() => { timedOut = true; abort(); }, options.timeout ?? 30000);
  try {
    const response = await fetch(`${config.apiUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: { Authorization: `Bearer ${data.session.access_token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) throw new RequestError(response.status === 401 ? 'Kirjaudu uudelleen jatkaaksesi.'
      : response.status === 403 ? 'Kurssioikeus puuttuu.'
      : response.status === 429 ? 'Harjoitusraja tuli vastaan. Odota hetki ja yritä uudelleen.'
      : response.status === 503 ? 'Harjoituspalvelu on hetkellisesti poissa käytöstä. Yritä myöhemmin.'
      : response.status >= 500 ? 'Palvelussa on hetkellinen häiriö. Yritä hetken kuluttua uudelleen.'
      : 'Pyyntö epäonnistui. Yritä uudelleen.', response.status);
    try { return await response.json(); }
    catch { throw new RequestError('Palvelimen vastausta ei voitu lukea. Yritä uudelleen.', response.status); }
  } catch (error) {
    if (error instanceof RequestError) throw error;
    if (timedOut) throw new Error('Palvelu ei vastannut ajoissa. Tarkista verkkoyhteys ja yritä uudelleen.');
    if (controller.signal.aborted) throw new Error('Pyyntö keskeytettiin.');
    // Native fetch reports offline, DNS and TLS failures as TypeError; never show its internal message.
    throw new Error('Yhteys palvelimeen ei onnistunut. Tarkista verkkoyhteys ja yritä uudelleen.');
  } finally { clearTimeout(timeout); options.signal?.removeEventListener('abort', abort); }
}
export function courseRequest(path: string, method = 'GET') { return apiRequest(`/api/courses/${path}`, { method }); }
export async function checkCourseAccess(): Promise<boolean> {
  const result = await courseRequest('check-access?courseType=abikurssi');
  if (typeof result !== 'object' || result === null || !('hasAccess' in result) || typeof result.hasAccess !== 'boolean') throw new Error('Palvelimen vastausta ei voitu lukea.');
  return result.hasAccess;
}

/** Permanently deletes the signed-in account on the server. The password is re-verified there. */
export async function deleteAccount(password: string) {
  await apiRequest('/api/account/delete', { method: 'POST', body: { password, confirmation: 'POISTA' }, timeout: 45000 });
}
