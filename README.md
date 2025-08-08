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

For problems requiring both primary constraints (must be covered exactly once) and secondary constraints (optional - may be left uncovered, but if covered, allow no collisions):

```ts
const solver = dlx.createSolver({
  primaryColumns: 2, // First 2 columns are primary
  secondaryColumns: 2 // Next 2 columns are secondary
})

// Method 1: Add constraints separately
solver.addSparseConstraint('constraint1', {
  primary: [0], // Must cover primary column 0
  secondary: [1] // May cover secondary column 1 (optional, but no conflicts if used)
})

// Method 2: Add as binary constraint
solver.addBinaryConstraint('constraint2', {
  primaryRow: [0, 1], // Binary values for primary columns
  secondaryRow: [1, 0] // Binary values for secondary columns
})
```

**Key difference between primary and secondary constraints:**

- **Primary**: All primary columns MUST be covered exactly once in any valid solution
- **Secondary**: Secondary columns are optional - they can be left uncovered, but if a secondary column IS covered, only one constraint can cover it (no collisions allowed)

### Solution Methods

```ts
// Find one solution
const oneSolution = solver.findOne()

// Find all solutions
const allSolutions = solver.findAll()

// Find up to N solutions
const limitedSolutions = solver.find(10)
```

### Generator Interface (Streaming Solutions)

For large solution spaces or when you need early termination, use the generator interface:

```ts
// Stream solutions one at a time
const generator = solver.createGenerator()

let solutionCount = 0
for (const solution of generator) {
  console.log('Found solution:', solution)

  solutionCount++
  if (solutionCount >= 5) {
    // Stop after finding 5 solutions
    break
  }
}

// Manual iteration for full control
const generator2 = solver.createGenerator()
let result = generator2.next()
while (!result.done) {
  processSolution(result.value)
  result = generator2.next()
}
```

The generator maintains search state between solutions, enabling memory-efficient streaming and early termination without computing all solutions upfront.

## Examples

The [benchmark directory](https://github.com/TimBeyer/dancing-links/tree/master/benchmark) contains complete implementations for:

- **N-Queens Problem**: Classical constraint satisfaction problem
- **Pentomino Tiling**: 2D shape placement with rotation constraints
- **Sudoku Solver**: Number placement with row/column/box constraints

These examples demonstrate encoding techniques for different problem types and show performance optimization strategies.

## Benchmarks

This section contains performance comparisons against other JavaScript Dancing Links libraries, updated automatically during releases.

All benchmarks run on the same machine with identical test cases. Results show operations per second (higher is better).

### All solutions to the sudoku

| Library                 | Ops/Sec | Relative Performance | Margin of Error |
| ----------------------- | ------- | -------------------- | --------------- |
| dancing-links (sparse)  | 6702.49 | **1.00x (fastest)**  | ±0.46%          |
| dancing-links (binary)  | 2761.40 | 0.41x                | ±0.66%          |
| dance                   | 1231.91 | 0.18x                | ±0.82%          |
| dlxlib                  | 811.49  | 0.12x                | ±3.00%          |
| dancing-links-algorithm | 770.92  | 0.12x                | ±0.85%          |

### Finding one pentomino tiling on a 6x10 field

| Library                | Ops/Sec | Relative Performance | Margin of Error |
| ---------------------- | ------- | -------------------- | --------------- |
| dancing-links (sparse) | 182.70  | **1.00x (fastest)**  | ±0.53%          |
| dancing-links (binary) | 177.41  | 0.97x                | ±0.14%          |
| dlxlib                 | 151.48  | 0.83x                | ±0.32%          |
| dance                  | 48.93   | 0.27x                | ±0.50%          |

### Finding ten pentomino tilings on a 6x10 field

| Library                | Ops/Sec | Relative Performance | Margin of Error |
| ---------------------- | ------- | -------------------- | --------------- |
| dancing-links (sparse) | 27.71   | **1.00x (fastest)**  | ±0.19%          |
| dancing-links (binary) | 27.42   | 0.99x                | ±0.75%          |
| dlxlib                 | 26.83   | 0.97x                | ±0.52%          |
| dance                  | 10.48   | 0.38x                | ±0.54%          |

### Finding one hundred pentomino tilings on a 6x10 field

| Library                | Ops/Sec | Relative Performance | Margin of Error |
| ---------------------- | ------- | -------------------- | --------------- |
| dancing-links (sparse) | 3.89    | **1.00x (fastest)**  | ±0.40%          |
| dancing-links (binary) | 3.89    | 1.00x                | ±0.47%          |
| dlxlib                 | 3.78    | 0.97x                | ±0.44%          |
| dance                  | 1.48    | 0.38x                | ±0.56%          |

**Testing Environment:**

- Node.js v24.5.0
- Test cases: Sudoku solving, pentomino tiling (1, 10, 100 solutions)

_Last updated: 2025-08-08_

## Contributing

For development information, performance benchmarking, profiling, and contribution guidelines, see [DEVELOPMENT.md](DEVELOPMENT.md).
