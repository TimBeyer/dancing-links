/**
 * Internal generator-based solver implementation
 * Uses the library's generator interface for iterative solution finding
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
interface PreparedGeneratorConstraints {
  numColumns: number
  constraints: SparseConstraintsBatch[]
}

/**
 * Internal solver using generator interface
 * Provides iterative solution finding with memory efficiency
 */
export class DancingLinksGeneratorSolver extends Solver<void, PreparedGeneratorConstraints> {
  static readonly name = 'dancing-links generator'

  /**
   * Prepare constraints in sparse format for generator operations
   * All formatting happens here, outside of benchmark timing
   */
  prepare(constraints: StandardConstraints): PreparedGeneratorConstraints {
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
   * Find all solutions using generator interface
   * Collects all solutions by iterating through the generator
   */
  solveAll(prepared: PreparedGeneratorConstraints): unknown {
    const dlx = new DancingLinks()
    const solver = dlx.createSolver({ columns: prepared.numColumns })
    solver.addSparseConstraints(prepared.constraints)

    const solutions = []
    for (const solution of solver.createGenerator()) {
      solutions.push(solution)
    }
    return solutions
  }

  /**
   * Find one solution using generator interface
   * Returns the first solution from the generator
   */
  solveOne(prepared: PreparedGeneratorConstraints): unknown {
    const dlx = new DancingLinks()
    const solver = dlx.createSolver({ columns: prepared.numColumns })
    solver.addSparseConstraints(prepared.constraints)

    const generator = solver.createGenerator()
    const result = generator.next()
    return result.done ? null : result.value
  }

  /**
   * Find a specific number of solutions using generator interface
   * Iterates through generator until count is reached or exhausted
   */
  solveCount(prepared: PreparedGeneratorConstraints, count: number): unknown {
    const dlx = new DancingLinks()
    const solver = dlx.createSolver({ columns: prepared.numColumns })
    solver.addSparseConstraints(prepared.constraints)

    const solutions = []
    for (const solution of solver.createGenerator()) {
      solutions.push(solution)
      if (solutions.length >= count) break
    }
    return solutions
  }
}
