# Dhanjiva

Hospital management landing page with a scroll-controlled journey through outpatient, finance, pharmacy, and wards.

Live website: https://dhanjiva-connected.higgsfield.app/

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

React 19 and TanStack Start, built for Cloudflare Workers. The access-request form uses a D1 database binding named `DB`; database migrations are included in the app. A plain static host will not provide the form backend. Hosting and database setup are separate from copying this repository.

## Animation

The latest performance update limits active video decoders, releases unused media, stops work when idle, and selects lighter all-intra clips for mobile and lower-powered devices. Reduced-motion mode uses still images. Original desktop footage is 1080p, not native 8K.

## Export

Source snapshot: `abdcc4eae49d0f4be90d030244084385b7d17ed0`. Includes application source, required vendored packages, and website assets. Dependencies, build output, historical reference media, and Higgsfield-specific internal CI configuration are excluded.
