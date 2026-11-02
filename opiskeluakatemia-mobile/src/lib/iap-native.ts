import type { IapNative } from './iap-types';

/**
 * Android and web: no App Store. iap-native.ios.ts replaces this file in the iOS bundle, so
 * expo-iap is never bundled or initialised here (it is also excluded from Android autolinking
 * in package.json).
 */
export const iapNative: IapNative | null = null;
