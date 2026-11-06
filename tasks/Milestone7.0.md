# Milestone 7.0 - Next.js 15 / React 19 PWA Auditorium Canvas

**Version:** 7.0.0.0 (Starting version)  
**Date Created:** 2026-11-06  
**Date Started:** 2026-11-06  
**Date Completed:** YYYY-MM-DD  
**Status:** In Progress  
**Based on:** `docs/modules/07_AUDITORIUM_UI_DASHBOARD.md`  

Constructs the frontend PWA in `apps/web`: a high-performance Next.js 15 / React 19 Progressive Web App rendering an interactive, hardware-accelerated 2D SVG auditorium seatmap connected to the FastAPI backend via Server-Sent Events (SSE) for real-time seat drop visualization, desktop/mobile push alerts, and predictive heatmap overlays.

---

## Version Information

**Current Version (at milestone start):**
- **prime-seat (web):** `6.0.0.3`

**Target Version (after milestone completion):**
- **prime-seat (web):** `7.0.0.4`

**Task-Level Versioning:**
Each task completion increments the BUILD number (4th digit) by 1:
- Task 0 complete: `7.0.0.0` (Milestone Initialization & Branch Setup)
- Task 1 complete: `7.0.0.1` (Next.js 15 PWA Scaffold, Manifest & Service Worker)
- Task 2 complete: `7.0.0.2` (SSE Stream Hook & Desktop Notification Hook)
- Task 3 complete: `7.0.0.3` (Interactive SVG AuditoriumCanvas Component & Heatmap Mode)
- Task 4 complete: `7.0.0.4` (Vitest Component Verification Gates & Sub-50ms Re-Render SLA)

**Git Branch:**
- **prime-seat:** `vishnu-110626-7.0-auditorium-ui`

---

## Progress Summary

**Completion:** 4 of 5 tasks complete (80%)

| Task | Priority | Status | Version | Deployed / Verified |
| :--- | :--- | :--- | :--- | :--- |
| **Task 0: Milestone Initialization & Branch Setup** | SETUP | ✅ Complete | `7.0.0.0` | 2026-11-06 |
| **Task 1: Next.js 15 PWA Scaffold, Manifest & Service Worker** | HIGH | ✅ Complete | `7.0.0.1` | 2026-11-06 |
| **Task 2: SSE Stream Hook & Desktop Notification Hook** | HIGH | ✅ Complete | `7.0.0.2` | 2026-11-06 |
| **Task 3: Interactive SVG AuditoriumCanvas Component & Heatmap Mode** | HIGH | ✅ Complete | `7.0.0.3` | 2026-11-06 |
| **Task 4: Vitest Component Verification Gates & Sub-50ms Re-Render SLA** | CRITICAL | ⏳ Pending | `7.0.0.4` | - |

**Status Legend:**
- ⏳ Pending: not started
- 🚧 In Progress: currently being worked on
- 🔍 Verifying: running verification gates
- ✅ Complete: implementation finished and verified

---

## Overview

**Objective:**  
Implement the interactive frontend PWA specified in `docs/modules/07_AUDITORIUM_UI_DASHBOARD.md`. Delivers a real-time SVG auditorium seatmap consuming SSE state diffs from the FastAPI backend with sub-50ms React re-rendering, PWA standalone execution with Service Worker push handling, and a predictive heatmap overlay rendering PyTorch $P(\text{Drop})$ probabilities over occupied prime seats.

