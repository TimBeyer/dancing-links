# Cover Story

**Cover Story** is a playable stealth-game prototype whose patrol system is a live exact-cover
problem. You are stealing a dossier from a museum while every plausible joint guard schedule is
recomputed, sampled, and drawn around you in real time.

This branch intentionally consumes [`dancing-links`](https://www.npmjs.com/package/dancing-links)
`4.3.9` from npm. It does not import or benchmark a local copy of the solver.

## Play

```sh
npm install
npm run dev
```

Open the local URL printed by Vite and select **Begin infiltration**.

| Input                      | Action                                                   |
| -------------------------- | -------------------------------------------------------- |
| WASD / arrow keys          | Move and hide behind exhibits                            |
| Click a nearby patrol node | Throw an echo; exactly one guard must service it         |
| E beside a magenta gate    | Jam that route for four planning beats                   |
| Space                      | Take the dossier at the vault or extract at the entrance |
| Escape                     | Pause / resume                                           |
| R                          | Restart                                                  |

The dossier increases the patrol tempo. Exposure rises only while a guard has an unobstructed view;
breaking line of sight lets it fall. Three blown identities end the run.

## Why this is actually DLX gameplay

Every planning beat generates a four-step route row for each guard. The exact-cover matrix uses:

- one primary column per guard, so exactly one route is selected for every guard;
- one primary column per active duty or echo, so exactly one selected route services each one;
- secondary node/time columns, so two guards cannot occupy the same place on the same beat; and
- secondary undirected edge/time columns, so guards cannot pass through one another head-on.

The game samples up to 128 complete covers and turns their next moves into the colored ghost field.
Thick, bright paths occur in more valid covers. The actual patrol then follows one of those complete
joint schedules. An echo adds a primary column; a jam removes all rows that cross an edge. Both
actions therefore reshape the solution space rather than applying a cosmetic AI modifier.

`128+` is deliberately shown when the search reaches its sampling limit. It means “at least 128,”
not that exactly 128 schedules exist.

## Real-world performance, not benchmark shortcuts

Every beat rebuilds the problem from the current guard positions, outstanding deadlines, and jammed
edges. The prototype does not cache an answer to a repeated puzzle. That makes its workload the one
the interaction creates: varied, stateful, and latency-sensitive.

The hot path is documented inline in [`src/schedule.ts`](src/schedule.ts):

- route constraints stay sparse instead of allocating mostly-zero binary matrices;
- all prevalidated route rows enter the solver in one batch;
- numeric node, edge, and time indices avoid parsing or per-slot lookup objects; and
- a bounded horizon, route count, and solution sample keep planning latency predictable.

Static node and edge maps in [`src/world.ts`](src/world.ts) are also built once rather than rescanned
for every render frame. These choices reduce work without changing the puzzle or reusing a previous
solution.

## Contradiction behavior

Player input should not crash or freeze the real-time loop. If a newly thrown echo cannot belong to
any cover, the scheduler retries without the newest player duty, reports the fizzle, and refunds its
charge. If a fixed routine duty is contradictory after route changes, it is separately removed while
guard selection and collision constraints remain active.

Those fallbacks are intentionally not behavior-identical, so they have dedicated tests. See
[`test/game/schedule.spec.ts`](test/game/schedule.spec.ts) for collisions, head-on edges, jams,
unreachable duties, both recovery paths, and honest capped-search reporting.

## Development

```sh
npm test           # scheduler and fallback behavior
npm run lint       # TypeScript linting
npm run build      # strict typecheck plus production Vite bundle
npm run format:check
```

The prototype is deliberately small and framework-free:

- `src/schedule.ts` builds and solves the live exact-cover matrix;
- `src/game.ts` owns the heist loop, patrol deadlines, detection, equipment, and rendering;
- `src/world.ts` defines the museum graph, exhibits, doors, and collision geometry; and
- `src/audio.ts` creates the procedural feedback sounds.

## Prototype scope

This is one compact mission tuned for desktop keyboard and pointer controls. There is no persistence
beyond the local best score, no level editor, and no production asset pipeline. The point of the
prototype is to test whether reading and manipulating a solution distribution can feel like a game.

## License

MIT
