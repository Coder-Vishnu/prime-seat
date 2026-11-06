# Task Runner: Milestone 7.0

## Active Task: Task 3 - Interactive SVG AuditoriumCanvas Component & Heatmap Mode (HIGH)

### Plan
1. **Implement `apps/web/src/components/AuditoriumCanvas.tsx`**:
   - 2D SVG vector rendering of auditorium seats with screen curvature banner
   - Exact implementation of the Section 2 six-state color and styling matrix
   - Pulsing amber keyframe animation on recent seat drops
   - Predictive ML heatmap gradient mode based on PyTorch $P(\text{Drop})$ scores
   - Dynamic hover tooltip displaying seat coordinates, occupancy status, and drop risk
   - Interactive seat click handler routing to `onSeatClick`
2. **Wire up `apps/web/src/app/page.tsx`**:
   - Integrate `AuditoriumCanvas`, `useAuditoriumStream`, and `useDesktopNotification`
   - Real-time connection badge (live SSE pulse indicator)
   - Heatmap toggle switch with gradient legend (High $\ge 70\%$, Med $\ge 40\%$, Low $< 40\%$)
   - Showtime and screen format switcher (Dolby Cinema vs. IMAX with Laser)
   - Recent drop alert banner with direct AMC checkout deep-link
3. **Verification Gates**:
   - TypeScript compiler validation (`npx tsc --noEmit`)
   - Verify SVG fill and stroke mapping for all 6 states
   - Verify heatmap mode probability thresholds
   - Verify click interaction callback
