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

- `NodeStore<T>` class: Struct-of-Arrays implementation with typed arrays for navigation fields
- `ColumnStore` class: Column headers with length tracking and circular linking
- Constraint types: `SimpleConstraint` (single row) and `ComplexConstraint` (primary + secondary rows)

### Key Modules

- State machine logic in `search()` function
- Matrix operations: `cover()` and `uncover()` for constraint satisfaction
- Constraint preprocessing in `getSearchConfig()` converts binary arrays to sparse format

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
