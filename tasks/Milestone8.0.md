# Milestone 8.0 - AMC Theatre Discovery & Multi-Showtime Explorer

**Version:** 8.0.0.0 (Starting version)  
**Date Created:** 2026-11-06  
**Date Started:** 2026-11-07  
**Date Completed:** YYYY-MM-DD  
**Status:** In Progress  
**Based on:** User Specification: DMV AMC Theatre Search, Monthly Calendar Date Picker, PLF Showtime Schedule (Dolby/IMAX/4DX), and True-to-Life AMC Seatmap Navigation  

Engineers an end-to-end theatre discovery and schedule exploration pipeline in `apps/web`. Enables users to search DMV-area AMC theatres, browse monthly screening calendars, filter showtimes across Dolby Cinema, IMAX with Laser, and 4DX/Prime formats, and transition seamlessly into true-to-life architectural seatmaps accurate to AMC ticketing layouts.

---

## Version Information

**Current Version (at milestone start):**
- **prime-seat (web):** `7.0.0.4`

**Target Version (after milestone completion):**
- **prime-seat (web):** `8.0.0.4`

**Task-Level Versioning:**
Each task completion increments the BUILD number (4th digit) by 1:
- Task 0 complete: `8.0.0.0` (Milestone Initialization & Branch Setup)
- Task 1 complete: `8.0.0.1` (DMV AMC Theatres Ingestion & Instant Search Component)
- Task 2 complete: `8.0.0.2` (Interactive Monthly Calendar & Date Range Selector)
- Task 3 complete: `8.0.0.3` (PLF Format Showtime Matrix & Movie Catalog)
- Task 4 complete: `8.0.0.4` (Accurate AMC Physical Seatmap Routing & Vitest Verification Gates)

**Git Branch:**
- **prime-seat:** `vishnu-110626-8.0-theatre-showtime-explorer`

---

## Progress Summary

**Completion:** 1 of 5 tasks complete (20%)

| Task | Priority | Status | Version | Deployed / Verified |
| :--- | :--- | :--- | :--- | :--- |
| **Task 0: Milestone Initialization & Branch Setup** | SETUP | ✅ Complete | `8.0.0.0` | Feature Branch Ready |
| **Task 1: DMV AMC Theatres Ingestion & Instant Search Component** | HIGH | ⏳ Pending | `8.0.0.1` | - |
| **Task 2: Interactive Monthly Calendar & Date Range Selector** | HIGH | ⏳ Pending | `8.0.0.2` | - |
| **Task 3: PLF Format Showtime Matrix & Movie Catalog** | HIGH | ⏳ Pending | `8.0.0.3` | - |
| **Task 4: Accurate AMC Physical Seatmap Routing & Vitest Verification Gates** | CRITICAL | ⏳ Pending | `8.0.0.4` | - |

**Status Legend:**
- ⏳ Pending: not started
- 🚧 In Progress: currently being worked on
- 🔍 Verifying: running verification gates
- ✅ Complete: implementation finished and verified

---

## Overview

**Objective:**  
Expand Prime Seat from a single-auditorium monitor into a comprehensive AMC booking and seat reclamation hub. Users can search and select premier AMC locations across the DMV area, browse upcoming showtime schedules on an interactive calendar, filter by Premium Large Formats (Dolby Cinema, IMAX with Laser, 4DX, Prime), and inspect accurate physical seatmaps with real-time drop detection.

**Scope:**
- Create typed DMV AMC theatre models and dataset (`apps/web/src/data/theatres.ts`) including AMC Tysons Corner 16, Georgetown 14, Hoffman Center 22, Montgomery 16, Shirlington 7, Courthouse Plaza 8, Rio Cinemas 18, DINE-IN Techworld 11, Magic Johnson 12, and Columbia 14.
- Implement `TheatreSearch.tsx` component with instant debounced type-ahead search by name, city, zip code, or premium format filters.
- Implement `CalendarPicker.tsx` component with interactive monthly grid, date status badges, and quick-access shortcuts (Today, Tomorrow, Weekend).
- Implement `ShowtimeSchedule.tsx` component displaying movies with posters, runtime, rating, PLF format tabs, auditorium indicators, and showtime pills with prime availability indicators.
- Create `apps/web/src/data/auditoriums.ts` mapping actual physical auditorium JSON layouts (`tysons_auditorium_11_dolby.json`, `tysons_auditorium_9_dolby.json`, IMAX geometries).
- Implement breadcrumb-guided multi-stage navigation in `apps/web/src/app/page.tsx` (`Theatres → Calendar → Showtimes → Seatmap`).
- Implement automated Vitest verification suite in `apps/web/tests/BookingPipeline.test.tsx` verifying search filtering, calendar date navigation, format filtering, and seatmap routing.

