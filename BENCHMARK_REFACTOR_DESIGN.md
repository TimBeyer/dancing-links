# Benchmark System Refactoring Implementation Document

## Overview

This document outlines the complete refactoring of the node-dlx benchmark system to create a modular, type-safe, and flexible benchmarking architecture. The system separates concerns between problem definitions, solver implementations, test cases, and execution groups.

## Requirements

### Primary Requirements
1. **Centralized Configuration**: Extract problem definitions, cases, and execution groups into clear configuration sections
2. **Dynamic Grouping**: Support different benchmark scenarios:
   - **Release**: Only sparse constraints vs all external libraries (competitive performance for README)
   - **PR**: All internal interfaces, no externals (fast regression testing)
   - **Full**: Everything vs everything (comprehensive testing)
3. **Easy Extensibility**: Simple to add new problems, solvers, cases, or groups
4. **Type Safety**: Proper TypeScript types throughout, no `any` usage
5. **Performance**: No overhead in benchmark timing loops

### Secondary Requirements
6. **Primary/Secondary Constraints**: Support for n-queens complex constraints
7. **Stateful Solvers**: Handle template-based and other stateful solver patterns
8. **External Library Compatibility**: Maintain existing external library interfaces
9. **CI Integration**: Preserve existing JSON output and CI workflow compatibility

## Architecture Overview

The system is built around 5 key abstractions:

1. **Problems** → Generate standardized constraints from problem-specific parameters
2. **Solvers** → Convert constraints and execute solving with different algorithms/libraries
3. **Cases** → Define specific test scenarios with execution strategies
4. **Groups** → Select which cases and solvers to run for different scenarios
5. **Runner** → Orchestrate execution and integrate with Benchmark.js

## Core Interfaces

### Standard Constraint Format

All problems output a standardized constraint format that clearly separates primary and secondary constraints:

```typescript
interface StandardConstraints {
  primaryConstraints: number[][]; // Must be covered exactly once
  secondaryConstraints?: number[][]; // Can be covered at most once (optional)
  columnNames?: string[]; // Optional for debugging/display
}
```

**Design Rationale**: High-level interface makes constraint semantics clear. Encoding overhead paid only once during preparation, not during timed benchmark loops.

### Solver Base Class

```typescript
export abstract class Solver<TSetup = void, TPrepared = unknown> {
  protected setupResult?: TSetup;
  
  setup?(constraints: StandardConstraints): void {
    // Optional: Setup once per case (e.g., template creation)
  }
  
  abstract prepare(constraints: StandardConstraints): TPrepared;
  abstract solveAll(prepared: TPrepared): unknown;
  abstract solveOne(prepared: TPrepared): unknown;  
  abstract solveCount(prepared: TPrepared, count: number): unknown;
}
```

**Design Rationale**: Class-based approach handles stateful solvers (templates). Generic types ensure type safety. All data formatting happens in `setup()` or `prepare()`, keeping solve methods pure.

### Benchmark Case Definition

```typescript
interface BenchmarkCase<TPrepared = unknown> {
  id: string;
  name: string;
  problemType: 'sudoku' | 'pentomino' | 'n-queens';
  parameters: unknown;
  executeStrategy<TSolver extends Solver<any, TPrepared>>(
    solver: TSolver, 
    prepared: TPrepared
  ): unknown;
  tags: string[];
}
```

**Design Rationale**: Each case defines its own execution strategy (findAll, findOne, find(N)). No branching in benchmark execution - just call `executeStrategy()`.

### Benchmark Group Definition

```typescript
interface BenchmarkGroup {
  name: string;
  description: string;
  caseIds: string[];
  solverNames: string[];
}
```

**Design Rationale**: Simple configuration objects enable flexible selection of which cases and solvers to run for different scenarios.

## Implementation Details

### Problem Definitions

Problems are simple functions that convert problem-specific parameters into standardized constraints:

