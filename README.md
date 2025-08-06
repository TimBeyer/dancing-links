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
| dancing-links template | 15204.930865658001 | **1.00x (fastest)** | ±1.56% |
| dancing-links (sparse) | 14781.843124617693 | 0.97x | ±1.85% |
| dancing-links generator | 14448.853007344822 | 0.95x | ±2.82% |
| dancing-links (binary) | 4273.314487803459 | 0.28x | ±4.02% |
| dance | 2369.2423754977112 | 0.16x | ±3.45% |
| dlxlib | 1457.2305999757893 | 0.10x | ±6.10% |
| dancing-links-algorithm | 1444.5896157794307 | 0.10x | ±1.42% |

### Finding one pentomino tiling on a 6x10 field

| Library | Ops/Sec | Relative Performance | Margin of Error |
|---------|---------|---------------------|-----------------|
| dancing-links (sparse) | 560.2507860359423 | **1.00x (fastest)** | ±1.76% |
| dancing-links template | 555.4984979399261 | 0.99x | ±1.71% |
| dancing-links generator | 550.1726912091755 | 0.98x | ±2.56% |
| dancing-links (binary) | 513.664241436702 | 0.92x | ±1.23% |
| dlxlib | 140.01701630688538 | 0.25x | ±2.28% |
| dance | 66.75788861936002 | 0.12x | ±2.53% |

### Finding ten pentomino tilings on a 6x10 field

| Library | Ops/Sec | Relative Performance | Margin of Error |
|---------|---------|---------------------|-----------------|
| dancing-links (sparse) | 85.66957851114057 | **1.00x (fastest)** | ±1.25% |
| dancing-links generator | 85.18197949410258 | 0.99x | ±1.92% |
| dancing-links (binary) | 84.59776825577052 | 0.99x | ±1.35% |
| dancing-links template | 81.69775001898832 | 0.95x | ±4.48% |
| dlxlib | 21.805843609641624 | 0.25x | ±2.77% |
| dance | 13.167346621169491 | 0.15x | ±4.29% |

### Finding one hundred pentomino tilings on a 6x10 field

| Library | Ops/Sec | Relative Performance | Margin of Error |
|---------|---------|---------------------|-----------------|
| dancing-links (binary) | 12.134411622703773 | **1.00x (fastest)** | ±1.35% |
| dancing-links (sparse) | 12.097221556606213 | 1.00x | ±3.78% |
| dancing-links generator | 12.06765869799719 | 0.99x | ±2.42% |
| dancing-links template | 11.667084035437146 | 0.96x | ±8.51% |
| dlxlib | 3.0383734542914063 | 0.25x | ±2.50% |
| dance | 2.066553457424013 | 0.17x | ±2.06% |

**Testing Environment:**
- Node.js v22.15.1
- Test cases: Sudoku solving, pentomino tiling (1, 10, 100 solutions)

*Last updated: 2025-08-06*

</details>

## Contributing

For development information, performance benchmarking, profiling, and contribution guidelines, see [DEVELOPMENT.md](DEVELOPMENT.md).