**Scope:**
- Scaffold Next.js 15 / React 19 project in `apps/web/` with Tailwind CSS v4, TypeScript strict mode, and PWA manifest (`manifest.json`).
- Implement Service Worker (`sw.js`) with push notification handling, actionable buttons (Claim Seat / Dismiss), and deep-link routing to AMC checkout URLs.
- Implement `useAuditoriumStream` custom hook (`apps/web/src/hooks/useAuditoriumStream.ts`) consuming SSE events from `/api/events/stream?showtime_id={id}` with exponential reconnect backoff (1s→16s cap).
- Implement `useDesktopNotification` hook (`apps/web/src/hooks/useDesktopNotification.ts`) for Web Notification API permission request and audio chime triggering.
- Implement `AuditoriumCanvas` SVG component (`apps/web/src/components/AuditoriumCanvas.tsx`) with curved screen indicator, 6-state color-coded seat nodes (Available, Occupied Standard, Occupied Prime, Reclamation Drop, Blocked/House, Aisle/Spacer), pulsing amber drop keyframes, hover tooltips with $P(\text{Drop})$ scores, click-to-checkout deep linking, and toggleable ML heatmap mode.
- Implement Vitest component test suite (`apps/web/tests/AuditoriumCanvas.test.tsx`) verifying SVG node rendering, color encoding, click interaction callbacks, and sub-50ms re-render SLA.

**Estimated Effort:** 3 hours  
**Dependencies:** Milestone 1.0 (`sentinel.schema`), Milestone 4.0 (`ml.churn_predictor` for $P(\text{Drop})$), Milestone 6.0 (`sentinel.dispatcher` SSE backend)

---

## Git Workflow Policy

**CRITICAL: The agent must NOT commit or push code directly to main.**

**Antigravity Agent Responsibilities:**
- Write and modify code files using targeted tools
- Run type checks, linting, and tests to verify changes
- Prepare clean diffs and code for developer review
- Create feature branches ONLY (`git checkout -b`, `git push -u origin`)

**Developer Responsibilities:**
- Review code changes in their preferred git client
- Create commits with appropriate messages
- Push commits to feature branch
- Create and merge pull requests
- Deploy to environments

---

## Task 0: Milestone Initialization & Branch Setup (SETUP)

**Purpose:** Verify starting environment, checkout feature branch `vishnu-110626-7.0-auditorium-ui`, and prepare milestone state.  
**Estimated Time:** 5 minutes  
**Status:** ✅ Complete  
**Version:** `7.0.0.0`  

### Step 0.1: Check Current Version
Confirm starting version `6.0.0.3` in `TASKS.md`.

