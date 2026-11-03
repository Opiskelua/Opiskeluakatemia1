// The App Store purchase loop, without React: verify each StoreKit transaction on our server, then
// finish it. Pure (dependencies injected), so tests/store.test.cjs can drive it with fakes.
//
// - A transaction is finished after the server answered 2xx (including "already recorded"), or a
//   settled 409 account_mismatch (another account's purchase, e.g. on a shared iPhone; see
//   claimSettled). On a 400, 401, 429, 5xx, timeout or network error it stays unfinished: StoreKit
//   offers it again on the next launch (recoverPending) and through "Palauta ostokset".
// - A 2xx opens the course only when the answer's access says paid (claimOpensCourse): the row's
//   status alone can be 'active' after its access period ended.
// - requestPurchase resolves AND the listener fires for the same transaction: one claim per
//   transaction id (in flight or done in this session). A transaction whose claim failed is claimed
//   quietly at most once per session (not on every return to the app); "Palauta ostokset" or a
//   live purchase event still claims it again.
// - Unsettled: a product with a failed claim, or an unfinished transaction found at recovery, in
//   this session. Its Buy stays off (no second charge for a payment still waiting) until a claim
//   for the product answers 2xx.
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
  claimErrorMessage, claimOpensCourse, claimSettled, claimSuccessMessage, courseForProductId, isJws, parseClaimResponse, purchaseErrorMessage,
  restoreFailedMessage, restoreMessage, type StoreAccess, type StoreMessage,
} from './store';

/** active: recorded and the course is open; expired: recorded, but its access period is over (opens nothing). */
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
  /**
   * The courses whose App Store payment is not confirmed by the server yet (a failed claim or an
   * unfinished transaction in this session), whenever that list changes. Called before
   * `verifying(false)`, so Buy never comes back for them in between.
   */
  unsettled?: (courses: CourseId[]) => void;
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
  /** Settled in this session (a 2xx, or a finished account_mismatch): never claimed again until the next launch. */
  const done = new Map<string, Result>();
  /** Product id → when Buy was tapped. Kept through Ask to Buy, so the later approval is 'live'. */
  const requested = new Map<string, number>();
  /** buy() calls waiting for a purchase event of a product id. */
  const waiters = new Map<string, Set<() => void>>();
  /** Transaction ids whose claim failed in this session: not claimed quietly again until the next launch. */
  const failed = new Set<string>();
  /** Product id → its unconfirmed transactions (failed claim, or unfinished at recovery) in this session. */
  const unsettled = new Map<string, Set<string>>();
  let buying = 0;
  let last: { text: string; at: number } | null = null;

  function say(message: StoreMessage | null) {
    if (!message) return;
    const at = now();
    if (last && last.text === message.text && at - last.at < 3000) return;
    last = { text: message.text, at };
    deps.say(message);
  }

  function publishUnsettled() {
    deps.unsettled?.([...unsettled.keys()].map(courseForProductId).filter((course): course is CourseId => course !== null));
  }
  function markUnsettled(purchase: IapPurchase) {
    const ids = unsettled.get(purchase.productId) ?? new Set<string>();
    if (ids.has(purchase.transactionId)) return;
    ids.add(purchase.transactionId);
    unsettled.set(purchase.productId, ids);
    publishUnsettled();
  }
  /** One transaction is settled (a finished account_mismatch); the product stays unsettled if it has others. */
  function settleTransaction(purchase: IapPurchase) {
    const ids = unsettled.get(purchase.productId);
    if (!ids?.delete(purchase.transactionId)) return;
    if (!ids.size) unsettled.delete(purchase.productId);
    publishUnsettled();
  }
  /** A claim for the product answered 2xx: the server's access decides about Buy from now on. */
  function settleProduct(productId: string) {
    if (unsettled.delete(productId)) publishUnsettled();
  }

  async function claimAndFinish(purchase: IapPurchase, course: CourseId, mode: ClaimMode): Promise<Result> {
    if (!isJws(purchase.token)) {
      // OpenIAP falls back to the transaction id when StoreKit has no JWS; the server would refuse it.
      const error = claimErrorMessage(400, 'invalid_transaction');
      failed.add(purchase.transactionId);
      markUnsettled(purchase);
      if (mode === 'live') say(error);
      return { outcome: 'failed', error };
    }
    let body: unknown;
    try {
      body = await deps.claim(purchase.token);
    } catch (cause) {
      const { status, code } = failure(cause);
      const error = claimErrorMessage(status, code);
      if (claimSettled(status, code)) {
        // Another account's purchase: finished, so it is not claimed again on every launch (a
        // failed finish only means one more claim on the next launch). Buy is not held back for it.
        try { await native.finish(purchase); } catch { /* Offered again on the next launch. */ }
        done.set(purchase.transactionId, { outcome: 'failed', error });
        settleTransaction(purchase);
      } else {
        failed.add(purchase.transactionId);
        markUnsettled(purchase);
      }
      if (mode === 'live') say(error);
      return { outcome: 'failed', error };
    }
    // 2xx: the server has recorded the transaction, so it is safe to finish, even when it opens
    // nothing. A failed finish only means StoreKit offers it again; the next claim is idempotent.
    try { await native.finish(purchase); } catch { /* Replayed on the next launch. */ }
    const result = parseClaimResponse(body, now());
    const opened = claimOpensCourse(result, course);
    const outcome = opened ? 'active' : 'expired';
    done.set(purchase.transactionId, { outcome, error: null });
    failed.delete(purchase.transactionId);
    requested.delete(purchase.productId);
    settleProduct(purchase.productId);
    if (opened) deps.granted(course, result?.access ?? null);
    if (mode !== 'restore' && result) say(claimSuccessMessage(result, opened));
    return { outcome, error: null };
  }

  /** Verify one transaction on the server and finish it once settled (2xx or account_mismatch). Safe to call twice. */
  function process(purchase: IapPurchase, mode: ClaimMode): Promise<Result> {
    const course = courseForProductId(purchase.productId);
    // Not our product, or Ask to Buy still waiting (the approved purchase arrives again later).
    if (!course || purchase.state === 'pending') return Promise.resolve({ outcome: 'skipped', error: null });
    const previous = done.get(purchase.transactionId);
    if (previous) return Promise.resolve(previous);
    const running = inFlight.get(purchase.transactionId);
    if (running) return running.task;
    // Already failed in this session: "Palauta ostokset", a live event or the next launch tries again.
    if (mode === 'quiet' && failed.has(purchase.transactionId)) return Promise.resolve({ outcome: 'failed', error: null });
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
      // A payment for this product still waits for the server: never a second charge. The store
      // shows Buy disabled with a pointer to "Palauta ostokset", which claims it again.
      if (unsettled.has(sku)) return;
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
    /**
     * Unfinished transactions (e.g. the app closed between payment and claim), quietly. Each is
     * claimed at most once per session: a return to the app does not retry one that failed.
     */
    async recoverPending() {
      let pending: IapPurchase[];
      try { pending = await native.pending(); } catch { return; }
      // A payment StoreKit still holds: Buy stays off for its course until a claim answers 2xx.
      for (const purchase of pending) {
        if (courseForProductId(purchase.productId) && purchase.state !== 'pending' && !done.has(purchase.transactionId)) markUnsettled(purchase);
      }
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
