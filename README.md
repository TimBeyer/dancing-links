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

<details>
<summary><strong>📊 Performance Comparison (Click to expand)</strong></summary>

All benchmarks run on the same machine with identical test cases. Results show operations per second (higher is better).

### A solution to the sudoku

| Library | Ops/Sec | Relative Performance | Margin of Error |
|---------|---------|---------------------|-----------------|
| dancing-links template | 14735.81 | **1.00x (fastest)** | ±3.41% |
| dancing-links (sparse) | 14689.71 | 1.00x | ±3.80% |
| dancing-links generator | 14243.16 | 0.97x | ±3.88% |
| dancing-links (binary) | 4700.84 | 0.32x | ±1.66% |
| dance | 2245.77 | 0.15x | ±4.74% |
| dlxlib | 1577.34 | 0.11x | ±2.64% |
| dancing-links-algorithm | 1392.54 | 0.09x | ±4.20% |

### Finding one pentomino tiling on a 6x10 field

| Library | Ops/Sec | Relative Performance | Margin of Error |
|---------|---------|---------------------|-----------------|
| dancing-links (sparse) | 555.72 | **1.00x (fastest)** | ±2.07% |
| dancing-links generator | 547.21 | 0.98x | ±2.23% |
| dancing-links template | 536.39 | 0.97x | ±3.75% |
| dancing-links (binary) | 511.21 | 0.92x | ±1.14% |
| dlxlib | 142.20 | 0.26x | ±1.44% |
| dance | 64.11 | 0.12x | ±4.52% |

### Finding ten pentomino tilings on a 6x10 field

| Library | Ops/Sec | Relative Performance | Margin of Error |
|---------|---------|---------------------|-----------------|
| dancing-links (sparse) | 83.31 | **1.00x (fastest)** | ±1.97% |
| dancing-links template | 83.15 | 1.00x | ±2.47% |
| dancing-links (binary) | 83.01 | 1.00x | ±1.50% |
| dancing-links generator | 75.28 | 0.90x | ±5.30% |
| dlxlib | 22.30 | 0.27x | ±1.57% |
| dance | 14.09 | 0.17x | ±1.23% |

### Finding one hundred pentomino tilings on a 6x10 field

| Library | Ops/Sec | Relative Performance | Margin of Error |
|---------|---------|---------------------|-----------------|
| dancing-links (binary) | 12.26 | **1.00x (fastest)** | ±0.98% |
| dancing-links template | 12.15 | 0.99x | ±1.99% |
| dancing-links generator | 12.07 | 0.98x | ±2.51% |
| dancing-links (sparse) | 11.65 | 0.95x | ±4.90% |
| dlxlib | 3.06 | 0.25x | ±1.72% |
| dance | 2.12 | 0.17x | ±2.71% |

**Testing Environment:**
- Node.js v22.15.1
- Test cases: Sudoku solving, pentomino tiling (1, 10, 100 solutions)

*Last updated: 2025-08-06*

</details>

## Contributing

For development information, performance benchmarking, profiling, and contribution guidelines, see [DEVELOPMENT.md](DEVELOPMENT.md).
