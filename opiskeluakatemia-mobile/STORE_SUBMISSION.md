# App Store / Google Play submission

Status of the Opiskeluakatemia mobile app (Expo SDK 58) for its first store release, version 1.0.0.

## 1. Identifiers and versions

| Setting | Value | Where |
| --- | --- | --- |
| App name | Opiskeluakatemia | `app.json` → `expo.name` |
| iOS bundle identifier | `fi.opiskeluakatemia.app` | `app.json` → `ios.bundleIdentifier` |
| Android package | `fi.opiskeluakatemia.app` | `app.json` → `android.package` |
| Marketing version | 1.0.0 | `app.json` → `version` |
| Build number / versionCode | 1 / 1 at first build, then incremented remotely by EAS | `eas.json` → `cli.appVersionSource: "remote"`, `production.autoIncrement` |
| Deep-link scheme | `opiskeluakatemia://` | `app.json` → `scheme` |

The identifier is a proposal. Change it **before the first upload**; it cannot be changed after the app exists in App Store Connect or Play Console.

## 2. Build profiles (`eas.json`)

- `development`: development client for the iOS Simulator and Android (internal distribution).
- `development-device`: development client for physical iPhones.
- `preview`: release-mode internal build (Android APK, iOS ad hoc) for testers.
- `production`: store build (Android App Bundle, iOS App Store), with an automatically incremented build number.

All profiles set `EXPO_PUBLIC_API_URL=https://opiskeluakatemia.fi`. The Supabase URL and anon key are public client values, but they are deliberately left out of the repository. Set them as EAS environment variables (see section 8). `.env.local` is git-ignored, so EAS never uploads it.

Release builds enforce the following:
- If `EXPO_PUBLIC_API_URL` is not set, the API URL defaults to `https://opiskeluakatemia.fi`.
- Plain-HTTP API and Supabase origins are refused unless they are local-network addresses. A refused origin shows a neutral "Palveluun ei saada yhteyttä" screen.
- iOS App Transport Security sets `NSAllowsArbitraryLoads=false` and allows only local networking.

## 3. Apple review notes (paste into App Store Connect → App Review Information)

> Opiskeluakatemia is the companion app for an existing Finnish English-course web service (Englannin abikurssi). Users sign in with an account created on opiskeluakatemia.fi. The app does not sell anything: there are no purchases, prices or links to purchase pages. Accounts without course access see neutral "no active course access" copy (guideline 3.1.3(b), multiplatform services).
> Demo account: <email> / <password> (has active course access).
> Account deletion: Koti → "Tili" (top right) → Poista tili. Deletion requires the password and typing POISTA, and it permanently removes the account on the server.
> Essays and open answers are graded by AI (Google Gemini) via our server. The user is asked for consent before the first upload.

## 4. Apple App Privacy ("nutrition label") answers

These answers are based on the data the app actually sends. The app has no analytics, advertising, crash-reporting or tracking SDKs, and it does not use IDFA. Tracking: **No**.

| Data type (Apple) | Collected | Linked to user | Tracking | Purpose |
| --- | --- | --- | --- | --- |
| Contact Info → Email Address | Yes (sign-in, password reset) | Yes | No | App Functionality |
| Identifiers → User ID (Supabase account ID) | Yes | Yes | No | App Functionality |
| User Content → Other User Content (essays, exercise answers, flashcards, daily-task completions) | Yes | Yes | No | App Functionality |
| Usage Data → Product Interaction | No (no analytics) | | | |
| Diagnostics (crash/performance) | No | | | |
| Purchases | No (the app only receives a yes/no course-access answer) | | | |
| Contact Info → Name | Not collected by the app. A name stored with the web account is only displayed. | | | |
| Audio | No (playback only, no microphone permission) | | | |

The same declarations are in the iOS privacy manifest (`ios.privacyManifests` in `app.json`). It also declares these required-reason APIs, aggregated from the bundled SDKs:
- UserDefaults: CA92.1
- FileTimestamp: C617.1, 0A2A.1, 3B52.1
- SystemBootTime: 35F9.1
- DiskSpace: E174.1, 85F4.1

