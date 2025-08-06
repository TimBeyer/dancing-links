/**
 * Internal sparse constraint solver implementation
 * Uses the library's sparse constraint format for optimal performance
 */

import { Solver, StandardConstraints } from '../types.js';
import { flattenConstraints } from '../utils/converters.js';
import { DancingLinks } from '../../index.js';

/**
 * Format for sparse constraints batch operations
 */
interface SparseConstraintsBatch {
  data: unknown;
  columnIndices: number[];
}

/**
 * Internal solver using sparse constraint format
 * This is typically the fastest interface for our library
 */
export class InternalSparseSolver extends Solver<void, SparseConstraintsBatch[]> {
  private numColumns = 0;
  
  /**
   * Prepare constraints in sparse format for batch operations
   * All formatting happens here, outside of benchmark timing
   */
  prepare(constraints: StandardConstraints): SparseConstraintsBatch[] {
    const flattened = flattenConstraints(constraints);
    this.numColumns = flattened.numColumns; // Store for solve methods
    
    // Convert to sparse constraint batch format expected by the library
    return flattened.rows.map((row, index) => ({
      data: index, // Use row index as data for identification
      columnIndices: row
    }));
  }
  
  /**
   * Find all solutions using sparse constraints
   */
  solveAll(prepared: SparseConstraintsBatch[]): unknown {
    const dlx = new DancingLinks();
    const solver = dlx.createSolver({ columns: this.numColumns });
    solver.addSparseConstraints(prepared);
    return solver.findAll();
  }
  
  /**
   * Find one solution using sparse constraints
   */
  solveOne(prepared: SparseConstraintsBatch[]): unknown {
    const dlx = new DancingLinks();
    const solver = dlx.createSolver({ columns: this.numColumns });
    solver.addSparseConstraints(prepared);
    return solver.findOne();
  }
  
  /**
   * Find a specific number of solutions using sparse constraints
   */
  solveCount(prepared: SparseConstraintsBatch[], count: number): unknown {
    const dlx = new DancingLinks();
    const solver = dlx.createSolver({ columns: this.numColumns });
    solver.addSparseConstraints(prepared);
    return solver.find(count);
  }
}