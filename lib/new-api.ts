/**
 * New High-Performance Caching API for Dancing Links
 * 
 * Provides constraint-level caching and template-based problem solving
 * to eliminate redundant constraint encoding operations.
 */

import { Constraint, Result, SearchConfig } from './interfaces.js'
import { search } from './index.js'

/**
 * Processed constraint with cached sparse representation
 */
interface ProcessedConstraint<T = any> {
  readonly data: T
  readonly coveredColumns: number[]
  readonly hash: string
}

// TODO: Internal search configuration (will be used when integrating with search)
// interface InternalSearchConfig<T = any> {
//   readonly numPrimary: number
//   readonly numSecondary: number
//   readonly rows: ProcessedConstraint<T>[]
// }

/**
 * Main factory class that manages constraint caching
 */
export class DancingLinks {
  private constraintCache = new Map<string, ProcessedConstraint>()

  /**
   * Create a new problem solver instance
   */
  createSolver<T = any>(): ProblemSolver<T> {
    return new ProblemSolver<T>(this.constraintCache)
  }

  /**
   * Create a new solver template for reusable constraint sets
   */
  createSolverTemplate<T = any>(): SolverTemplate<T> {
    return new SolverTemplate<T>(this.constraintCache)
  }
}

/**
 * Template for reusable constraint sets
 */
export class SolverTemplate<T = any> {
  private baseConstraints: ProcessedConstraint<T>[] = []

  constructor(private constraintCache: Map<string, ProcessedConstraint>) {}

  /**
   * Add a constraint to the template
   */
  addConstraint(constraint: Constraint<T>): this {
    const processed = this.processConstraint(constraint)
    this.baseConstraints.push(processed)
    return this
  }

  /**
   * Create a solver with template constraints pre-loaded
   */
  createSolver(): ProblemSolver<T> {
    const solver = new ProblemSolver<T>(this.constraintCache)
    for (const constraint of this.baseConstraints) {
      solver.addProcessedConstraint(constraint)
    }
    return solver
  }

  private processConstraint(constraint: Constraint<T>): ProcessedConstraint<T> {
    const hash = this.hashConstraint(constraint)
    
    if (!this.constraintCache.has(hash)) {
      const processed = this.convertToProcessed(constraint)
      this.constraintCache.set(hash, processed)
    }
    
    return this.constraintCache.get(hash)! as ProcessedConstraint<T>
  }

  private hashConstraint(constraint: Constraint<T>): string {
    // Simple hash based on constraint structure (not data)
    // This allows caching constraints with same pattern but different data
    if ('row' in constraint) {
      return `simple:${constraint.row.join(',')}`
    } else {
      return `complex:${constraint.primaryRow.join(',')};${constraint.secondaryRow.join(',')}`
    }
  }

  private convertToProcessed(constraint: Constraint<T>): ProcessedConstraint<T> {
    const hash = this.hashConstraint(constraint)
    let coveredColumns: number[]

    if ('row' in constraint) {
      coveredColumns = []
      for (let i = 0; i < constraint.row.length; i++) {
        if (constraint.row[i] === 1) {
          coveredColumns.push(i)
        }
      }
    } else {
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
    }

    return {
      data: constraint.data,
      coveredColumns,
      hash
    }
  }
}

/**
 * Problem solver with lazy compilation and caching
 */
export class ProblemSolver<T = any> {
  private constraints: ProcessedConstraint<T>[] = []

  constructor(private constraintCache: Map<string, ProcessedConstraint>) {}

  /**
   * Add a constraint to the problem
   */
  addConstraint(constraint: Constraint<T>): this {
    const processed = this.processConstraint(constraint)
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

  private solve(numSolutions: number): Result<T>[][] {
    if (this.constraints.length === 0) {
      throw new Error('Cannot solve problem with no constraints')
    }

    const searchConfig = this.buildSearchConfig(numSolutions)
    return search<T>(searchConfig)
  }

  private buildSearchConfig(numSolutions: number): SearchConfig<T> {
    // Analyze constraints to determine matrix dimensions
    let numPrimary = 0
    let maxColumn = -1

    for (const constraint of this.constraints) {
      for (const col of constraint.coveredColumns) {
        if (col > maxColumn) {
          maxColumn = col
        }
      }
    }

    numPrimary = maxColumn + 1

    // Convert ProcessedConstraints to the Row format expected by SearchConfig
    const rows = []
    for (const constraint of this.constraints) {
      rows.push({
        data: constraint.data,
        coveredColumns: constraint.coveredColumns
      })
    }

    return {
      numPrimary,
      numSecondary: 0, // For now, only support simple constraints
      numSolutions,
      rows
    }
  }

  private processConstraint(constraint: Constraint<T>): ProcessedConstraint<T> {
    const hash = this.hashConstraint(constraint)
    
    if (!this.constraintCache.has(hash)) {
      const processed = this.convertToProcessed(constraint)
      this.constraintCache.set(hash, processed)
    }
    
    return this.constraintCache.get(hash)! as ProcessedConstraint<T>
  }

  private hashConstraint(constraint: Constraint<T>): string {
    if ('row' in constraint) {
      return `simple:${constraint.row.join(',')}`
    } else {
      return `complex:${constraint.primaryRow.join(',')};${constraint.secondaryRow.join(',')}`
    }
  }

  private convertToProcessed(constraint: Constraint<T>): ProcessedConstraint<T> {
    const hash = this.hashConstraint(constraint)
    let coveredColumns: number[]

    if ('row' in constraint) {
      coveredColumns = []
      for (let i = 0; i < constraint.row.length; i++) {
        if (constraint.row[i] === 1) {
          coveredColumns.push(i)
        }
      }
    } else {
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
    }

    return {
      data: constraint.data,
      coveredColumns,
      hash
    }
  }
}