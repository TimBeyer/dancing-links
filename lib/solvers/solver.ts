/**
 * Problem solver for Dancing Links exact cover problems.
 *
 * Provides methods to add constraints and find solutions with type safety
 * and automatic validation.
 *
 * @template T The type of data associated with constraints
 * @template Mode Either 'simple' or 'complex' solver mode
 *
 * @example
 * ```typescript
 * const solver = dlx.createSolver({ columns: 3 })
 * solver.addSparseConstraint('row1', [0, 2])
 * solver.addSparseConstraint('row2', [1])
 * solver.addSparseConstraint('row3', [0, 1])
 *
 * const solutions = solver.findAll()
 * console.log(`Found ${solutions.length} solutions`)
 * ```
 */

import {
  Result,
  ConstraintRow,
  SolverMode,
  ConstraintHandler,
  SparseColumnIndices,
  BinaryColumnValues,
  SparseConstraintBatch,
  BinaryConstraintBatch
} from '../types/interfaces.js'
import { search } from '../core/algorithm.js'
import { ProblemBuilder, type SearchContext } from '../core/problem-builder.js'

export class ProblemSolver<T, Mode extends SolverMode> {
  constructor(
    private handler: ConstraintHandler<T, Mode>,
    /** Optional immutable layout supplied only by the explicit reusable-template API. */
    private contextTemplate?: SearchContext<T>
  ) {}

  validateConstraints(): this {
    this.handler.validateConstraints()
    return this
  }

  addSparseConstraint(data: T, columnIndices: SparseColumnIndices<Mode>): this {
    this.detachContextTemplate()
    this.handler.addSparseConstraint(data, columnIndices)
    return this
  }

  addSparseConstraints(constraints: SparseConstraintBatch<T, Mode>): this {
    // Keep this rare detach inline: batches are the hot ingestion API, so fresh
    // solvers pay only one predictable branch before the branch-free handler.
    if (this.contextTemplate) {
      this.handler.detachConstraints()
      this.contextTemplate = undefined
    }
    this.handler.addSparseConstraints(constraints)
    return this
  }

  addBinaryConstraint(data: T, columnValues: BinaryColumnValues<Mode>): this {
    this.detachContextTemplate()
    this.handler.addBinaryConstraint(data, columnValues)
    return this
  }

  addBinaryConstraints(constraints: BinaryConstraintBatch<T, Mode>): this {
    // Match the sparse batch fast path; binary conversion is still performed by
    // the ordinary monomorphic handler after one predictable detach check.
    if (this.contextTemplate) {
      this.handler.detachConstraints()
      this.contextTemplate = undefined
    }
    this.handler.addBinaryConstraints(constraints)
    return this
  }

  /**
   * Add a pre-built constraint row (used internally by templates).
   *
   * @param row - Pre-processed constraint row
   * @returns This instance for method chaining
   * @internal
   */
  addRow(row: ConstraintRow<T>): this {
    this.detachContextTemplate()
    this.handler.addRow(row)
    return this
  }

  addRows(rows: ConstraintRow<T>[]): this {
    this.detachContextTemplate()
    this.handler.addRows(rows)
    return this
  }

  /**
   * Find one solution to the exact cover problem.
   *
   * @returns Array containing at most one solution
   *
   * @example
   * ```typescript
   * const solutions = solver.findOne()
   * if (solutions.length > 0) {
   *   console.log('Found solution:', solutions[0])
   * }
   * ```
   */
  findOne(): Result<T>[][] {
    return this.solve(1)
  }

  /**
   * Find all solutions to the exact cover problem.
   *
   * @returns Array of all solutions found
   *
   * @example
   * ```typescript
   * const solutions = solver.findAll()
   * solutions.forEach((solution, index) => {
   *   console.log(`Solution ${index}:`, solution)
   * })
   * ```
   */
  findAll(): Result<T>[][] {
    return this.solve(Infinity)
  }

  /**
   * Find up to the specified number of solutions.
   *
   * @param numSolutions - Maximum number of solutions to find
   * @returns Array of solutions (may be fewer than requested)
   *
   * @example
   * ```typescript
   * const solutions = solver.find(5) // Find at most 5 solutions
   * ```
   */
  find(numSolutions: number): Result<T>[][] {
    return this.solve(numSolutions)
  }

