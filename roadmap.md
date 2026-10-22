# Roadmap

- [x] Home: centered search inside stationary header; remove large heading; hide bottom navigation on scroll down and reveal on scroll up. Verified at 770px and 390px.
- [x] Home: remove subtitle text
- [x] Home: remove the "0 templates" count line above the grid.
- [x] Fix APK build failure (builder callback URL pointed at a dead deployment)
- [x] "Teacher" base shown as "Universal"; App ID rule driven by base config
- [x] Build patch: Universal base writes template HTML into injector.html only
- [x] Home background: video on desktop, image on mobile
- [x] Admin panel: three-line menu at top
- [x] Live (Vercel) site loads media via asset proxy

## Remix setup
- [ ] Replace FIREBASE_SERVICE_ACCOUNT, GITHUB_REPO, GITHUB_TOKEN, GOOGLE_API_KEY, IMGBB_API_KEY and VERCEL_TOKEN using secure entry. Blocked: the replacement form was declined in this remix setup; no values were changed.
- [x] Clear copied Drizzle migration history and regenerate an empty migration set. Rechecked in this remix: Drizzle generated a PostgreSQL journal with zero entries and no SQL migrations; database data was not changed.

## Shared page background
- [x] Make the home header lighter and search fully transparent.
- [x] Keep desktop video persistent across pages, including admin, without static-image flashes.
- [x] Verify Windows video playback, signed-out navigation persistence, admin entry, and mobile image fallback. Account-only page checks remain unavailable until sign-in is configured.

## Current
- [x] Device performance choice: one-time low/high dialog for new visitors, low mode shows plain emojis instead of animated stickers, profile page toggle to change it. 53 tests pass; dialog, low-mode emojis and high-mode animated stickers verified in browser. Signed-in profile toggle not exercised (no session).
- [x] Update Universal APK assets/logo.png using the selected build logo at original dimensions; 13 APK regression tests pass, non-target archive contents preserved, pushed and verified apk-builder/main fcaed2129c08 with backup. Build/sign/upload/report workflow unchanged; actual signed APK/device and Telegram delivery not exercised.
- [x] Add separate Preview HTML for new/existing templates; real admin add/edit and visitor preview verified, 14 targeted tests pass; APK callback still uses original build HTML.
- [x] Compare manual-edit base with workflow APK; restore supplied Universal base, preserve protected archive entries, correct package authorities, run six regression tests and rebuild locally. Pushed apk-builder commit 4627dd7d36b7 and verified remote files.
- [ ] Verify the latest signed workflow APK on Android and reproduce the user's exact failure. Blocked: failing signed APK/device error not supplied; local unsigned archive checks do not establish runtime success.
- [x] Inspect supplied Universal APK and fix apk-builder patch scope, saved-ID requirement and preservation of unrelated text/assets; six regression tests passed. Real user new-build/rebuild runtime verification remains open above.
- [x] Restrict every new build to random com.tineshmod.a1–com.tineshmod.a10; package input removed; six user/admin handler tests verify submitted overrides are ignored across all three bases and saved assignment reaches dispatch. Full suite: 16 tests pass.
- [x] Inspect idforge-creations source and export its Firebase Realtime Database as a safe JSON deliverable.
- [x] Fix Universal registration to use existing public Firebase rules without the unrelated service-account token; 11 tests pass and live create/read/delete verified with temporary record removed.
- [ ] Verify full signed-in Universal APK flow. Blocked: preview has no templates to build; database registration itself is verified.
- [x] Update contextual memory with Universal registration behavior and verification limits.
- [x] Push tested source changes to tineshbuildercode/main and tinesh-builder/main; backup branches created and remote formatter contents verified. Vercel deployment and real Universal APK flow are not verified.
- [x] Fix failed APK build workflow (needs one real build to confirm)
- [x] Transparent cards on Windows desktop
