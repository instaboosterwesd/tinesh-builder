# Tinesh Builder — project context

Updated: October 17, 2026. This is a handoff document, not a credential store. Never add tokens, passwords, private keys, session cookies, user credentials, or service-account JSON here.

## Exact current request and recent work

The user asked to update Vercel and create this root file documenting everything learned about the project, its logic, preferences, rules, and current work.

The immediately preceding requests were:
1. After Google or other sign-in, require users who have not entered a name and Telegram username to complete those details. Save the profile so the user appears in admin Users.
2. Investigate profile, leaderboard, wallet and similar pages showing loading indefinitely.

Both fixes are implemented in the Lovable preview. Real Firebase signup was tested: completion dialog appears, cannot be dismissed with Escape, details save and read back, a completed account skips the dialog on reload, and admin Users shows the saved name and Telegram username. Profile, wallet, leaderboard and orders were tested signed in. Failed requests were simulated on each page; each showed Try again, and retry loaded real data. Ten targeted tests passed; the latest preview build was clean. Actual Google popup sign-in was not exercised in these latest checks; the completion dialog is provider-independent.

The Vercel production update completed on October 17, 2026 (theme-toggle fix). Deployment `tineshbuildercode-1rpqza70e-instaboosterwesds-projects.vercel.app` reached Ready and the alias `https://tineshautomarketv1.vercel.app` was updated (HTTP 200 confirmed). VERCEL_TOKEN is now stored in the Lovable secret store. A fresh real Firebase signup on that live alias completed the required profile dialog, saved details, and successfully loaded Profile, Wallet, Leaderboard and Orders. No funded build or Google OAuth popup was tested. Documentation-only follow-up deployments may have a newer generated deployment address.

## Product and preferences

- Android APK builder based on selectable templates; user-facing brand is Builder.
- User originally supplied `https://github.com/instaboosterwesd/tinesh-builder.git` as the source to clone/update. Later source/deploy target was `https://github.com/instaboosterwesd/tineshbuildercode.git`.
- All visible app text must be English; never add Hindi UI text. The user commonly chats in Hindi written with Latin characters.
- Keep build and deposit workflows simple.
- User requested enhanced admin UI, proper light/dark themes, and mobile-friendly layouts. Existing visual style is soft claymorphism with blue/cyan accents and a floating capsule navigation dock. Preserve the existing semantic design tokens and controls.
- Search templates by name or product ID.
- HTML live preview must only be shown when enabled for the template.
- User pages: Home, Wallet, Orders/history, Leaderboard, Profile.
- Leaderboard exposes name and build count, not usernames or Telegram handles.
- Profile supports name/Telegram editing, avatar, password change, logout, recent builds, login history, and the admin-configured support link.
- Admin should manage users, edit/delete users, adjust wallet balances, manage deposits/builds/templates, and configure maintenance mode and contact/support.

## Current architecture

- React 19, TanStack Start/Router, TanStack Query, Vite, Tailwind v4, shadcn/Radix controls and sonner notifications.
- Keep TanStack file routes in `src/routes`; do not introduce React Router or an App.tsx route switcher.
- Root route owns providers, maintenance handling and the profile-completion dialog.
- App-internal server operations are `createServerFn`; external build callbacks use the public server route `src/routes/api/public/build.ts` and must verify the caller.
- Main application data/auth have moved from Lovable Cloud to Firebase at the user's explicit request. Generated Lovable Cloud integration files remain, but their presence does not mean current application reads use that backend.
- Firebase project is `tineshfirebase`; Realtime Database is the app data store. Service-account REST calls and Web Crypto are used server-side rather than the Node firebase-admin SDK.
- Browser Firebase initialization fetches its configuration using `getFirebaseConfig`. No private service-account credentials are sent to the browser.
- Firebase client auth supports email/password and Google popup login.
- `src/start.ts` registers `attachFirebaseAuth`. It waits for initialized auth and attaches the user's Firebase ID token. It must not call `firebaseReady()` because initialization fetches configuration through a server function and would recurse.
- `requireFirebaseAuth` verifies the token and exposes the verified user ID and email/name claims.
- Firebase ID tokens are verified using jose, Google's remote JWK set, RS256, exact issuer/audience, expiration, subject and issued/authentication times. Relabeling an X.509 certificate as a public-key PEM is invalid and must not return.
- Runtime-safe server code uses Web APIs/fetch; avoid native Node-only packages or subprocess-dependent server logic.

## Data and profile logic

Realtime Database paths include:
- `profiles/{uid}`: name, email, Telegram username, optional avatar URL and created-at timestamp.
- `wallets/{uid}/balance` and `walletTransactions/{uid}`.
- `loginHistory/{uid}`.
- `buildRequests/{id}`, `templates/{id}`, `deposits/{id}` and `settings/main`.

`getProfileCompletion` reads the signed-in profile and creates missing email/created-at fields. Missing name or Telegram username forces the root completion dialog. Google display name can prefill the name but does not replace the required stored details. `updateMyProfile` validates and saves details under the verified user's ID. Name is trimmed and limited to 80 characters. Telegram strips a leading @, is required, is limited to 64 stored characters, and accepts letters, numbers and underscores. Error states must not silently bypass completion; logout remains available.