  /**
   * Create a generator that yields solutions one at a time.
   *
   * This provides a streaming interface for iterating over solutions.
   * The generator builds problem structures once and yields solutions
   * from the complete solution set.
   *
   * **Performance Note**: This implementation computes all solutions upfront,
   * so it's only beneficial when you plan to iterate through many (but not
   * necessarily all) solutions. For single solutions, use `findOne()` instead.
   *
   * @returns Generator that yields individual solutions
   *
   * @example
   * ```typescript
   * const generator = solver.createGenerator()
   * for (const solution of generator) {
   *   console.log('Found solution:', solution)
   *   if (shouldStop) break // Early termination
   * }
   * ```
   */
  *createGenerator(): Generator<Result<T>[], void, unknown> {
    const constraints = this.handler.getConstraints()
    if (constraints.length === 0) {
      throw new Error('Cannot solve problem with no constraints')
    }

    const context = this.createSearchContext(constraints)

    // Keep calling search with numSolutions: 1 until exhausted
    while (true) {
      const solutions = search<T>(context, 1)
      if (solutions.length === 0) break
      yield solutions[0]
    }
  }

  private solve(numSolutions: number): Result<T>[][] {
    const constraints = this.handler.getConstraints()
    if (constraints.length === 0) {
      throw new Error('Cannot solve problem with no constraints')
    }

    const context = this.createSearchContext(constraints)

    // Execute search on context
    return search<T>(context, numSolutions)
  }

  private createSearchContext(constraints: ConstraintRow<T>[]): SearchContext<T> {
    if (this.contextTemplate) {
      // The compiled template remains immutable; each solve mutates only its two
      // native-copied buffers, preserving solver independence without rebuilding.
      return ProblemBuilder.cloneContext(this.contextTemplate)
    }

    return ProblemBuilder.buildContext({
      numPrimary: this.handler.getNumPrimary(),
      numSecondary: this.handler.getNumSecondary(),
      rows: constraints
    })
  }

  /**
   * Detach template rows only when a solver actually adds local rows.
   *
   * Template creation used to copy the entire row-reference table for every
   * solver even though read-only solvers search the compiled context directly.
   * Deferring that O(number of template rows) copy makes the common read-only
   * path O(1). The handler class and hot solve path remain identical for fresh
   * and template solvers, avoiding mixed-workload JIT polymorphism.
   */
  private detachContextTemplate(): void {
    if (this.contextTemplate) {
      this.handler.detachConstraints()
      this.contextTemplate = undefined
    }
  }
}

/**
 * Cold exact-cover specialization for configurations with no primary columns.
 *
 * The empty row selection is their one solution; secondary-only rows remain
 * optional. Handling this at solver construction keeps root-empty checks out of
 * the ordinary search state machine, where they measurably slow every normal
 * solve. Inherited mutation methods still provide validation and template COW.
 * @internal
 */
export function createZeroPrimaryProblemSolver<T, Mode extends SolverMode>(
  handler: ConstraintHandler<T, Mode>,
  contextTemplate?: SearchContext<T>
): ProblemSolver<T, Mode> {
  // Construct the regular class directly and replace methods only on this cold
  // instance. A derived class gives ProblemSolver multiple constructor targets
  // in V8 and measurably slows short ordinary solves; own methods keep its hot
  // construction site monomorphic while preserving instanceof ProblemSolver.
  const solver = new ProblemSolver(handler, contextTemplate)

  const assertHasConstraints = (): void => {
    if (handler.getConstraints().length === 0) {
      throw new Error('Cannot solve problem with no constraints')
    }
  }
  const emptySolution = (): Result<T>[][] => {
    assertHasConstraints()
    return [[]]
  }

  // The public find limit is intentionally ignored: this domain has exactly one
  // solution under the existing find(0) convention, so no count work is needed.
  solver.findOne = emptySolution
  solver.findAll = emptySolution
  solver.find = emptySolution
  solver.createGenerator = function* (): Generator<Result<T>[], void, unknown> {
    assertHasConstraints()
    yield []
  }

  return solver
}
