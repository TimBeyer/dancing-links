/**
 * New High-Performance Caching API for Dancing Links
 * 
 * Provides constraint-level caching and template-based problem solving
 * to eliminate redundant constraint encoding operations.
 */

import { 
  Constraint, 
  BinaryConstraint,
  SparseConstraint,
  BinaryNumber,
  Result, 
  SearchConfig,
  SolverConfig,
  SimpleSolverConfig,
  ComplexSolverConfig,
  ComplexSparseConstraint,
  ComplexBinaryConstraint,
  isSimpleConstraint,
  isComplexConstraint,
  isSparseConstraint,
  isComplexSparseConstraint,
  isComplexSolverConfig
} from './interfaces.js'
import { search } from './index.js'

/**
 * Processed constraint with cached sparse representation
 */
interface ProcessedConstraint<T = any> {
  readonly data: T
  readonly coveredColumns: number[]
  readonly hash: string
  readonly isComplex?: boolean
  readonly primaryColumns?: number[]
  readonly secondaryColumns?: number[]
}

/**
 * Main factory class that manages constraint caching
 */
export class DancingLinks {
  private constraintCache = new Map<string, ProcessedConstraint>()

  /**
   * Create a new problem solver instance (simple - columns only)
   */
  createSolver<T = any>(config: SimpleSolverConfig): ProblemSolver<T, 'simple'>

  /**
   * Create a new problem solver instance (complex - primary + secondary)
   */
  createSolver<T = any>(config: ComplexSolverConfig): ProblemSolver<T, 'complex'>

  createSolver<T = any>(config: SolverConfig): ProblemSolver<T, any> {
    if (isComplexSolverConfig(config)) {
      return new ProblemSolver<T, 'complex'>(this.constraintCache, config)
    } else {
      return new ProblemSolver<T, 'simple'>(this.constraintCache, config)
    }
  }

  /**
   * Create a new solver template for reusable constraint sets (simple - columns only)
   */
  createSolverTemplate<T = any>(config: SimpleSolverConfig): SolverTemplate<T, 'simple'>

  /**
   * Create a new solver template for reusable constraint sets (complex - primary + secondary)
   */
  createSolverTemplate<T = any>(config: ComplexSolverConfig): SolverTemplate<T, 'complex'>

  createSolverTemplate<T = any>(config: SolverConfig): SolverTemplate<T, any> {
    if (isComplexSolverConfig(config)) {
      return new SolverTemplate<T, 'complex'>(this.constraintCache, config)
    } else {
      return new SolverTemplate<T, 'simple'>(this.constraintCache, config)
    }
  }
}

/**
 * Template for reusable constraint sets
 */
export class SolverTemplate<T = any, Mode extends 'simple' | 'complex' = 'simple'> {
  private baseConstraints: ProcessedConstraint<T>[] = []

  constructor(
    private constraintCache: Map<string, ProcessedConstraint>,
    private config: SolverConfig
  ) {}

  /**
   * Add constraint using efficient sparse format (RECOMMENDED)
   * 2-4x faster than binary format, better caching performance
   * @example template.addSparseConstraint("baseRule1", [0, 4, 7])
   */
  addSparseConstraint(
    data: T,
    columns: Mode extends 'complex' 
      ? ComplexSparseConstraint<T>['primary'] extends never 
        ? { primary: number[], secondary: number[] }
        : { primary: number[], secondary: number[] }
      : number[]
  ): this {
    // Validate dimensions
    this.validateSparseConstraint(columns)

    let sparseConstraint: SparseConstraint<T> | ComplexSparseConstraint<T>
    
    if (isComplexSolverConfig(this.config)) {
      const complexColumns = columns as { primary: number[], secondary: number[] }
      sparseConstraint = { data, ...complexColumns }
    } else {
      sparseConstraint = { data, columns: columns as number[] }
    }

    const processed = ConstraintProcessor.process(sparseConstraint, this.constraintCache)
    this.baseConstraints.push(processed)
    return this
  }

