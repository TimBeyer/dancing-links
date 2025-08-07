/**
 * Fast solver for Dancing Links exact cover problems with batch constraint optimization.
 *
 * Optimized for performance when all constraints are known upfront by:
 * - Skipping intermediate Row<T>[] storage
 * - Direct conversion from sparse constraints to NodeStore/ColumnStore
 * - Single-pass memory allocation with exact capacity calculation
 * - Bypassing constraint handler overhead
 */

import {
  Result,
  FastSolver,
  SparseConstraintBatch
} from '../types/interfaces.js'
import { search } from '../core/algorithm.js'
import { ProblemBuilder } from '../core/problem-builder.js'

export class FastSolverImpl<T> implements FastSolver<T> {
  constructor(
    private readonly numPrimary: number,
    private readonly numSecondary: number,
    private readonly sparseConstraints: Array<{ data: T; coveredColumns: number[] }>
  ) {}

  findOne(): Result<T>[][] {
    return this.solve(1)
  }

  findAll(): Result<T>[][] {
    return this.solve(Infinity)
  }

  find(numSolutions: number): Result<T>[][] {
    return this.solve(numSolutions)
  }

  *createGenerator(): Generator<Result<T>[], void, unknown> {
    if (this.sparseConstraints.length === 0) {
      throw new Error('Cannot solve problem with no constraints')
    }

    // Build search context directly from sparse constraints - key optimization!
    const context = ProblemBuilder.buildContextFromSparse({
      numPrimary: this.numPrimary,
      numSecondary: this.numSecondary,
      sparseConstraints: this.sparseConstraints
    })

    // Keep calling search with numSolutions: 1 until exhausted
    while (true) {
      const solutions = search<T>(context, 1)
      if (solutions.length === 0) break
      yield solutions[0]
    }
  }

  private solve(numSolutions: number): Result<T>[][] {
    if (this.sparseConstraints.length === 0) {
      throw new Error('Cannot solve problem with no constraints')
    }

    // Build search context directly from sparse constraints - key optimization!
    const context = ProblemBuilder.buildContextFromSparse({
      numPrimary: this.numPrimary,
      numSecondary: this.numSecondary,
      sparseConstraints: this.sparseConstraints
    })

    return search<T>(context, numSolutions)
  }
}

/**
 * Fast solver factory functions for direct sparse constraint processing
 */
export namespace FastSolverFactory {
  /**
   * Create a fast solver from sparse constraints in simple mode
   */
  export function createSimple<T>(
    columns: number,
    sparseConstraints: SparseConstraintBatch<T, 'simple'>
  ): FastSolver<T> {
    // Convert sparse constraints to internal format (no Row<T> objects!)
    const constraintData = sparseConstraints.map(constraint => ({
      data: constraint.data,
      coveredColumns: constraint.columnIndices as number[]
    }))

    return new FastSolverImpl<T>(columns, 0, constraintData)
  }

  /**
   * Create a fast solver from sparse constraints in complex mode
   */
  export function createComplex<T>(
    primaryColumns: number,
    secondaryColumns: number,
    sparseConstraints: SparseConstraintBatch<T, 'complex'>
  ): FastSolver<T> {
    // Convert complex sparse constraints to internal format (no Row<T> objects!)
    const constraintData = sparseConstraints.map(constraint => {
      const indices = constraint.columnIndices as { primary: number[], secondary: number[] }
      // Combine primary and secondary columns (secondary columns are offset)
      const coveredColumns = [
        ...indices.primary,
        ...indices.secondary.map(col => col + primaryColumns)
      ].sort((a, b) => a - b)

      return {
        data: constraint.data,
        coveredColumns
      }
    })

    return new FastSolverImpl<T>(primaryColumns, secondaryColumns, constraintData)
  }
}