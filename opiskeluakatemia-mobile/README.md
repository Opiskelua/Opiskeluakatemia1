# Opiskeluakatemia mobile

An Expo / React Native TypeScript app for iOS and Android, beside the existing Next.js website. It shares the website's Supabase project and authenticated course APIs.

## What works in this first version

- Existing email/password accounts, persistent sessions and foreground token refresh.
- Password recovery using the website's existing reset-password page.
- Purchase linking and server-verified course access, with loading, retry, and no-access states.
- Sign-out, Finnish copy, keyboard handling and safe-area layout.
- Grammar, reading-comprehension and listening exercises from the same web course catalogue.
- AI-generated grammar and reading exercises, with the selected mobile difficulty sent to the existing web APIs.
- Exercise answers, results and history synchronized through the existing authenticated course APIs and Supabase attempt tables.
- Retry-safe mobile submissions: a repeated request reuses the same saved attempt instead of recording it twice.
- Reading and listening media, answer feedback, history refresh and pull-to-refresh.

Google sign-in, signup, native payments, notifications and offline study are not implemented yet. This is a development foundation, not an App Store release. The icon assets are Expo placeholders.

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
- Physical phone: on the same Wi-Fi, the app replaces a localhost API origin with the Expo development machine's LAN IP. With tunnels or a deployed backend, set `EXPO_PUBLIC_API_URL` explicitly.
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

JavaScript export checks are not native builds or device testing. Verify on devices using a test account: valid/invalid login, app restart, active/no course access, offline retry, expired session and sign-out. Use the dedicated test account created for this workspace; do not commit its password.

## Backend contract

Requests send `Authorization: Bearer <Supabase access token>` to the existing Next.js server:

- `POST /api/courses/link-purchases` associates matching purchases with the signed-in account, as the website does.
- `GET /api/courses/check-access?courseType=abikurssi` returns `{ hasAccess: boolean, courseType: string }`.

The server verifies the user and evaluates course access. A local UI state never grants access to protected course material. Supabase public keys are expected to be visible in a client app; server service-role keys, Stripe secrets and AI keys must never be included. Session persistence currently uses AsyncStorage, following Supabase's React Native quickstart; it is not encrypted storage.

## Next milestone

Test the completed exercise flow on physical iOS and Android devices with an active course account. Then add Google sign-in, offline study, permanent iOS/Android application identifiers, EAS configuration, final icons and the appropriate purchase flow before store submission.

## Initial verification results

TypeScript checking and both iOS/Android JavaScript exports passed. Expo's offline dependency check reported compatible versions, but did not perform an online validation. Live test-account login, course access, grammar/listening submissions and reading multiple-choice submission were verified against the local backend and shared Supabase history. The user confirmed the app opens successfully on their iPhone over a personal hotspot after replacing an expired temporary backend tunnel with the Mac LAN address. Full native device regression testing remains outstanding.

The initial npm audit reported five high-severity entries in Expo's CLI dependency chain (including node-forge and zod). The suggested automatic fix downgrades Expo to SDK 44, so it was not applied. Review upstream fixes and rerun the audit before release.

## Phone test and AI configuration

Start the website in one terminal (`cd opiskeluakatemia && npm run dev`) and Expo in another (`cd opiskeluakatemia-mobile && npx expo start --lan`). Keep both running. Scan Expo's QR code with your phone on the same Wi-Fi. Sign in, choose **Aloita harjoittelu**, complete a ready-made grammar exercise, then open **Harjoitushistoria**. The result should also appear on the website using the same account. Web history refreshes when its browser window regains focus; mobile history refreshes on focus, foreground and pull-to-refresh. Sync covers completed attempts, not unfinished answers.

