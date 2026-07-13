/**
 * Template for reusable constraint sets.
 *
 * Use this when you want to solve multiple similar problems that share
 * common constraint patterns.
 *
 * @template T The type of data associated with constraints
 * @template Mode Either 'simple' or 'complex' solver mode
 *
 * @example
 * ```typescript
 * const template = dlx.createSolverTemplate({ columns: 3 })
 * template.addSparseConstraint('common', [0, 1])
 *
 * const solver1 = template.createSolver()
 * solver1.addSparseConstraint('specific1', [2])
 *
 * const solver2 = template.createSolver()
 * solver2.addSparseConstraint('specific2', [1, 2])
 * ```
 */

import {
  ConstraintRow,
  SolverMode,
  ConstraintHandler,
  SparseColumnIndices,
  BinaryColumnValues,
  SparseConstraintBatch,
  BinaryConstraintBatch,
  SimpleSolverConfig,
  ComplexSolverConfig
} from '../types/interfaces.js'
import { SimpleConstraintHandler, ComplexConstraintHandler } from '../constraints/index.js'
import { ProblemBuilder, type SearchContext } from '../core/problem-builder.js'
import { ProblemSolver, createZeroPrimaryProblemSolver } from './solver.js'

/**
 * Freeze the constraint topology used by a compiled template.
 *
 * Row payloads and handler-owned row objects remain references, but each column
 * array is copied once at compilation. Solver-local copy-on-write rebuilds
 * therefore use the exact topology that produced the cached links, even if a
 * caller later mutates an input array.
 */
function snapshotRows<T>(constraints: ConstraintRow<T>[]): ConstraintRow<T>[] {
  // Native slice preserves the packed array kind used by ordinary handlers. A
  // pre-sized-and-filled array remains holey in V8 and would deoptimize the row
  // loops when a process switches between template and fresh solvers.
  const snapshot = constraints.slice()
  for (let i = 0; i < constraints.length; i++) {
    const row = constraints[i]
    // The handler owns the row object, so detach only its caller-owned array.
    // Reusing the original allocation-site map avoids wrong-map deopts when
    // template and fresh rows pass through the same builder/search functions.
    const mutableRow = row as { coveredColumns: number[]; data: T }
    mutableRow.coveredColumns = row.coveredColumns.slice()
  }
  return snapshot
}

export class SolverTemplate<T, Mode extends SolverMode> {
  /** Immutable compiled layout; every constraint mutation invalidates it. */
  private contextTemplate?: SearchContext<T>

  constructor(private handler: ConstraintHandler<T, Mode>) {}

  validateConstraints(): this {
    this.handler.validateConstraints()
    return this
  }

  addSparseConstraint(data: T, columnIndices: SparseColumnIndices<Mode>): this {
    this.contextTemplate = undefined
    this.handler.addSparseConstraint(data, columnIndices)
    return this
  }

  addSparseConstraints(constraints: SparseConstraintBatch<T, Mode>): this {
    this.contextTemplate = undefined
    this.handler.addSparseConstraints(constraints)
    return this
  }

  addBinaryConstraint(data: T, columnValues: BinaryColumnValues<Mode>): this {
    this.contextTemplate = undefined
    this.handler.addBinaryConstraint(data, columnValues)
    return this
  }

  addBinaryConstraints(constraints: BinaryConstraintBatch<T, Mode>): this {
    this.contextTemplate = undefined
    this.handler.addBinaryConstraints(constraints)
    return this
  }

  addRow(row: ConstraintRow<T>): this {
    this.contextTemplate = undefined
    this.handler.addRow(row)
    return this
  }

  addRows(rows: ConstraintRow<T>[]): this {
    this.contextTemplate = undefined
    this.handler.addRows(rows)
    return this
  }

  /**
   * Create a new solver instance with this template's constraints pre-loaded.
   *
   * @returns New problem solver with template constraints
   *
   * @example
   * ```typescript
   * const solver = template.createSolver()
   * solver.addSparseConstraint('additional', [2])
   * const solutions = solver.findAll()
   * ```
   */
  createSolver(): ProblemSolver<T, Mode> {
    // Get constraints once for batch operation
    const constraints = this.handler.getConstraints()

    // Check if template has validation enabled
    const templateValidationEnabled = this.handler.isValidationEnabled()
    const contextTemplate = this.getContextTemplate(constraints)

    // Share the compiled context's immutable row table. ProblemSolver detaches
    // it only on first local mutation, making read-only solver creation O(1)
    // while retaining the same handler class and hot shape as fresh solvers.
    // Use explicit mode detection instead of inferring from getNumSecondary()
    if (this.handler.mode === 'complex') {
      const config = this.handler.getConfig() as ComplexSolverConfig
      const newHandler = new ComplexConstraintHandler<T>(config)
      newHandler.shareConstraints(contextTemplate.rows)

      // Propagate validation setting from template
      if (templateValidationEnabled) {
        newHandler.validateConstraints()
      }

      // Match fresh solvers' cold specialization without putting a root-empty
      // check in the shared search loop. Passing the compiled context retains
      // the same O(1) row sharing and first-mutation copy-on-write behavior.
      if (config.primaryColumns === 0) {
        // The handler mode check above proves this generic Mode cast at runtime.
        return createZeroPrimaryProblemSolver(
          newHandler,
          contextTemplate
        ) as unknown as ProblemSolver<T, Mode>
      }
      return new ProblemSolver(newHandler, contextTemplate) as ProblemSolver<T, Mode>
    } else {
      const config = this.handler.getConfig() as SimpleSolverConfig
      const newHandler = new SimpleConstraintHandler<T>(config)
      newHandler.shareConstraints(contextTemplate.rows)

      // Propagate validation setting from template
      if (templateValidationEnabled) {
        newHandler.validateConstraints()
      }

      if (config.columns === 0) {
        // The handler mode check above proves this generic Mode cast at runtime.
        return createZeroPrimaryProblemSolver(
          newHandler,
          contextTemplate
        ) as unknown as ProblemSolver<T, Mode>
      }
      return new ProblemSolver(newHandler, contextTemplate) as ProblemSolver<T, Mode>
    }
  }

  private getContextTemplate(constraints: ConstraintRow<T>[]): SearchContext<T> {
    if (!this.contextTemplate) {
      // Compile one immutable snapshot. Later template additions cannot alter
      // solvers already created from it, while future creates reuse the work.
      this.contextTemplate = ProblemBuilder.buildContext({
        numPrimary: this.handler.getNumPrimary(),
        numSecondary: this.handler.getNumSecondary(),
        rows: snapshotRows(constraints)
      })
    }
    return this.contextTemplate
  }
}