```typescript
// benchmark/problems/sudoku.ts
export interface SudokuParams {
  puzzle: string;
}

export function generateSudokuConstraints(params: SudokuParams): StandardConstraints {
  return {
    primaryConstraints: [
      ...generatePositionConstraints(params.puzzle), // Each cell must have exactly one number
      ...generateRowConstraints(), // Each row must have exactly one of each number
      ...generateColumnConstraints(), // Each column must have exactly one of each number  
      ...generateBoxConstraints() // Each 3x3 box must have exactly one of each number
    ]
    // No secondary constraints for sudoku
  };
}

// benchmark/problems/n-queens.ts
export interface NQueensParams {
  n: number;
}

export function generateNQueensConstraints(params: NQueensParams): StandardConstraints {
  return {
    primaryConstraints: generatePositionConstraints(params.n), // Each queen must be placed
    secondaryConstraints: [
      ...generateRowConstraints(params.n), // At most one queen per row
      ...generateColumnConstraints(params.n), // At most one queen per column
      ...generateDiagonalConstraints(params.n) // At most one queen per diagonal
    ]
  };
}
```

### Solver Implementations

#### Internal Sparse Solver
```typescript
export class InternalSparseSolver extends Solver<void, SparseConstraintsBatch> {
  prepare(constraints: StandardConstraints): SparseConstraintsBatch {
    const sparseRows = flattenConstraints(constraints).rows;
    return formatForSolver(sparseRows); // Format ONCE during preparation
  }
  
  solveAll(prepared: SparseConstraintsBatch): Solution[] {
    const solver = dlx.createSolver({ columns: prepared.numColumns });
    solver.addSparseConstraints(prepared); // Already formatted
    return solver.findAll();
  }
  
  // ... solveOne, solveCount implementations
}
```

#### Internal Template Solver
```typescript
export class InternalTemplateSolver extends Solver<SolverTemplate, LibrarySolver> {
  setup(constraints: StandardConstraints): void {
    const dlx = new DancingLinks();
    const template = dlx.createSolverTemplate({ columns: constraints.numColumns });
    const sparseRows = flattenConstraints(constraints).rows;
    const formatted = formatForSolver(sparseRows); // Format during setup
    template.addSparseConstraints(formatted);
    this.setupResult = template;
  }
  
  prepare(constraints: StandardConstraints): LibrarySolver {
    if (!this.setupResult) throw new Error('Template not set up');
    return this.setupResult.createSolver(); // Template already has formatted constraints
  }
  
  solveAll(solver: LibrarySolver): Solution[] {
    return solver.findAll(); // Just solve, no formatting
  }
  
  // ... solveOne, solveCount implementations
}
```

#### External Library Solver
```typescript
export class ExternalDlxlibSolver extends Solver<void, number[][]> {
  prepare(constraints: StandardConstraints): number[][] {
    if (constraints.secondaryConstraints) {
      throw new Error('dlxlib does not support secondary constraints');
    }
    return convertToBinary(constraints);
  }
  
  solveAll(plainRows: number[][]): Solution[] {
    return dlxlib.solve(plainRows);
  }
  
  solveOne(plainRows: number[][]): Solution[] {
    return dlxlib.solve(plainRows, null, null, 1);
  }
  
  solveCount(plainRows: number[][], count: number): Solution[] {
    return dlxlib.solve(plainRows, null, null, count);
  }
}
```

### Case Definitions

```typescript
// benchmark/config/cases.ts
export const cases: BenchmarkCase[] = [
  {
    id: 'sudoku-hard',
    name: 'A solution to the sudoku',
    problemType: 'sudoku',
    parameters: { puzzle: '..............3.85..1.2.......' },
    executeStrategy: (solver, prepared) => solver.solveAll(prepared),
    tags: ['sudoku']
  },
  {
    id: 'pentomino-1',
    name: 'Finding one pentomino tiling on a 6x10 field', 
    problemType: 'pentomino',
    parameters: {},
    executeStrategy: (solver, prepared) => solver.solveOne(prepared),
    tags: ['pentomino', 'quick']
  },
  {
    id: 'pentomino-100',
    name: 'Finding one hundred pentomino tilings on a 6x10 field',
    problemType: 'pentomino',
    parameters: {},
    executeStrategy: (solver, prepared) => solver.solveCount(prepared, 100),
    tags: ['pentomino', 'intensive'] 
  }
];
```

