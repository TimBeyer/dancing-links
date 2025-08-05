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
  Row,
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
import { ProblemSolver } from './solver.js'

export class SolverTemplate<T, Mode extends SolverMode> {
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

  addRow(row: Row<T>): this {
    this.handler.addRow(row)
    return this
  }

  addRows(rows: Row<T>[]): this {
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

    // Use explicit mode detection instead of inferring from getNumSecondary()
    if (this.handler.mode === 'complex') {
      const config = this.handler.getConfig() as ComplexSolverConfig
      const newHandler = new ComplexConstraintHandler<T>(config)
      
      // Propagate validation setting from template
      if (templateValidationEnabled) {
        newHandler.validateConstraints()
      }
      
      newHandler.addRows(constraints)
      return new ProblemSolver(newHandler) as ProblemSolver<T, Mode>
    } else {
      const config = this.handler.getConfig() as SimpleSolverConfig
      const newHandler = new SimpleConstraintHandler<T>(config)
      
      // Propagate validation setting from template
      if (templateValidationEnabled) {
        newHandler.validateConstraints()
      }
      
      newHandler.addRows(constraints)
      return new ProblemSolver(newHandler) as ProblemSolver<T, Mode>
    }
  }
}
