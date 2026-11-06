# Task Runner: Milestone 7.0

## Active Task: Task 4 - Vitest Component Verification Gates & Sub-50ms Re-Render SLA (CRITICAL)

### Plan
1. **Configure Vitest Dependencies**:
   - Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitejs/plugin-react` in `apps/web`
2. **Vitest Configuration**:
   - Create `apps/web/vitest.config.ts` with `jsdom` test environment and `@/*` alias
   - Create `apps/web/tests/setup.ts` importing `@testing-library/jest-dom/vitest`
3. **Implement Verification Suite**:
   - `apps/web/tests/AuditoriumCanvas.test.tsx` implementing 5 gates:
     - `test_gate_01_seat_node_rendering_and_geometry`
     - `test_gate_02_click_interaction_callback`
     - `test_gate_03_color_encoding_matrix`
     - `test_gate_04_heatmap_probability_gradient`
     - `test_gate_05_sub_50ms_rerender_sla`
4. **Execute Verification Gates**:
   - Run `npx vitest run` ensuring 100% pass rate (5/5 gates)
   - Verify 0 TypeScript strict-mode errors
   - Re-start dev server if desired
