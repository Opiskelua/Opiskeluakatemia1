// iOS course store: App Store product ids, the platform gate, what each course card offers, and
// the Finnish copy for purchase, restore and trial outcomes. Pure logic without React Native
// imports, so tests/store.test.cjs can load it.
//
// Rules (App Store 3.1.1 / Google Play payments policy):
// - Only iOS sells, and only through Apple In-App Purchase. Android and web never show a store,
//   a price, a trial button or sign-up (storeEnabled / signUpEnabled are false there).
// - The price is never written in the app: it comes from StoreKit (product.displayPrice).
// - Season dates are not in the app either: the server catalog (GET /api/iap/apple/catalog)
//   says until when a purchase gives access and whether the course is on sale.
// - Store copy lives here, never in COURSES (src/lib/courses.ts), which Android also renders.

import { COURSE_IDS, COURSES, type CourseId, type CourseType } from './courses';

/** App Store product id per course type. Non-Renewing Subscriptions; never rename once live. */
export const APPLE_PRODUCT_IDS: Readonly<Record<CourseType, string>> = {
  abikurssi: 'fi.opiskeluakatemia.app.englannin_abikurssi',
  'ruotsin-abikurssi': 'fi.opiskeluakatemia.app.ruotsin_abikurssi',
};

/** The product id for a course. */
export const productIdFor = (course: CourseId) => APPLE_PRODUCT_IDS[COURSES[course].courseType];
/** Every product id the app sells, in display order (fetchProducts skus). */
export const STORE_SKUS: readonly string[] = COURSE_IDS.map(productIdFor);
/** The course an App Store product id belongs to; null for any other id. */
export function courseForProductId(productId: unknown): CourseId | null {
  return COURSE_IDS.find(id => productIdFor(id) === productId) ?? null;
}

export const CLAIM_PATH = '/api/iap/apple/claim';
export const CATALOG_PATH = '/api/iap/apple/catalog';
export const TRIAL_PATH = '/api/courses/trial';
export const ACCESS_ALL_PATH = '/api/courses/check-access?courseType=all';
/** Attaches web guest checkouts (pending_activation) to the account by its verified email. */
export const LINK_PURCHASES_PATH = '/api/courses/link-purchases';
/** Must match the website's TRIAL_DAYS (src/lib/course-trial.ts). */
export const TRIAL_DAYS = 3;

/** Minutes left on a trial as "2 pv 5 h", "5 h 12 min" or "42 min" (like the website's countdown). */
export function trialLeftLabel(minutesLeft: number | null): string {
  const total = Math.max(1, minutesLeft ?? 1);
  const totalHours = Math.floor(total / 60);
  const minutes = total % 60;
  if (totalHours === 0) return `${minutes} min`;
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days === 0) return `${hours} h${minutes ? ` ${minutes} min` : ''}`;
  return `${days} pv${hours ? ` ${hours} h` : ''}`;
}

/** The App Store exists only in the iOS app. Android and web (and anything unknown) get no store UI. */
export const storeEnabled = (platform: string) => platform === 'ios';

// ---------------------------------------------------------------------------
// Server answers
// ---------------------------------------------------------------------------

export interface CatalogEntry {
  productId: string;
  /** YYYY-MM-DD, inclusive: the last day a purchase made today gives access. */
  accessUntil: string;
  onSale: boolean;
  /**
   * Whether the iOS app offers the free trial for this course. Optional on the server (missing =
   * true): `"trial": false` hides the trial button without a new binary, e.g. if App Review asks.
   */
  trial: boolean;
}
export type StoreCatalog = Partial<Record<CourseId, CatalogEntry>>;

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * GET /api/iap/apple/catalog → { products: [{ courseType, productId, accessUntil, onSale, trial? }] }.
 * Entries for unknown courses, a product id that is not the course's own, or a malformed date are
 * dropped (that course then shows "not on sale"). Throws when the answer is not a catalog at all.
 */
export function parseCatalog(value: unknown): StoreCatalog {
  const products = value && typeof value === 'object' ? (value as { products?: unknown }).products : undefined;
  if (!Array.isArray(products)) throw new Error('Kurssikaupan tietoja ei voitu lukea. Yritä uudelleen.');
  const catalog: StoreCatalog = {};
  for (const item of products) {
    if (!item || typeof item !== 'object') continue;
    const { courseType, productId, accessUntil, onSale, trial } = item as Record<string, unknown>;
    const course = COURSE_IDS.find(id => COURSES[id].courseType === courseType);
    if (!course || productId !== productIdFor(course) || typeof accessUntil !== 'string' || !DATE.test(accessUntil) || typeof onSale !== 'boolean') continue;
    catalog[course] = { productId, accessUntil, onSale, trial: trial !== false };
  }
  return catalog;
}

