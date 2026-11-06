# Task Runner: Milestone 7.0

## Active Task: Task 2 - SSE Stream Hook & Desktop Notification Hook (HIGH)

### Plan
1. **Implement `apps/web/src/hooks/useAuditoriumStream.ts`**:
   - TypeScript interfaces: `SeatData` and `DropEventPayload` matching `sentinel.schema`
   - `useAuditoriumStream(showtimeId: string)`:
     - `EventSource` connection to `/api/events/stream?showtime_id=${showtimeId}`
     - Event handler for `SNAPSHOT_INIT` (initial seats state load)
     - Event handler for `SEAT_DROP` (localized seat state update & latestDrop trigger)
     - Exponential backoff with sequence: 1s, 2s, 4s, 8s, 16s (capped at 16000ms)
     - Browser desktop notification trigger on `SEAT_DROP`
     - Robust cleanup on unmount or `showtimeId` change
     - Strict TypeScript typing with no `any`
2. **Implement `apps/web/src/hooks/useDesktopNotification.ts`**:
   - Permission management (`Notification.requestPermission()`)
   - State exposure: `permission`, `isSupported`, `requestPermission`
   - Web Audio API synthesizer for acoustic notification chime (dual tone chord 880Hz / 1760Hz)
   - `triggerNotification(title, body, icon, url)` helper
3. **Verification Gates**:
   - TypeScript compiler validation (`npx tsc --noEmit` in `apps/web`)
   - Test exponential backoff calculation sequence (1s, 2s, 4s, 8s, 16s, 16s)
   - Verify alignment of `SeatData` and `DropEventPayload` with `sentinel.schema`
