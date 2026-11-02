// The App Store purchase loop, without React: verify each StoreKit transaction on our server, then
// finish it. Pure (dependencies injected), so tests/store.test.cjs can drive it with fakes.
//
// - A transaction is finished ONLY after the server answered 2xx (including "already recorded").
//   On a 409 (another account), 400, 5xx or a network error it stays unfinished: StoreKit offers
//   it again on the next launch or return to the app (recoverPending) and through "Palauta ostokset".
// - requestPurchase resolves AND the listener fires for the same transaction: one claim per
//   transaction id (in flight or done in this session).
// - Only what the user just asked for speaks up. A transaction is 'live' (errors shown) when its
//   product was requested with Buy in this session and it is not older than that tap (expo-iap's
//   own rule, see purchaseFlowBinding.takeRequested); StoreKit's launch replay of an old,
//   unfinished transaction is 'quiet'. Store errors outside a purchase (a failed price query, the
//   connection, the transaction listener) are never shown as "Osto ei onnistunut"; only Ask to Buy is.
// - Errors reach the user through one function (say), which drops a repeat of the same text, as
//   expo-iap both throws and emits an error for one failed purchase.

import type { CourseId } from './courses';
import type { IapNative, IapPurchase } from './iap-types';
import {
  claimErrorMessage, claimSuccessMessage, courseForProductId, isJws, parseClaimResponse, purchaseErrorMessage, restoreFailedMessage,
  restoreMessage, type StoreAccess, type StoreMessage,
} from './store';

export type ClaimOutcome = 'active' | 'expired' | 'failed' | 'skipped';
/** live: a purchase the user just made or an Ask to Buy approval; quiet: replays and the launch scan; restore: "Palauta ostokset". */
export type ClaimMode = 'live' | 'quiet' | 'restore';

export interface PurchaseServiceDeps {
  native: IapNative;
  /** POST /api/iap/apple/claim; resolves with the 2xx body, rejects with { status?, code? } otherwise. */
  claim: (signedTransaction: string) => Promise<unknown>;
  say: (message: StoreMessage) => void;
  /**
   * A claim opened a course. `access` is the claim answer's account access (null when missing or
   * unreadable). Called before `verifying(false)`, so the caller can hide Buy for the course at
   * once, before (and regardless of) any later refresh.
   */
  granted: (course: CourseId, access: StoreAccess | null) => void;
  /** Claims in flight went from none to some (true) or back to none (false). */
  verifying?: (active: boolean) => void;
  now?: () => number;
  /** How long buy() waits for the purchase event when requestPurchase returned no transaction. */
  eventWaitMs?: number;
}

/** Same allowance as expo-iap's PURCHASE_REQUEST_CLOCK_SKEW_MS between the tap and StoreKit's transaction date. */
const CLOCK_SKEW_MS = 600_000;
const isDeferred = (code: string | undefined) => code === 'deferred-payment' || code === 'pending';

const failure = (error: unknown) => {
  const value = error && typeof error === 'object' ? (error as { status?: unknown; code?: unknown }) : {};
  return { status: typeof value.status === 'number' ? value.status : undefined, code: typeof value.code === 'string' ? value.code : undefined };
};

type Result = { outcome: ClaimOutcome; error: StoreMessage | null };

