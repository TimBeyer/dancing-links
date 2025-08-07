/**
 * Internal fast solver implementation
 * Uses the optimized createFastSolver interface for batch constraint processing
 * This solver bypasses the normal constraint handler system for maximum performance
 */

import { Solver, StandardConstraints } from '../types.js'
import { flattenConstraints } from '../utils/converters.js'
import { DancingLinks } from '../../index.js'

/**
 * Prepared constraint data for fast solver including column count
 */
interface PreparedFastConstraints {
  numColumns: number
  sparseConstraints: Array<{ data: unknown; columnIndices: number[] }>
}

/**
 * Fast solver using optimized createFastSolver interface
 * This solver creates the solver with all constraints upfront, eliminating
 * intermediate Row<T>[] storage and constraint handler overhead
 */
export class DancingLinksFastSolver extends Solver<void, PreparedFastConstraints> {
  static readonly name = 'dancing-links (fast)'

  /**
   * Prepare constraints in fast solver format for batch operations
   * All formatting happens here, outside of benchmark timing
   */
  prepare(constraints: StandardConstraints): PreparedFastConstraints {
    const flattened = flattenConstraints(constraints)

    // Convert to sparse constraint batch format for fast solver
    const sparseConstraints = flattened.rows.map((row, index) => ({
      data: index, // Use row index as data for identification
      columnIndices: row
    }))

    return {
      numColumns: flattened.numColumns,
      sparseConstraints
    }
  }

  /**
   * Find all solutions using fast solver
   */
  solveAll(prepared: PreparedFastConstraints): unknown {
    const dlx = new DancingLinks()
    const solver = dlx.createFastSolver({
      columns: prepared.numColumns,
      sparseConstraints: prepared.sparseConstraints
    })
    return solver.findAll()
  }

  /**
   * Find one solution using fast solver
   */
  solveOne(prepared: PreparedFastConstraints): unknown {
    const dlx = new DancingLinks()
    const solver = dlx.createFastSolver({
      columns: prepared.numColumns,
      sparseConstraints: prepared.sparseConstraints
    })
    return solver.findOne()
  }

  /**
   * Find a specific number of solutions using fast solver
   */
  solveCount(prepared: PreparedFastConstraints, count: number): unknown {
    const dlx = new DancingLinks()
    const solver = dlx.createFastSolver({
      columns: prepared.numColumns,
      sparseConstraints: prepared.sparseConstraints
    })
    return solver.find(count)
  }
}