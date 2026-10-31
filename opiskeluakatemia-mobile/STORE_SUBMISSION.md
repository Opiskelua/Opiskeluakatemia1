# App Store / Google Play submission

Status of the Opiskeluakatemia mobile app (Expo SDK 58) for its first store release, version 1.1.0 (`app.json`). The app serves two courses: Englannin abikurssi (everything) and Ruotsin abikurssi (Polku and theory; see the website's `docs/RUOTSIN_ABIKURSSI.md` and this app's README, "Courses").

## 1. Identifiers and versions

| Setting | Value | Where |
| --- | --- | --- |
| App name | Opiskeluakatemia | `app.json` → `expo.name` |
| iOS bundle identifier | `fi.opiskeluakatemia.app` | `app.json` → `ios.bundleIdentifier` |
| Android package | `fi.opiskeluakatemia.app` | `app.json` → `android.package` |
| Marketing version | 1.1.0 | `app.json` → `version` |
| Build number / versionCode | Managed remotely by EAS (not set in `app.json`); starts at 1 and auto-increments on production builds | `eas.json` → `cli.appVersionSource: "remote"`, `production.autoIncrement` |
| Deep-link scheme | `opiskeluakatemia://` | `app.json` → `scheme` |

The identifier `fi.opiskeluakatemia.app` is final (confirmed 29.10.2026). Do not change it: it cannot be changed after the app exists in App Store Connect or Play Console.

## 2. Build profiles (`eas.json`)

- `development`: development client for the iOS Simulator and Android (internal distribution).
- `development-device`: development client for physical iPhones.
- `preview`: release-mode internal build (Android APK, iOS ad hoc) for testers.
- `production`: store build (Android App Bundle, iOS App Store), with an automatically incremented build number.

The `preview` and `production` profiles set an EAS Update `channel` with the same name (`preview`, `production`); see section 10.

All profiles set `EXPO_PUBLIC_API_URL=https://opiskeluakatemia.fi`. The Supabase URL and anon key are public client values, but they are deliberately left out of the repository. Set them as EAS environment variables (see section 8). `.env.local` is git-ignored, so EAS never uploads it.

Release builds enforce the following:
- If `EXPO_PUBLIC_API_URL` is not set, the API URL defaults to `https://opiskeluakatemia.fi`.
- Plain-HTTP API and Supabase origins are refused unless they are local-network addresses. A refused origin shows a neutral "Palveluun ei saada yhteyttä" screen.
- iOS App Transport Security sets `NSAllowsArbitraryLoads=false` and allows only local networking.

## 3. Apple review notes (paste into App Store Connect → App Review Information)

