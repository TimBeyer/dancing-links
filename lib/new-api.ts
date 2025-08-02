/**
 * High-Performance Template-Based API for Dancing Links
 * 
 * Provides template-based problem solving to enable constraint reuse
 * across multiple problem instances with optimal performance.
 * 
 * DESIGN PHILOSOPHY:
 * 
 * This implementation prioritizes runtime performance and simplicity by eliminating
 * unnecessary caching infrastructure while maintaining powerful constraint reuse
 * capabilities through templates.
 * 
 * KEY OPTIMIZATIONS:
 * 
 * 1. SINGLE-PASS CONSTRAINT PROCESSING:
 *    - Validates input constraints while simultaneously building final output
 *    - Eliminates separate validation phases that duplicate iteration
 *    - Builds Row objects directly without intermediate transformations
 * 
 * 2. ZERO-COPY SPARSE FORMAT HANDLING:
 *    - Builds final coveredColumns array directly during validation
 *    - Eliminates array cloning since input arrays are never mutated
 *    - Applies column offsets during construction rather than post-processing
 * 
 * 3. OPTIMIZED BINARY-TO-SPARSE CONVERSION:
 *    - Converts binary constraints to sparse format during validation
 *    - Eliminates intermediate constraint object creation
 *    - Direct conversion without separate processing phases
 * 
 * 4. TEMPLATE-BASED CONSTRAINT REUSE:
 *    - SolverTemplate captures constraint patterns for reuse
 *    - Multiple solvers can be created from the same template
 *    - Eliminates redundant constraint encoding for similar problems
 * 
 * NO CACHING COMPLEXITY:
 * This design deliberately avoids constraint-level caching because:
 * - Hash generation requires full constraint iteration (same cost as processing)
 * - Most constraints are unique (different data), making cache hit rates low
 * - Templates provide better reuse patterns for real-world scenarios
 * - Simpler code is easier to maintain and debug
 * 
 * PERFORMANCE CHARACTERISTICS:
 * - Minimal allocations due to direct Row object construction
 * - Single iteration per constraint for validation + processing
 * - Better cache locality from unified memory access patterns
 * - Optimized for constraint-heavy algorithms (N-Queens, Sudoku, Pentomino)
 * 
 * USAGE PATTERNS:
 * - Use ProblemSolver for one-off constraint sets
 * - Use SolverTemplate when solving multiple similar problems
 * - Templates handle the real-world constraint reuse scenarios efficiently
 */

import { 
  BinaryNumber,
  Result, 
  SearchConfig,
  Row,
  SolverConfig,
  SparseColumnIndices,
  BinaryColumnValues,
  SolverMode,
  ConfigToMode,
  isComplexSolverConfig
} from './interfaces.js'
import { search } from './index.js'


/**
 * Shared constraint handling logic for both ProblemSolver and SolverTemplate
 */
abstract class ConstraintHandler<T, Mode extends SolverMode = 'simple'> {
  protected constraints: Row<T>[] = []

  constructor(
    protected config: SolverConfig
  ) {}

  /**
   * Add constraint using efficient sparse format (RECOMMENDED)
   * 
   * PERFORMANCE OPTIMIZED: Single-pass validation + processing
   * - Validates column indices while building final coveredColumns array
   * - Builds output directly without intermediate copies or caching overhead
   * - Better cache locality from unified memory access patterns
   */
  addSparseConstraint(data: T, columnIndices: SparseColumnIndices<Mode>): this {
    if (isComplexSolverConfig(this.config)) {
      // Complex mode: separate primary and secondary column handling
      const { primary, secondary } = columnIndices as { primary: number[], secondary: number[] }
      const numPrimary = this.config.primaryColumns
      
      // Validate primary columns (no copying needed)
      for (let i = 0; i < primary.length; i++) {
        const col = primary[i]
        if (col < 0 || col >= numPrimary) {
          throw new Error(`Primary column index ${col} exceeds primaryColumns limit of ${numPrimary}`)
        }
      }
      
      // Validate secondary columns and build with offset
      const coveredColumns: number[] = [...primary] // Copy primary directly
      for (let i = 0; i < secondary.length; i++) {
        const col = secondary[i]
        if (col < 0 || col >= this.config.secondaryColumns) {
          throw new Error(`Secondary column index ${col} exceeds secondaryColumns limit of ${this.config.secondaryColumns}`)
        }
        coveredColumns.push(col + numPrimary) // Apply offset for secondary columns
      }
      
      this.constraints.push({ data, coveredColumns })
      
    } else {
      // Simple mode: validate input and pass through directly
      const columns = columnIndices as number[]
      const columnLimit = this.config.columns
      
      // Validate bounds only - input is already in correct sparse format
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i]
        if (col < 0 || col >= columnLimit) {
          throw new Error(`Column index ${col} exceeds columns limit of ${columnLimit}`)
        }
      }
      