If Apple's post-upload email lists another missing reason, add it there.

## 5. Google Play Data safety answers

- Does the app collect or share any of the required user data types? **Yes**
- Is all user data encrypted in transit? **Yes** (HTTPS only in release builds)
- Do you provide a way for users to request that their data is deleted? **Yes**. Deletion is in the app (Tili → Poista tili). Web deletion URL: `https://opiskeluakatemia.fi/tietosuojakaytanto`, which describes the email request route. A dedicated web deletion page is recommended; see section 9.

| Category → type | Collected | Shared | Optional? | Purpose | Processed ephemerally? |
| --- | --- | --- | --- | --- | --- |
| Personal info → Email address | Yes | No | Required | Account management, App functionality | No |
| Personal info → User IDs | Yes | No | Required | Account management, App functionality | No |
| App activity → Other user-generated content (essays, answers, flashcards) | Yes | No* | Optional (only when used) | App functionality | No |
| App activity → App interactions (exercise results/history, daily tasks) | Yes | No | Required for core features | App functionality | No |
| App info and performance (crash logs, diagnostics) | No | | | | |
| Financial info / Purchase history | No | | | | |
| Location, Contacts, Photos, Audio, Device IDs | No | | | | |

\* The server sends essays and open answers to Google Gemini for grading. Gemini acts as a service provider processing on Opiskeluakatemia's behalf, which Google Play does not count as "sharing". The app still discloses it and asks for consent.

Security practices: data encrypted in transit, deletion request mechanism available. Not independently security-reviewed (MASA): leave unchecked.

Android permissions in the release manifest:
- `INTERNET`, `MODIFY_AUDIO_SETTINGS` (audio playback), and `VIBRATE` (Expo default, normal permission).
- `RECORD_AUDIO`, storage, media, foreground-service, notification, biometric and `SYSTEM_ALERT_WINDOW` permissions are blocked explicitly.
- No foreground-service declaration is needed.

## 6. Age rating and audience

**Apple age rating questionnaire:** answer "None" or "No" to everything. That covers violence, sexual content, profanity, drugs, gambling, horror, medical, contests, unrestricted web access, user-to-user communication, user-generated content shared with others, and chatbots. Essays are private and graded, not published. The expected result is **4+**.

**Google Play content rating (IARC):** category Education/Reference. Answer "No" for violence, sexuality, language, controlled substances, gambling, user interaction/communication, sharing location, and digital purchases. The expected result is PEGI 3 / Everyone.

**Google Play target audience:** 16–17 and 18+ (upper-secondary students preparing for the matriculation exam). Do not select under-13 groups, because the Families policy would then apply. Not designed for children.

## 7. Policy compliance implemented in the app

- **3.1.1 / 3.1.3(b):**
  - No purchase links, prices or "buy" calls to action anywhere.
  - Users without access see "Kurssioikeutta ei löytynyt" with neutral advice to sign in with the right email.
  - Sign-up is not offered in the app.
- **5.1.1(v) account deletion:**
  - Flow: Tili → Poista tili → password + type POISTA → native destructive confirmation.
  - The app calls `POST /api/account/delete`, then signs out locally.
- **5.1.2(i) third-party AI:** a one-time consent dialog appears before essays or open answers are sent for AI grading. Declining keeps the text unsent.
- **Privacy policy and terms links:** on the sign-in screen and in Tili. They open `https://opiskeluakatemia.fi/tietosuojakaytanto` and `/kayttoehdot`.
- **Removed "coming later" copy:** the Google sign-in placeholder text is gone (guideline 2.1 / 2.3).

## 8. Remaining human steps (in order)

1. **Choose the final identifiers.** Keep or change `fi.opiskeluakatemia.app` in `app.json` before the first build.
2. **Accounts:** set up an Apple Developer Program membership (organisation, D-U-N-S for Y-tunnus 3302177-2) and a Google Play Console developer account. Google requires identity verification and, for new personal accounts, closed testing with 12 testers for 14 days before production.
3. **EAS project:**
   - Run `npx eas-cli@latest login`, then `npx eas-cli@latest init` (adds `extra.eas.projectId` and `owner` to `app.json`).
   - Create the environment variables for the `preview` and `production` environments (visibility "plain text" is fine, these are public):
     - `npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --environment production --environment preview --visibility plaintext`
     - `npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key> --environment production --environment preview --visibility plaintext`