**Estimated Effort:** 3 hours  
**Dependencies:** Milestone 7.0 (`AuditoriumCanvas`, `useAuditoriumStream`, Next.js 15 PWA)

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

**Purpose:** Verify starting environment, checkout feature branch `vishnu-110626-8.0-theatre-showtime-explorer`, and prepare milestone state.  
**Estimated Time:** 5 minutes  
**Status:** ✅ Complete  
**Version:** `8.0.0.0`  

### Step 0.1: Check Current Version
Confirm starting version `7.0.0.4` in `TASKS.md`.

### Step 0.2: Create Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b vishnu-110626-8.0-theatre-showtime-explorer
git push -u origin vishnu-110626-8.0-theatre-showtime-explorer
```

### Step 0.3: Update Milestone Header
Update this document with confirmed version and record `Date Started`.

### Verification Gate
- [x] Working branch is `vishnu-110626-8.0-theatre-showtime-explorer`
- [x] Working tree clean and verified

---

## Task 1: DMV AMC Theatres Ingestion & Instant Search Component (HIGH)

**Purpose:** Implement typed dataset of DMV-area AMC theatres and an interactive search component with format filters and location queries.  
**Estimated Time:** 40 minutes  
**Status:** ⏳ Pending  
**Version:** `8.0.0.1`  
**Dependencies:** Task 0  

### Description
1. Create `apps/web/src/data/theatres.ts`:
   - Interface `AMCTheatre`: `{ id: string; name: string; slug: string; address: string; city: string; state: string; zip: string; region: string; formats: ('DOLBY_CINEMA' | 'IMAX_LASER' | 'PRIME' | 'REALD_3D' | 'DINE_IN')[]; screenCount: number; hasRecliners: boolean; isFlagship: boolean; imageUrl?: string }`.
   - Seed with 10 comprehensive DMV AMC locations (Tysons 16, Georgetown 14, Hoffman Center 22, Montgomery 16, Shirlington 7, Courthouse Plaza 8, Rio 18, Techworld 11, Magic Johnson 12, Columbia 14).
2. Create `apps/web/src/components/TheatreSearch.tsx`:
   - Search input with clear button and instant search across name, city, zip, and region.
   - Filter chips for format toggles (e.g. "Dolby Cinema Only", "IMAX Only", "Flagship PLF").
   - Responsive theatre cards showing location details, format tags, and "View Showtimes →" CTA.
   - Expose `onSelectTheatre: (theatre: AMCTheatre) => void`.

### Affected Files
- `apps/web/src/data/theatres.ts`
- `apps/web/src/components/TheatreSearch.tsx`

### Verification Gates & Testing
- [ ] TypeScript compiler passes with 0 errors (`npx tsc --noEmit`)
- [ ] Instant search accurately filters by city (e.g. "McLean" returns Tysons Corner 16)
- [ ] Format chip filter correctly isolates theatres offering Dolby Cinema

---

## Task 2: Interactive Monthly Calendar & Date Range Selector (HIGH)

**Purpose:** Implement an interactive monthly calendar view allowing users to select showtime dates with screening density indicators.  
**Estimated Time:** 35 minutes  
**Status:** ⏳ Pending  
**Version:** `8.0.0.2`  
**Dependencies:** Task 1  

### Description
1. Create `apps/web/src/components/CalendarPicker.tsx`:
   - Current month view with previous/next month navigation.
   - Day cells with day of week, day of month, and visual dots indicating scheduled PLF showtimes.
   - Shortcut pills at top: "Today", "Tomorrow", "This Friday", "This Saturday", "This Sunday".
   - Disable past dates to prevent invalid historical queries.
   - Highlight active selected date with gold/sky accent styling.
   - Expose `selectedDate: string` and `onSelectDate: (dateStr: string) => void`.

### Affected Files
- `apps/web/src/components/CalendarPicker.tsx`

### Verification Gates & Testing
- [ ] Calendar correctly calculates days in month and start day offset
- [ ] Past dates are disabled and non-clickable
- [ ] Shortcut pills ("Today", "Tomorrow") accurately update selected date

---

## Task 3: PLF Format Showtime Matrix & Movie Catalog (HIGH)

**Purpose:** Implement the movie catalog and showtime matrix filtered by Dolby Cinema, IMAX with Laser, 4DX, and Prime formats.  
**Estimated Time:** 45 minutes  
**Status:** ⏳ Pending  
**Version:** `8.0.0.3`  
**Dependencies:** Task 2  

### Description
1. Create `apps/web/src/data/showtimes.ts`:
   - Interface `Movie`: `{ id: string; title: string; rating: string; runtimeMinutes: number; posterUrl: string; genre: string }`.
   - Interface `Showtime`: `{ id: string; theatreId: string; movieId: string; date: string; time: string; format: 'DOLBY_CINEMA' | 'IMAX_LASER' | 'PRIME' | 'REALD_3D'; auditoriumId: string; auditoriumName: string; totalSeats: number; availableSeats: number; primeAvailableSeats: number; checkoutUrl: string }`.
   - Seed rich schedule of blockbusters across DMV theatres and dates.
2. Create `apps/web/src/components/ShowtimeSchedule.tsx`:
   - Format filter tabs: "All PLF Formats", "Dolby Cinema", "IMAX with Laser", "Prime 3D".
   - Movie presentation cards: high-res poster thumbnail, rating badge (PG-13, R), runtime, and genre.
   - Showtime pills grouped by format & auditorium:
     - Pill displays screening time (e.g. `7:15 PM`).
     - Badge displays availability status (e.g. `3 Prime Left` in amber, `Available` in emerald, `Sold Out` in red).
   - Expose `onSelectShowtime: (showtime: Showtime, movie: Movie) => void`.

### Affected Files
- `apps/web/src/data/showtimes.ts`
- `apps/web/src/components/ShowtimeSchedule.tsx`

### Verification Gates & Testing
- [ ] Format tabs correctly filter showtime pills without re-mounting movie list
- [ ] Showtime pills display correct prime vacancy badges
- [ ] `onSelectShowtime` fires with complete showtime & movie payload

---

## Task 4: Accurate AMC Physical Seatmap Routing & Vitest Verification Gates (CRITICAL)

**Purpose:** Connect the multi-stage navigation flow to authentic physical auditorium layouts and implement automated Vitest suite.  
**Estimated Time:** 40 minutes  
**Status:** ⏳ Pending  
**Version:** `8.0.0.4`  
**Dependencies:** Task 3  

### Description
1. Create `apps/web/src/data/auditoriums.ts`:
   - Integrates the exact 262-seat layout of AMC Tysons Corner 16 Auditorium 11 (`tysons_auditorium_11_dolby.json`) and Auditorium 9 (`tysons_auditorium_9_dolby.json`).
   - Dynamic generator for IMAX with Laser and standard PLF auditoriums with realistic architectural curvature, row labeling, and prime sightline boxes.
2. Wire up complete 4-stage pipeline in `apps/web/src/app/page.tsx`:
   - Stage 1: Theatre Search (`TheatreSearch.tsx`)
   - Stage 2: Date Picker (`CalendarPicker.tsx`)
   - Stage 3: Showtimes Matrix (`ShowtimeSchedule.tsx`)
   - Stage 4: Live Seating Canvas (`AuditoriumCanvas.tsx`)
   - Interactive breadcrumb navigation bar:
     `[Theatres] > [AMC Tysons 16] > [Nov 7] > [Dune: Part Two (7:15 PM Dolby)]`
   - "← Back" button allowing seamless transitions between stages without losing selected context.
3. Implement automated test suite in `apps/web/tests/BookingPipeline.test.tsx`:
   - `test_gate_01_theatre_search_filtering`: Verifies searching "Georgetown" returns AMC Georgetown 14.
   - `test_gate_02_calendar_date_selection`: Verifies date navigation and shortcut pill selection.
   - `test_gate_03_format_showtime_filtering`: Verifies filtering by Dolby Cinema isolates Dolby showtimes.
   - `test_gate_04_seatmap_stage_transition`: Verifies selecting a showtime renders the accurate auditorium seatmap.
4. Run full test suite: `npx vitest run`.

### Affected Files
- `apps/web/src/data/auditoriums.ts`
- `apps/web/src/app/page.tsx`
- `apps/web/tests/BookingPipeline.test.tsx`

### Verification Gates & Testing
- [ ] 100% Vitest pass rate (`npx vitest run`) — 4/4 new gates passed (9/9 total)
- [ ] 0 TypeScript compilation errors (`npx tsc --noEmit`)
- [ ] Production build succeeds (`npm run build`)

---

**End of Milestone 8.0 Specification**