/** A course's free trial: never started, running (minutes left) or used up. */
export type TrialState = { kind: 'none' } | { kind: 'running'; endsAtMs: number } | { kind: 'used' };

export interface StoreAccess {
  /** May study now (paid or a running trial). */
  courses: Record<CourseId, boolean>;
  /** Bought (on the web, in the App Store or granted by an admin). */
  paid: Record<CourseId, boolean>;
  trials: Record<CourseId, TrialState>;
}

function trialState(value: unknown, receivedAt: number): TrialState {
  if (!value || typeof value !== 'object') return { kind: 'none' };
  const remainingMs = (value as { remainingMs?: unknown }).remainingMs;
  if (typeof remainingMs !== 'number' || !Number.isFinite(remainingMs) || remainingMs <= 0) return { kind: 'used' };
  return { kind: 'running', endsAtMs: receivedAt + remainingMs };
}

/**
 * GET /api/courses/check-access?courseType=all → { courses, paid, trials } keyed by course type.
 * remainingMs is measured on the server, so the local end time does not depend on the phone clock.
 * Throws when courses or paid are missing: a malformed answer never shows a Buy button to an owner.
 */
export function parseStoreAccess(value: unknown, receivedAt: number): StoreAccess {
  const body = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const courses = body.courses as Record<string, unknown> | undefined;
  const paid = body.paid as Record<string, unknown> | undefined;
  const trials = (body.trials && typeof body.trials === 'object' ? body.trials : {}) as Record<string, unknown>;
  const result: StoreAccess = { courses: { en: false, sv: false }, paid: { en: false, sv: false }, trials: { en: { kind: 'none' }, sv: { kind: 'none' } } };
  for (const id of COURSE_IDS) {
    const type = COURSES[id].courseType;
    if (!courses || !paid || typeof courses[type] !== 'boolean' || typeof paid[type] !== 'boolean') throw new Error('Palvelimen vastausta ei voitu lukea.');
    result.courses[id] = courses[type] as boolean;
    result.paid[id] = paid[type] as boolean;
    result.trials[id] = trialState(trials[type], receivedAt);
  }
  return result;
}

/** An authenticated request to our server (apiRequest): resolves with the 2xx body, rejects otherwise. */
export type StoreRequest = (path: string, options?: { method?: string; timeout?: number }) => Promise<unknown>;
/** link-purchases runs before every store refresh; it may not hold the access check up for long. */
export const LINK_TIMEOUT_MS = 8000;

/**
 * The store's server state: the catalog and, after POST link-purchases, check-access?courseType=all.
 * A web guest checkout stays pending_activation until link-purchases attaches it to the account by
 * the verified email, so it runs first: the store never offers Buy for a course already bought on
 * the web. Its errors are ignored (check-access stays authoritative). Throws like the parsers.
 */
export async function fetchStoreState(request: StoreRequest, now: () => number = Date.now) {
  const [accessBody, catalogBody] = await Promise.all([
    request(LINK_PURCHASES_PATH, { method: 'POST', timeout: LINK_TIMEOUT_MS }).catch(() => undefined).then(() => request(ACCESS_ALL_PATH)),
    request(CATALOG_PATH),
  ]);
  const receivedAt = now();
  return { access: parseStoreAccess(accessBody, receivedAt), catalog: parseCatalog(catalogBody), receivedAt };
}

/**
 * The access after a verified purchase of `course` when the claim answer carried no readable
 * access: the course is paid and open. Keeps the Buy button away until check-access answers.
 */
export function markOwned(access: StoreAccess, course: CourseId): StoreAccess {
  return { courses: { ...access.courses, [course]: true }, paid: { ...access.paid, [course]: true }, trials: access.trials };
}

// ---------------------------------------------------------------------------
// What a course card offers
// ---------------------------------------------------------------------------

export type OfferState = 'owned' | 'trial-running' | 'trial-available' | 'buy' | 'not-on-sale';

export interface CourseOffer {
  state: OfferState;
  /** Buy button (also needs a StoreKit price before it is enabled). */
  showBuy: boolean;
  /** "Aloita ilmainen 60 min kokeilu" button. */
  showTrial: boolean;
  /** Whole minutes left of a running trial (rounded up), else null. */
  trialMinutesLeft: number | null;
  /**
   * The catalog's access end as D.M.YYYY, only next to a Buy button (the terms of the purchase on
   * offer); null otherwise, so an owner or a closed sale never sees the season's date as theirs.
   */
  accessUntilLabel: string | null;
}