### Group Definitions

```typescript
// benchmark/config/groups.ts
export const groups: BenchmarkGroup[] = [
  {
    name: 'release',
    description: 'Release benchmarks: sparse vs all external libraries',
    caseIds: ['sudoku-hard', 'pentomino-1', 'pentomino-10', 'pentomino-100'],
    solverNames: [
      'internal-sparse',  // Only our fastest interface
      'external-dlxlib',
      'external-dance', 
      'external-dancing-links-algorithm'
    ]
  },
  {
    name: 'pr',
    description: 'PR benchmarks: all internal interfaces for regression testing',
    caseIds: ['sudoku-hard', 'pentomino-1', 'pentomino-10', 'pentomino-100'],
    solverNames: [
      'internal-binary',
      'internal-sparse', 
      'internal-template',
      'internal-generator'
    ]
  },
  {
    name: 'full',
    description: 'Full benchmarks: everything vs everything',
    caseIds: ['sudoku-hard', 'pentomino-1', 'pentomino-10', 'pentomino-100'],
    solverNames: [
      'internal-binary',
      'internal-sparse',
      'internal-template', 
      'internal-generator',
      'external-dlxlib',
      'external-dance',
      'external-dancing-links-algorithm'
    ]
  }
];
```

### Constraint Conversion Utilities

```typescript
// benchmark/utils/converters.ts
export function flattenConstraints(constraints: StandardConstraints): { 
  numColumns: number; 
  rows: number[][]; 
  primaryColumns: number; 
} {
  const primaryRows = constraints.primaryConstraints;
  const secondaryRows = constraints.secondaryConstraints || [];
  
  // Assign column numbers: primary constraints get 0..n-1, secondary get n..m-1
  const primaryColumns = Math.max(0, ...primaryRows.flat()) + 1;
  const secondaryColumnOffset = primaryColumns;
  
  const allRows = [
    ...primaryRows, 
    ...secondaryRows.map(row => row.map(col => col + secondaryColumnOffset))
  ];
  
  return {
    numColumns: primaryColumns + (secondaryRows.length > 0 ? Math.max(0, ...secondaryRows.flat()) + 1 : 0),
    rows: allRows,
    primaryColumns
  };
}

export function convertToBinary(constraints: StandardConstraints): number[][] {
  const flattened = flattenConstraints(constraints);
  return convertSparseToBinary(flattened.rows, flattened.numColumns);
}

function convertSparseToBinary(sparseRows: number[][], numColumns: number): number[][] {
  const matrix = new Array(sparseRows.length);
  for (let i = 0; i < sparseRows.length; i++) {
    matrix[i] = new Array(numColumns).fill(0);
    for (const col of sparseRows[i]) {
      matrix[i][col] = 1;
    }
  }
  return matrix;
}
```

### Execution Runner

