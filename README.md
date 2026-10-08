# Dhanjiva

Hospital management landing page with a connected outpatient → finance → pharmacy → wards animation, one tool, and video-learning modules.

## Run locally

Use Node.js 24.x and Bun 1.4.2.

```sh
cd app
bun install --frozen-lockfile
bun run dev
```

## Validate

```sh
cd app
bun run typecheck
bun test tests/*.test.ts
bun run build:vercel
```

## Browser checks

After the production build, run `bun run preview --host 127.0.0.1 --port 4173` from `app`. In another terminal, run `bunx playwright install chromium webkit`, then `bun run test:browser`. The checks cover 320px to 1440px, landscape, Safari/WebKit, full-resolution defaults, mobile chapter separation, bounded video loading, reduced motion, and the form without database credentials. Run them without production database credentials; the form check deliberately expects an unconfigured database.

## Deploy to Vercel

Import this repository. Either leave Root Directory at the repository root **or** set it to `app`; both have a matching `vercel.json`. Use Node.js 24.x. Remove any old dashboard overrides for Build Command, Install Command, and Output Directory so the checked-in settings apply. In particular, do not set Output Directory to `dist/client`: that omits the server.

The build uses the current Nitro Vite adapter and produces `.vercel/output`, containing server functions, route configuration, and static assets. Root imports copy the app's build output into the repository-level `.vercel/output`. No deployment is performed by these scripts.

Optional public setting: set `VITE_SITE_URL` to the final HTTPS website origin before building so canonical and social URLs use your domain.

## Access-request form

The website renders without database credentials. To enable saving access requests, connect a Neon Postgres database to the Vercel project and set the server-only `DATABASE_URL` (or `POSTGRES_URL`). Never use a `VITE_` prefix for database credentials.

Apply the included idempotent schema setup against the intended database before accepting requests:

```sh
cd app
bun run db:migrate
```

Provide the database URL through your environment or secret manager. No database is automatically created or migrated during builds. If configuration is missing, the form reports unavailability and never falsely confirms a saved request. Existing data is not migrated from Netlify or Cloudflare by this repository.

## Media quality and mobile support

High quality is the default on desktop, tablet, and mobile, including browsers that do not expose device RAM. It serves the original 1910 × 1080 clips directly as static assets; the build does not transcode or shrink them. There is no quality selector or automatic resolution downgrade. Playback bounds loaded videos and stops work when idle. Reduced-motion preferences show still images and fetch no videos.

Mobile displays the whole landscape frame instead of zooming it to fill a portrait screen. Text remains real HTML, so it stays sharp at high pixel density and when zoomed. The UI palette uses ivory, navy, and pale blue; original imagery keeps its natural colours. The available video source is 1080p, not native 4K or 8K.

Direct dependencies are pinned to current registry releases that satisfy the project's 24-hour release-age policy. Nitro's current Vite adapter is published on its beta version line. The exact dependency tree is recorded in `app/bun.lock`; managed vendored packages remain included.
