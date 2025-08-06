/**
 * Internal generator-based solver implementation
 * Uses the library's generator interface for iterative solution finding
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
 * Internal solver using generator interface
 * Provides iterative solution finding with memory efficiency
 */
export class InternalGeneratorSolver extends Solver<void, SparseConstraintsBatch[]> {
  private numColumns = 0;
  /**
   * Prepare constraints in sparse format for generator operations
   * All formatting happens here, outside of benchmark timing
   */
  prepare(constraints: StandardConstraints): SparseConstraintsBatch[] {
    const flattened = flattenConstraints(constraints);
    this.numColumns = flattened.numColumns;
    
    // Convert to sparse constraint batch format expected by the library
    return flattened.rows.map((row, index) => ({
      data: index, // Use row index as data for identification
      columnIndices: row
    }));
  }
  
  /**
   * Find all solutions using generator interface
   * Collects all solutions by iterating through the generator
   */
  solveAll(prepared: SparseConstraintsBatch[]): unknown {
    const dlx = new DancingLinks();
    const solver = dlx.createSolver({ columns: this.numColumns });
    solver.addSparseConstraints(prepared);
    
    const solutions = [];
    for (const solution of solver.createGenerator()) {
      solutions.push(solution);
    }
    return solutions;
  }
  
  /**
   * Find one solution using generator interface
   * Returns the first solution from the generator
   */
  solveOne(prepared: SparseConstraintsBatch[]): unknown {
    const dlx = new DancingLinks();
    const solver = dlx.createSolver({ columns: this.numColumns });
    solver.addSparseConstraints(prepared);
    
    const generator = solver.createGenerator();
    const result = generator.next();
    return result.done ? null : result.value;
  }
  
  /**
   * Find a specific number of solutions using generator interface
   * Iterates through generator until count is reached or exhausted
   */
  solveCount(prepared: SparseConstraintsBatch[], count: number): unknown {
    const dlx = new DancingLinks();
    const solver = dlx.createSolver({ columns: this.numColumns });
    solver.addSparseConstraints(prepared);
    
    const solutions = [];
    for (const solution of solver.createGenerator()) {
      solutions.push(solution);
      if (solutions.length >= count) break;
    }
    return solutions;
  }
}