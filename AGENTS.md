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

## Architecture rules
- Admin access is a single shared password (env ADMIN_PASSWORD, fallback "devdev") checked inside every admin server function — no user accounts needed for a one-admin panel.
- All DB/storage access goes through server functions with the admin client; media bucket is private and served via signed URLs because the workspace blocks public buckets.
- APK builds patch a prebuilt base APK (apktool) in the GitHub repo instaboosterwesd/apk-builder via repository_dispatch; builder URL + callback secret go in the dispatch payload, and the runner uploads the signed APK to storage via a signed upload URL from /api/public/build — avoids managing GitHub repo secrets and keeps APKs downloadable via signed URLs.
