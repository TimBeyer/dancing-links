/**
 * Dancing Links Factory
 *
 * Factory class for creating Dancing Links solvers and templates with type safety.
 *
 * @example
 * ```typescript
 * // Simple solver for one-time use
 * const dlx = new DancingLinks<string>()
 * const solver = dlx.createSolver({ columns: 3 })
 * solver.addSparseConstraint('row1', [0, 2])
 * const solutions = solver.findAll()
 *
 * // Template for reusing constraint patterns
 * const template = dlx.createSolverTemplate({ columns: 3 })
 * template.addSparseConstraint('base', [0, 1])
 * const solver1 = template.createSolver()
 * const solver2 = template.createSolver()
 * ```
 */

import {
  SolverConfig,
  SimpleSolverConfig,
  ComplexSolverConfig,
  isComplexSolverConfig
} from '../types/interfaces.js'
import { SimpleConstraintHandler, ComplexConstraintHandler } from '../constraints/index.js'
import { ProblemSolver } from './solver.js'
import { SolverTemplate } from './template.js'

/**
 * Factory class for creating Dancing Links solvers and templates with type safety.
 *
 * @template T The type of data associated with constraints
 *
 * @example
 * ```typescript
 * const dlx = new DancingLinks<string>()
 * const solver = dlx.createSolver({ columns: 3 })
 * const template = dlx.createSolverTemplate({ primaryColumns: 2, secondaryColumns: 1 })
 * ```
 */
export class DancingLinks<T> {
  /**
   * Create a new problem solver for a single problem instance.
   *
   * @param config - Solver configuration (simple or complex mode)
   * @returns Type-safe problem solver instance
   *
   * @example
   * ```typescript
   * // Simple mode (columns only)
   * const solver = dlx.createSolver({ columns: 3 })
   *
   * // Complex mode (primary + secondary columns)
   * const solver = dlx.createSolver({
   *   primaryColumns: 2,
   *   secondaryColumns: 1
   * })
   * ```
   */
  createSolver(config: SimpleSolverConfig): ProblemSolver<T, 'simple'>
  createSolver(config: ComplexSolverConfig): ProblemSolver<T, 'complex'>
  createSolver(config: SolverConfig): ProblemSolver<T, 'simple'> | ProblemSolver<T, 'complex'> {
    if (isComplexSolverConfig(config)) {
      const handler = new ComplexConstraintHandler<T>(config)
      return new ProblemSolver<T, 'complex'>(handler)
    } else {
      const handler = new SimpleConstraintHandler<T>(config)
      return new ProblemSolver<T, 'simple'>(handler)
    }
  }

  /**
   * Create a solver template for reusing constraint patterns across multiple problems.
   *
   * @param config - Solver configuration (simple or complex mode)
   * @returns Type-safe solver template instance
   *
   * @example
   * ```typescript
   * const template = dlx.createSolverTemplate({ columns: 3 })
   * template.addSparseConstraint('base', [0, 1])
   *
   * // Create multiple solvers from the same template
   * const solver1 = template.createSolver()
   * const solver2 = template.createSolver()
   * ```
   */
  createSolverTemplate(config: SimpleSolverConfig): SolverTemplate<T, 'simple'>
  createSolverTemplate(config: ComplexSolverConfig): SolverTemplate<T, 'complex'>
  createSolverTemplate(
    config: SolverConfig
  ): SolverTemplate<T, 'simple'> | SolverTemplate<T, 'complex'> {
    if (isComplexSolverConfig(config)) {
      const handler = new ComplexConstraintHandler<T>(config)
      return new SolverTemplate<T, 'complex'>(handler)
    } else {
      const handler = new SimpleConstraintHandler<T>(config)
      return new SolverTemplate<T, 'simple'>(handler)
    }
  }
}