import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import { useSession } from './SessionProvider';
import { apiRequest } from '../lib/api';
import { COURSE_IDS, COURSES, type CourseId } from '../lib/courses';
import { iapNative } from '../lib/iap-native';
import { createPurchaseService, type PurchaseService } from '../lib/iap-service';
import {
  CLAIM_PATH, fetchStoreState, markOwned, productIdFor, STORE_SKUS, storeEnabled, TRIAL_PATH, trialDisclosure, trialErrorMessage, trialStartedMessage,
  type StoreAccess, type StoreCatalog, type StoreMessage,
} from '../lib/store';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
/** What is running: a purchase sheet for a course, a restore, or a trial start. */
export type IapBusy = { kind: 'buy' | 'trial'; course: CourseId } | { kind: 'restore' } | null;

interface IapContextValue {
  /** iOS with a signed-in user. False on Android and web: no store UI may render. */
  enabled: boolean;
  /** StoreKit's localized price per course; a course is missing until the App Store returned it. */
  prices: Partial<Record<CourseId, string>>;
  pricesState: LoadState;
  loadPrices: () => void;
  /** link-purchases, then check-access?courseType=all; and the server catalog (fetchStoreState). */
  access: StoreAccess | null;
  catalog: StoreCatalog;
  storeState: LoadState;
  storeError: string;
  refreshStore: () => Promise<void>;
  busy: IapBusy;
  /** A claim is being verified on the server. */
  verifying: boolean;
  /**
   * Courses with an App Store payment the server has not confirmed yet (a failed claim or an
   * unfinished transaction in this session): Buy stays disabled and "Palauta ostokset" retries.
   */
  unsettled: readonly CourseId[];
  /** The one place purchase, restore and trial outcomes are shown. */
  message: StoreMessage | null;
  clearMessage: () => void;
  /** Increases whenever a purchase or trial opened a course, or a trial ended: course screens re-check access. */
  accessVersion: number;
  /** The clock offers are computed with: ticks every 30 s while a trial runs, so "noin N min" counts down. */
  now: number;
  buy: (course: CourseId) => void;
  restore: () => void;
  /** Asks for confirmation with the trial disclosure; false when the price is not known yet. */
  startTrial: (course: CourseId) => boolean;
}

const noop = () => undefined;
const disabled: IapContextValue = {
  enabled: false, prices: {}, pricesState: 'idle', loadPrices: noop, access: null, catalog: {}, storeState: 'idle', storeError: '',
  refreshStore: async () => undefined, busy: null, verifying: false, unsettled: [], message: null, clearMessage: noop, accessVersion: 0, now: 0,
  buy: noop, restore: noop, startTrial: () => false,
};
const IapContext = createContext<IapContextValue>(disabled);

const requestFailure = (error: unknown) => {
  const value = error && typeof error === 'object' ? (error as { status?: unknown; code?: unknown }) : {};
  return { status: typeof value.status === 'number' ? value.status : undefined, code: typeof value.code === 'string' ? value.code : undefined };
};

/**
 * The iOS purchase service, mounted app-wide while someone is signed in (inside SessionProvider):
 * one App Store connection, one purchase listener and one error listener for the whole app, so an
 * Ask to Buy approval that arrives later is still verified and finished. On Android and web it
 * renders its children with a disabled value and never touches expo-iap (see src/lib/iap-native.ts).
 */
export function IapProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  if (!storeEnabled(Platform.OS) || !iapNative || !userId) return <IapContext.Provider value={disabled}>{children}</IapContext.Provider>;
  return <IosStore key={userId} userId={userId}>{children}</IosStore>;
}

