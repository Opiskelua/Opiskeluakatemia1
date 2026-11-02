import { Platform } from 'react-native';
import type { Purchase, PurchaseIOS } from 'expo-iap';
import type { IapNative, IapPurchase } from './iap-types';

// iOS bundle only (Metro picks this file over iap-native.ts for iOS). expo-iap is required on
// first use by a signed-in iOS user, never at import time and never on another platform.
type ExpoIap = typeof import('expo-iap');
let loaded: ExpoIap | null = null;
function iap(): ExpoIap {
  if (Platform.OS !== 'ios') throw new Error('App Store is only available on iOS.');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  loaded ??= require('expo-iap') as ExpoIap;
  return loaded;
}

/** Apple purchases only; `Purchase` has no platform field, so narrow on `store`. */
function toPurchase(purchase: Purchase | null | undefined): IapPurchase | null {
  if (!purchase || purchase.store !== 'apple') return null;
  const apple = purchase as PurchaseIOS;
  const transactionId = apple.transactionId || apple.id;
  if (!transactionId || !apple.productId) return null;
  const transactionDate = typeof apple.transactionDate === 'number' && Number.isFinite(apple.transactionDate) ? apple.transactionDate : 0;
  return { transactionId, productId: apple.productId, token: apple.purchaseToken ?? null, state: apple.purchaseState, transactionDate, raw: purchase };
}
const apple = (purchases: readonly (Purchase | null | undefined)[] | null | undefined) =>
  (purchases ?? []).map(toPurchase).filter((purchase): purchase is IapPurchase => purchase !== null);

function errorCode(error: unknown): string | undefined {
  if (iap().isUserCancelledError(error)) return 'user-cancelled';
  const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : undefined;
  return typeof code === 'string' ? code : undefined;
}

export const iapNative: IapNative | null = Platform.OS === 'ios' ? {
  connect: () => iap().initConnection(),
  disconnect: async () => { await iap().endConnection(); },
  async prices(skus) {
    // 'all': StoreKit non-renewing subscriptions are 'subs' in OpenIAP, and 'in-app' would drop them.
    const products = await iap().fetchProducts({ skus: [...skus], type: 'all' });
    const prices: Record<string, string> = {};
    for (const product of products ?? []) {
      if (product.platform === 'ios' && skus.includes(product.id) && typeof product.displayPrice === 'string' && product.displayPrice) prices[product.id] = product.displayPrice;
    }
    return prices;
  },
  async buy(sku, appAccountToken) {
    // appAccountToken = the Supabase user id (a UUID): the server refuses a transaction made for another account.
    const result = await iap().requestPurchase({ type: 'subs', request: { apple: { sku, appAccountToken } } });
    return apple(Array.isArray(result) ? result : [result]);
  },
  finish: purchase => iap().finishTransaction({ purchase: purchase.raw as Purchase, isConsumable: false }),
  pending: async () => apple(await iap().getPendingTransactionsIOS()),
  entitlements: async () => apple(await iap().getAvailablePurchases({ onlyIncludeActiveItemsIOS: true })),
  sync: async () => { await iap().syncIOS(); },
  onPurchase: listener => iap().purchaseUpdatedListener(purchase => {
    const value = toPurchase(purchase);
    if (value) listener(value);
  }),
  onError: listener => iap().purchaseErrorListener(error => listener(errorCode(error))),
  errorCode,
} : null;
