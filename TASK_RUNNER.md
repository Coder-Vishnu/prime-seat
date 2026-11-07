# Task Runner: Milestone 8.0

## Completed Tasks
- [x] **Task 0: Milestone Initialization & Branch Setup** (`8.0.0.0`)
- [x] **Task 1: DMV AMC Theatres Ingestion & Instant Search Component** (`8.0.0.1`)

## Active Task: Task 2 - Interactive Monthly Calendar & Date Range Selector (HIGH)

### Plan
1. **Build CalendarPicker Component**:
   - Create `apps/web/src/components/CalendarPicker.tsx`.
   - Implement interactive monthly grid with previous/next month navigation.
   - Compute start-of-month day offset, days in month, and disable past historical dates.
   - Add shortcut pills: "Today", "Tomorrow", "This Friday", "This Saturday", "This Sunday".
   - Highlight active selected date with gold/sky accent styling and visual indicator dots for available screening dates.
   - Expose `selectedDate: string` (YYYY-MM-DD) and `onSelectDate: (dateStr: string) => void`.
2. **Implement Vitest Verification Suite**:
   - Create `apps/web/tests/CalendarPicker.test.tsx` verifying day calculation, disabling past dates, shortcut selection, and `onSelectDate` emission.
3. **Run Verification Gates**:
   - `npx tsc --noEmit`
   - `npm test`
