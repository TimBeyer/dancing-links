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

The [benchmark directory](https://github.com/TimBeyer/node-dlx/tree/master/benchmark) contains complete implementations for:

- **N-Queens Problem**: Classical constraint satisfaction problem
- **Pentomino Tiling**: 2D shape placement with rotation constraints
- **Sudoku Solver**: Number placement with row/column/box constraints

These examples demonstrate encoding techniques for different problem types and show performance optimization strategies.

## Benchmarks

This section contains performance comparisons against other JavaScript Dancing Links libraries, updated automatically during releases.

All benchmarks run on the same machine with identical test cases. Results show operations per second (higher is better).

### All solutions to the sudoku

| Library                 | Ops/Sec  | Relative Performance | Margin of Error |
| ----------------------- | -------- | -------------------- | --------------- |
| dancing-links (sparse)  | 14439.67 | **1.00x (fastest)**  | ±4.52%          |
| dancing-links (binary)  | 3461.99  | 0.24x                | ±6.52%          |
| dance                   | 1417.14  | 0.10x                | ±5.95%          |
| dancing-links-algorithm | 1287.46  | 0.09x                | ±2.59%          |
| dlxlib                  | 1265.06  | 0.09x                | ±7.45%          |

### Finding one pentomino tiling on a 6x10 field

| Library                | Ops/Sec | Relative Performance | Margin of Error |
| ---------------------- | ------- | -------------------- | --------------- |
| dancing-links (sparse) | 564.27  | **1.00x (fastest)**  | ±5.16%          |
| dancing-links (binary) | 502.65  | 0.89x                | ±4.66%          |
| dlxlib                 | 121.26  | 0.21x                | ±5.18%          |
| dance                  | 67.79   | 0.12x                | ±1.54%          |

### Finding ten pentomino tilings on a 6x10 field

| Library                | Ops/Sec | Relative Performance | Margin of Error |
| ---------------------- | ------- | -------------------- | --------------- |
| dancing-links (sparse) | 87.61   | **1.00x (fastest)**  | ±2.35%          |
| dancing-links (binary) | 87.10   | 0.99x                | ±1.37%          |
| dlxlib                 | 20.78   | 0.24x                | ±3.18%          |
| dance                  | 14.50   | 0.17x                | ±2.33%          |

### Finding one hundred pentomino tilings on a 6x10 field

| Library                | Ops/Sec | Relative Performance | Margin of Error |
| ---------------------- | ------- | -------------------- | --------------- |
| dancing-links (sparse) | 12.27   | **1.00x (fastest)**  | ±2.24%          |
| dancing-links (binary) | 11.87   | 0.97x                | ±3.69%          |
| dlxlib                 | 2.93    | 0.24x                | ±7.06%          |
| dance                  | 2.02    | 0.16x                | ±6.52%          |

**Testing Environment:**

- Node.js v22.15.1
- Test cases: Sudoku solving, pentomino tiling (1, 10, 100 solutions)

_Last updated: 2025-08-06_

## Contributing

For development information, performance benchmarking, profiling, and contribution guidelines, see [DEVELOPMENT.md](DEVELOPMENT.md).
