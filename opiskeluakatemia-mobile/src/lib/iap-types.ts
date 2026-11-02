// The App Store bridge the purchase service talks to. Only src/lib/iap-native.ios.ts implements it
// (with expo-iap); src/lib/iap-native.ts is the Android/web stub (null), so Metro never puts
// expo-iap into the Android or web bundle.

/** One StoreKit transaction, reduced to what the purchase service needs. */
export interface IapPurchase {
  /** StoreKit transaction id: the in-memory dedupe key. */
  transactionId: string;
  productId: string;
  /** The transaction's JWS (sent to the server), or null when StoreKit gave none. */
  token: string | null;
  state: 'pending' | 'purchased' | 'unknown';
  /** The library's own purchase object, handed back to finishTransaction. */
  raw: unknown;
}

export interface IapSubscription { remove: () => void }

export interface IapNative {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  /** productId → StoreKit's localized displayPrice, for the products the App Store returned. */
  prices(skus: readonly string[]): Promise<Record<string, string>>;
  /** Opens the App Store sheet. The outcome arrives through onPurchase / onError. */
  buy(sku: string, appAccountToken: string): Promise<void>;
  finish(purchase: IapPurchase): Promise<void>;
  /** Unfinished transactions (Transaction.unfinished), e.g. after a crash between payment and claim. */
  pending(): Promise<IapPurchase[]>;
  /** Current entitlements (Transaction.currentEntitlements), for "Palauta ostokset". */
  entitlements(): Promise<IapPurchase[]>;
  /** AppStore.sync(): may ask for the Apple ID password, so only on an explicit tap. */
  sync(): Promise<void>;
  onPurchase(listener: (purchase: IapPurchase) => void): IapSubscription;
  onError(listener: (code: string | undefined) => void): IapSubscription;
  /** The error code (expo-iap ErrorCode string) of a thrown error. */
  errorCode(error: unknown): string | undefined;
}