  /**
   * Add constraint using binary format (for compatibility)
   * Consider using addSparseConstraint() for better performance
   * @example template.addBinaryConstraint("baseRule1", [1, 0, 0, 0, 1, 0, 0, 1])
   */
  addBinaryConstraint(
    data: T,
    row: Mode extends 'complex'
      ? { primaryRow: BinaryNumber[], secondaryRow: BinaryNumber[] }
      : BinaryNumber[]
  ): this {
    // Validate dimensions
    this.validateBinaryConstraint(row)

    let binaryConstraint: BinaryConstraint<T> | ComplexBinaryConstraint<T>
    
    if (isComplexSolverConfig(this.config)) {
      const complexRow = row as { primaryRow: BinaryNumber[], secondaryRow: BinaryNumber[] }
      binaryConstraint = { data, ...complexRow }
    } else {
      binaryConstraint = { data, row: row as BinaryNumber[] }
    }

    const processed = ConstraintProcessor.process(binaryConstraint, this.constraintCache)
    this.baseConstraints.push(processed)
    return this
  }


  /**
   * Create a solver with template constraints pre-loaded
   * Uses the same configuration as the template
   */
  createSolver(): ProblemSolver<T, Mode> {
    const solver = new ProblemSolver<T, Mode>(this.constraintCache, this.config)
    for (const constraint of this.baseConstraints) {
      solver.addProcessedConstraint(constraint)
    }
    return solver
  }

  private validateSparseConstraint(columns: any): void {
    if (isComplexSolverConfig(this.config)) {
      const { primary, secondary } = columns as { primary: number[], secondary: number[] }
      
      for (const col of primary) {
        if (col < 0 || col >= this.config.primaryColumns) {
          throw new Error(`Primary column index ${col} exceeds primaryColumns limit of ${this.config.primaryColumns}`)
        }
      }
      
      for (const col of secondary) {
        if (col < 0 || col >= this.config.secondaryColumns) {
          throw new Error(`Secondary column index ${col} exceeds secondaryColumns limit of ${this.config.secondaryColumns}`)
        }
      }
    } else {
      const cols = columns as number[]
      for (const col of cols) {
        if (col < 0 || col >= this.config.columns) {
          throw new Error(`Column index ${col} exceeds columns limit of ${this.config.columns}`)
        }
      }
    }
  }

  private validateBinaryConstraint(row: any): void {
    if (isComplexSolverConfig(this.config)) {
      const { primaryRow, secondaryRow } = row as { primaryRow: BinaryNumber[], secondaryRow: BinaryNumber[] }
      
      if (primaryRow.length !== this.config.primaryColumns) {
        throw new Error(`Primary row length ${primaryRow.length} does not match primaryColumns ${this.config.primaryColumns}`)
      }
      
      if (secondaryRow.length !== this.config.secondaryColumns) {
        throw new Error(`Secondary row length ${secondaryRow.length} does not match secondaryColumns ${this.config.secondaryColumns}`)
      }
    } else {
      const binaryRow = row as BinaryNumber[]
      if (binaryRow.length !== this.config.columns) {
        throw new Error(`Row length ${binaryRow.length} does not match columns ${this.config.columns}`)
      }
    }
  }
}

/**
 * Problem solver with type-safe constraint handling and dimension enforcement
 */
export class ProblemSolver<T = any, Mode extends 'simple' | 'complex' = 'simple'> {
  private constraints: ProcessedConstraint<T>[] = []

  constructor(
    private constraintCache: Map<string, ProcessedConstraint>,
    private config: SolverConfig
  ) {}

  /**
   * Add constraint using efficient sparse format (RECOMMENDED)
   * 2-4x faster than binary format, better caching performance
   */
  addSparseConstraint(
    data: T,
    columns: Mode extends 'complex' 
      ? ComplexSparseConstraint<T>['primary'] extends never 
        ? { primary: number[], secondary: number[] }
        : { primary: number[], secondary: number[] }
      : number[]
  ): this {
    // Validate dimensions
    this.validateSparseConstraint(columns)

    let sparseConstraint: SparseConstraint<T> | ComplexSparseConstraint<T>
    
    if (isComplexSolverConfig(this.config)) {
      const complexColumns = columns as { primary: number[], secondary: number[] }
      sparseConstraint = { data, ...complexColumns }
    } else {
      sparseConstraint = { data, columns: columns as number[] }
    }

    const processed = ConstraintProcessor.process(sparseConstraint, this.constraintCache)
    this.constraints.push(processed)
    return this
  }