      // Use input array directly as coveredColumns (no copying needed)
      this.constraints.push({ data, coveredColumns: columns })
    }
    
    return this
  }

  /**
   * Add constraint using binary format (for compatibility)
   * 
   * PERFORMANCE OPTIMIZED: Single-pass validation + binary-to-sparse conversion
   * - Validates array lengths upfront (quick O(1) checks)
   * - Converts binary to sparse format while building final coveredColumns
   * - Direct sparse conversion without intermediate allocations or caching overhead
   */
  addBinaryConstraint(data: T, columnValues: BinaryColumnValues<Mode>): this {
    if (isComplexSolverConfig(this.config)) {
      // Complex mode: separate primary and secondary row handling
      const { primaryRow, secondaryRow } = columnValues as { primaryRow: BinaryNumber[], secondaryRow: BinaryNumber[] }
      
      // Quick validation: check array lengths first (O(1) operations)
      if (primaryRow.length !== this.config.primaryColumns) {
        throw new Error(`Primary row length ${primaryRow.length} does not match primaryColumns ${this.config.primaryColumns}`)
      }
      if (secondaryRow.length !== this.config.secondaryColumns) {
        throw new Error(`Secondary row length ${secondaryRow.length} does not match secondaryColumns ${this.config.secondaryColumns}`)
      }
      
      // Single-pass: convert binary to sparse
      const coveredColumns: number[] = []
      
      // Process primary row: convert 1s to column indices
      for (let i = 0; i < primaryRow.length; i++) {
        if (primaryRow[i] === 1) {
          coveredColumns.push(i)
        }
      }
      
      // Process secondary row: convert 1s to column indices (with offset)
      for (let i = 0; i < secondaryRow.length; i++) {
        if (secondaryRow[i] === 1) {
          coveredColumns.push(i + primaryRow.length) // Apply offset for secondary columns
        }
      }
      
      this.constraints.push({ data, coveredColumns })
      
    } else {
      // Simple mode: single binary row handling
      const row = columnValues as BinaryNumber[]
      
      // Quick validation: check array length first (O(1) operation)
      if (row.length !== this.config.columns) {
        throw new Error(`Row length ${row.length} does not match columns ${this.config.columns}`)
      }
      
      // Single-pass: convert binary to sparse
      const coveredColumns: number[] = []
      
      // Process row: convert 1s to column indices
      for (let i = 0; i < row.length; i++) {
        if (row[i] === 1) {
          coveredColumns.push(i)
        }
      }
      
      this.constraints.push({ data, coveredColumns })
    }
    
    return this
  }


  protected getNumPrimary(): number {
    return isComplexSolverConfig(this.config) ? this.config.primaryColumns : this.config.columns
  }

  protected getNumSecondary(): number {
    return isComplexSolverConfig(this.config) ? this.config.secondaryColumns : 0
  }
}

/**
 * Main factory class for creating Dancing Links solvers and templates
 */
export class DancingLinks<T> {

  /**
   * Create a new problem solver instance with type-safe mode inference
   */
  createSolver<C extends SolverConfig>(config: C): ProblemSolver<T, ConfigToMode<C>> {
    if (isComplexSolverConfig(config)) {
      return new ProblemSolver<T, 'complex'>(config) as ProblemSolver<T, ConfigToMode<C>>
    } else {
      return new ProblemSolver<T, 'simple'>(config) as ProblemSolver<T, ConfigToMode<C>>
    }
  }

  /**
   * Create a new solver template for reusable constraint sets with type-safe mode inference
   */
  createSolverTemplate<C extends SolverConfig>(config: C): SolverTemplate<T, ConfigToMode<C>> {
    if (isComplexSolverConfig(config)) {
      return new SolverTemplate<T, 'complex'>(config) as SolverTemplate<T, ConfigToMode<C>>
    } else {
      return new SolverTemplate<T, 'simple'>(config) as SolverTemplate<T, ConfigToMode<C>>
    }
  }
}

/**
 * Template for reusable constraint sets
 */
export class SolverTemplate<T, Mode extends SolverMode = 'simple'> extends ConstraintHandler<T, Mode> {
  /**
   * Create a solver with template constraints pre-loaded
   * Uses the same configuration as the template
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
 * Problem solver with type-safe constraint handling and dimension enforcement
 */
export class ProblemSolver<T, Mode extends SolverMode = 'simple'> extends ConstraintHandler<T, Mode> {
  /**
   * Add a pre-built row (used internally by templates)
   */
  addRow(row: Row<T>): this {
    this.constraints.push(row)
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

    const searchConfig: SearchConfig<T> = {
      numPrimary: this.getNumPrimary(),
      numSecondary: this.getNumSecondary(),
      numSolutions,
      rows: this.constraints  // Direct assignment! No transformation needed
    }
    
    return search<T>(searchConfig)
  }
}