> Opiskeluakatemia is the companion app for an existing Finnish web service for matriculation exam courses: Englannin abikurssi (English) and Ruotsin abikurssi (Swedish). Users sign in with an account created on opiskeluakatemia.fi. The app does not sell anything: there are no purchases, prices or links to purchase pages. The app shows only the courses the account has access to; owners of both switch course on the home screen. For the Swedish course the app offers the learning path and theory, and the home screen says that Swedish exercises, writing and flashcards are on the website (no purchase wording). Accounts without course access see neutral "no active course access" copy (guideline 3.1.3(b), multiplatform services).
> Demo account: test@example.com / (password in the owner's password manager, not in the repo) — has active access to both courses.

> **⚠ OPEN DECISION (owner, before submitting): guideline 3.1.3(b).** The justification above relies on 3.1.3(b) "Multiplatform Services". Apple's current 3.1.3(b) lets an app give access to content bought elsewhere only if those items are **also available as in-app purchases** in the app. This app offers no IAP, so as written it may be rejected. Choose one before submitting: (a) add the course as an in-app purchase; (b) distribute under Apple's EU alternative business terms; or (c) give the app a meaningful free tier so it does not depend only on web-bought access. Verify against the current guideline text when deciding. The strategy text above is unchanged until that decision is made.

> **⚠ Replace the demo account.** `test@example.com` is a placeholder (here and in section 6, "App access"). Create a real review account on opiskeluakatemia.fi with active access to both courses (for example the bundle, access until 27.9.2027) and sample data, and enter its email and password in App Store Connect and Play Console. Never put the password in the repo.
> Legal pages (privacy policy, terms) open in the browser with ?app=1, which hides all purchase links on those pages.
> Account deletion: tap the round avatar (initial) in the top-right of the home screen → scroll down → Poista tili…. Deletion requires the password and typing POISTA, and it permanently removes the account on the server.
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
- Do you provide a way for users to request that their data is deleted? **Yes**. Deletion is in the app (Tili → Poista tili).
- Delete account URL (Play Console → App content → Data safety / Account deletion): `https://opiskeluakatemia.fi/poista-tili`. The public page names the app and explains all three routes (in the app: Tili → Poista tili; on the web: Asetukset → Poista tili at `/settings`, which calls the same `/api/account/delete` endpoint; or by email to support@opiskeluakatemia.fi), what is deleted and what is kept (Stripe payment records for bookkeeping). Signed-in visitors get a direct link to `/settings#poista-tili`. Deploy the page before submitting.

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

**Apple age rating questionnaire:** answer "None" or "No" to everything, including the newer questions on AI chatbots/assistants (the app has none: AI only grades essays and open answers and returns feedback, there is no free-form chat) and social media features. That covers violence, sexual content, profanity, drugs, gambling, horror, medical, contests, unrestricted web access, user-to-user communication, user-generated content shared with others, and chatbots. Essays are private and graded, not published. The expected result is **4+**.

**Google Play content rating (IARC):** category Education/Reference. Answer "No" for violence, sexuality, language, controlled substances, gambling, user interaction/communication, sharing location, and digital purchases. The expected result is PEGI 3 / Everyone.

**Google Play target audience:** 16–17 and 18+ (upper-secondary students preparing for the matriculation exam). Do not select under-13 groups, because the Families policy would then apply. Not designed for children.

### Google Play: other "App content" answers

| Section | Answer |
| --- | --- |
| Privacy policy | `https://opiskeluakatemia.fi/tietosuojakaytanto` |
| App access | "All or some functionality is restricted" → add the demo account (**⚠ replace the placeholder test@example.com with the real review account, see section 3**), instructions: "Sign in with these credentials. The account has active access to both courses; switch course on the home screen." |
| Ads | No, the app contains no ads |
| Content rating | IARC questionnaire as above (Education) |
| Target audience | 16–17 and 18+ |
| News app | No |
| COVID-19 contact tracing/status | No |
| Data safety | Section 5 |
| Government app | No |
| Financial features | None |
| Health | None |
| Account deletion URL | `https://opiskeluakatemia.fi/poista-tili` |

## 7. Policy compliance implemented in the app

- **3.1.1 / 3.1.3(b):**
  - No purchase links, prices or "buy" calls to action anywhere.
  - Users without access see "Kurssioikeutta ei löytynyt" with neutral advice to sign in with the right email.
  - Sign-up is not offered in the app.
- **5.1.1(v) account deletion:**
  - Flow: Tili → Poista tili → password + type POISTA → native destructive confirmation.
  - The app calls `POST /api/account/delete`, then signs out locally.
- **5.1.2(i) third-party AI:** a one-time consent dialog appears before essays or open answers are sent for AI grading. Declining keeps the text unsent.
- **Google Play AI-generated content:** generated exercises have an "Ilmoita ongelmasta" link that opens an email to support@opiskeluakatemia.fi (subject "Ilmoitus tehtävästä", exercise id and category prefilled).
- **Privacy policy and terms links:** on the sign-in screen and in Tili. They open `https://opiskeluakatemia.fi/tietosuojakaytanto` and `/kayttoehdot`.
- **Removed "coming later" copy:** the Google sign-in placeholder text is gone (guideline 2.1 / 2.3).

## 8. Remaining human steps (in order)

1. **Identifiers:** `fi.opiskeluakatemia.app` is confirmed as final. Nothing to do.
2. **Accounts:** set up an Apple Developer Program membership (organisation, D-U-N-S for Y-tunnus 3302177-2) and a Google Play Console developer account. Google requires identity verification and, for new personal accounts, closed testing with 12 testers for 14 days before production.
3. **EAS project:**
   - ✅ Done: `eas init` has run (`extra.eas.projectId` and `owner` are in `app.json`), and `update:configure` has set `updates.url`.
   - Log in with `npx eas-cli@latest login` on the machine that builds.
   - Create the environment variables for the `preview` and `production` environments (visibility "plain text" is fine, these are public):
     - `npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --environment production --environment preview --visibility plaintext`
     - `npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key> --environment production --environment preview --visibility plaintext`
     - `npx eas-cli@latest env:create --name EXPO_PUBLIC_API_URL --value https://opiskeluakatemia.fi --environment production --environment preview --visibility plaintext` (builds get this from `eas.json`, but `eas update` does not read build-profile `env`; see section 10).
4. **Deploy the website first.**
   - Ship these to production:
     - `src/app/api/account/delete/route.ts`
     - `src/lib/account-deletion.ts`
     - the earlier mobile routes (`src/lib/mobile-attempt.ts` etc., see README);
     - the Swedish course (website branch `ruotsin-abikurssi`, after its two migrations; launch checklist in the website's `docs/RUOTSIN_ABIKURSSI.md` §6).
   - Confirm `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel.
   - Test deletion with a throwaway account on staging or production: the account should disappear from Supabase Auth, and its attempts, essays and flashcards should be gone.
5. **Supabase Auth settings:** add `https://opiskeluakatemia.fi/reset-password` to the allowed redirect URLs.
6. **Privacy policy update:** ✅ Done. The policy was published on 29.10.2026; its 31.10.2026 revision names both courses and goes live with the Swedish branch. It added:
   - the mobile app;
   - AI grading by Google Gemini;
   - sub-processors (Supabase, Vercel, Google, Stripe, Resend);
   - in-app account deletion and what is deleted;
   - retention: Stripe keeps payment records for bookkeeping;
   - the date.

   The web "Poista tili" (Asetukset → Poista tili on `/settings`) uses the same endpoint. Play's deletion URL is `/poista-tili` (section 5).
7. **Artwork:** ✅ Done: the Expo placeholder icons and splash image have been replaced with final artwork. If they change again, keep the file names and sizes (icon 1024×1024 without transparency; Android adaptive 512×512, monochrome 432×432; splash 1024×1024 on transparent, shown at 160 pt).
8. **Builds:** run `npx eas-cli@latest build --profile production --platform all`. Let EAS manage signing: it creates the iOS distribution certificate and provisioning profile, and the Android upload keystore. Back up the keystore credentials from `eas credentials`.
9. **Device testing (preview build on a physical iPhone and Android phone):**
   - sign in with the demo account; wrong password shows a Finnish error; password reset email opens `https://opiskeluakatemia.fi/reset-password` (outside the launch code gate) and works;
   - app restart keeps the session (Keychain/Keystore); an old AsyncStorage session migrates;
   - active course access (demo account) and no course access (a throwaway account): neutral "Kurssioikeutta ei löytynyt", no purchase wording anywhere;
   - exercises load through `/api/abikurssi/course-exercises` (reading, listening incl. audio playback, listening MC, grammar sets) and are graded by the server; results and explanations show after submitting;
   - essay: the AI consent dialog appears once; grading returns feedback;
   - flashcards, daily tasks, path lessons and review, history, progress;
   - Swedish course: an account with only Ruotsin abikurssi sees the Swedish Polku (lessons, Kertaus, target grade) and theory, no exercise, essay, flashcard or daily-task entries, and the website note on the home screen; an account with both courses gets the Englanti/Ruotsi switcher and keeps the chosen course after a restart;
   - Tili → Tietosuojakäytäntö / Käyttöehdot open the site with `?app=1`: no "Osta kurssi", no sales links in the header or footer;
   - offline (airplane mode): Finnish error and retry;
   - deep link `opiskeluakatemia://history`;
   - account deletion end to end with a throwaway account (never the demo account).
10. **Store listings:** the Finnish texts, character counts and the screenshot plan are in `STORE_LISTING.md`. Enter the description, keywords, support URL (https://opiskeluakatemia.fi/ota-yhteytta), privacy policy URL, screenshots (6.9" and 6.5" iPhone; Android phone), feature graphic (Play), category Education. Fill in the sections 4–6 answers, the review notes and the demo account (section 3).
11. **Submit:**
    - Run `npx eas-cli@latest submit --platform ios --profile production`. The first run asks for the App Store Connect app; add `submit.production.ios.ascAppId` to `eas.json` afterwards.
    - Run `npx eas-cli@latest submit --platform android --profile production`. This uploads to the internal track as a draft. Store the Google service-account JSON outside the repo and reference it with `serviceAccountKeyPath`.
    - The first Android upload may have to be done manually in Play Console.

## 9. Known limitations and follow-ups

- The website's shared `requireAuth` caches verified tokens for 5 minutes per server instance. After deletion, the app discards its tokens immediately. A copied token could still pass cached checks on a warm instance for up to 5 minutes, but it reaches no data, because the user's rows are already gone. The deletion endpoint itself always verifies tokens fresh.
- Deletion refuses automatically (409, user is told to contact support) if a legacy recurring Stripe subscription is active. Cancel it in Stripe, then delete.
- The `user_course_purchases` rows follow the database's `ON DELETE CASCADE`. Stripe retains the payment records required by Finnish bookkeeping law.
- `npm audit` reports advisories in Expo CLI build tooling (not shipped in the app bundle). The automatic fix downgrades Expo, so it was not applied.
- Google sign-in, sign-up, offline study and push notifications are not in 1.1.0.
- Ruotsin abikurssi in the app is Polku and theory only; Swedish exercises, writing and flashcards are on the website.

## 10. Over-the-air updates (EAS Update)

`expo-updates` is installed and configured:
- `app.json` → `runtimeVersion: { "policy": "appVersion" }`. The runtime version equals the marketing version (`1.1.0`), so an update only reaches builds with the same `version`. Builds made with an earlier version never receive the Swedish course update.
  - That includes the English-only history filter. The history (`loadHistory` in `src/lib/exercises.ts`) reads the `*_attempts` tables straight from Supabase, not through the server. The Swedish course on the website writes its reading attempts into the same `reading_attempts` table, with `course_type = 'ruotsin-abikurssi'`. Any binary whose JavaScript lacks the filter shows those attempts in the English home stats and in Historia. That means the 1.0.0 internal preview build, and a 1.1.0 build made from `glass-ui` until the update applies on its second launch. No server change can hide the rows from an old build.
  - Before the Swedish course launches on the website, build the 1.1.0 preview binary from the merged `ruotsin-abikurssi` code and move every tester to it. Steps and a 1.0.0 fallback: website `docs/RUOTSIN_ABIKURSSI.md` §6 step 6. The first store builds (section 8 step 8) are made from that merged code, so they are not affected.
- `eas.json` → `build.preview.channel: "preview"`, `build.production.channel: "production"`. The `development` profiles have no channel (the dev client loads from Metro).
- `app.json` → `updates.url` is set (`https://u.expo.dev/<projectId>`, matching `extra.eas.projectId`), so store builds made from now on can receive updates on their channel. The app code does not import `expo-updates`.
- `expo-updates` is a native module. A development client built before it was added still runs the app, but rebuild it (`--profile development`) to test update behaviour.

### Before publishing updates

1. ✅ Done: `eas init` and `update:configure` (`updates.url` is in `app.json`).
2. Make sure the EAS environment variables exist for the target environment (section 8 step 3), including `EXPO_PUBLIC_API_URL`. `eas update` bundles the JavaScript **on your machine** and does not use the `env` block of `eas.json`. Values from the git-ignored `.env.local` are also loaded, and that file points `EXPO_PUBLIC_API_URL` at `http://localhost:3000`. Always pass `--environment` so the EAS values take precedence, and check that every `EXPO_PUBLIC_*` name in `.env.local` also exists in that EAS environment. An update that points at localhost would leave every installed app unable to reach the server.
3. Build and submit the store binaries **after** step 1 (section 8 steps 8 and 11). Only builds that contain `updates.url` and a channel can receive updates; builds made earlier never do.

### Publishing an update

```sh
# testers first (preview builds)
npx eas-cli@latest update --channel preview --environment preview --message "Korjaa harjoitushistorian latauksen"
# then the store builds
npx eas-cli@latest update --channel production --environment production --message "Korjaa harjoitushistorian latauksen"
```

- An update is downloaded on the next app launch and applied on the launch after that (default `checkAutomatically: ON_LOAD`, `fallbackToCacheTimeout: 0`).
- It reaches only builds whose runtime version matches the current `app.json` `version`. Publish from the same commit lineage as the store build, with the same `version`.
- Roll back with `npx eas-cli@latest update:rollback` (or republish the previous commit) if an update is broken.
- Publish to `preview` first and test on a preview build before publishing to `production`.

### Update or new store build?

Can ship as an update (JavaScript and assets only):
- bug fixes and UI changes in `src/`, `App.tsx`, copy and translations;
- new screens or logic that use only native modules already in the build;
- images, fonts and other assets bundled through Metro;
- `EXPO_PUBLIC_*` values (they are inlined into the JS bundle).

Needs a new store build (and review):
- adding, removing or upgrading any package with native code (any `expo-*` module, `react-native-*`, `react-native` itself, an Expo SDK upgrade);
- any change to native configuration in `app.json`: permissions, `blockedPermissions`, `infoPlist`, privacy manifest, plugins, bundle identifier, scheme, icon, splash screen, `updates` settings;
- changing `version` (with the `appVersion` policy this creates a new runtime version, so existing builds stop receiving updates published from it);
- anything Apple or Google must review as a new feature or a change of the app's purpose. Updates must stay within App Store guideline 2.5.2 and Google Play's policy: bug fixes and improvements to the reviewed app, not a different app or new purchase flows.

When native code changes, bump `version` (for example to `1.1.1`), build, submit, and publish later updates against that new runtime version.

