# Cover Story repository guidance

Cover Story is a browser stealth prototype driven by real-time exact-cover patrol scheduling. The
published `dancing-links` package is a runtime dependency; do not restore or import the old in-tree
solver implementation.

## Commands

- `npm run dev` — Vite development server
- `npm test` — game scheduling and fallback tests
- `npm run build` — strict TypeScript check and production build
- `npm run lint` — lint app and tests
- `npm run format:check` — verify formatting

## Requirements

- Document every performance optimization in code with what it does and why it is faster.
- Do not cache solved states merely to improve a repeated-work benchmark. Scheduling must reflect the
  live game state.
- Add explicit tests whenever fallback behavior is not identical to the normal path.
- Use Conventional Commits.

The live exact-cover model is in `src/schedule.ts`; rendering and game rules are in `src/game.ts`;
world geometry is in `src/world.ts`.
