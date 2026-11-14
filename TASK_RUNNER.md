# Task Runner: Milestone 8.0

## Completed Tasks
- [x] **Task 0: Milestone Initialization & Branch Setup** (`8.0.0.0`)
- [x] **Task 1: DMV AMC Theatres Ingestion & Instant Search Component** (`8.0.0.1`)
- [x] **Task 2: Interactive Monthly Calendar & Date Range Selector** (`8.0.0.2`)

## Queued Task: Task 3 - PLF Format Showtime Matrix & Movie Catalog (HIGH)

### Plan for Task 3
1. **Define Showtime & Movie Models**:
   - Create `apps/web/src/data/showtimes.ts`.
   - Implement `Movie` interface (id, title, rating, runtimeMinutes, posterUrl, genre).
   - Implement `Showtime` interface (id, theatreId, movieId, date, time, format, auditoriumId, auditoriumName, totalSeats, availableSeats, primeAvailableSeats, checkoutUrl).
   - Seed schedule data across DMV theatres, movies, and dates.
2. **Build ShowtimeSchedule Component**:
   - Create `apps/web/src/components/ShowtimeSchedule.tsx`.
   - Format filter tabs: "All PLF Formats", "Dolby Cinema", "IMAX with Laser", "Prime 3D".
   - Movie presentation cards with posters, ratings, runtimes, and showtime pills with availability indicators.
   - Expose `onSelectShowtime: (showtime: Showtime, movie: Movie) => void`.
3. **Vitest Verification**:
   - Implement `apps/web/tests/ShowtimeSchedule.test.tsx`.
   - Run type checks and tests.
