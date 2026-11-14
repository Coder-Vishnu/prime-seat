# Task Runner: Milestone 8.0

## Completed Tasks
- [x] **Task 0: Milestone Initialization & Branch Setup** (`8.0.0.0`)
- [x] **Task 1: DMV AMC Theatres Ingestion & Instant Search Component** (`8.0.0.1`)
- [x] **Task 2: Interactive Monthly Calendar & Date Range Selector** (`8.0.0.2`)
- [x] **Task 3: PLF Format Showtime Matrix & Movie Catalog** (`8.0.0.3`)

## Queued Task: Task 4 - Accurate AMC Physical Seatmap Routing & Vitest Verification Gates (CRITICAL)

### Plan for Task 4
1. **Auditorium Topology Models & Data**:
   - Create `apps/web/src/data/auditoriums.ts` mapping real physical layouts (e.g. `tysons-aud-11-dolby`, `tysons-aud-9-imax`).
2. **End-to-End Multi-Stage Booking Pipeline in page.tsx**:
   - Wire `TheatreSearch` → `CalendarPicker` → `ShowtimeSchedule` → `AuditoriumCanvas` into `apps/web/src/app/page.tsx`.
   - Add breadcrumbs navigation (`Theatres → Calendar → Showtimes → Seatmap`).
3. **Comprehensive Booking Pipeline Vitest Suite**:
   - Create `apps/web/tests/BookingPipeline.test.tsx` verifying end-to-end user navigation flow across all 4 stages.
4. **Verification Gates**:
   - Run Vitest suite and `tsc --noEmit`.
