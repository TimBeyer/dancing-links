/**
 * Internal binary constraint solver implementation
 * Uses the library's binary constraint format
 */

import { Solver, StandardConstraints } from '../types.js';
import { convertToBinary } from '../utils/converters.js';
import { DancingLinks } from '../../index.js';

/**
 * Format for binary constraints batch operations
 */
interface BinaryConstraintsBatch {
  data: unknown;
  columnValues: (0 | 1)[];
}

/**
 * Internal solver using binary constraint format
 */
export class InternalBinarySolver extends Solver<void, BinaryConstraintsBatch[]> {
  private numColumns = 0;
  /**
   * Prepare constraints in binary format for batch operations
   * All formatting happens here, outside of benchmark timing
   */
  prepare(constraints: StandardConstraints): BinaryConstraintsBatch[] {
    const binaryMatrix = convertToBinary(constraints);
    this.numColumns = binaryMatrix.length > 0 ? binaryMatrix[0].length : 0;
    
    // Convert to binary constraint batch format expected by the library
    return binaryMatrix.map((row, index) => ({
      data: index, // Use row index as data for identification
      columnValues: row as (0 | 1)[]
    }));
  }
  
  /**
   * Find all solutions using binary constraints
   */
  solveAll(prepared: BinaryConstraintsBatch[]): unknown {
    const dlx = new DancingLinks();
    const solver = dlx.createSolver({ columns: this.numColumns });
    solver.addBinaryConstraints(prepared);
    return solver.findAll();
  }
  
  /**
   * Find one solution using binary constraints
   */
  solveOne(prepared: BinaryConstraintsBatch[]): unknown {
    const dlx = new DancingLinks();
    const solver = dlx.createSolver({ columns: this.numColumns });
    solver.addBinaryConstraints(prepared);
    return solver.findOne();
  }
  
  /**
   * Find a specific number of solutions using binary constraints
   */
  solveCount(prepared: BinaryConstraintsBatch[], count: number): unknown {
    const dlx = new DancingLinks();
    const solver = dlx.createSolver({ columns: this.numColumns });
    solver.addBinaryConstraints(prepared);
    return solver.find(count);
  }
}