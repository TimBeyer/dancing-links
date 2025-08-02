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
  BinaryNumber,
  Result, 
  SearchConfig,
  Row,
  SolverConfig,
  SimpleSolverConfig,
  ComplexSolverConfig,
  SparseColumnIndices,
  BinaryColumnValues,
  SolverMode,
  ConfigForMode,
  isComplexSolverConfig
} from './interfaces.js'
import { search } from './index.js'


/**
 * Base class providing constraint handling logic for both ProblemSolver and SolverTemplate.
 * 
 * @template T The type of data associated with each constraint
 * @template Mode Either 'simple' or 'complex' solver mode
 */
abstract class ConstraintHandler<T, Mode extends SolverMode> {
  protected constraints: Row<T>[] = []
  protected validationEnabled = false
  protected isComplexMode: boolean
  protected numPrimary: number
  protected numSecondary: number

  constructor(
    protected config: ConfigForMode<Mode>
  ) {
    this.isComplexMode = isComplexSolverConfig(config)
    if (this.isComplexMode) {
      const complexConfig = config as ComplexSolverConfig
      this.numPrimary = complexConfig.primaryColumns
      this.numSecondary = complexConfig.secondaryColumns
    } else {
      const simpleConfig = config as SimpleSolverConfig
      this.numPrimary = simpleConfig.columns
      this.numSecondary = 0
    }
  }

  /**
   * Enable constraint validation for debugging.
   * Validation checks column bounds but reduces performance.
   * 
   * @returns This instance for method chaining
   * 
   * @example
   * ```typescript
   * solver
   *   .validateConstraints() // Enable validation for debugging
   *   .addSparseConstraint('data', [0, 2, 4])
   *   .solve()
   * ```
   */
  validateConstraints(): this {
    this.validationEnabled = true
    return this
  }

  /**
   * Add a constraint using sparse format (recommended for performance).
   * 
   * @param data - User data to associate with this constraint
   * @param columnIndices - Column indices that this constraint covers
   * @returns This instance for method chaining
   * 
   * @example
   * ```typescript
   * // Simple mode: array of column indices
   * solver.addSparseConstraint('data', [0, 2, 4])
   * 
   * // Complex mode: separate primary and secondary
   * solver.addSparseConstraint('data', { 
   *   primary: [0, 1], 
   *   secondary: [0, 2] 
   * })
   * ```
   */
  addSparseConstraint(data: T, columnIndices: SparseColumnIndices<Mode>): this {
    return this.addSparseConstraints([{ data, columnIndices }])
  }

  /**
   * Add multiple constraints using sparse format (batch operation for better performance).
   * 
   * @param constraints - Array of constraints to add
   * @returns This instance for method chaining
   * 
   * @example
   * ```typescript
   * solver.addSparseConstraints([
   *   { data: 'row1', columnIndices: [0, 2, 4] },
   *   { data: 'row2', columnIndices: [1, 3, 5] },
   *   { data: 'row3', columnIndices: [0, 1] }
   * ])
   * ```
   */
  addSparseConstraints(constraints: Array<{ data: T, columnIndices: SparseColumnIndices<Mode> }>): this {
    // Main optimized implementation - V8 can optimize this entire loop
    for (let i = 0; i < constraints.length; i++) {
      const { data, columnIndices } = constraints[i]
      
      if (this.isComplexMode) {
        // Complex mode: separate primary and secondary column handling
        const { primary, secondary } = columnIndices as { primary: number[], secondary: number[] }
        
        // Optional validation for debugging
        if (this.validationEnabled) {
          for (let j = 0; j < primary.length; j++) {
            const col = primary[j]
            if (col < 0 || col >= this.numPrimary) {
              throw new Error(`Primary column index ${col} exceeds primaryColumns limit of ${this.numPrimary}`)
            }
          }
        }
        
        // Validate secondary columns and build with offset
        const coveredColumns: number[] = [...primary] // Copy primary directly
        for (let j = 0; j < secondary.length; j++) {
          const col = secondary[j]
          if (this.validationEnabled) {
            if (col < 0 || col >= this.numSecondary) {
              throw new Error(`Secondary column index ${col} exceeds secondaryColumns limit of ${this.numSecondary}`)
            }
          }
          coveredColumns.push(col + this.numPrimary) // Apply offset for secondary columns
        }
        
        this.constraints.push(new Row(coveredColumns, data))
        
      } else {
        // Simple mode: validate input and pass through directly
        const columns = columnIndices as number[]
        
        // Optional validation for debugging
        if (this.validationEnabled) {
          for (let j = 0; j < columns.length; j++) {
            const col = columns[j]
            if (col < 0 || col >= this.numPrimary) {
              throw new Error(`Column index ${col} exceeds columns limit of ${this.numPrimary}`)
            }
          }
        }
        
        // Use input array directly as coveredColumns (no copying needed)
        this.constraints.push(new Row(columns, data))
      }
    }
    return this
  }

