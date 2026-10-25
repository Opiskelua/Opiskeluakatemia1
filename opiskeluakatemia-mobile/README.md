# Opiskeluakatemia mobile

An Expo / React Native TypeScript app for iOS and Android, beside the existing Next.js website. It shares the website's Supabase project and authenticated course APIs.

## What works in this first version

- Existing email/password accounts, persistent sessions and foreground token refresh.
- Password recovery using the website's existing reset-password page.
- Purchase linking and server-verified course access, with loading, retry, and no-access states.
- Sign-out, Finnish copy, keyboard handling and safe-area layout.

Exercises, progress syncing, Google sign-in, signup, native payments, notifications and offline study are not implemented yet. This is a development foundation, not an App Store release. The icon assets are Expo placeholders.

## Run

Use a current Node.js LTS version and npm.

```sh
cd opiskeluakatemia-mobile
npm install
# If .env.local is absent:
cp .env.example .env.local
npm start
```

The initial setup copied only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_APP_URL` from the website into their corresponding `EXPO_PUBLIC_*` variables in the ignored `.env.local` file. No privileged keys are copied.

`EXPO_PUBLIC_API_URL` must point to the existing Next.js server, without a trailing `/api`. The inherited setting currently targets local development. Start the website separately with `npm run dev` in `../opiskeluakatemia`.

- iOS Simulator: `http://localhost:3000` can reach the Mac's server.
- Android Emulator: use `http://10.0.2.2:3000`.
- Physical phone: use your Mac's LAN IP (same Wi-Fi), or your deployed HTTPS website origin.
- Restart Expo after changing environment settings.

Use `npm run ios` with Xcode / iOS Simulator installed, or `npm run android` with Android Studio / an emulator installed. This project uses Expo SDK 58. Expo Go must support that SDK; otherwise use a development build. See https://docs.expo.dev/develop/development-builds/introduction/.

Password recovery sends an email only when the user presses its button. Its redirect uses the configured website origin and must be allowed in Supabase's redirect URL settings. Google-only accounts do not have mobile OAuth in this version.

## Validation

```sh
npm run typecheck
npx expo install --check
npx expo export --platform ios --output-dir dist/ios
npx expo export --platform android --output-dir dist/android
```

JavaScript export checks are not native builds or device testing. Verify on devices using a test account: valid/invalid login, app restart, active/no course access, offline retry, expired session and sign-out. No test account was supplied during setup.

## Backend contract

Requests send `Authorization: Bearer <Supabase access token>` to the existing Next.js server:

- `POST /api/courses/link-purchases` associates matching purchases with the signed-in account, as the website does.
- `GET /api/courses/check-access?courseType=abikurssi` returns `{ hasAccess: boolean, courseType: string }`.

The server verifies the user and evaluates course access. A local UI state never grants access to protected course material. Supabase public keys are expected to be visible in a client app; server service-role keys, Stripe secrets and AI keys must never be included. Session persistence currently uses AsyncStorage, following Supabase's React Native quickstart; it is not encrypted storage.

## Next milestone

Implement a single real exercise flow backed by the website's existing content and progress APIs, then expand to other subjects. Add navigation when these screens exist. Select permanent iOS/Android application identifiers, configure EAS and store accounts, replace placeholder icons, and implement the appropriate purchase flow before store submission.

## Initial verification results

TypeScript checking and both iOS/Android JavaScript exports passed. Expo's offline dependency check reported compatible versions, but did not perform an online validation. Native compilation, device layout, live sign-in and live course access have not been tested.

The initial npm audit reported five high-severity entries in Expo's CLI dependency chain (including node-forge and zod). The suggested automatic fix downgrades Expo to SDK 44, so it was not applied. Review upstream fixes and rerun the audit before release.
