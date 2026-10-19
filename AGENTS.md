<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Reset copied migration history as a directory and use the migration tool to regenerate its metadata; never hand-edit journals or snapshots, so Drizzle remains the metadata owner.
- Mount profile completion inside the root auth provider and key its Firebase read by user ID; this covers every sign-in provider and avoids cross-account cached details.
- Verify Firebase ID tokens with jose and Google's remote JWK set; X.509 certificates cannot be imported by merely relabeling their PEM header as an SPKI public key.
- Account-page queries use bounded requests, explicit failure/retry feedback, and user-scoped query keys; failed requests must not remain indistinguishable from loading or leak cached account data.
- Keep website identity and visitor announcements in Firebase settings/main, expose only public fields through the shared site-settings query, and authorize every settings write server-side; one source keeps admin changes consistent across visitor pages.
- Upload build logos through authenticated ImgBB server calls and store owner-scoped path-to-URL mappings in Firebase mediaFiles; resolve those mappings for orders and build callbacks because the configured Cloud Storage bucket is unavailable.
- Shared surface and glass utilities own card/control treatment across routes; legacy clay classes are glass aliases to keep existing views consistent, with standard backdrop-filter only for production compatibility.
- Keep decorative animations in reusable effects components with browser work inside effects and reduced-motion handling; the shared background mounts once in the root provider outside the route outlet so navigation, pending states, and admin pages do not restart it. Login media stays on the auth page.
- Use the global background token and CDN asset pointers for theme images; desktop video eligibility is shared with CSS media conditions that suppress static images before hydration, while mobile and reduced-motion visitors retain theme images.
- Use shared HackerLoader/LoadingPanel for loading feedback, with scoped timers and reduced-motion support; consistent states must not block navigation or alter unrelated text.
- All new builds use the shared server-side random package-name module, discard client package overrides, and retain the stored name on retries; a single assignment policy covers user and admin builds.
- IconScout calls go through the server-only searchIconscout proxy (src/lib/iconscout.functions.ts) reading ICONSCOUT_CLIENT_ID/SECRET; the client secret must never reach the browser. Loading UI uses shared HackerLoader/BrandLoader/SkeletonGrid/DetailSkeleton and SmartImage so states stay consistent.

- Media pointers (/__l5e/...) are proxied in src/server.ts to the Lovable project host when the app runs off Lovable hosting (Vercel); without it all images/videos 404 there.
- Base-app behaviour (App ID vs register link, which asset receives template HTML) is config-driven: base-apks.ts flags in this app and bases/<id>.json html_targets in the apk-builder repo.
- Store preview_html separately from build html; public detail responses expose only enabled preview HTML with legacy fallback, while authorized build callbacks use html exclusively to prevent preview edits changing APK behavior.
- Universal APK workflows must preserve opaque code and non-target archive entries from the working base and keep package-scoped authorities consistent without rewriting component classes; archive checks do not substitute for installed-device verification.
- Universal registration uses a server-only Firebase writer behind the app's build authorization, with conditional ID reservation; use only a dedicated Universal credential when configured, otherwise the registration database's existing public rules, never the unrelated app credential. Persist app_id before dispatch so retries reuse the record.
