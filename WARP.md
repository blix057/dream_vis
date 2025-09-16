# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository overview
- Stack: Next.js 14 (App Router) + TypeScript + Tailwind CSS.
- Image generation providers: Pollinations (default; no key required) and OpenAI (requires OPENAI_API_KEY).
- Runtime: Edge function for the image generation API.

Commands
- Install dependencies: npm install
- Develop (hot reload at http://localhost:3000): npm run dev
- Build (production): npm run build
- Start (serve production build): npm run start
- Lint: no lint script configured in package.json
- Tests: no test framework configured in this repo

Environment
- OpenAI (optional): set OPENAI_API_KEY in a local .env.local (Next.js will load it) or in Vercel Project Settings.
- Note: README mentions copying .env.local.example, but that file does not exist in this repository; create .env.local manually if needed.

Big-picture architecture
- App Router entrypoints (app/)
  - app/page.tsx: top-level page. Renders two client components via Suspense: components/DreamForm and components/ResultGrid. The page exports dynamic = 'force-dynamic' to disable static optimization.
  - app/layout.tsx: global HTML shell and styles; pulls in app/globals.css.
- Client components (components/)
  - DreamForm.tsx (use client):
    - Manages prompt, count (1–4), size (256/512/1024 square), and style (realistic/comic/ghibli).
    - Submits POST /api/generate with JSON body, forcing provider=pollinations and model=flux by default.
    - On success: writes results to sessionStorage under key 'dream_results' and updates the URL query (?q, n, s, style) for shareable links.
  - ResultGrid.tsx (use client):
    - Loads images from sessionStorage if present; otherwise reconstructs state from URL query and re-calls /api/generate to render a shared link without prior session.
- API route (server-side)
  - app/api/generate/route.ts (Edge runtime; maxDuration=60):
    - Validates request body with zod: { prompt, count, provider, model, size, style }.
    - Execution path:
      - If provider === 'pollinations' OR OPENAI_API_KEY is missing: build Pollinations URLs with style-based suffix, deterministic seeds, and requested dimensions. Returns { images: [{ url, seed }] }.
      - Else: uses OpenAI Images API (openai.images.generate) with selected model (maps 'flux' to 'gpt-image-1'), appends style suffix, and returns { images: [{ url }] }.
      - On OpenAI failure, falls back to Pollinations with the same prompt/style/size.
- Configuration
  - next.config.mjs: reactStrictMode, experimental.esmExternals, and images.remotePatterns allowing external image hosts used by Pollinations/OpenAI/Replicate.
  - tsconfig.json: strict TS, bundler moduleResolution, next plugin; no emit.
  - tailwind.config.js: scans ./app and ./components; extends theme with bg color. postcss.config.js enables tailwindcss and autoprefixer.

Deployment
- Vercel: push to GitHub, import the repo in Vercel, and set OPENAI_API_KEY if using the OpenAI provider.
- Images: next.config.mjs already whitelists external hostnames for remote images.

Project rule for Warp
- After making changes that should deploy, commit and push to GitHub to trigger Vercel builds.
  Example:
  - git add -A && git commit -m "chore: update" && git push