  /**
   * Add constraint using binary format (for compatibility)
   * Consider using addSparseConstraint() for better performance
   */
  addBinaryConstraint(
    data: T,
    row: Mode extends 'complex'
      ? { primaryRow: BinaryNumber[], secondaryRow: BinaryNumber[] }
      : BinaryNumber[]
  ): this {
    // Validate dimensions
    this.validateBinaryConstraint(row)

    let binaryConstraint: BinaryConstraint<T> | ComplexBinaryConstraint<T>
    
    if (isComplexSolverConfig(this.config)) {
      const complexRow = row as { primaryRow: BinaryNumber[], secondaryRow: BinaryNumber[] }
      binaryConstraint = { data, ...complexRow }
    } else {
      binaryConstraint = { data, row: row as BinaryNumber[] }
    }

    const processed = ConstraintProcessor.process(binaryConstraint, this.constraintCache)
    this.constraints.push(processed)
    return this
  }


  /**
   * Add a pre-processed constraint (used internally by templates)
   */
  addProcessedConstraint(constraint: ProcessedConstraint<T>): this {
    this.constraints.push(constraint)
    return this
  }

  /**
   * Find one solution
   */
  findOne(): Result<T>[][] {
    return this.solve(1)
  }

  /**
   * Find all solutions
   */
  findAll(): Result<T>[][] {
    return this.solve(Infinity)
  }

  /**
   * Find specified number of solutions
   */
  find(numSolutions: number): Result<T>[][] {
    return this.solve(numSolutions)
  }

  private validateSparseConstraint(columns: any): void {
    if (isComplexSolverConfig(this.config)) {
      const { primary, secondary } = columns as { primary: number[], secondary: number[] }
      
      for (const col of primary) {
        if (col < 0 || col >= this.config.primaryColumns) {
          throw new Error(`Primary column index ${col} exceeds primaryColumns limit of ${this.config.primaryColumns}`)
        }
      }
      
      for (const col of secondary) {
        if (col < 0 || col >= this.config.secondaryColumns) {
          throw new Error(`Secondary column index ${col} exceeds secondaryColumns limit of ${this.config.secondaryColumns}`)
        }
      }
    } else {
      const cols = columns as number[]
      for (const col of cols) {
        if (col < 0 || col >= this.config.columns) {
          throw new Error(`Column index ${col} exceeds columns limit of ${this.config.columns}`)
        }
      }
    }
  }

  private validateBinaryConstraint(row: any): void {
    if (isComplexSolverConfig(this.config)) {
      const { primaryRow, secondaryRow } = row as { primaryRow: BinaryNumber[], secondaryRow: BinaryNumber[] }
      
      if (primaryRow.length !== this.config.primaryColumns) {
        throw new Error(`Primary row length ${primaryRow.length} does not match primaryColumns ${this.config.primaryColumns}`)
      }
      
      if (secondaryRow.length !== this.config.secondaryColumns) {
        throw new Error(`Secondary row length ${secondaryRow.length} does not match secondaryColumns ${this.config.secondaryColumns}`)
      }
    } else {
      const binaryRow = row as BinaryNumber[]
      if (binaryRow.length !== this.config.columns) {
        throw new Error(`Row length ${binaryRow.length} does not match columns ${this.config.columns}`)
      }
    }
  }

  private solve(numSolutions: number): Result<T>[][] {
    if (this.constraints.length === 0) {
      throw new Error('Cannot solve problem with no constraints')
    }

    const searchConfig = this.buildSearchConfig(numSolutions)
    return search<T>(searchConfig)
  }

