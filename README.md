# dancing-links

## About

This is an implementation of Knuth's DLX to solve the exact cover problem.
It is a port of [Knuth's literate dancing links implementation](https://cs.stanford.edu/~knuth/programs/dance.w) and supports primary and secondary constraints, and returning custom data in addition to row indices.

There are no external dependencies and there is full TypeScript support.

It is currently [the fastest](#benchmarks) Dancing Links implementation in JavaScript.

## Usage

### Basic Example

```ts
import { DancingLinks } from 'dancing-links'

const dlx = new DancingLinks<string>()
const solver = dlx.createSolver({ columns: 3 })

solver.addSparseConstraint('row1', [0, 2]) // Constraint active in columns 0 and 2
solver.addSparseConstraint('row2', [1]) // Constraint active in column 1
solver.addSparseConstraint('row3', [0, 1]) // Constraint active in columns 0 and 1

const solutions = solver.findAll()
// Returns: [[{ data: 'row1', index: 0 }, { data: 'row2', index: 1 }]]
```

### Constraint Formats

#### Sparse Constraints (Recommended)

**Sparse constraints are the most efficient format** - specify only the active column indices instead of full binary arrays. This reduces parsing overhead and memory usage, especially for problems with many columns.

```ts
const solver = dlx.createSolver({ columns: 100 })

// ⚡ EFFICIENT: Only specify active columns
solver.addSparseConstraint('constraint1', [0, 15, 42, 87])
solver.addSparseConstraint('constraint2', [1, 16, 43, 99])

// Batch operations for better performance
const constraints = [
  { data: 'batch1', columnIndices: [0, 10, 20] },
  { data: 'batch2', columnIndices: [5, 15, 25] },
  { data: 'batch3', columnIndices: [2, 12, 22] }
]
solver.addSparseConstraints(constraints)
```

#### Binary Constraints

Use binary constraints when it's more convenient for your encoding logic or when you already have constraint data in binary format:

```ts
const solver = dlx.createSolver({ columns: 4 })

// Convenient when encoding naturally produces binary arrays
solver.addBinaryConstraint('row1', [1, 0, 1, 0])
solver.addBinaryConstraint('row2', [0, 1, 0, 1])
solver.addBinaryConstraint('row3', [1, 1, 0, 0])

// Batch operations
const binaryConstraints = [
  { data: 'batch1', columnValues: [1, 0, 1, 0] },
  { data: 'batch2', columnValues: [0, 1, 0, 1] }
]
solver.addBinaryConstraints(binaryConstraints)
```

### Constraint Templates

For problems with reusable constraint patterns, templates provide significant performance benefits by pre-processing base constraints. **Templates are especially beneficial when using binary constraints**, as the binary-to-sparse conversion happens once during template creation rather than every time you create a solver:

```ts
// Create template with base constraints
const template = dlx.createSolverTemplate({ columns: 20 })
template.addSparseConstraint('base1', [0, 5, 10])
template.addSparseConstraint('base2', [1, 6, 11])

// Create multiple solvers from the same template
const solver1 = template.createSolver()
solver1.addSparseConstraint('extra1', [2, 7, 12])
const solutions1 = solver1.findAll()

const solver2 = template.createSolver()
solver2.addSparseConstraint('extra2', [3, 8, 13])
const solutions2 = solver2.findAll()
```

### Complex Constraints (Primary + Secondary)

For problems requiring both primary constraints (must be covered exactly once) and secondary constraints (can be covered multiple times):

```ts
const solver = dlx.createSolver({
  primaryColumns: 2, // First 2 columns are primary
  secondaryColumns: 2 // Next 2 columns are secondary
})

// Method 1: Add constraints separately
solver.addSparseConstraint('constraint1', {
  primaryColumns: [0], // Must cover primary column 0
  secondaryColumns: [1] // May cover secondary column 1
})

// Method 2: Add as binary constraint
solver.addBinaryConstraint('constraint2', {
  primaryRow: [0, 1], // Binary values for primary columns
  secondaryRow: [1, 0] // Binary values for secondary columns
})
```

### Solution Methods

```ts
// Find one solution
const oneSolution = solver.findOne()

// Find all solutions
const allSolutions = solver.findAll()

// Find up to N solutions
const limitedSolutions = solver.find(10)
```

## Examples

The [benchmark directory](https://github.com/TimBeyer/node-dlx/tree/master/benchmark) contains complete implementations for:

- **N-Queens Problem**: Classical constraint satisfaction problem
- **Pentomino Tiling**: 2D shape placement with rotation constraints
- **Sudoku Solver**: Number placement with row/column/box constraints

These examples demonstrate encoding techniques for different problem types and show performance optimization strategies.

## Performance & Benchmarks

The benchmarks compare performance across different constraint formats and against other Dancing Links libraries using sudoku and pentomino problems.

### Running Benchmarks

```bash
# Fast library-only benchmarks
npm run benchmark

# Include external library comparisons
npm run benchmark:comparison

# Generate JSON output
npm run benchmark:json

# Custom options
node built/benchmark/index.js --external --json=results.json
```

### Key Performance Insights

- **Sparse constraints** reduce parsing overhead compared to binary constraints
- **Template reuse** eliminates constraint preprocessing overhead, especially beneficial for binary constraints which require conversion to sparse format
- **Batch operations** reduce function call overhead when adding many constraints

Benchmarks consistently show this library outperforms other JavaScript Dancing Links implementations, with sparse constraints and templates providing additional optimizations.

## Profiling

Generate CPU profiles for performance analysis:

```bash
npm run profile
```

This creates `profile.cpuprofile` which can be loaded into Chrome DevTools for detailed performance analysis.

## Development

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

## Implementation Notes

The algorithm uses a state machine pattern to avoid recursion and closely follows [Knuth's reference implementation](https://cs.stanford.edu/~knuth/programs/dance.w). The core algorithm is implemented in `lib/index.ts` using efficient data structures optimized for the Dancing Links technique.
