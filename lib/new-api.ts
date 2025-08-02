/**
 * Template-Based API for Dancing Links
 * 
 * Factory-based interface for creating Dancing Links solvers with type safety.
 * 
 * @fileoverview Provides ProblemSolver for single problems and SolverTemplate for reusable constraint patterns.
 * Supports both simple (columns only) and complex (primary + secondary) modes with sparse and binary formats.
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
  Result, 
  SearchConfig,
  Row,
  SolverConfig,
  SimpleSolverConfig,
  ComplexSolverConfig,
  SparseColumnIndices,
  BinaryColumnValues,
  SparseConstraintBatch,
  BinaryConstraintBatch,
  SolverMode,
  ConstraintHandler,
  isComplexSolverConfig
} from './interfaces.js'
import { SimpleConstraintHandler, ComplexConstraintHandler } from './constraint-handlers.js'
import { search } from './index.js'


/**
 * Removed abstract base class - replaced with delegation pattern
 * See SimpleConstraintHandler and ComplexConstraintHandler for implementations
 */

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
  createSolverTemplate(config: SolverConfig): SolverTemplate<T, 'simple'> | SolverTemplate<T, 'complex'> {
    if (isComplexSolverConfig(config)) {
      const handler = new ComplexConstraintHandler<T>(config)
      return new SolverTemplate<T, 'complex'>(handler)
    } else {
      const handler = new SimpleConstraintHandler<T>(config)
      return new SolverTemplate<T, 'simple'>(handler)
    }
  }
}

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
    
    // Use explicit mode detection instead of inferring from getNumSecondary()
    if (this.handler.mode === 'complex') {
      const config = this.handler.getConfig() as ComplexSolverConfig
      const newHandler = new ComplexConstraintHandler<T>(config)
      newHandler.addRows(constraints)
      return new ProblemSolver(newHandler) as ProblemSolver<T, Mode>
    } else {
      const config = this.handler.getConfig() as SimpleSolverConfig
      const newHandler = new SimpleConstraintHandler<T>(config)
      newHandler.addRows(constraints)
      return new ProblemSolver(newHandler) as ProblemSolver<T, Mode>
    }
  }
}

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

