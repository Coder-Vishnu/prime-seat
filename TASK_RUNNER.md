# Task Runner: Milestone 8.0

## Active Task: Task 1 - DMV AMC Theatres Ingestion & Instant Search Component (HIGH)

### Plan
1. **Define Data Models & Dataset**:
   - Create `apps/web/src/data/theatres.ts` with `AMCTheatre` interface and 10 premier DMV AMC theatres (AMC Tysons Corner 16, Georgetown 14, Hoffman Center 22, Montgomery 16, Shirlington 7, Courthouse Plaza 8, Rio Cinemas 18, DINE-IN Techworld 11, Magic Johnson Capital Centre 12, Columbia 14).
2. **Build Instant Search Component**:
   - Create `apps/web/src/components/TheatreSearch.tsx` with instant debounced search query filtering across name, city, zip code, and region.
   - Add format toggle filter chips (`ALL`, `DOLBY_CINEMA`, `IMAX_LASER`, `PRIME`, `FLAGSHIP`).
   - Implement responsive cards showing theatre address, formats, screen counts, recliner status, and "View Showtimes →" selection trigger.
3. **Run Verification Gates**:
   - Run TypeScript type checks (`npx tsc --noEmit` in `apps/web`).
   - Run Vitest test suite (`npm run test` in `apps/web`).
