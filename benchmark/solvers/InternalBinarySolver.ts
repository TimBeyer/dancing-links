/**
 * Internal binary constraint solver implementation
 * Uses the library's binary constraint format
 */

import { Solver, StandardConstraints } from '../types.js'
import { convertToBinary } from '../utils/converters.js'
import { DancingLinks } from '../../index.js'

/**
 * Format for binary constraints batch operations
 */
interface BinaryConstraintsBatch {
  data: unknown
  columnValues: (0 | 1)[]
}

/**
 * Prepared constraint data including column count
 */
interface PreparedBinaryConstraints {
  numColumns: number
  constraints: BinaryConstraintsBatch[]
}

/**
 * Internal solver using binary constraint format
 */
export class DancingLinksBinarySolver extends Solver<void, PreparedBinaryConstraints> {
  static readonly name = 'dancing-links (binary)'

  /**
   * Prepare constraints in binary format for batch operations
   * All formatting happens here, outside of benchmark timing
   */
  prepare(constraints: StandardConstraints): PreparedBinaryConstraints {
    const binaryMatrix = convertToBinary(constraints)
    const numColumns = binaryMatrix.length > 0 ? binaryMatrix[0].length : 0

    // Convert to binary constraint batch format expected by the library
    const binaryConstraints = binaryMatrix.map((row, index) => ({
      data: index, // Use row index as data for identification
      columnValues: row as (0 | 1)[]
    }))

    return {
      numColumns,
      constraints: binaryConstraints
    }
  }

  /**
   * Find all solutions using binary constraints
   */
  solveAll(prepared: PreparedBinaryConstraints): unknown {
    const dlx = new DancingLinks()
    const solver = dlx.createSolver({ columns: prepared.numColumns })
    solver.addBinaryConstraints(prepared.constraints)
    return solver.findAll()
  }

  /**
   * Find one solution using binary constraints
   */
  solveOne(prepared: PreparedBinaryConstraints): unknown {
    const dlx = new DancingLinks()
    const solver = dlx.createSolver({ columns: prepared.numColumns })
    solver.addBinaryConstraints(prepared.constraints)
    return solver.findOne()
  }

  /**
   * Find a specific number of solutions using binary constraints
   */
  solveCount(prepared: PreparedBinaryConstraints, count: number): unknown {
    const dlx = new DancingLinks()
    const solver = dlx.createSolver({ columns: prepared.numColumns })
    solver.addBinaryConstraints(prepared.constraints)
    return solver.find(count)
  }
}
