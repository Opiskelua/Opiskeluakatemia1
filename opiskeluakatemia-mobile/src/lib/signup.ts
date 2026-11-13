// In-app account creation (iOS only) and sign-in error copy. Pure logic without React Native
// imports, so tests/store.test.cjs can load it. The rules mirror the website's sign-up form
// (src/app/login/page.tsx): at least 6 characters and the password typed twice.

import { PRODUCTION_ORIGIN } from './api-origin';
import { IOS_STORE_OPEN, storeEnabled } from './store';

/** Sign-up belongs to the iOS store flow; Android and web stay sign-in only. */
export const signUpEnabled = (platform: string, open: boolean = IOS_STORE_OPEN) => storeEnabled(platform, open);

export const MIN_PASSWORD_LENGTH = 6;

/**
 * Where the confirmation e-mail link lands: a neutral website page ("palaa sovellukseen ja kirjaudu
 * sisään") outside the launch gate, with no prices or purchase links. Must be in Supabase Auth's
 * allowed redirect URLs, or Supabase falls back to the Site URL.
 */
export const EMAIL_CONFIRMED_URL = `${PRODUCTION_ORIGIN}/sahkoposti-vahvistettu`;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The first problem with the form, or null when it can be sent. */
export function signUpProblem(email: string, password: string, again: string): string | null {
  if (!email.trim() || !password || !again) return 'Täytä sähköposti ja salasana kahteen kertaan.';
  if (!EMAIL.test(email.trim())) return 'Tarkista sähköpostiosoite.';
  if (password.length < MIN_PASSWORD_LENGTH) return `Salasanan tulee olla vähintään ${MIN_PASSWORD_LENGTH} merkkiä pitkä.`;
  if (password !== again) return 'Salasanat eivät täsmää.';
  return null;
}

interface AuthErrorLike { code?: unknown; status?: unknown; message?: unknown }

const codeOf = (error: unknown) => {
  const value = error && typeof error === 'object' ? (error as AuthErrorLike).code : undefined;
  return typeof value === 'string' ? value : '';
};
const statusOf = (error: unknown) => {
  const value = error && typeof error === 'object' ? (error as AuthErrorLike).status : undefined;
  return typeof value === 'number' ? value : undefined;
};
const messageOf = (error: unknown) => {
  const value = error && typeof error === 'object' ? (error as AuthErrorLike).message : undefined;
  return typeof value === 'string' ? value.toLowerCase() : '';
};

/** Supabase signUp error → Finnish. The server's English message is never shown. */
export function signUpErrorMessage(error: unknown): string {
  const code = codeOf(error);
  const message = messageOf(error);
  if (code === 'user_already_exists' || code === 'email_exists' || message.includes('already registered')) {
    return 'Tällä sähköpostiosoitteella on jo tili. Kirjaudu sisään tai palauta salasana.';
  }
  if (code === 'weak_password' || message.includes('password should')) {
    return `Salasana on liian heikko. Käytä vähintään ${MIN_PASSWORD_LENGTH} merkkiä ja vältä yleisiä salasanoja.`;
  }
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || statusOf(error) === 429) {
    return 'Liian monta yritystä. Odota hetki ja yritä uudelleen.';
  }
  if (code === 'email_address_invalid' || code === 'validation_failed') return 'Tarkista sähköpostiosoite.';
  if (code === 'signup_disabled') return 'Tilin luominen ei ole juuri nyt mahdollista. Yritä myöhemmin uudelleen.';
  return 'Tilin luominen epäonnistui. Tarkista verkkoyhteys ja yritä uudelleen.';
}

/**
 * Outcome of supabase.auth.signUp without an error:
 * - 'signed-in': the project does not require confirmation; the session signs the user in;
 * - 'exists': Supabase hides an existing confirmed address by returning a user without identities;
 * - 'confirm': a confirmation e-mail was sent and there is no session yet.
 */
export function signUpOutcome(data: { user?: { identities?: unknown[] | null } | null; session?: unknown } | null | undefined): 'signed-in' | 'exists' | 'confirm' {
  if (data?.session) return 'signed-in';
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return 'exists';
  return 'confirm';
}

/** signInWithPassword error → Finnish; an unconfirmed address gets its own copy. */
export function signInErrorMessage(error: unknown): { text: string; unconfirmed: boolean } {
  const code = codeOf(error);
  if (code === 'email_not_confirmed' || messageOf(error).includes('email not confirmed')) {
    return { text: 'Sähköpostiosoitetta ei ole vielä vahvistettu. Avaa sähköpostiisi lähetetty vahvistuslinkki ja kirjaudu sitten sisään.', unconfirmed: true };
  }
  if (code === 'over_request_rate_limit' || statusOf(error) === 429) return { text: 'Liian monta yritystä. Odota hetki ja yritä uudelleen.', unconfirmed: false };
  return { text: 'Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana sekä verkkoyhteys.', unconfirmed: false };
}

/** supabase.auth.resend({ type: 'signup' }) error → Finnish. */
export function resendErrorMessage(error: unknown): string {
  if (codeOf(error) === 'over_email_send_rate_limit' || codeOf(error) === 'over_request_rate_limit' || statusOf(error) === 429) {
    return 'Liian monta yritystä. Odota hetki ja yritä uudelleen.';
  }
  return 'Viestin lähetys ei onnistunut. Yritä hetken kuluttua uudelleen.';
}
