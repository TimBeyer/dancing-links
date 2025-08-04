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
  SearchConfig,
  Row,
  SolverMode,
  ConstraintHandler,
  SparseColumnIndices,
  BinaryColumnValues,
  SparseConstraintBatch,
  BinaryConstraintBatch
} from '../types/interfaces.js'
import { search } from '../core/algorithm.js'

export class ProblemSolver<T, Mode extends SolverMode> {
  constructor(private handler: ConstraintHandler<T, Mode>) {}

  validateConstraints(): this {
    this.handler.validateConstraints()
    return this
  }

  addSparseConstraint(data: T, columnIndices: SparseColumnIndices<Mode>): this {
    this.handler.addSparseConstraint(data, columnIndices)
    return this
  }

  addSparseConstraints(constraints: SparseConstraintBatch<T, Mode>): this {
    this.handler.addSparseConstraints(constraints)
    return this
  }

  addBinaryConstraint(data: T, columnValues: BinaryColumnValues<Mode>): this {
    this.handler.addBinaryConstraint(data, columnValues)
    return this
  }

  addBinaryConstraints(constraints: BinaryConstraintBatch<T, Mode>): this {
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
  addRow(row: Row<T>): this {
    this.handler.addRow(row)
    return this
  }

  addRows(rows: Row<T>[]): this {
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

  private solve(numSolutions: number): Result<T>[][] {
    const constraints = this.handler.getConstraints()
    if (constraints.length === 0) {
      throw new Error('Cannot solve problem with no constraints')
    }

    const searchConfig: SearchConfig<T> = {
      numPrimary: this.handler.getNumPrimary(),
      numSecondary: this.handler.getNumSecondary(),
      numSolutions,
      rows: constraints
    }

    return search<T>(searchConfig)
  }
}