  private buildSearchConfig(numSolutions: number): SearchConfig<T> {
    let numPrimary: number
    let numSecondary: number

    if (isComplexSolverConfig(this.config)) {
      numPrimary = this.config.primaryColumns
      numSecondary = this.config.secondaryColumns
    } else {
      numPrimary = this.config.columns
      numSecondary = 0
    }

    // Convert ProcessedConstraints to the Row format expected by SearchConfig
    const rows = []
    for (const constraint of this.constraints) {
      let coveredColumns = constraint.coveredColumns
      
      // Handle complex constraints that need column offset calculation
      if (constraint.isComplex && constraint.primaryColumns && constraint.secondaryColumns) {
        const primaryCols = [...constraint.primaryColumns]
        const secondaryCols = constraint.secondaryColumns.map(col => col + numPrimary)
        coveredColumns = primaryCols.concat(secondaryCols)
      }
      
      rows.push({
        data: constraint.data,
        coveredColumns
      })
    }

    return {
      numPrimary,
      numSecondary,
      numSolutions,
      rows
    }
  }
}

/**
 * Utility class for processing constraints with caching
 */
class ConstraintProcessor {
  static process<T>(constraint: Constraint<T> | ComplexSparseConstraint<T> | ComplexBinaryConstraint<T>, cache: Map<string, ProcessedConstraint>): ProcessedConstraint<T> {
    const hash = this.hashConstraint(constraint)
    
    if (!cache.has(hash)) {
      const processed = this.convertToProcessed(constraint)
      cache.set(hash, processed)
    }
    
    return cache.get(hash)! as ProcessedConstraint<T>
  }

  private static hashConstraint<T>(constraint: Constraint<T> | ComplexSparseConstraint<T> | ComplexBinaryConstraint<T>): string {
    if (isSparseConstraint(constraint)) {
      // Fast sparse hashing - already in optimal format
      return `sparse:${constraint.columns.join(',')}`
    } else if (isComplexSparseConstraint(constraint)) {
      // ComplexSparseConstraint
      return `complex-sparse:${constraint.primary.join(',')};${constraint.secondary.join(',')}`
    } else if (isSimpleConstraint(constraint)) {
      return `simple:${constraint.row.join(',')}`
    } else if (isComplexConstraint(constraint)) {
      return `complex:${constraint.primaryRow.join(',')};${constraint.secondaryRow.join(',')}`
    } else {
      throw new Error('Unknown constraint type')
    }
  }

  private static convertToProcessed<T>(constraint: Constraint<T> | ComplexSparseConstraint<T> | ComplexBinaryConstraint<T>): ProcessedConstraint<T> {
    const hash = this.hashConstraint(constraint)
    let coveredColumns: number[]

    if (isSparseConstraint(constraint)) {
      // Already sparse - no conversion needed!
      coveredColumns = constraint.columns
    } else if (isComplexSparseConstraint(constraint)) {
      // ComplexSparseConstraint - store separately for proper processing later
      return {
        data: constraint.data,
        coveredColumns: [], // Will be calculated during buildSearchConfig
        hash,
        isComplex: true,
        primaryColumns: [...constraint.primary],
        secondaryColumns: [...constraint.secondary]
      }
    } else if (isSimpleConstraint(constraint)) {
      // Binary to sparse conversion
      coveredColumns = []
      for (let i = 0; i < constraint.row.length; i++) {
        if (constraint.row[i] === 1) {
          coveredColumns.push(i)
        }
      }
    } else if (isComplexConstraint(constraint)) {
      // Complex binary to sparse conversion
      const primaryColumns = []
      for (let i = 0; i < constraint.primaryRow.length; i++) {
        if (constraint.primaryRow[i] === 1) {
          primaryColumns.push(i)
        }
      }
      
      const secondaryColumns = []
      for (let i = 0; i < constraint.secondaryRow.length; i++) {
        if (constraint.secondaryRow[i] === 1) {
          secondaryColumns.push(i + constraint.primaryRow.length)
        }
      }
      
      coveredColumns = primaryColumns.concat(secondaryColumns)
    } else {
      throw new Error('Unknown constraint type')
    }

    return {
      data: (constraint as any).data,
      coveredColumns,
      hash
    }
  }
}