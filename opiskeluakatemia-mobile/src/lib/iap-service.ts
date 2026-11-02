// The App Store purchase loop, without React: verify each StoreKit transaction on our server, then
// finish it. Pure (dependencies injected), so tests/store.test.cjs can drive it with fakes.
//
// - A transaction is finished ONLY after the server answered 2xx (including "already recorded").
//   On a 409 (another account), 400, 5xx or a network error it stays unfinished: StoreKit offers
//   it again on the next launch (recoverPending) and through "Palauta ostokset".
// - requestPurchase resolves AND the listener fires for the same transaction: one claim per
//   transaction id (in flight or done in this session).
// - Errors reach the user through one function (say), which drops a repeat of the same text, as
//   expo-iap both throws and emits an error for one failed purchase.

import type { IapNative, IapPurchase } from './iap-types';
import {
  claimErrorMessage, claimSuccessMessage, courseForProductId, isJws, parseClaimResponse, purchaseErrorMessage, restoreMessage,
  type StoreMessage,
} from './store';

export type ClaimOutcome = 'active' | 'expired' | 'failed' | 'skipped';
/** live: a purchase the user just made or an Ask to Buy approval; quiet: the launch scan; restore: "Palauta ostokset". */
export type ClaimMode = 'live' | 'quiet' | 'restore';

export interface PurchaseServiceDeps {
  native: IapNative;
  /** POST /api/iap/apple/claim; resolves with the 2xx body, rejects with { status?, code? } otherwise. */
  claim: (signedTransaction: string) => Promise<unknown>;
  say: (message: StoreMessage) => void;
  /** A claim opened a course: refresh course access. */
  granted: () => void;
  /** Claims in flight went from none to some (true) or back to none (false). */
  verifying?: (active: boolean) => void;
  now?: () => number;
}

const failure = (error: unknown) => {
  const value = error && typeof error === 'object' ? (error as { status?: unknown; code?: unknown }) : {};
  return { status: typeof value.status === 'number' ? value.status : undefined, code: typeof value.code === 'string' ? value.code : undefined };
};

export function createPurchaseService(deps: PurchaseServiceDeps) {
  const { native } = deps;
  const now = deps.now ?? Date.now;
  const inFlight = new Map<string, Promise<{ outcome: ClaimOutcome; error: StoreMessage | null }>>();
  const done = new Map<string, 'active' | 'expired'>();
  let last: { text: string; at: number } | null = null;

  function say(message: StoreMessage | null) {
    if (!message) return;
    const at = now();
    if (last && last.text === message.text && at - last.at < 3000) return;
    last = { text: message.text, at };
    deps.say(message);
  }

  async function claimAndFinish(purchase: IapPurchase, mode: ClaimMode): Promise<{ outcome: ClaimOutcome; error: StoreMessage | null }> {
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
    const result = parseClaimResponse(body);
    const status = result?.status ?? 'active';
    done.set(purchase.transactionId, status);
    if (status === 'active') deps.granted();
    if (mode !== 'restore' && result) say(claimSuccessMessage(result));
    return { outcome: status, error: null };
  }

  /** Verify one transaction on the server and finish it after a 2xx. Safe to call twice. */
  function process(purchase: IapPurchase, mode: ClaimMode): Promise<{ outcome: ClaimOutcome; error: StoreMessage | null }> {
    // Not our product, or Ask to Buy still waiting (the approved purchase arrives again later).
    if (!courseForProductId(purchase.productId) || purchase.state === 'pending') return Promise.resolve({ outcome: 'skipped', error: null });
    const previous = done.get(purchase.transactionId);
    if (previous) return Promise.resolve({ outcome: previous, error: null });
    const running = inFlight.get(purchase.transactionId);
    if (running) return running;
    const task = claimAndFinish(purchase, mode).finally(() => {
      inFlight.delete(purchase.transactionId);
      if (inFlight.size === 0) deps.verifying?.(false);
    });
    if (inFlight.size === 0) deps.verifying?.(true);
    inFlight.set(purchase.transactionId, task);
    return task;
  }

  return {
    process,
    /** purchaseErrorListener: cancel is silent, Ask to Buy is "waiting for approval". */
    onError(code: string | undefined) { say(purchaseErrorMessage(code)); },
    /** Opens the App Store sheet; the result arrives through the purchase listener. */
    async buy(sku: string, appAccountToken: string) {
      try { await native.buy(sku, appAccountToken); }
      catch (error) { say(purchaseErrorMessage(native.errorCode(error))); }
    },
    /** After connecting: unfinished transactions (e.g. the app closed between payment and claim). */
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
        try { await native.sync(); } catch (error) {
          if (native.errorCode(error) === 'user-cancelled') return;
        }
        try { purchases = ours(await native.entitlements()); } catch {
          say({ tone: 'error', text: 'Ostojen palautus ei onnistunut. Tarkista verkkoyhteys ja yritä uudelleen.' });
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