function IosStore({ userId, children }: { userId: string; children: ReactNode }) {
  const native = iapNative!;
  const connected = useRef(false);
  const [prices, setPrices] = useState<Partial<Record<CourseId, string>>>({});
  const [pricesState, setPricesState] = useState<LoadState>('idle');
  const [access, setAccess] = useState<StoreAccess | null>(null);
  const [catalog, setCatalog] = useState<StoreCatalog>({});
  const [storeState, setStoreState] = useState<LoadState>('idle');
  const [storeError, setStoreError] = useState('');
  const [busy, setBusy] = useState<IapBusy>(null);
  const [verifying, setVerifying] = useState(false);
  const [unsettled, setUnsettled] = useState<readonly CourseId[]>([]);
  const [message, setMessage] = useState<StoreMessage | null>(null);
  const [accessVersion, setAccessVersion] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const service = useRef<PurchaseService | null>(null);
  const storeRequest = useRef(0);
  const mounted = useRef(true);

  const refreshStore = useCallback(async () => {
    const current = ++storeRequest.current;
    setStoreState('loading'); setStoreError('');
    try {
      // Links web guest checkouts first (errors ignored), so a course bought on the web is never offered.
      const next = await fetchStoreState(apiRequest);
      if (current !== storeRequest.current || !mounted.current) return;
      setAccess(next.access);
      setCatalog(next.catalog);
      setStoreState('ready');
      setNow(next.receivedAt);
    } catch (error) {
      if (current !== storeRequest.current || !mounted.current) return;
      setStoreState('error');
      setStoreError(error instanceof Error ? error.message : 'Kurssikauppaa ei voitu ladata. Yritä uudelleen.');
    }
  }, []);

  /**
   * A purchase or trial opened a course. After a purchase the course is marked owned right away
   * (from the claim answer, or optimistically when it carried no access), before the purchase
   * service clears `verifying`: the Buy button must never come back for a course just paid for,
   * even if the refresh below fails. The refresh then brings the server's full state.
   */
  const granted = useCallback((purchased?: { course: CourseId; access: StoreAccess | null }) => {
    if (!mounted.current) return;
    if (purchased) setAccess(previous => purchased.access ?? (previous ? markOwned(previous, purchased.course) : previous));
    setAccessVersion(value => value + 1);
    void refreshStore();
  }, [refreshStore]);

  const loadPrices = useCallback(() => {
    setPricesState('loading');
    void (async () => {
      try {
        // A retry after a failed launch connection connects again first, and then also picks up
        // the unfinished transactions the launch could not reach.
        if (!connected.current) {
          connected.current = await native.connect();
          if (connected.current && mounted.current) void service.current?.recoverPending();
        }
        if (!connected.current) throw new Error('App Store is not connected.');
        const found = await native.prices(STORE_SKUS);
        if (!mounted.current) return;
        const next: Partial<Record<CourseId, string>> = {};
        for (const id of COURSE_IDS) if (found[productIdFor(id)]) next[id] = found[productIdFor(id)];
        setPrices(next);
        // No product at all: agreements, product status or the network. Buying stays disabled.
        setPricesState(Object.keys(next).length ? 'ready' : 'error');
      } catch {
        if (mounted.current) setPricesState('error');
      }
    })();
  }, [native]);

  // One connection and one pair of listeners per signed-in user. Purchases that arrive while
  // signed out are never finished: they stay in StoreKit and are recovered after the next sign-in.
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    const purchases = createPurchaseService({
      native,
      claim: signedTransaction => apiRequest(CLAIM_PATH, { method: 'POST', body: { signedTransaction }, timeout: 45000 }),
      say: value => { if (!cancelled) setMessage(value); },
      granted: (course, access) => { if (!cancelled) granted({ course, access }); },
      verifying: active => { if (!cancelled) setVerifying(active); },
      unsettled: courses => { if (!cancelled) setUnsettled(courses); },
    });
    service.current = purchases;
    const subscriptions: { remove: () => void }[] = [];
    (async () => {
      try {
        // StoreKit also replays old unfinished transactions here at launch: the service shows errors
        // only for what this session's Buy asked for.
        subscriptions.push(native.onPurchase(purchase => { void purchases.onPurchase(purchase); }));
        subscriptions.push(native.onError(code => purchases.onError(code)));
        connected.current = await native.connect();
        if (cancelled) return;
        loadPrices();
        if (connected.current) await purchases.recoverPending();
      } catch {
        // No App Store module (e.g. a build without expo-iap) or no connection: prices show their error state.
        connected.current = false;
        if (!cancelled) setPricesState('error');
      }
    })();
    // Back in the foreground: verify anything newly unfinished. Claims in flight, done, or already
    // failed in this session are not sent again (the service dedupes; a failed one waits for the
    // next launch or "Palauta ostokset"), so returning to the app does not flash "Vahvistetaan ostoa…".
    const foreground = AppState.addEventListener('change', state => {
      if (state !== 'active' || cancelled) return;
      // A success note ("Kokeilu alkoi…", "…on nyt käytössäsi") is old news once the user has been away.
      setMessage(current => current?.tone === 'success' ? null : current);
      if (connected.current) void purchases.recoverPending();
    });
    return () => {
      foreground.remove();
      cancelled = true; mounted.current = false; service.current = null;
      for (const subscription of subscriptions) { try { subscription.remove(); } catch { /* Already removed. */ } }
      if (connected.current) native.disconnect().catch(() => undefined);
      connected.current = false;
    };
  }, [native, granted, loadPrices]);

  const buy = useCallback((course: CourseId) => {
    const purchases = service.current;
    // Never a second charge for a course the account already owns (the UI hides Buy too): only
    // with a fresh, successful access check that says the course is not paid, and no App Store
    // payment for it still waiting for the server.
    if (!purchases || busy || verifying || !prices[course] || storeState !== 'ready' || !access || access.paid[course] || unsettled.includes(course)) return;
    setMessage(null);
    setBusy({ kind: 'buy', course });
    void purchases.buy(productIdFor(course), userId).finally(() => { if (mounted.current) setBusy(null); });
  }, [busy, verifying, prices, storeState, access, unsettled, userId]);

  const restore = useCallback(() => {
    const purchases = service.current;
    if (!purchases || busy) return;
    setMessage(null);
    setBusy({ kind: 'restore' });
    void purchases.restore().finally(() => { if (mounted.current) setBusy(null); });
  }, [busy]);

  const runTrial = useCallback(async (course: CourseId) => {
    setMessage(null);
    setBusy({ kind: 'trial', course });
    try {
      await apiRequest(TRIAL_PATH, { method: 'POST', body: { courseType: COURSES[course].courseType } });
      if (!mounted.current) return;
      setMessage(trialStartedMessage(course));
      granted();
    } catch (error) {
      const { status, code } = requestFailure(error);
      if (mounted.current) setMessage(trialErrorMessage(status, code));
    } finally {
      if (mounted.current) setBusy(null);
    }
  }, [granted]);

  const startTrial = useCallback((course: CourseId) => {
    const price = prices[course];
    if (!price) return false;
    if (busy) return true;
    // App Store 3.1.1: duration, what happens afterwards and the price, before the trial starts.
    Alert.alert('Aloitetaanko ilmainen kokeilu?', trialDisclosure(course, price), [
      { text: 'Peruuta', style: 'cancel' },
      { text: 'Aloita kokeilu', onPress: () => void runTrial(course) },
    ]);
    return true;
  }, [prices, busy, runTrial]);

  const clearMessage = useCallback(() => setMessage(null), []);

  // A running trial: tick the clock for the minutes-left label and, when the trial ends, re-check
  // access (the course locks on the home screen and the card turns into Buy).
  useEffect(() => {
    if (!access) return;
    const start = Date.now();
    const ends = COURSE_IDS.flatMap(id => {
      const trial = access.trials[id];
      return trial.kind === 'running' && trial.endsAtMs > start ? [trial.endsAtMs] : [];
    });
    if (!ends.length) return;
    const tick = setInterval(() => setNow(Date.now()), 30000);
    const end = setTimeout(() => {
      setNow(Date.now());
      setAccessVersion(value => value + 1);
      void refreshStore();
    }, Math.max(0, Math.min(...ends) - start) + 1000);
    return () => { clearInterval(tick); clearTimeout(end); };
  }, [access, refreshStore]);

  const value = useMemo<IapContextValue>(() => ({
    enabled: true, prices, pricesState, loadPrices, access, catalog, storeState, storeError, refreshStore, busy, verifying, unsettled, message, clearMessage,
    accessVersion, now, buy, restore, startTrial,
  }), [prices, pricesState, loadPrices, access, catalog, storeState, storeError, refreshStore, busy, verifying, unsettled, message, clearMessage, accessVersion, now, buy, restore, startTrial]);
  return <IapContext.Provider value={value}>{children}</IapContext.Provider>;
}

export const useIap = () => useContext(IapContext);
