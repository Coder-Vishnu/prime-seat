# Task Runner: Milestone 7.0

## Active Task: Task 1 - Next.js 15 PWA Scaffold, Manifest & Service Worker (HIGH)

### Plan
1. **Initialize `apps/web/package.json`**:
   - Next.js 15.x, React 19.x, React DOM 19.x
   - TypeScript, `@types/react`, `@types/react-dom`, `@types/node`
   - Tailwind CSS
   - Scripts: `dev`, `build`, `start`, `lint`
   - Version: `7.0.0.1`
2. **Configure TypeScript (`apps/web/tsconfig.json`)**:
   - Strict mode enabled
   - App Router path aliases (`@/*` -> `./src/*`)
3. **Configure Tailwind & Styling**:
   - Tailwind CSS setup with dark-mode base (`#0a0a0a`)
   - `apps/web/src/app/globals.css` with animation keyframes (`@keyframes pulse-ring`)
4. **PWA Manifest & Service Worker**:
   - `apps/web/public/manifest.json` per Section 3.1
   - `apps/web/public/sw.js` per Section 3.2
   - `apps/web/public/icons/` with placeholder PNG icons and `.gitkeep`
5. **App Shell**:
   - `apps/web/src/app/layout.tsx` with PWA metadata, manifest link, and Service Worker registration
   - `apps/web/src/app/page.tsx` base landing view
6. **Verification Gates**:
   - Run `npm install` in `apps/web`
   - Run `npm run build` to verify 0 TypeScript / compilation errors
   - Validate `manifest.json` structure
   - Verify Service Worker presence and syntax
