# Development Guide

This document contains information for developers working on the dancing-links library.

## Prerequisites

- Node.js 20 or higher
- npm 8 or higher

## Setup

```bash
npm install
```

## Development Scripts

### Building & Testing

- `npm run build` - Build the TypeScript code to JavaScript
- `npm run build:dev` - Build with development configuration (includes benchmarks and scripts)
- `npm test` - Run the test suite
- `npm run test-watch` - Run tests in watch mode
- `npm run coverage` - Generate test coverage report

### Code Quality

- `npm run lint` - Run ESLint code quality checks
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Performance & Benchmarking

- `npm run benchmark` - Run fast library-only benchmarks (CI mode)
- `npm run benchmark:comparison` - Run comprehensive benchmarks including external libraries
- `npm run benchmark:json` - Generate JSON benchmark output for analysis
- `npm run update-benchmark-docs` - Update README with current benchmark results
- `npm run update-benchmark-docs:dry-run` - Preview benchmark documentation changes
- `npm run profile` - Generate CPU performance profile

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

### Automated Benchmark Documentation

The project includes automated benchmark documentation that runs during releases:

- Compares against other JS Dancing Links libraries (dlxlib, dance, dancing-links-algorithm)
- Generates objective performance comparison tables
- Updates README automatically during `npm run release`
- Can be run manually with `npm run update-benchmark-docs`

## Profiling

Generate CPU profiles for performance analysis:

```bash
npm run profile
```

This creates `profile.cpuprofile` which can be loaded into Chrome DevTools for detailed performance analysis.

## Architecture & Implementation

### Core Algorithm

The algorithm uses a state machine pattern to avoid recursion and closely follows [Knuth's reference implementation](https://cs.stanford.edu/~knuth/programs/dance.w). The core algorithm is implemented using efficient data structures optimized for the Dancing Links technique.

### Project Structure

- `lib/` - Core library implementation with organized nested modules
  - `core/` - Core algorithm and data structures
  - `constraints/handlers/` - Constraint handlers for different solver modes
  - `solvers/` - Factory, solver, and template classes
  - `types/` - TypeScript interfaces and type definitions
- `benchmark/` - Performance testing and example problems (n-queens, pentomino, sudoku)
- `test/unit/` - Unit test suite
- `scripts/` - Development and automation scripts
- `built/` - Compiled JavaScript output

### Algorithm Structure

The core algorithm (`lib/core/algorithm.ts`) uses a state machine pattern with these states:

- **FORWARD**: Select next column to cover
- **ADVANCE**: Try next option for selected column
- **BACKUP**: Backtrack when no options remain
- **RECOVER**: Restore previous state when backtracking
- **DONE**: Solution found or search complete

### Data Structures

- `NodeStore<T>` class: Struct-of-Arrays implementation with typed arrays for navigation fields
- `ColumnStore` class: Column headers with length tracking and circular linking
- Constraint types: `SimpleConstraint` (single row) and `ComplexConstraint` (primary + secondary rows)

## Contribution Guidelines

### Commit Convention

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

### Code Quality Standards

#### Code Comments

**DO** write detailed comments for:

- Complex algorithms with multiple steps
- Non-obvious business logic or domain-specific rules
- Areas where refactoring considerations are documented
- Code that cannot be easily simplified due to technical constraints

**DON'T** write comments for:

- Self-evident code (obvious function names, simple operations)
- Historical changes or what code "used to do"
- Anything that can be understood from reading the code itself

#### Performance-Critical Code Guidelines

**DO** use for performance-critical code:

- `for...of` loops over `.forEach()`
- Manual loops over `.map()` and `.reduce()` for data transformation
- Low-level iteration patterns in hot paths

**DON'T** use for performance-critical code:

- Array utility methods (`.map`, `.reduce`, `.forEach`) - provably slower than loops
- Functional programming patterns that create intermediate arrays
- Method chaining that allocates temporary objects

#### Testing Guidelines

**DO** in tests:

- Test functionality and behavior
- Focus on input/output verification
- Test edge cases and error conditions

**DON'T** in tests:

- Test method existence with `.to.have.property` - TypeScript ensures this
- Test implementation details
- Duplicate type checking that TypeScript already provides

### Pre-Commit Checklist

Before every commit, ALWAYS run:

1. `npm run format` - Format code with Prettier
2. `npm run lint` - Check for linting issues
3. `npm run test` - Ensure all tests pass
4. `npm run build` - Verify TypeScript compilation

### Performance Requirements

Performance is critical - always run benchmarks before and after changes using `npm run benchmark`. The library maintains its position as the fastest Dancing Links implementation in JavaScript through systematic optimization.

See `PERFORMANCE.md` for detailed analysis of optimization work completed.

## Release Process

Releases are automated using release-it:

```bash
npm run release
```

This will:

1. Run automated benchmark documentation updates
2. Format code
3. Generate changelog
4. Create git tag
5. Publish to npm
6. Create GitHub release

The benchmark documentation is automatically updated during releases to ensure performance claims stay current.