/**
 * Offers for every course on this platform, or null where the store does not exist (Android, web).
 * `access` null means check-access has not answered yet: every course is then "not on sale" (no
 * Buy button can appear before the app knows the account does not own the course).
 */
export function storeOffers(platform: string, access: StoreAccess | null, catalog: StoreCatalog, now: number): Record<CourseId, CourseOffer> | null {
  if (!storeEnabled(platform)) return null;
  return Object.fromEntries(COURSE_IDS.map(id => [id, offerForCourse(id, access, catalog[id], now)])) as Record<CourseId, CourseOffer>;
}

/**
 * The store card and the home call to action for one course.
 * - paid: owned, nothing to sell (a second purchase would charge again for the same season);
 * - a running trial: minutes left, Buy while on sale;
 * - never tried and on sale: Buy and the free trial (unless the catalog switched the trial off);
 * - trial used and on sale: Buy;
 * - otherwise (no catalog entry, sale over): not on sale, no Buy and no trial.
 */
export function offerForCourse(course: CourseId, access: StoreAccess | null, catalog: CatalogEntry | null | undefined, now: number): CourseOffer {
  const none: CourseOffer = { state: 'not-on-sale', showBuy: false, showTrial: false, trialMinutesLeft: null, accessUntilLabel: null };
  if (!access) return none;
  if (access.paid[course]) return { ...none, state: 'owned' };
  const onSale = !!catalog?.onSale;
  // The purchase terms (access end date) belong only next to a price that can be bought.
  const accessUntilLabel = onSale && catalog ? finnishDate(catalog.accessUntil) : null;
  const trial = access.trials[course];
  if (trial.kind === 'running' && trial.endsAtMs > now) {
    return { ...none, state: 'trial-running', showBuy: onSale, accessUntilLabel, trialMinutesLeft: Math.max(1, Math.ceil((trial.endsAtMs - now) / 60000)) };
  }
  if (!onSale) return none;
  if (trial.kind === 'none' && catalog?.trial !== false) return { ...none, state: 'trial-available', showBuy: true, showTrial: true, accessUntilLabel };
  return { ...none, state: 'buy', showBuy: true, accessUntilLabel };
}

/** YYYY-MM-DD → D.M.YYYY (Finnish style, no leading zeros); null for anything else. */
export function finnishDate(value: string): string | null {
  const match = DATE.exec(value);
  if (!match) return null;
  return `${Number(match[3])}.${Number(match[2])}.${match[1]}`;
}

/** The access line on a store card (contract wording). */
export const accessLine = (label: string) => `Käyttöoikeus ${label} asti · kertaosto, ei uusiudu`;

/** What a purchase includes, per course. Shown only in the iOS store, never on Android. */
export const STORE_COPY: Readonly<Record<CourseId, { includes: readonly string[] }>> = {
  en: {
    includes: [
      'Polku: oppitunnit, kertaus ja tavoitearvosana',
      'Kielioppi-, luetun- ja kuullunymmärtämisharjoitukset',
      'Kirjoitelmat tekoälypalautteella',
      'Teoria, muistikortit ja päivän tehtävät',
      'Sama kurssi myös verkossa samalla tilillä',
    ],
  },
  sv: {
    includes: [
      'Polku: oppitunnit, kertaus ja tavoitearvosana',
      'Ruotsin kieliopin teoria',
      'Harjoitukset, kirjoitelmat ja muistikortit verkossa samalla tilillä',
    ],
  },
};

/**
 * The disclosure shown before a trial starts (App Store 3.1.1: duration, what happens after it and
 * the price to continue). `price` is StoreKit's localized displayPrice.
 */