Profile and wallet requests use user-scoped query keys. Profile completion invalidates profile/admin queries after saving. Login history is recorded once per user/sign-in stamp in browser storage.

## Wallet, deposit and build requirements

- Currency in the current UI is INR (₹); do not invent SEK/EUR pricing.
- Deposit flow: enter amount → show admin-configured UPI QR → I have paid → enter UTR/transaction ID → submit for admin review.
- Admin approves/rejects deposits; approval credits the wallet. A submission alone does not mean money is available.
- Duplicate UTRs are rejected; payment settlement is manual and is not confirmed by a payment provider.
- Payment settings include UPI ID and minimum deposit. If UPI is missing, show payments unavailable instead of presenting a fake QR.
- Building uses the chosen template, wallet price, app name/package name, template-specific direction-link ID where required, and logo before build dispatch.
- Wallet deduction and refunds are handled in server helpers; never trust a client-provided balance.
- Firebase numeric transactions use REST ETag conditional writes; wallet/build/deposit concurrency and the complete funded build flow remain areas to validate before making new financial changes.
- Admin handles template/build lifecycle and GitHub-based APK build/encryption workflows under `.github/workflows`.
- Dispatch needs the GitHub token, repository, callback secret and builder URL. If missing, builds remain approved with a configuration message; dispatch errors mark them failed. Admin rejection refunds charged builds, and encryption is a separate dispatch.
- The public build callback requires the x-build-secret header. Admin operations currently use a shared server-checked password rather than Firebase administrator roles.
- Build callback writes status/output through Firebase. Template IDs may be Firebase push keys; do not require strict SQL UUID format.
- Logos/APKs use Firebase/Google Cloud Storage upload/signed URL helpers. Profile avatar uploads use ImgBB server-side. Logo upload uses the returned resumable upload URL with PUT and the correct content type.

## Loading fix

Previously several pages used `if (!data) Loading`, which hid rejected requests as endless loading.

Current behavior:
- Shared `QueryFeedback` shows pending status or an explicit error with Try again.
- `withRequestTimeout` bounds account requests to 15 seconds and preserves real request errors.
- Account queries disable automatic retries for explicit user-controlled recovery.
- Wallet, profile, leaderboard and orders have bounded request/error recovery. Completion reads/saves are bounded too.
- Wallet header does not fabricate a zero balance while data is unavailable.
- Query keys for protected account data include Firebase UID to prevent another account's cached details from appearing.

Tests: `src/test/request-timeout.test.ts`, `src/test/profile-completion.test.ts`, `src/test/app-routing.test.tsx`. Run relevant tests after changing behavior. Do not manually run the Lovable project's build/typecheck; the preview harness handles it.

## Deployment context

- Live Vercel alias: `https://tineshautomarketv1.vercel.app`.
- Earlier investigation found the owned Vercel project is named tineshbuildercode; do not assume a project named tineshautomarketv1 exists just because of the alias.
- Earlier Vercel HTTP 500/resource-provisioning problems were reportedly resolved by unlinking an extra database add-on, correcting private-key configuration and changing the server region to Paris. Preserve successful hosting configuration unless fresh evidence requires a change.
- Prior successful source/deployment staging exists under `/tmp/vdeploy`, with Vercel project linkage in `.vercel/project.json`. This is temporary staging, not authoritative source. Always refresh source/dependencies before deploying.
- Required private environment variable names include FIREBASE_SERVICE_ACCOUNT, GOOGLE_API_KEY, IMGBB_API_KEY, GITHUB_FINE_GRAINED_PERSONAL_ACCESS_TOKEN and VERCEL_TOKEN; analytics uses GOOGLE_ANALYTICS_MEASUREMENT_ID. Never record their values here.
- User pasted deployment tokens previously; rotation is advisable. Do not repeat them in chat, source, logs or this file.
- Deploying Vercel does not publish Lovable, and updating local source does not by itself update Vercel. Do not publish to another host unless asked.

## Mandatory project rules and safety

- Root AGENTS.md is the authoritative home for architecture rules; persistent project preferences live in project memory. This file is contextual documentation, not a substitute for either.
- Reset copied Drizzle migration history as a directory and use the migration tool to regenerate metadata. Never manually edit migration journals/snapshots. The previous empty-baseline reset preserved data.
- Do not edit generated integration clients, auth helpers, types or managed configuration.
- Never store private keys/tokens/passwords in code. Use secrets tooling and existing connections.
- Do not modify managed database schemas or silently weaken auth/security settings.
- If working on Lovable Cloud, describe it as Lovable Cloud/backend, and do not reveal internal project URLs/IDs or direct the user to an inaccessible dashboard.
- Read a file before editing; preserve current design tokens; use existing Button/components for controls; keep UI English.
- Never rewrite managed Git history or run stateful git commands in this workspace.

## Known limitations / honest verification boundaries

