# Validation

Validated locally on 8 October 2026; no Vercel deployment was performed.

- TypeScript check passed.
- 9 unit/contract tests passed.
- Nitro Vercel production build passed; server route returns HTTP 200 in production preview.
- Browser checks: Chromium at 320×568, 390×844, 768×1024, 844×390 and 1440×900; WebKit at 390×844, all at device scale factor 2.
- All six browser configurations: no horizontal overflow or page errors; HD video width 1910px; explicit light mode width 960px; at most two video nodes; zero idle animation callbacks after leaving the hero.
- Reduced-motion mode: zero video requests.
- Form without a database: clear unavailable response, no false success.
- All 16 animation videos/posters are byte-for-byte identical before and after the production build.
- Both repository-root and app-root Vercel configurations are included. Root output-copy script tested.

Limitations: browser emulation is not a test on every physical device. Live database writes and a real Vercel deployment were not tested. The form needs a connected Neon Postgres database and the documented migration. The current Nitro adapter is a beta upstream release; the build emits non-fatal upstream bundler warnings.