### Step 0.2: Create Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b vishnu-110626-7.0-auditorium-ui
git push -u origin vishnu-110626-7.0-auditorium-ui
```

### Step 0.3: Update Milestone Header
Update this document with confirmed version and record `Date Started`.

### Verification Gate
- [x] Working branch is `vishnu-110626-7.0-auditorium-ui`
- [x] Working tree clean and verified

---

## Task 1: Next.js 15 PWA Scaffold, Manifest & Service Worker (HIGH)

**Purpose:** Initialize the Next.js 15 / React 19 project in `apps/web/` with TypeScript, Tailwind CSS, PWA manifest, and Service Worker push handler.  
**Estimated Time:** 45 minutes  
**Status:** ✅ Complete  
**Version:** `7.0.0.1`  
**Dependencies:** Task 0  

### Description
1. Initialize Next.js 15 project in `apps/web/` with TypeScript strict mode and App Router (`src/app/`).
2. Install and configure Tailwind CSS v4 with dark-mode-first palette (`bg-[#0a0a0a]` base).
3. Create `apps/web/public/manifest.json` per Section 3.1 of the spec:
   - `name: "Prime Seat"`, `short_name: "PrimeSeat"`, `display: "standalone"`, `background_color: "#000000"`, `theme_color: "#0a0a0a"`, `orientation: "portrait-primary"`.
   - Icon references: `seat-icon-192.png` (192×192, any maskable) and `seat-icon-512.png` (512×512).
4. Create `apps/web/public/sw.js` Service Worker per Section 3.2:
   - `push` event listener parsing JSON payload, showing notification with seat row/number, vibration pattern `[200, 100, 200, 100, 400]`, tag deduplication, renotify, and actions `[Claim Seat, Dismiss]`.
   - `notificationclick` event listener routing `claim` action to `checkout_url` via `clients.openWindow`.
5. Create placeholder `apps/web/public/icons/` directory with `.gitkeep`.
6. Configure `apps/web/src/app/layout.tsx` with `<link rel="manifest">` and Service Worker registration script.

### Affected Files
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/tailwind.config.ts`
- `apps/web/public/manifest.json`
- `apps/web/public/sw.js`
- `apps/web/public/icons/.gitkeep`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`

### Verification Gates & Testing
- [x] `npm run build` completes with 0 TypeScript errors
- [x] `manifest.json` validates against W3C Web App Manifest schema
- [x] Service Worker `sw.js` registers successfully in dev mode

---

## Task 2: SSE Stream Hook & Desktop Notification Hook (HIGH)

**Purpose:** Implement the real-time SSE consumer hook and desktop notification permission hook.  
**Estimated Time:** 30 minutes  
**Status:** ✅ Complete  
**Version:** `7.0.0.2`  
**Dependencies:** Task 1  

### Description
1. Create `apps/web/src/hooks/useAuditoriumStream.ts` per Section 4.1:
   - Export `SeatData` interface: `{ row: string; number: number; status: 'AVAILABLE' | 'OCCUPIED' | 'BLOCKED'; seat_type: string; is_prime: boolean; drop_probability?: number }`.
   - Export `DropEventPayload` interface: `{ showtime_id: string; movie_title: string; seat: SeatData; drop_probability: number; timestamp: string; checkout_url: string }`.
   - `useAuditoriumStream(showtimeId: string)` hook:
     - Creates `EventSource` to `/api/events/stream?showtime_id=${showtimeId}`.
     - Handles `SNAPSHOT_INIT` events (full seat array initialization).
     - Handles `SEAT_DROP` events (localized seat state update, desktop notification trigger).
     - Exponential reconnect backoff: `Math.min(1000 * 2^retryCount, 16000)`.
     - Returns `{ seats, latestDrop, isConnected }`.
2. Create `apps/web/src/hooks/useDesktopNotification.ts`:
   - Manages `Notification.requestPermission()` on mount.
   - Exposes `permissionState` and `triggerNotification(title, body, icon)` helper.
   - Audio chime on drop notification via `AudioContext` or `HTMLAudioElement`.

### Affected Files
- `apps/web/src/hooks/useAuditoriumStream.ts`
- `apps/web/src/hooks/useDesktopNotification.ts`

### Verification Gates & Testing
- [x] `useAuditoriumStream` compiles with strict TypeScript (no `any` types)
- [x] Exponential backoff reconnect produces correct delay sequence: 1s, 2s, 4s, 8s, 16s, 16s (capped)
- [x] `SeatData` and `DropEventPayload` types align with `sentinel.schema` Pydantic models from Milestone 1.0

---

## Task 3: Interactive SVG AuditoriumCanvas Component & Heatmap Mode (HIGH)

**Purpose:** Implement the hardware-accelerated 2D SVG auditorium seatmap with 6-state color encoding, drop animation, and predictive heatmap overlay.  
**Estimated Time:** 45 minutes  
**Status:** ✅ Complete  
**Version:** `7.0.0.3`  
**Dependencies:** Task 2  

### Description
1. Create `apps/web/src/components/AuditoriumCanvas.tsx` per Section 4.2:
   - `AuditoriumCanvasProps`: `{ seats: SeatData[]; totalRows: number; totalCols: number; screenFormat: 'DOLBY_CINEMA' | 'IMAX_LASER'; latestDrop: DropEventPayload | null; heatmapMode: boolean; onSeatClick?: (seat: SeatData) => void }`.
   - **Curved Screen Banner:** SVG quadratic Bézier path (`Q 300 10 580 40`) with sky-400 stroke, format label below.
   - **Seat Geometry:** `seatWidth=28`, `seatHeight=24`, `gapX=10`, `gapY=12`, rounded rectangles (`rx=6`).
   - **6-State Color Matrix** per Section 2:
     - Available: Emerald-500/600, static.
     - Occupied (Standard): Slate-700/800, muted.
     - Occupied (Prime): Slate-600 fill, Sky-400 stroke (2.5px).
     - Reclamation Drop: Amber-500/600, `animate-pulse` CSS keyframe.
     - Blocked/House: Slate-800/900, `opacity-40`, `pointer-events: none`.
     - Aisle/Spacer: Invisible, `pointer-events: none`.
   - **Heatmap Mode:** When toggled, overrides occupied seat colors with $P(\text{Drop})$ gradient:
     - $\ge 0.7$: Red-500/600 (high churn risk).
     - $\ge 0.4$: Orange-500/600 (medium).
     - $< 0.4$: Blue-500/600 (low).
   - **Hover Tooltip:** Absolute-positioned panel showing `Row X, Seat N`, status, and $P(\text{Drop})$ percentage.
   - **Click Handler:** Routes `onSeatClick` callback to parent for checkout deep-link or info modal.
2. Wire up `AuditoriumCanvas` + `useAuditoriumStream` in `apps/web/src/app/page.tsx`:
   - Heatmap toggle button.
   - Connection status indicator (green dot = connected, red = disconnected).
   - Auto-scroll to latest dropped seat.

### Affected Files
- `apps/web/src/components/AuditoriumCanvas.tsx`
- `apps/web/src/app/page.tsx`

### Verification Gates & Testing
- [x] All 6 seat states render with correct SVG fill/stroke colors per Section 2 matrix
- [x] Pulsing amber animation triggers exclusively on `SEAT_DROP` event seats
- [x] Heatmap mode correctly maps $P(\text{Drop}) \ge 0.7$ to red, $\ge 0.4$ to orange, $< 0.4$ to blue
- [x] `onSeatClick` fires with correct `SeatData` payload on seat node click

---

## Task 4: Vitest Component Verification Gates & Sub-50ms Re-Render SLA (CRITICAL)

**Purpose:** Implement automated Vitest test suite verifying SVG rendering, color encoding, interaction callbacks, and sub-50ms re-render performance SLA.  
**Estimated Time:** 30 minutes  
**Status:** ⏳ Pending  
**Version:** `7.0.0.4`  
**Dependencies:** Task 3  

### Description
1. Install Vitest, `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom` in `apps/web/`.
2. Configure `vitest.config.ts` with `jsdom` environment and path aliases.
3. Create `apps/web/tests/AuditoriumCanvas.test.tsx` per Section 5:
   - **`test_gate_01_seat_node_rendering_and_geometry`:** Renders mock seat array, asserts all seat number labels present in SVG text nodes.
   - **`test_gate_02_click_interaction_callback`:** Simulates `fireEvent.click` on seat node, asserts `onSeatClick` called with correct `SeatData`.
   - **`test_gate_03_color_encoding_matrix`:** Renders seats in all 6 states, asserts correct SVG `fill` and `stroke` attribute values per Section 2 matrix.
   - **`test_gate_04_heatmap_probability_gradient`:** Renders occupied seats with known $P(\text{Drop})$ values, asserts heatmap mode applies correct red/orange/blue fills.
   - **`test_gate_05_sub_50ms_rerender_sla`:** Measures `performance.now()` delta for a seat state update via `rerender()`, asserts $< 50\text{ms}$.
4. Run full test suite: `npx vitest run`.

### Affected Files
- `apps/web/vitest.config.ts`
- `apps/web/tests/AuditoriumCanvas.test.tsx`
- `apps/web/package.json` (dev dependencies)

### Verification Gates & Testing
- [ ] 100% Vitest pass rate (`npx vitest run`) — 5/5 gates passed
- [ ] Sub-50ms re-render SLA verified with mock state diff
- [ ] 0 TypeScript strict-mode errors across `apps/web/src/`

---

**End of Milestone 7.0 Specification**




