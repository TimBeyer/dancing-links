/**
 * Internal sparse constraint solver implementation
 * Uses the library's sparse constraint format for optimal performance
 */

import { Solver, StandardConstraints } from '../types.js'
import { flattenConstraints } from '../utils/converters.js'
import { DancingLinks } from '../../index.js'

/**
 * Format for sparse constraints batch operations
 */
interface SparseConstraintsBatch {
  data: unknown
  columnIndices: number[]
}

/**
 * Prepared constraint data including column count
 */
interface PreparedSparseConstraints {
  numColumns: number
  constraints: SparseConstraintsBatch[]
}

/**
 * Internal solver using sparse constraint format
 * This is typically the fastest interface for our library
 */
export class DancingLinksSparseSolver extends Solver<void, PreparedSparseConstraints> {
  static readonly name = 'dancing-links (sparse)'

  /**
   * Prepare constraints in sparse format for batch operations
   * All formatting happens here, outside of benchmark timing
   */
  prepare(constraints: StandardConstraints): PreparedSparseConstraints {
    const flattened = flattenConstraints(constraints)

    // Convert to sparse constraint batch format expected by the library
    const sparseConstraints = flattened.rows.map((row, index) => ({
      data: index, // Use row index as data for identification
      columnIndices: row
    }))

    return {
      numColumns: flattened.numColumns,
      constraints: sparseConstraints
    }
  }

  /**
   * Find all solutions using sparse constraints
   */
  solveAll(prepared: PreparedSparseConstraints): unknown {
    const dlx = new DancingLinks()
    const solver = dlx.createSolver({ columns: prepared.numColumns })
    solver.addSparseConstraints(prepared.constraints)
    return solver.findAll()
  }

  /**
   * Find one solution using sparse constraints
   */
  solveOne(prepared: PreparedSparseConstraints): unknown {
    const dlx = new DancingLinks()
    const solver = dlx.createSolver({ columns: prepared.numColumns })
    solver.addSparseConstraints(prepared.constraints)
    return solver.findOne()
  }

  /**
   * Find a specific number of solutions using sparse constraints
   */
  solveCount(prepared: PreparedSparseConstraints, count: number): unknown {
    const dlx = new DancingLinks()
    const solver = dlx.createSolver({ columns: prepared.numColumns })
    solver.addSparseConstraints(prepared.constraints)
    return solver.find(count)
  }
}
