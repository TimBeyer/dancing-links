/**
 * External dance solver implementation
 * Uses the dance library for Dancing Links solving
 */

/// <reference path="../types.d.ts" />

import { Solver, StandardConstraints } from '../types.js';
import { convertToBinary, validateSecondarySupport } from '../utils/converters.js';
import * as dance from 'dance';

/**
 * External solver using dance library
 * Does not support secondary constraints
 */
export class DanceSolver extends Solver<void, number[][]> {
  static readonly name = 'dance';
  /**
   * Prepare constraints in binary matrix format for dance
   * dance expects plain binary arrays (0-indexed)
   */
  prepare(constraints: StandardConstraints): number[][] {
    // Validate that dance can handle these constraints
    validateSecondarySupport(constraints, 'external-dance');
    
    // Convert to binary matrix format expected by dance
    return convertToBinary(constraints);
  }
  
  /**
   * Find all solutions using dance
   * dance.solve with empty options finds all solutions
   */
  solveAll(plainRows: number[][]): unknown {
    return dance.solve(plainRows, {});
  }
  
  /**
   * Find one solution using dance
   * Uses maxSolutions option to limit results
   */
  solveOne(plainRows: number[][]): unknown {
    return dance.solve(plainRows, { maxSolutions: 1 });
  }
  
  /**
   * Find a specific number of solutions using dance
   * Uses maxSolutions option to limit results
   */
  solveCount(plainRows: number[][], count: number): unknown {
    return dance.solve(plainRows, { maxSolutions: count });
  }
}