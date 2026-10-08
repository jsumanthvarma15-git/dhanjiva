# Dhanjiva

Hospital management landing page with a scroll-controlled journey through outpatient, finance, pharmacy, and wards.

Live website: https://dhanjiva.netlify.app/

## Development

Requires Node.js 22 and Bun.

```sh
cd app
bun install --frozen-lockfile
bun run dev
```

## Validation

```sh
cd app
bun run typecheck
bun run build
```

## Runtime

React 19 and TanStack Start, deployed to Netlify using its TanStack Start Vite adapter. The root `netlify.toml` sets `app` as the build base and publishes `app/dist/client`; the adapter generates the server function and routing needed to render the website. Publishing static assets alone is not sufficient for this server-rendered site.

The access-request form uses Netlify Database with Drizzle ORM. Its schema is in `app/db/schema.ts`, and deployment migrations are in `app/netlify/database/migrations`. Netlify provisions the database and applies migrations during deployment. The original Cloudflare configuration and D1 migrations remain as historical source files but are not used by Netlify.

## Animation

The latest performance update limits active video decoders, releases unused media, stops work when idle, and selects lighter all-intra clips for mobile and lower-powered devices. Reduced-motion mode uses still images. Original desktop footage is 1080p, not native 8K.

## Export

Source snapshot: `abdcc4eae49d0f4be90d030244084385b7d17ed0`. Includes application source, required vendored packages, and website assets. Dependencies, build output, historical reference media, and Higgsfield-specific internal CI configuration are excluded.
