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
- [ ] Replace the six requested secrets using secure entry. Blocked: secure form was declined, and the uploaded file has no matching setting labels.
- [x] Clear copied Drizzle migration history and regenerate an empty migration set.

## Shared page background
- [x] Make the home header lighter and search fully transparent.
- [x] Keep desktop video persistent across pages, including admin, without static-image flashes.
- [x] Verify Windows video playback, signed-out navigation persistence, admin entry, and mobile image fallback. Account-only page checks remain unavailable until sign-in is configured.