export function createPurchaseService(deps: PurchaseServiceDeps) {
  const { native } = deps;
  const now = deps.now ?? Date.now;
  const eventWaitMs = deps.eventWaitMs ?? 5000;
  const inFlight = new Map<string, { productId: string; task: Promise<Result> }>();
  const done = new Map<string, 'active' | 'expired'>();
  /** Product id → when Buy was tapped. Kept through Ask to Buy, so the later approval is 'live'. */
  const requested = new Map<string, number>();
  /** buy() calls waiting for a purchase event of a product id. */
  const waiters = new Map<string, Set<() => void>>();
  let buying = 0;
  let last: { text: string; at: number } | null = null;

  function say(message: StoreMessage | null) {
    if (!message) return;
    const at = now();
    if (last && last.text === message.text && at - last.at < 3000) return;
    last = { text: message.text, at };
    deps.say(message);
  }

  async function claimAndFinish(purchase: IapPurchase, course: CourseId, mode: ClaimMode): Promise<Result> {
    if (!isJws(purchase.token)) {
      // OpenIAP falls back to the transaction id when StoreKit has no JWS; the server would refuse it.
      const error = claimErrorMessage(400, 'invalid_transaction');
      if (mode === 'live') say(error);
      return { outcome: 'failed', error };
    }
    let body: unknown;
    try {
      body = await deps.claim(purchase.token);
    } catch (cause) {
      const { status, code } = failure(cause);
      const error = claimErrorMessage(status, code);
      if (mode === 'live') say(error);
      return { outcome: 'failed', error };
    }
    // 2xx: the server has recorded the transaction, so it is safe to finish. A failed finish only
    // means StoreKit offers it again; the next claim is idempotent.
    try { await native.finish(purchase); } catch { /* Replayed on the next launch. */ }
    const result = parseClaimResponse(body, now());
    const status = result?.status ?? 'active';
    done.set(purchase.transactionId, status);
    requested.delete(purchase.productId);
    if (status === 'active') deps.granted(course, result?.access ?? null);
    if (mode !== 'restore' && result) say(claimSuccessMessage(result));
    return { outcome: status, error: null };
  }

  /** Verify one transaction on the server and finish it after a 2xx. Safe to call twice. */
  function process(purchase: IapPurchase, mode: ClaimMode): Promise<Result> {
    const course = courseForProductId(purchase.productId);
    // Not our product, or Ask to Buy still waiting (the approved purchase arrives again later).
    if (!course || purchase.state === 'pending') return Promise.resolve({ outcome: 'skipped', error: null });
    const previous = done.get(purchase.transactionId);
    if (previous) return Promise.resolve({ outcome: previous, error: null });
    const running = inFlight.get(purchase.transactionId);
    if (running) return running.task;
    const task = claimAndFinish(purchase, course, mode).finally(() => {
      inFlight.delete(purchase.transactionId);
      if (inFlight.size === 0) deps.verifying?.(false);
    });
    if (inFlight.size === 0) deps.verifying?.(true);
    inFlight.set(purchase.transactionId, { productId: purchase.productId, task });
    return task;
  }

  /** Bought with this session's Buy tap (or approved after it), not a replay of an older transaction. */
  function wasRequested(purchase: IapPurchase) {
    const askedAt = requested.get(purchase.productId);
    return askedAt !== undefined && (!purchase.transactionDate || purchase.transactionDate >= askedAt - CLOCK_SKEW_MS);
  }

  function release(productId: string) {
    for (const wake of [...(waiters.get(productId) ?? [])]) wake();
  }

  /** Resolves when a purchase event for productId has been processed, or after `ms`. */
  function waitForEvent(productId: string, ms: number) {
    return new Promise<void>(resolve => {
      const set = waiters.get(productId) ?? new Set<() => void>();
      waiters.set(productId, set);
      const wake = () => {
        clearTimeout(timer);
        set.delete(wake);
        if (!set.size) waiters.delete(productId);
        resolve();
      };
      const timer = setTimeout(wake, ms);
      set.add(wake);
    });
  }

  return {
    process,
    /** purchaseUpdatedListener: 'live' only for what this session's Buy asked for. */
    onPurchase(purchase: IapPurchase): Promise<Result> {
      const task = process(purchase, wasRequested(purchase) ? 'live' : 'quiet');
      void task.finally(() => release(purchase.productId));
      return task;
    },
    /**
     * purchaseErrorListener. OpenIAP also emits here for a failed product query, the connection and
     * the transaction listener: those are not purchases, so only errors during a Buy are shown
     * (cancel stays silent), plus Ask to Buy, which can arrive at any time.
     */
    onError(code: string | undefined) {
      if (isDeferred(code) || buying > 0) say(purchaseErrorMessage(code));
    },
    /**
     * Opens the App Store sheet and resolves once the outcome has been handled: the returned
     * transaction verified (or the listener's, if StoreKit returned none, within eventWaitMs), or
     * the error shown. The caller keeps Buy busy until then.
     */
    async buy(sku: string, appAccountToken: string) {
      buying++;
      requested.set(sku, now());
      try {
        let purchases: IapPurchase[];
        try {
          purchases = await native.buy(sku, appAccountToken);
        } catch (error) {
          const code = native.errorCode(error);
          if (!isDeferred(code)) requested.delete(sku);
          say(purchaseErrorMessage(code));
          return;
        }
        const ours = (purchases ?? []).filter(purchase => purchase.productId === sku);
        if (ours.some(purchase => purchase.state === 'pending')) say(purchaseErrorMessage('deferred-payment'));
        const ready = ours.filter(purchase => purchase.state !== 'pending');
        if (ready.length) {
          await Promise.all(ready.map(purchase => process(purchase, 'live')));
          return;
        }
        if (ours.length) return;
        // StoreKit returned nothing: the outcome arrives through the listener.
        const running = [...inFlight.values()].filter(entry => entry.productId === sku).map(entry => entry.task);
        if (running.length) await Promise.all(running);
        else await waitForEvent(sku, eventWaitMs);
      } finally {
        buying--;
      }
    },
    /** Unfinished transactions (e.g. the app closed between payment and claim), quietly. */
    async recoverPending() {
      let pending: IapPurchase[];
      try { pending = await native.pending(); } catch { return; }
      for (const purchase of pending) await process(purchase, 'quiet');
    },
    /**
     * "Palauta ostokset": claim every current App Store entitlement for our products. AppStore.sync
     * (which may ask for the Apple ID password) runs only when nothing was found, and only here,
     * on the user's explicit tap.
     */
    async restore() {
      const ours = (list: IapPurchase[]) => list.filter(purchase => courseForProductId(purchase.productId));
      let purchases: IapPurchase[] = [];
      try { purchases = ours(await native.entitlements()); } catch { /* Synced below. */ }
      if (!purchases.length) {
        let syncFailed = false;
        try { await native.sync(); } catch (error) {
          if (native.errorCode(error) === 'user-cancelled') return;
          syncFailed = true;
        }
        try { purchases = ours(await native.entitlements()); } catch {
          say(restoreFailedMessage);
          return;
        }
        // A failed sync with nothing found is a failure, not "no purchases on this Apple ID".
        if (!purchases.length && syncFailed) {
          say(restoreFailedMessage);
          return;
        }
      }
      const results: ('active' | 'expired' | 'failed')[] = [];
      let firstError: StoreMessage | null = null;
      for (const purchase of purchases) {
        const { outcome, error } = await process(purchase, 'restore');
        if (outcome === 'skipped') continue;
        results.push(outcome);
        firstError ??= error;
      }
      say(restoreMessage(results, firstError));
    },
  };
}

export type PurchaseService = ReturnType<typeof createPurchaseService>;