```typescript
// benchmark/runner.ts
export function runBenchmarkGroup(groupName: string, options: BenchmarkOptions): Promise<BenchmarkSection[]> {
  const group = groups.find(g => g.name === groupName);
  if (!group) {
    throw new Error(`Benchmark group '${groupName}' not found`);
  }
  
  if (!options.quiet) {
    console.log(`Running ${group.name} benchmarks: ${group.description}`);
  }
  
  return runBenchmarks(group.caseIds, group.solverNames, options);
}

async function runBenchmarks(
  caseIds: string[], 
  solverNames: string[], 
  options: BenchmarkOptions
): Promise<BenchmarkSection[]> {
  const results: BenchmarkSection[] = [];
  
  for (const caseId of caseIds) {
    const benchmarkCase = cases.find(c => c.id === caseId);
    if (!benchmarkCase) continue;
    
    const constraints = problems[benchmarkCase.problemType](benchmarkCase.parameters);
    const suite = new Benchmark.Suite();
    const sectionResults: BenchmarkResult[] = [];
    
    for (const solverName of solverNames) {
      const solver = solvers[solverName];
      if (!solver) continue;
      
      try {
        // Setup once per case (outside timing)
        solver.setup?.(constraints);
        
        // Prepare once per case (outside timing)
        const prepared = solver.prepare(constraints);
        
        // Add to benchmark suite - clean execution, no branching!
        suite.add(`${benchmarkCase.name} - ${solverName}`, function() {
          benchmarkCase.executeStrategy(solver, prepared);
        });
        
      } catch (error) {
        if (!options.quiet) {
          console.warn(`Skipping ${solverName} for ${caseId}: ${error.message}`);
        }
      }
    }
    
    // Run the suite for this case
    const sectionResult = await runSuite(suite, benchmarkCase.name, options);
    results.push(sectionResult);
  }
  
  return results;
}
```

## File Structure

```
benchmark/
├── config/
│   ├── cases.ts          # Benchmark case definitions
│   ├── groups.ts         # Benchmark group definitions
│   └── solvers.ts        # Solver registry
├── problems/
│   ├── sudoku.ts         # Sudoku problem definition
│   ├── pentomino.ts      # Pentomino problem definition
│   └── n-queens.ts       # N-Queens problem definition
├── solvers/
│   ├── InternalSparseSolver.ts
│   ├── InternalBinarySolver.ts
│   ├── InternalTemplateSolver.ts
│   ├── InternalGeneratorSolver.ts
│   ├── ExternalDlxlibSolver.ts
│   ├── ExternalDanceSolver.ts
│   └── ExternalDancingLinksAlgorithmSolver.ts
├── utils/
│   └── converters.ts     # Constraint format conversion utilities
├── types.ts              # Core type definitions
├── runner.ts             # Benchmark execution engine
└── index.ts              # CLI interface and main entry point
```

## Usage Examples

```bash
# PR benchmarks (default): All internal interfaces, no externals
npm run benchmark

# Release benchmarks: Sparse vs all externals
npm run benchmark -- --release

# Full benchmarks: Everything vs everything  
npm run benchmark -- --full

# With JSON output for CI
npm run benchmark -- --pr --json=pr-results.json
npm run benchmark -- --release --json=release-results.json
```

## Extension Points

### Adding a New Problem
1. Create problem function in `benchmark/problems/new-problem.ts`
2. Export interface and constraint generation function
3. Add problem type to union type in case definitions
4. Add import to problem registry

### Adding a New Solver
1. Create class extending `Solver<TSetup, TPrepared>`
2. Implement `setup()`, `prepare()`, `solveAll()`, `solveOne()`, `solveCount()`
3. Add to solver registry in `benchmark/config/solvers.ts`

### Adding a New Case
1. Add entry to `cases` array in `benchmark/config/cases.ts`
2. Define `executeStrategy` function for how this case should be solved
3. Add appropriate tags for group selection

### Adding a New Group
1. Add entry to `groups` array in `benchmark/config/groups.ts`
2. Specify which cases and solvers should be included
3. Optionally add CLI flag support in main runner

## Benefits

1. **Zero Duplication**: Problems, solvers, and cases defined once, combined flexibly
2. **Type Safety**: Compile-time verification of solver compatibility and data flow
3. **Performance**: All formatting done during setup/prepare, not in timed loops  
4. **Easy Extension**: Clear interfaces for adding new problems, solvers, cases, groups
5. **Clean Separation**: Problems don't know about solvers, solvers don't know about groupings
6. **CI Compatibility**: Preserves existing JSON output format and workflow integration
7. **Flexible Grouping**: Tag-based and explicit selection for different scenarios

This architecture satisfies all original requirements while providing a foundation for future extensibility and maintainability.