4. **Deploy the website first.**
   - Ship these to production:
     - `src/app/api/account/delete/route.ts`
     - `src/lib/account-deletion.ts`
     - the earlier mobile routes (`src/lib/mobile-attempt.ts` etc., see README).
   - Confirm `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel.
   - Test deletion with a throwaway account on staging or production: the account should disappear from Supabase Auth, and its attempts, essays and flashcards should be gone.
5. **Supabase Auth settings:** add `https://opiskeluakatemia.fi/reset-password` to the allowed redirect URLs.
6. **Privacy policy update** (website text, legal decision). Add:
   - the mobile app;
   - AI grading by Google Gemini;
   - sub-processors (Supabase, Vercel, Google, Stripe, Resend);
   - in-app account deletion and what is deleted;
   - retention: Stripe keeps payment records for bookkeeping;
   - the date.

   Consider a web "Poista tili" button on `/settings` that uses the same endpoint, to serve as Google Play's deletion URL.
7. **Artwork:** `assets/icon.png`, `assets/splash-icon.png` and `assets/android-icon-*.png` are still Expo placeholders. Replace them with final artwork using the same file names and sizes:
   - icon: 1024×1024, no transparency, no rounded corners;
   - Android adaptive foreground/background: 512×512 (432×432 monochrome);
   - splash: 1024×1024 on transparent background, shown at 160 pt on `#F5F5F7`.

   Update `android.adaptiveIcon.backgroundColor` to the brand colour.
8. **Builds:** run `npx eas-cli@latest build --profile production --platform all`. Let EAS manage signing: it creates the iOS distribution certificate and provisioning profile, and the Android upload keystore. Back up the keystore credentials from `eas credentials`.
9. **Device testing (preview build on a physical iPhone and Android phone):**
   - sign in, wrong password, password reset email link;
   - app restart keeps the session (now in Keychain/Keystore; an old AsyncStorage session migrates);
   - active and no course access;
   - offline mode: airplane mode should give Finnish error and retry;
   - exercises incl. listening audio, essay AI consent and grading, flashcards;
   - deep link `opiskeluakatemia://history`;
   - account deletion end-to-end with a throwaway account.
10. **Store listings:** Finnish description, keywords, support URL (https://opiskeluakatemia.fi/ota-yhteytta), privacy policy URL, screenshots (6.9" and 6.5" iPhone; Android phone), feature graphic (Play), category Education. Fill in the sections 4–6 answers, the review notes and the demo account (section 3).
11. **Submit:**
    - Run `npx eas-cli@latest submit --platform ios --profile production`. The first run asks for the App Store Connect app; add `submit.production.ios.ascAppId` to `eas.json` afterwards.
    - Run `npx eas-cli@latest submit --platform android --profile production`. This uploads to the internal track as a draft. Store the Google service-account JSON outside the repo and reference it with `serviceAccountKeyPath`.
    - The first Android upload may have to be done manually in Play Console.

## 9. Known limitations and follow-ups

- The website's shared `requireAuth` caches verified tokens for 5 minutes per server instance. After deletion, the app discards its tokens immediately. A copied token could still pass cached checks on a warm instance for up to 5 minutes, but it reaches no data, because the user's rows are already gone. The deletion endpoint itself always verifies tokens fresh.
- Deletion refuses automatically (409, user is told to contact support) if a legacy recurring Stripe subscription is active. Cancel it in Stripe, then delete.
- The `user_course_purchases` rows follow the database's `ON DELETE CASCADE`. Stripe retains the payment records required by Finnish bookkeeping law.
- `npm audit` reports advisories in Expo CLI build tooling (not shipped in the app bundle). The automatic fix downgrades Expo, so it was not applied.
- Google sign-in, sign-up, offline study and push notifications are not in 1.0.0.
