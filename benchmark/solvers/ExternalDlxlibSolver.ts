/**
 * External dlxlib solver implementation
 * Uses the dlxlib library for Dancing Links solving
 */

/// <reference path="../types.d.ts" />

import { Solver, StandardConstraints } from '../types.js';
import { convertToBinary, validateSecondarySupport } from '../utils/converters.js';
import * as dlxlib from 'dlxlib';

/**
 * External solver using dlxlib library
 * Does not support secondary constraints
 */
export class ExternalDlxlibSolver extends Solver<void, number[][]> {
  /**
   * Prepare constraints in binary matrix format for dlxlib
   * dlxlib expects plain binary arrays (0-indexed)
   */
  prepare(constraints: StandardConstraints): number[][] {
    // Validate that dlxlib can handle these constraints
    validateSecondarySupport(constraints, 'external-dlxlib');
    
    // Convert to binary matrix format expected by dlxlib
    return convertToBinary(constraints);
  }
  
  /**
   * Find all solutions using dlxlib
   */
  solveAll(plainRows: number[][]): unknown {
    return dlxlib.solve(plainRows);
  }
  
  /**
   * Find one solution using dlxlib
   * Uses the fourth parameter to limit solutions
   */
  solveOne(plainRows: number[][]): unknown {
    return dlxlib.solve(plainRows, null, null, 1);
  }
  
  /**
   * Find a specific number of solutions using dlxlib
   * Uses the fourth parameter to limit solutions
   */
  solveCount(plainRows: number[][], count: number): unknown {
    return dlxlib.solve(plainRows, null, null, count);
  }
}