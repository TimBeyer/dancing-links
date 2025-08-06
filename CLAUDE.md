# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a high-performance JavaScript/TypeScript implementation of Knuth's Dancing Links algorithm (DLX) for solving exact cover problems. The library provides the fastest JS implementation of the algorithm and includes examples for n-queens, pentomino tiling, and sudoku problems.

## Development Commands

- `npm run build` - Build TypeScript to JavaScript (cleans first)
- `npm run test` - Run unit tests (alias for test-unit)
- `npm run test-watch` - Run tests in watch mode
- `npm run test-unit` - Run unit tests with Mocha and ts-node
- `npm run lint` - Run ESLint checks
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run coverage` - Generate test coverage report with nyc
- `npm run benchmark` - Run library-only performance benchmarks
- `npm run benchmark:comparison` - Run comprehensive benchmarks comparing against other libraries
- `npm run profile` - Generate CPU profile for performance analysis

## Core Architecture

### Main Entry Points

- `index.ts` - Public API exports (DancingLinks factory, ProblemSolver, SolverTemplate)
- `lib/index.ts` - Main library re-exports from organized modules
- `lib/core/algorithm.ts` - Core Dancing Links algorithm implementation using state machine
- `lib/types/interfaces.ts` - TypeScript type definitions and constraint interfaces
- `lib/solvers/factory.ts` - DancingLinks factory class for creating solvers and templates
- `lib/constraints/handlers/` - Constraint handlers for simple and complex modes

### Algorithm Structure

The core algorithm (`lib/core/algorithm.ts`) uses a state machine pattern to avoid recursion and implement Knuth's Dancing Links algorithm. The states are:

- FORWARD: Select next column to cover
- ADVANCE: Try next option for selected column
- BACKUP: Backtrack when no options remain
- RECOVER: Restore previous state when backtracking
- DONE: Solution found or search complete

### Data Structures

- `NodeStore<T>` class: Struct-of-Arrays implementation with typed arrays for navigation fields
- `ColumnStore` class: Column headers with length tracking and circular linking
- Constraint types: `SimpleConstraint` (single row) and `ComplexConstraint` (primary + secondary rows)

### Key Modules

- State machine logic in `search()` function in `lib/core/algorithm.ts`
- Matrix operations: `cover()` and `uncover()` for constraint satisfaction
- Data structures in `lib/core/data-structures.ts` with NodeStore and ColumnStore classes
- Constraint handlers in `lib/constraints/handlers/` for simple and complex solver modes

## Performance Requirements

Performance is critical - always run benchmarks before and after changes using `npm run benchmark`. The library maintains its position as the fastest Dancing Links implementation in JavaScript through systematic optimization.

See `PERFORMANCE.md` for detailed analysis of optimization work completed.

## Testing

All new features require comprehensive unit tests. Use `npm run test` for standard testing, `npm run test-watch` for development. Coverage reports available via `npm run coverage`.

## Commit Convention

Must follow Conventional Commits specification:

- `feat:` - New features (minor version bump)
- `fix:` - Bug fixes (patch version bump)
- `perf:` - Performance improvements
- `test:` - Test additions/changes
- `docs:` - Documentation changes
- `ci:` - CI/build changes (no release)
- `build:` - Build system changes (no release)

## Project Structure

- `lib/` - Core library implementation with organized nested modules
  - `core/` - Core algorithm and data structures
  - `constraints/handlers/` - Constraint handlers for different solver modes
  - `solvers/` - Factory, solver, and template classes
  - `types/` - TypeScript interfaces and type definitions
- `benchmark/` - Performance testing and example problems (n-queens, pentomino, sudoku)
- `test/unit/` - Unit test suite
- `built/` - Compiled JavaScript output
- TypeScript configuration supports both development (`tsconfig.dev.json`) and production builds

## Code Quality Standards

### Code comments

Make sure to leave relevant and detailed comments on complex parts of the codebase.

#### Comment Guidelines

**DO** write detailed comments for:

- Complex algorithms with multiple steps
- Non-obvious business logic or domain-specific rules
- Areas where refactoring considerations are documented
- Code that cannot be easily simplified due to technical constraints

**DON'T** write comments for:

- Self-evident code (obvious function names, simple operations)
- Historical changes or what code "used to do"
- Anything that can be understood from reading the code itself

When you write complex code, you MUST write documentation explaining the why, not the what.

### Performance-Critical Code Guidelines

**DO** use for performance-critical code:

- `for...of` loops over `.forEach()`
- Manual loops over `.map()` and `.reduce()` for data transformation
- Low-level iteration patterns in hot paths

**DON'T** use for performance-critical code:

- Array utility methods (`.map`, `.reduce`, `.forEach`) - provably slower than loops
- Functional programming patterns that create intermediate arrays
- Method chaining that allocates temporary objects

### Testing Guidelines

**DO** in tests:

- Test functionality and behavior
- Focus on input/output verification
- Test edge cases and error conditions

**DON'T** in tests:

- Test method existence with `.to.have.property` - TypeScript ensures this
- Test implementation details
- Duplicate type checking that TypeScript already provides

### Problem-Solving Approach

**ALWAYS plan together first for complex problems before implementing.**

When to **PLAN TOGETHER** (not implement immediately):

- Questions like "Can we think of a better way..."
- "Maybe we can build something better..."
- "Is it a good interface to..."
- Architecture or design discussions
- Performance optimization strategies
- API design questions
- Complex problem exploration

When to **IMPLEMENT DIRECTLY**:

- "Can you fix the type issue"
- "Add this specific feature"
- "Run the tests"
- Clear, specific implementation requests
- Bug fixes with known solutions

**Always use judgment**: If unsure whether to plan or implement, err on the side of planning and discussion first. Implementation can always come after we've explored the problem space together.

## Commit Guidelines

- **ALWAYS run `npm run format` before committing** - Code must be properly formatted
- Commit frequently, ensure tests pass before committing, always ensure that ALL TS types pass
- Always do work in branches and create one if we're not in a branch already. Commit frequently.

### Pre-Commit Checklist

Before every commit, ALWAYS run:

1. `npm run format` - Format code with Prettier
2. `npm run lint` - Check for linting issues
3. `npm run test` - Ensure all tests pass
4. `npm run build` - Verify TypeScript compilation