export function trialDisclosure(course: CourseId, price: string) {
  return `Ilmainen kokeilu avaa koko kurssin (${COURSES[course].label}) heti ${TRIAL_DAYS} päiväksi, ilman maksutietoja. `
    + `Kun aika on kulunut, kurssin sisältö lukittuu. Sen jälkeen kurssin voi ostaa sovelluksessa hintaan ${price} (kertaosto, ei uusiudu). Kokeilun voi käyttää kerran.`;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type MessageTone = 'info' | 'error' | 'success';
/** `course`: the course the message is about, so a course home shows only its own; absent = general. */
export interface StoreMessage { tone: MessageTone; text: string; course?: CourseId }

const SUPPORT = 'support@opiskeluakatemia.fi';

/**
 * StoreKit / expo-iap error codes (ErrorCode string values) → copy. null = say nothing
 * (the buyer cancelled). 'network' is the app's own code for a failed request to our server.
 */
export function purchaseErrorMessage(code: unknown): StoreMessage | null {
  switch (code) {
    case 'user-cancelled': return null;
    case 'deferred-payment':
    case 'pending':
      return { tone: 'info', text: 'Osto odottaa huoltajan hyväksyntää. Kurssi avautuu, kun osto on hyväksytty. Voit sulkea tämän näkymän.' };
    case 'iap-not-available':
    case 'billing-unavailable':
      return { tone: 'error', text: 'Ostot eivät ole käytettävissä tällä laitteella. Tarkista Ruutuajan sisältö- ja tietosuojarajoitukset ja yritä uudelleen.' };
    case 'network-error':
    case 'network':
    case 'service-timeout':
      return { tone: 'error', text: 'Yhteys ei onnistunut. Tarkista verkkoyhteys ja yritä uudelleen.' };
    case 'sku-not-found':
    case 'item-unavailable':
      return { tone: 'error', text: 'Kurssia ei juuri nyt löytynyt App Storesta. Yritä myöhemmin uudelleen.' };
    case 'already-owned':
      return { tone: 'info', text: 'Olet jo ostanut tämän kurssin. Paina ”Palauta ostokset”, niin liitämme oston tiliisi.' };
    default:
      return { tone: 'error', text: 'Osto ei onnistunut. Yritä uudelleen.' };
  }
}

export type ClaimStatus = 'active' | 'expired';
export interface ClaimResult {
  courseType: string;
  environment: string;
  status: ClaimStatus;
  /** The account's access right after recording (check-access?courseType=all shape); null if missing or unreadable. */
  access: StoreAccess | null;
}

/** 200 body of POST /api/iap/apple/claim; null when it is not a successful claim. */
export function parseClaimResponse(value: unknown, receivedAt: number = Date.now()): ClaimResult | null {
  if (!value || typeof value !== 'object') return null;
  const { ok, courseType, environment, status, access } = value as Record<string, unknown>;
  if (ok !== true || typeof courseType !== 'string' || (status !== 'active' && status !== 'expired')) return null;
  let parsed: StoreAccess | null = null;
  try { parsed = access ? parseStoreAccess(access, receivedAt) : null; } catch { parsed = null; }
  return { courseType, environment: typeof environment === 'string' ? environment : '', status, access: parsed };
}

/**
 * Whether a recorded claim opened `course`. `status` is only the purchase row's status column: a
 * purchase can be recorded as active and still be past its access end (the season's access_until,
 * or the Sandbox cap), so the account's paid access in the answer decides. Only without a readable
 * access does the status decide (and a 2xx without a readable body counts as opened, as before).
 */
export function claimOpensCourse(result: ClaimResult | null, course: CourseId): boolean {
  if (!result) return true;
  return result.access ? result.access.paid[course] : result.status === 'active';
}

/** The copy after a verified claim; `opened` from claimOpensCourse. */
export function claimSuccessMessage(result: ClaimResult, opened: boolean): StoreMessage {
  const course = COURSE_IDS.find(id => COURSES[id].courseType === result.courseType);
  const name = course ? COURSES[course].label : 'Kurssi';
  if (opened) return { tone: 'success', course, text: `${name} on nyt käytössäsi. Kiitos ostosta!` };
  if (result.status === 'expired') {
    return { tone: 'info', course, text: `Ostos löytyi, mutta sen kurssikausi on jo päättynyt, joten se ei avaa kurssia. Hyvitystä voit pyytää Applelta (reportaproblem.apple.com). Kysyttävää: ${SUPPORT}.` };
  }
  // Recorded as active, but its access period is over (e.g. last season's purchase, restored now).
  return { tone: 'info', course, text: `Ostos löytyi, mutta sen käyttöoikeus on jo päättynyt, joten se ei avaa kurssia. Kysyttävää: ${SUPPORT}.` };
}

/**
 * A failed claim (HTTP status + server code, or no status for a network failure) → copy. Only a
 * 409 account_mismatch is settled (see claimSettled); everything else stays unfinished, so StoreKit
 * keeps offering it and the app retries on the next launch or on "Palauta ostokset".
 */
export function claimErrorMessage(status: number | undefined, code: string | undefined): StoreMessage {
  if (code === 'account_mismatch' || status === 409) {
    return { tone: 'error', text: `Tämä App Store -osto on liitetty toiseen Opiskeluakatemia-tiliin. Kirjaudu sillä tilillä, jolla kurssi ostettiin, ja paina ”Palauta ostokset”. Jos tarvitset apua, kirjoita: ${SUPPORT}.` };
  }
  if (code === 'invalid_transaction' || status === 400) {
    return { tone: 'error', text: `Ostoa ei voitu vahvistaa. Kurssia ei avattu. Ota yhteyttä: ${SUPPORT}.` };
  }
  if (status === 401) return { tone: 'error', text: 'Kirjaudu uudelleen. Ostos on tallessa, ja se liitetään tiliisi, kun olet kirjautunut.' };
  if (status === undefined || code === 'unavailable' || status === 503 || status >= 500 || status === 429) {
    return { tone: 'error', text: 'Maksu on tallessa, mutta ostoa ei voitu vielä vahvistaa. Yritämme uudelleen, kun avaat sovelluksen. Voit myös painaa ”Palauta ostokset” hetken kuluttua.' };
  }
  return { tone: 'error', text: `Ostoa ei voitu vahvistaa. Yritä ”Palauta ostokset” hetken kuluttua tai kirjoita: ${SUPPORT}.` };
}

/**
 * Whether a failed claim is settled, so the transaction may be finished anyway. Only a 409
 * account_mismatch is: the server will never record it for this account. A finished non-renewing
 * transaction stays in Transaction.currentEntitlements, so the rightful account can still restore
 * it (and the server records it from Apple's ONE_TIME_CHARGE notification too).
 * Never a 400: invalid_transaction is the server's only 400 code and it covers a revoked
 * transaction and a server misconfiguration (bundle id, app id, product catalog) alike, so
 * finishing on it could lose a real purchase. Never a 401, 429, 5xx, timeout or network failure.
 */
export const claimSettled = (status: number | undefined, code: string | undefined) => status === 409 && code === 'account_mismatch';

/** Under a disabled Buy while an App Store payment for the course waits for the server's confirmation. */
export const UNSETTLED_PURCHASE_NOTE = 'Edellistä ostoa ei ole vielä vahvistettu. Paina alta ”Palauta ostokset”, niin yritämme uudelleen.';

/** "Palauta ostokset" could not reach the App Store (the sync or the purchase query failed). */
export const restoreFailedMessage: StoreMessage = { tone: 'error', text: 'Ostojen palautus ei onnistunut. Tarkista verkkoyhteys ja yritä uudelleen.' };

/**
 * Restore summary from the claim results of every App Store purchase found: 'active' = the claim
 * opened its course, 'expired' = recorded, but its access period is over (see claimOpensCourse).
 */
export function restoreMessage(results: readonly ('active' | 'expired' | 'failed')[], firstError: StoreMessage | null): StoreMessage {
  if (results.includes('active')) return { tone: 'success', text: 'Ostot palautettu. Kurssi on käytössäsi.' };
  if (firstError) return firstError;
  if (results.includes('expired')) return { tone: 'info', text: 'Löysimme oston, mutta sen käyttöoikeus on jo päättynyt, joten se ei avaa kurssia.' };
  return { tone: 'info', text: 'Tällä Apple ID:llä ei löytynyt palautettavia kurssiostoja.' };
}

/** POST /api/courses/trial error code → copy. */
export function trialErrorMessage(status: number | undefined, code: string | undefined): StoreMessage {
  switch (code) {
    case 'email_unconfirmed': return { tone: 'info', text: 'Vahvista ensin sähköpostiosoitteesi: avaa sähköpostiisi lähetetty vahvistuslinkki ja yritä sitten uudelleen.' };
    case 'trial_used': return { tone: 'info', text: 'Olet jo käyttänyt tämän kurssin ilmaisen kokeilun.' };
    case 'already_owned': return { tone: 'info', text: 'Kurssi on jo käytössäsi.' };
    case 'unavailable': return { tone: 'error', text: 'Kokeilua ei voitu aloittaa juuri nyt. Yritä hetken päästä uudelleen.' };
  }
  if (status === undefined) return { tone: 'error', text: 'Yhteys ei onnistunut. Tarkista verkkoyhteys ja yritä uudelleen.' };
  return { tone: 'error', text: 'Kokeilua ei voitu aloittaa. Yritä uudelleen.' };
}

export const trialStartedMessage = (course: CourseId): StoreMessage => ({
  tone: 'success', course, text: `Kokeilu alkoi: ${COURSES[course].label} on käytössäsi ${TRIAL_DAYS} päivää.`,
});

/** A StoreKit purchase token is the transaction's JWS (header.payload.signature); anything else is not sent. */
export const isJws = (token: unknown): token is string => typeof token === 'string' && token.length < 20000 && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(token);
