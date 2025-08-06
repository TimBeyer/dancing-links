/**
 * External dancing-links-algorithm solver implementation
 * Uses the dancing-links-algorithm library for Dancing Links solving
 */

/// <reference path="../types.d.ts" />

import { Solver, StandardConstraints } from '../types.js'
import { convertToBinary, validateSecondarySupport } from '../utils/converters.js'
import * as dancingLinksAlgorithm from 'dancing-links-algorithm'

/**
 * External solver using dancing-links-algorithm library
 * Does not support secondary constraints
 * Note: This library only supports finding all solutions (no count limiting)
 */
export class DancingLinksAlgorithmSolver extends Solver<void, number[][]> {
  static readonly name = 'dancing-links-algorithm'
  /**
   * Prepare constraints in binary matrix format for dancing-links-algorithm
   * dancing-links-algorithm expects plain binary arrays (0-indexed)
   */
  prepare(constraints: StandardConstraints): number[][] {
    // Validate that dancing-links-algorithm can handle these constraints
    validateSecondarySupport(constraints, 'external-dancing-links-algorithm')

    // Convert to binary matrix format expected by dancing-links-algorithm
    return convertToBinary(constraints)
  }

  /**
   * Find all solutions using dancing-links-algorithm
   */
  solveAll(plainRows: number[][]): unknown {
    return dancingLinksAlgorithm.solve(plainRows)
  }

  /**
   * Find one solution using dancing-links-algorithm
   * Note: This library doesn't support limiting solutions, so we get all and take first
   * This makes it less efficient for single-solution benchmarks
   */
  solveOne(plainRows: number[][]): unknown {
    const allSolutions = dancingLinksAlgorithm.solve(plainRows)
    return Array.isArray(allSolutions) && allSolutions.length > 0 ? [allSolutions[0]] : allSolutions
  }

  /**
   * Find a specific number of solutions using dancing-links-algorithm
   * Note: This library doesn't support limiting solutions, so we get all and slice
   * This makes it less efficient for limited-count benchmarks
   */
  solveCount(plainRows: number[][], count: number): unknown {
    const allSolutions = dancingLinksAlgorithm.solve(plainRows)
    if (Array.isArray(allSolutions)) {
      return allSolutions.slice(0, count)
    }
    return allSolutions
  }
}
