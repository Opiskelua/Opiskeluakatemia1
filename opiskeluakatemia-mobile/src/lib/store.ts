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
/** Must match the website's TRIAL_MINUTES (src/lib/course-trial.ts). */
export const TRIAL_MINUTES = 60;

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
}
export type StoreCatalog = Partial<Record<CourseId, CatalogEntry>>;

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * GET /api/iap/apple/catalog → { products: [{ courseType, productId, accessUntil, onSale }] }.
 * Entries for unknown courses, a product id that is not the course's own, or a malformed date are
 * dropped (that course then shows "not on sale"). Throws when the answer is not a catalog at all.
 */
export function parseCatalog(value: unknown): StoreCatalog {
  const products = value && typeof value === 'object' ? (value as { products?: unknown }).products : undefined;
  if (!Array.isArray(products)) throw new Error('Kurssikaupan tietoja ei voitu lukea. Yritä uudelleen.');
  const catalog: StoreCatalog = {};
  for (const item of products) {
    if (!item || typeof item !== 'object') continue;
    const { courseType, productId, accessUntil, onSale } = item as Record<string, unknown>;
    const course = COURSE_IDS.find(id => COURSES[id].courseType === courseType);
    if (!course || productId !== productIdFor(course) || typeof accessUntil !== 'string' || !DATE.test(accessUntil) || typeof onSale !== 'boolean') continue;
    catalog[course] = { productId, accessUntil, onSale };
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
  /** The catalog's access end as D.M.YYYY, else null. */
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
 * - never tried and on sale: Buy and the free trial;
 * - trial used and on sale: Buy;
 * - otherwise (no catalog entry, sale over): not on sale, no Buy and no trial.
 */
export function offerForCourse(course: CourseId, access: StoreAccess | null, catalog: CatalogEntry | null | undefined, now: number): CourseOffer {
  const accessUntilLabel = catalog ? finnishDate(catalog.accessUntil) : null;
  const none: CourseOffer = { state: 'not-on-sale', showBuy: false, showTrial: false, trialMinutesLeft: null, accessUntilLabel };
  if (!access) return none;
  if (access.paid[course]) return { ...none, state: 'owned' };
  const onSale = !!catalog?.onSale;
  const trial = access.trials[course];
  if (trial.kind === 'running' && trial.endsAtMs > now) {
    return { ...none, state: 'trial-running', showBuy: onSale, trialMinutesLeft: Math.max(1, Math.ceil((trial.endsAtMs - now) / 60000)) };
  }
  if (!onSale) return none;
  if (trial.kind === 'none') return { ...none, state: 'trial-available', showBuy: true, showTrial: true };
  return { ...none, state: 'buy', showBuy: true };
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
  return `Ilmainen kokeilu avaa koko kurssin (${COURSES[course].label}) heti ${TRIAL_MINUTES} minuutiksi, ilman maksutietoja. `
    + `Kun aika on kulunut, kurssin sisältö lukittuu. Sen jälkeen kurssin voi ostaa sovelluksessa hintaan ${price} (kertaosto, ei uusiudu). Kokeilun voi käyttää kerran.`;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type MessageTone = 'info' | 'error' | 'success';
export interface StoreMessage { tone: MessageTone; text: string }

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
export interface ClaimResult { courseType: string; environment: string; status: ClaimStatus }

/** 200 body of POST /api/iap/apple/claim; null when it is not a successful claim. */
export function parseClaimResponse(value: unknown): ClaimResult | null {
  if (!value || typeof value !== 'object') return null;
  const { ok, courseType, environment, status } = value as Record<string, unknown>;
  if (ok !== true || typeof courseType !== 'string' || (status !== 'active' && status !== 'expired')) return null;
  return { courseType, environment: typeof environment === 'string' ? environment : '', status };
}

/** The copy after a verified claim. */
export function claimSuccessMessage(result: ClaimResult): StoreMessage {
  const course = COURSE_IDS.find(id => COURSES[id].courseType === result.courseType);
  const name = course ? COURSES[course].label : 'Kurssi';
  if (result.status === 'expired') {
    return { tone: 'info', text: `Ostos löytyi, mutta sen kurssikausi on jo päättynyt, joten se ei avaa kurssia. Hyvitystä voit pyytää Applelta (reportaproblem.apple.com). Kysyttävää: ${SUPPORT}.` };
  }
  return { tone: 'success', text: `${name} on nyt käytössäsi. Kiitos ostosta!` };
}

/**
 * A failed claim (HTTP status + server code, or no status for a network failure) → copy and
 * whether the transaction may be finished. It never may: only a 2xx finishes a transaction, so
 * StoreKit keeps offering it and the app retries on the next launch or on "Palauta ostokset".
 */
export function claimErrorMessage(status: number | undefined, code: string | undefined): StoreMessage {
  if (code === 'account_mismatch' || status === 409) {
    return { tone: 'error', text: `Tämä App Store -osto on liitetty toiseen Opiskeluakatemia-tiliin. Kirjaudu sillä tilillä, jolla kurssi ostettiin. Jos tarvitset apua, kirjoita: ${SUPPORT}.` };
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

/** Restore summary from the claim results of every App Store purchase found. */
export function restoreMessage(results: readonly ('active' | 'expired' | 'failed')[], firstError: StoreMessage | null): StoreMessage {
  if (results.includes('active')) return { tone: 'success', text: 'Ostot palautettu. Kurssi on käytössäsi.' };
  if (firstError) return firstError;
  if (results.includes('expired')) return { tone: 'info', text: 'Löysimme oston, mutta sen kurssikausi on jo päättynyt.' };
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
  tone: 'success', text: `Kokeilu alkoi: ${COURSES[course].label} on käytössäsi ${TRIAL_MINUTES} minuuttia.`,
});

/** A StoreKit purchase token is the transaction's JWS (header.payload.signature); anything else is not sent. */
export const isJws = (token: unknown): token is string => typeof token === 'string' && token.length < 20000 && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(token);
