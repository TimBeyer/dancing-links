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
- `npm run benchmark:dev` - Run development benchmarks comparing Original AoS vs SoA implementations
- `npm run profile` - Generate CPU profile for performance analysis

## Core Architecture

### Main Entry Points
- `index.ts` - Public API exports (`findOne`, `findAll`, `find`, `findRaw`)
- `lib/index.ts` - Core Dancing Links algorithm implementation using state machine
- `lib/interfaces.ts` - TypeScript type definitions and constraint interfaces
- `lib/utils.ts` - Utility functions for converting constraints to internal format

### Algorithm Structure
The core algorithm (`lib/index.ts`) uses a state machine pattern to avoid recursion and implement Knuth's Dancing Links algorithm. The states are:
- FORWARD: Select next column to cover
- ADVANCE: Try next option for selected column
- BACKUP: Backtrack when no options remain
- RECOVER: Restore previous state when backtracking
- DONE: Solution found or search complete

### Data Structures
- `Node<T>` class: Doubly-linked list nodes with left/right/up/down pointers
- `Column<T>` class: Column headers with length tracking
- Constraint types: `SimpleConstraint` (single row) and `ComplexConstraint` (primary + secondary rows)

### Key Modules
- State machine logic in `search()` function
- Matrix operations: `cover()` and `uncover()` for constraint satisfaction
- Constraint preprocessing in `getSearchConfig()` converts binary arrays to sparse format

## Performance Requirements

Performance is critical - always run benchmarks before and after changes using `npm run benchmark`. The library must maintain its position as the fastest Dancing Links implementation in JavaScript.

### Performance Optimization Guidelines

**CRITICAL: Always benchmark performance changes in isolation**

When implementing performance optimizations:

1. **One optimization at a time** - Never mix multiple performance changes in a single commit
2. **Benchmark each change individually** - Run `npm run benchmark:dev` before and after each change
3. **Never make assumptions** - Modern JS engines (V8) are highly sophisticated and counter-intuitive
4. **Document results** - Record actual performance impact, not theoretical expectations
5. **Be prepared to revert** - Many "optimizations" actually hurt performance in modern JS
6. **Isolate variables** - Change only one thing to understand its true impact

**Example workflow:**
- Baseline: Run benchmarks on current implementation
- Change: Implement single, focused optimization
- Measure: Run benchmarks again and compare results
- Document: Record actual performance delta (positive or negative)
- Decide: Keep if beneficial, revert if harmful
- Repeat: Move to next optimization only after completing this cycle

**Never assume** that logical optimizations (loop unrolling, branch reduction, etc.) will improve performance. V8's TurboFan compiler often handles these better than manual optimizations.

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

- `lib/` - Core algorithm implementation
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

## Commit Guidelines
- Commit frequently, ensure tests pass before committing, always ensure that ALL TS types pass