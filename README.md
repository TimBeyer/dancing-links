# dancing-links [![codecov](https://codecov.io/gh/TimBeyer/node-dlx/branch/master/graph/badge.svg)](https://codecov.io/gh/TimBeyer/node-dlx)

## About

This is an implementation of Knuth's DLX to solve the exact cover problem.
It is a port of [Knuth's literate dancing links implementation](https://cs.stanford.edu/~knuth/programs/dance.w) and supports primary and secondary constraints, and returning custom data in addition to row indices.

There are no external dependencies and there is full typescript support.

It is currently [the fastest](#benchmarks) Dancing Links implementation in JS.

## Usage

### High-Performance API (Recommended)

The new high-performance API provides optimized interfaces for different constraint types and use cases:

```javascript
import { DancingLinks } from 'dancing-links'

// Create a Dancing Links container
const dlx = new DancingLinks()

// ⚡ SPARSE CONSTRAINTS (RECOMMENDED - most efficient for sparse matrices)
// Only specify active column indices instead of full binary arrays
const sparseSolver = dlx.createSolver({ columns: 100 })
sparseSolver.addSparseConstraint('sparse1', [0, 15, 42, 87])  // Only active columns
sparseSolver.addSparseConstraint('sparse2', [1, 16, 43, 99])

// Binary constraints (use when constraints are dense)
const solver = dlx.createSolver({ columns: 4 })
solver.addBinaryConstraint('row1', [1, 0, 1, 0])
solver.addBinaryConstraint('row2', [0, 1, 0, 1]) 
solver.addBinaryConstraint('row3', [1, 1, 0, 0])

const solution = solver.findOne()
// Returns: [{ data: 'row1', index: 0 }, { data: 'row2', index: 1 }]

// Constraint templates (for reusable constraint sets) - use sparse for best performance
const template = dlx.createSolverTemplate({ columns: 20 })
template.addSparseConstraint('base1', [0, 5, 10])      // Base constraints
template.addSparseConstraint('base2', [1, 6, 11])

// Create multiple solvers from the same template
const solver1 = template.createSolver()
solver1.addSparseConstraint('extra1', [2, 7, 12])     // Additional constraints

const solver2 = template.createSolver() 
solver2.addSparseConstraint('extra2', [3, 8, 13])

// Complex constraints (primary + secondary)
const complexSolver = dlx.createSolver({ 
  columns: 4, 
  primaryColumns: 2  // First 2 columns are primary
})
complexSolver.addComplexConstraint('complex1', {
  primaryRow: [1, 0],
  secondaryRow: [1, 1]
})
```

### Legacy API (ES Modules)

```javascript
import { findOne, findAll } from 'dancing-links'

// Simple case
const constraints = [
  {
    data: 'first one',
    row: [1, 0]
  },
  {
    data: 'second one',
    row: [0, 1]
  },
  {
    data: 'third one',
    row: [0, 1]
  }
]

const oneSolution = findOne(constraints)
const allSolutions = findAll(constraints)
```

### CommonJS (Legacy)

```javascript
const dlx = require('dancing-links')

// Simple case
const constraints = [
  {
    data: 'first one',
    row: [1, 0]
  },
  {
    data: 'second one',
    row: [0, 1]
  },
  {
    data: 'third one',
    row: [0, 1]
  }
]

const oneSolution = dlx.findOne(constraints)
/**
 * [{
 *      data: 'first one',
 *      index: 0
 *  },
 *  {
 *      data: 'second one',
 *      index: 1
 *  }]
 */

const allSolutions = dlx.findAll(constraints)
/**
 * [[{
 *      data: 'first one',
 *      index: 0
 *  },
 *  {
 *      data: 'second one',
 *      index: 1
 *  }],
 *  [{
 *      data: 'first one',
 *      index: 0
 *  },
 *  {
 *      data: 'third one',
 *      index: 2
 *  }]]
 */

// Secondary constraints

const constraints = [
  {
    data: 'first one',
    primaryRow: [1, 0],
    secondaryRow: [1]
  },
  {
    data: 'second one',
    primaryRow: [0, 1],
    secondaryRow: [0]
  },
  {
    data: 'third one',
    primaryRow: [0, 1],
    secondaryRow: [1]
  }
]

const oneSolution = dlx.findOne(constraints)
/**
 * [{
 *      data: 'first one',
 *      index: 0
 *  },
 *  {
 *      data: 'second one',
 *      index: 1,
 *  }]
 */

const allSolutions = dlx.findAll(constraints)
/**
 *
 * Not the best example, but for brevity's sake believe me that it works as intended.
 *
 * [{
 *      data: 'first one',
 *      index: 0
 *  },
 *  {
 *      data: 'second one',
 *      index: 1,
 *  }]
 */
```

## Implementation

Previously, this library was directly based on the [original DLX paper](https://arxiv.org/pdf/cs/0011047.pdf) and implemented using recursion.  
However, in order to improve performance and align with [Knuth's reference implementation](https://cs.stanford.edu/~knuth/programs/dance.w), the algorithm needed to be converted to an iteration.

Since JS does not support the `goto` statement, and since it's considered harmful anyway, the implementation uses a very simple state machine to execute the algorithm.

## Benchmarks

The benchmarks compare performance across different APIs and against [dlxlib](https://github.com/taylorjg/dlxlibjs) and [dance](https://github.com/wbyoung/dance) using sudoku and [pentomino](https://en.wikipedia.org/wiki/Pentomino) tiling problems.

### Available Benchmark Commands

```bash
# Fast library-only benchmarks (for CI)
npm run benchmark

# Include external library comparisons
npm run benchmark:comparison  

# Generate JSON output for automated analysis
npm run benchmark:json
```

### Command Line Options

```bash
# Custom benchmark execution
node built/benchmark/index.js [options]

Options:
  --external, --full    Include external library comparisons
  --json[=file]         Output results as JSON (to file if specified)
  --quiet               Suppress console output during benchmarks
  --help                Show help message
```

This library consistently achieves **10-15x faster performance** than other Dancing Links implementations in JavaScript, with the new high-performance API providing additional optimizations for sparse constraints and constraint templating.

## Profiling

You can generate a CPU profile of the algorithm using `npm run profile`.
It will create a file called `profile.cpuprofile` which you can then load into the Chrome inspector.
To do this, you will need to install the optional dependency `v8-profiler` manually using `npm install --no-save v8-profiler`.  
This is because there isn't currently a way to specify optional dev dependencies, and as a dev dependency compiling of the dependency fails in CI.

## Examples

The [benchmark directory](https://github.com/TimBeyer/node-dlx/tree/master/benchmark) implements encoders for the n-queens and pentomino tiling problems.  
They aren't very optimized (the pentomino tiling does not consider symmetries) but you can use them as examples for how to encode your constraints for the library.

## Development

This project uses modern tooling and requires **Node.js 20+**.

### Prerequisites

- Node.js 20 or higher
- npm 8 or higher

### Setup

```bash
npm install
```

### Scripts

- `npm run build` - Build the TypeScript code to JavaScript
- `npm test` - Run the test suite
- `npm run lint` - Run ESLint code quality checks
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run benchmark` - Run fast library-only benchmarks (CI mode)
- `npm run benchmark:comparison` - Run comprehensive benchmarks including external libraries
- `npm run benchmark:json` - Generate JSON benchmark output for analysis
- `npm run coverage` - Generate test coverage report
- `npm run profile` - Generate CPU performance profile

### Conventional Commits

This project follows [Conventional Commits](https://www.conventionalcommits.org/) specification for automated releases and changelog generation. Please use the following commit message format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat:` - A new feature (triggers minor version bump)
- `fix:` - A bug fix (triggers patch version bump)
- `docs:` - Documentation only changes
- `style:` - Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor:` - A code change that neither fixes a bug nor adds a feature
- `perf:` - A code change that improves performance
- `test:` - Adding missing tests or correcting existing tests
- `chore:` - Changes to the build process or auxiliary tools

**Breaking Changes:**
To trigger a major version release, include `BREAKING CHANGE:` in the commit footer or add `!` after the type:

```
feat!: remove support for Node.js 16

BREAKING CHANGE: Node.js 18+ is now required
```

### Modern Features

- **ESM Support**: Full ES Module support with proper import/export syntax
- **TypeScript 5.x**: Modern TypeScript with strict type checking
- **ESLint**: Code quality and consistency checks
- **Prettier**: Automatic code formatting
- **Node 20+ Support**: Leverages modern Node.js features

### Architecture

The core algorithm implementation is in:

- `lib/index.ts` - Main Dancing Links algorithm implementation
- `lib/interfaces.ts` - TypeScript interfaces and types
- `lib/utils.ts` - Utility functions for constraint conversion