The existing backend uses Gemini for generated exercises and open-answer grading. Put the valid key in **`opiskeluakatemia/.env.local`** as `GEMINI_API_KEY=...` and restart the Next.js backend. Never put this key in the mobile project or an `EXPO_PUBLIC_*` variable. The last provider check returned HTTP 402; AI flows need verification after the key is replaced. Ready-made grammar, reading multiple-choice subsets and listening multiple-choice exercises do not require AI calls.

Mobile submissions use the same grammar/reading/listening evaluate routes as the web, plus an optional UUID `clientAttemptId`. Deploy the updated website routes and `src/lib/mobile-attempt.ts` before pointing a distributed mobile build at production; they provide retry deduplication. The local preview has development-only CORS for localhost ports 8081 and 8083. Production CORS is unchanged.

`npm test` validates the website fixtures, scoring, response validation and LAN origin mapping. The website's focused mobile-attempt tests cover ownership and retry handling. Full web TypeScript checking currently reports pre-existing missing Playwright dependencies in `test-theory-links.spec.ts`.

## Continued mobile integration (26 October 2026)

The home screen now includes theory, daily tasks, essays, progress and synced flashcards. The flashcard API and course-content API enforce active course access on the server. The website's Muistikortit page includes a synced section using the same API; existing browser-only decks remain separately labelled and are not automatically migrated.

Flashcard storage adapts short vocabulary text and course markers to the shared database length constraints, normalizes padding in responses, and starts cards at the required one-day interval. Unreviewed cards remain immediately due. Failed or stale review requests require a refresh before another review. Mobile input limits match the shared card storage limits.

Validation: mobile TypeScript, lint and 28 tests pass; iOS, Android and web bundle exports succeeded. Local unauthenticated course endpoints return 401, and course/essay browser-preview preflights succeed. Pack installation, card loading, review saving (10 to 9 due cards), progress and daily tasks were checked with the existing browser test session. Protected deep links now wait for session restoration before routing. The stored test-credentials.json login was rejected, so do not rely on that file for a fresh sign-in. Physical-device testing and live AI grading remain outstanding. Website-wide TypeScript checking still reports the existing missing @playwright/test dependency in test-theory-links.spec.ts.

## Follow-up integration (27 October 2026)

Applied the isolated Codex patches to this checkout: generated daily-task IDs now resolve to the assigned grammar/reading exercise, and website flashcards expose loading/saving status and announce revealed answers. Unknown assignments remain unsupported. Essay daily-task completion failures now offer a separate retry using the saved grade, without submitting the essay for grading again.

Installed the website's missing `@playwright/test` development dependency. Current validation passes: mobile TypeScript, Expo lint and all 35 tests; full website TypeScript; changed website component ESLint; and all 10 website unit tests (`node --import tsx --test src/lib/__tests__/*.test.ts`). This supersedes the missing-Playwright typecheck limitation above. No live AI grading, production deployment or physical-device regression testing was performed during this follow-up.

## Gemini model compatibility

The backend now defaults to `gemini-3.8-flash` through a shared model factory. Set `GEMINI_MODEL` in `opiskeluakatemia/.env.local` to override it. The factory retains system prompts, safety settings and response formats, removes unsupported Gemini 3 sampling controls, uses low thinking, and bounds provider requests to 60 seconds. The API key remains backend-only. The example environment file contains a placeholder.

The previous `gemini-2.5-flash` request returned 404 for the new account; direct replacement-model checks returned 503 and a timeout. Local request-format tests use a mocked transport and do not spend Gemini quota. Live end-to-end AI verification remains outstanding; a subsequent live check was blocked by Codex's automatic approval review reporting its usage limit. No browser testing was used for this migration.

Live Gemini verification subsequently succeeded on 27 October: `gemini-3.5-flash-lite` returned HTTP 200, and the shared backend SDK generated a JSON grammar exercise with 10 questions and valid answer indexes. The local backend `.env.local` now selects this model via `GEMINI_MODEL`. These checks used terminal requests; no browser testing or student-data submission was involved. Full in-app grading and physical-device regression testing remain separate checks.