  /**
   * Add a constraint using binary format (0s and 1s).
   * 
   * @param data - User data to associate with this constraint
   * @param columnValues - Binary array where 1 indicates the constraint covers that column
   * @returns This instance for method chaining
   * 
   * @remarks Consider using addSparseConstraint() for better performance.
   * 
   * @example
   * ```typescript
   * // Simple mode: binary array
   * solver.addBinaryConstraint('data', [1, 0, 1, 0, 1])
   * 
   * // Complex mode: separate primary and secondary rows
   * solver.addBinaryConstraint('data', {
   *   primaryRow: [1, 1, 0],
   *   secondaryRow: [1, 0, 1]
   * })
   * ```
   */
  addBinaryConstraint(data: T, columnValues: BinaryColumnValues<Mode>): this {
    return this.addBinaryConstraints([{ data, columnValues }])
  }

  /**
   * Add multiple constraints using binary format (batch operation for better performance).
   * 
   * @param constraints - Array of constraints to add
   * @returns This instance for method chaining
   * 
   * @example
   * ```typescript
   * solver.addBinaryConstraints([
   *   { data: 'row1', columnValues: [1, 0, 1, 0, 1] },
   *   { data: 'row2', columnValues: [0, 1, 0, 1, 0] },
   *   { data: 'row3', columnValues: [1, 1, 0, 0, 0] }
   * ])
   * ```
   */
  addBinaryConstraints(constraints: Array<{ data: T, columnValues: BinaryColumnValues<Mode> }>): this {
    // Main optimized implementation - V8 can optimize this entire loop
    for (let i = 0; i < constraints.length; i++) {
      const { data, columnValues } = constraints[i]
      
      if (this.isComplexMode) {
        // Complex mode: separate primary and secondary row handling
        const { primaryRow, secondaryRow } = columnValues as { primaryRow: BinaryNumber[], secondaryRow: BinaryNumber[] }
        
        // Optional validation for debugging
        if (this.validationEnabled) {
          if (primaryRow.length !== this.numPrimary) {
            throw new Error(`Primary row length ${primaryRow.length} does not match primaryColumns ${this.numPrimary}`)
          }
          if (secondaryRow.length !== this.numSecondary) {
            throw new Error(`Secondary row length ${secondaryRow.length} does not match secondaryColumns ${this.numSecondary}`)
          }
        }
        
        // Single-pass: convert binary to sparse
        const coveredColumns: number[] = []
        
        // Process primary row: convert 1s to column indices
        for (let j = 0; j < primaryRow.length; j++) {
          if (primaryRow[j] === 1) {
            coveredColumns.push(j)
          }
        }
        
        // Process secondary row: convert 1s to column indices (with offset)
        for (let j = 0; j < secondaryRow.length; j++) {
          if (secondaryRow[j] === 1) {
            coveredColumns.push(j + primaryRow.length) // Apply offset for secondary columns
          }
        }
        
        this.constraints.push(new Row(coveredColumns, data))
        
      } else {
        // Simple mode: single binary row handling
        const row = columnValues as BinaryNumber[]
        
        // Optional validation for debugging
        if (this.validationEnabled) {
          if (row.length !== this.numPrimary) {
            throw new Error(`Row length ${row.length} does not match columns ${this.numPrimary}`)
          }
        }
        
        // Single-pass: convert binary to sparse
        const coveredColumns: number[] = []
        
        // Process row: convert 1s to column indices
        for (let j = 0; j < row.length; j++) {
          if (row[j] === 1) {
            coveredColumns.push(j)
          }
        }
        
        this.constraints.push(new Row(coveredColumns, data))
      }
    }
    return this
  }


  /**
   * Get the number of primary columns for this solver.
   * @returns Number of primary columns
   * @protected
   */
  protected getNumPrimary(): number {
    return this.numPrimary
  }

  /**
   * Get the number of secondary columns for this solver.
   * @returns Number of secondary columns (0 for simple mode)
   * @protected
   */
  protected getNumSecondary(): number {
    return this.numSecondary
  }
}

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
      return new ProblemSolver<T, 'complex'>(config)
    } else {
      return new ProblemSolver<T, 'simple'>(config)
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
      return new SolverTemplate<T, 'complex'>(config)
    } else {
      return new SolverTemplate<T, 'simple'>(config)
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
export class SolverTemplate<T, Mode extends SolverMode> extends ConstraintHandler<T, Mode> {
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
    const solver = new ProblemSolver<T, Mode>(this.config)
    for (const constraint of this.constraints) {
      solver.addRow(constraint)
    }
    return solver
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
export class ProblemSolver<T, Mode extends SolverMode> extends ConstraintHandler<T, Mode> {
  /**
   * Add a pre-built constraint row (used internally by templates).
   * 
   * @param row - Pre-processed constraint row
   * @returns This instance for method chaining
   * @internal
   */
  addRow(row: Row<T>): this {
    this.constraints.push(row)
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
    if (this.constraints.length === 0) {
      throw new Error('Cannot solve problem with no constraints')
    }

    const searchConfig: SearchConfig<T> = {
      numPrimary: this.getNumPrimary(),
      numSecondary: this.getNumSecondary(),
      numSolutions,
      rows: this.constraints  // Direct assignment! No transformation needed
    }
    
    return search<T>(searchConfig)
  }
}