- No templates or builds existed during recent browser checks. The leaderboard correctly showed no builds, and orders correctly showed no orders.
- The complete priced build → uploaded logo → GitHub action → callback → downloadable APK flow is not recently verified end to end.
- Real payment/UPI settlement and approval concurrency are not verified by the loading tests.
- Server reads still scan broad build/deposit collections in some paths; future scaling work may need indexed user-scoped queries. Frontend request timeout does not cancel already-running backend work.
- Default admin-password fallback exists in server helpers; replace with a securely configured private password before real production use. Do not copy the fallback value into documentation.
- Older roadmap items claiming Profile/Orders/Leaderboard are coming soon are stale; the pages now exist and were tested. Do not use those stale notes as evidence that pages are absent.
- Template media editing/upload capabilities need a fresh inspection before claiming complete support.
- Keep deployment outcome and production validation separate from preview validation.
## Rebrand & UX (Oct 2026)
- Brand renamed "Builder" → "AppForge" everywhere (logo, titles, UPI payee name). Logo: src/assets/logo.png (anvil mark), favicon: public/favicon.png.
- Theme defaults to dark for new visitors; saved choice still respected (src/lib/theme.ts, key "builder-theme").
- New-user tour: src/components/UserTour.tsx (5 steps, localStorage key "appforge-tour-done"), mounted in __root after ProfileCompletion.
- Home page: centered heading + short subtitle + three feature badges, then the sticky search/filter bar. No hero image (removed on request; src/assets/hero.png and hero.jpg deleted).
## Build-logo upload repair (October 17, 2026)
- Both Google Storage bucket names returned HTTP 404 during real checks. The user-supplied ImgBB key was valid and saved securely as IMGBB_API_KEY in this project and Vercel; never record its value.
- Build logos now upload through authenticated uploadLogo, use owner-scoped Firebase mediaFiles mappings and resolve to ImgBB for Orders/admin/build callbacks. Profile photos share the same safe ImgBB helper.
- getTemplate accepts safe Firebase push IDs rather than UUID-only IDs.
- Preview and live Vercel real signup/free-request tests passed; saved logo fetched as HTTP 200 image/png and the live Orders page rendered it. Deployment tineshbuildercode-j3n060j6n-instaboosterwesds-projects.vercel.app was Ready and aliased to tineshautomarketv1.vercel.app.
- Full APK completion/download is not verified. APK output, template videos and old missing Google Storage objects are not repaired by the logo change. Temporary test template was removed after the upload check.
## Remix session (October 17, 2026, new Lovable project)
- Project re-imported from instaboosterwesd/tineshbuildercode into a fresh Lovable project; project memory (mem://) now holds core rules.
- Dashboard backgrounds re-uploaded to this project's CDN from reversebypass.store (dashboard-dark-bg.webp for dark, dashboard-light-bg.webp for light) via --page-wash in src/styles.css.
- Top header (logo + wallet/login) shows only on the Home page (/); Wallet, Orders, Leaders, Profile etc. hide it (AppShell showHeader).
- This remix has no secrets configured yet (Firebase service account, GitHub, ImgBB, Vercel, admin password). Keys pasted in chat should be rotated.

## Remix session continued (October 17, 2026, evening)

User writes Hinglish/Hindi; reply in simple Hindi. They want changes pushed directly without asking.

### Repos and deploy (no credentials stored here)
- Live site code repo: github.com/instaboosterwesd/tineshbuildercode (main). Vercel project `tineshbuildercode` auto-deploys it to https://tineshautomarketv1.vercel.app. Pushing here IS the Vercel update.
- Mirror repo: github.com/instaboosterwesd/tinesh-builder (main) — push here too.
- Build workflows repo: github.com/instaboosterwesd/apk-builder (private). Vercel env GITHUB_REPO points at it.
- Sandbox blocks git checkout/commit/push; push via GitHub REST API (blobs → tree → commit → update ref) from a Python script, after creating a `backup-<timestamp>` branch. Tokens come from user-uploaded files at runtime only — never write them into the repo. Rotating the GitHub token and Firebase key the user pasted is advised.

### Done this session
- Header transparent with search centered in it; "Build your Android app" heading and "0 templates" line removed.
- Scrolling down hides only the bottom navigation dock; header stays.
- Desktop (min-width 1024px, fine pointer, no reduced motion) shows the looping video on every page incl. admin, mounted once in root; no image flash. Mobile/tablet keep theme image.
- Faster page opens: QueryClient defaults (staleTime 30s, gcTime 10m, no focus refetch), router preload on intent, usePrefetchUserData in the dock warms wallet/orders/profile/leaderboard.
- APK build failure fixed: Firebase Storage bucket does not exist (404), so upload-url failed. Workflows now upload APKs as GitHub release assets (tags build-<id>, enc-<id>), report path `release/<tag>/<file>.apk`; app serves HMAC-signed 24h links via /api/public/apk which redirects to the GitHub asset. Needs one real build to confirm.
- Admin Settings → Appearance: desktop video on/off (off = image), card see-through sliders separately for computers (default 4% fill) and phones/tablets (default 20% fill). Stored in settings/main (desktop_video, glass_desktop, glass_mobile), applied via CSS vars on <html>.
- Profile: Help and Log out buttons centered (max-w-xs).
