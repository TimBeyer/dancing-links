# Migration Guide: Legacy API → High-Performance Caching API

This guide helps you migrate from the deprecated legacy API to the new high-performance caching API.

## Performance Benefits

The new API provides **60x+ performance improvements** for constraint reuse scenarios:

- **Legacy API**: 515 ops/sec
- **New API (cached)**: 32,628 ops/sec

## Migration Examples

### Simple One-Shot Problems

**Before (deprecated):**
```typescript
import { findOne, findAll, find } from 'dancing-links'

const solution = findOne(constraints)
const allSolutions = findAll(constraints)  
const solutions = find(constraints, 10)
```

**After (recommended):**
```typescript
import { DancingLinks } from 'dancing-links'

const dlx = new DancingLinks()
const solver = dlx.createSolver()

for (const constraint of constraints) {
  solver.addConstraint(constraint)
}

const solution = solver.findOne()
const allSolutions = solver.findAll()
const solutions = solver.find(10)
```

### Advanced Manual Configuration

**Before (deprecated):**
```typescript
import { findRaw, getSearchConfig } from 'dancing-links'

const config = getSearchConfig(1, constraints)
const solutions = findRaw(config)
```

**After (recommended):**
```typescript
import { DancingLinks } from 'dancing-links'

const dlx = new DancingLinks()
const solver = dlx.createSolver()

for (const constraint of constraints) {
  solver.addConstraint(constraint)
}

const solutions = solver.findOne()
```

### Constraint Reuse (High Performance)

**Before (inefficient):**
```typescript
// Each call re-encodes constraints - very slow!
for (let i = 0; i < 100; i++) {
  const solutions = find(constraints, 1)
  // Process solutions...
}
```

**After (60x faster):**
```typescript
import { DancingLinks } from 'dancing-links'

const dlx = new DancingLinks()

// Encode constraints once, reuse many times
for (let i = 0; i < 100; i++) {
  const solver = dlx.createSolver()
  
  for (const constraint of constraints) {
    solver.addConstraint(constraint) // Cached automatically!
  }
  
  const solutions = solver.findOne()
  // Process solutions...
}
```

### Template-Based Problem Families

**Before:**
```typescript
// Sudoku solver - inefficient repeated encoding
function solveSudokuPuzzle(puzzle) {
  const constraints = generateConstraints(puzzle)
  return findOne(constraints)
}

const puzzle1Solutions = solveSudokuPuzzle(puzzle1)
const puzzle2Solutions = solveSudokuPuzzle(puzzle2)
```

**After (optimal):**
```typescript
import { DancingLinks } from 'dancing-links'

// Create reusable template for all sudoku puzzles
const dlx = new DancingLinks()
const sudokuTemplate = dlx.createSolverTemplate()

// Add base sudoku rules once
const baseRules = generateBaseSudokuRules()
for (const rule of baseRules) {
  sudokuTemplate.addConstraint(rule)
}

// Solve specific puzzles efficiently
function solveSudokuPuzzle(puzzle) {
  const solver = sudokuTemplate.createSolver()
  
  // Add puzzle-specific constraints
  const givens = generateGivenConstraints(puzzle)
  for (const given of givens) {
    solver.addConstraint(given)
  }
  
  return solver.findOne()
}

const puzzle1Solutions = solveSudokuPuzzle(puzzle1) // Fast!
const puzzle2Solutions = solveSudokuPuzzle(puzzle2) // Fast!
```

## Migration Checklist

- [ ] Replace `findOne()` calls with `DancingLinks` API
- [ ] Replace `findAll()` calls with `DancingLinks` API  
- [ ] Replace `find()` calls with `DancingLinks` API
- [ ] Replace `findRaw()` calls with `DancingLinks` API
- [ ] Replace `getSearchConfig()` usage with `DancingLinks` API
- [ ] Identify constraint reuse opportunities for performance gains
- [ ] Consider template patterns for problem families
- [ ] Run benchmarks to verify performance improvements

## Gradual Migration

The legacy API remains fully functional. You can migrate incrementally:

1. **Start with high-frequency code paths** for maximum performance impact
2. **Migrate constraint reuse scenarios** for biggest gains  
3. **Keep simple one-shot calls** on legacy API if preferred
4. **Update when convenient** - no breaking changes

## Need Help?

- Check the comprehensive test suite in `test/unit/new-api.spec.ts` for examples
- See performance benchmarks in `benchmark/new-api-performance.ts`
- All legacy functions have `@deprecated` JSDoc with migration guidance

The new API maintains the library's position as the **fastest Dancing Links implementation in JavaScript** while enabling new high-performance use cases that competing libraries cannot match.