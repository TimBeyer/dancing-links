/**
 * Internal template-based solver implementation
 * Pre-compiles constraints into a reusable template for maximum performance
 */

import { Solver, StandardConstraints } from '../types.js';
import { flattenConstraints } from '../utils/converters.js';
import { DancingLinks } from '../../index.js';

/**
 * Template instance from the Dancing Links library
 */
type SolverTemplate = any; // ReturnType<ReturnType<typeof DancingLinks>['createSolverTemplate']>;

/**
 * Solver instance from a template
 */
type TemplateSolver = ReturnType<SolverTemplate['createSolver']>;

/**
 * Internal solver using template-based constraint pre-compilation
 * Fastest for repeated solving of the same constraint set
 */
export class DancingLinksTemplateSolver extends Solver<SolverTemplate, TemplateSolver> {
  static readonly name = 'dancing-links template';
  /**
   * Setup template once per case with pre-compiled constraints
   * This is the expensive operation done outside of benchmark timing
   */
  setup(constraints: StandardConstraints): void {
    const flattened = flattenConstraints(constraints);
    const dlx = new DancingLinks();
    const template = dlx.createSolverTemplate({ columns: flattened.numColumns });
    
    // Convert to sparse constraint batch format for template
    const sparseConstraints = flattened.rows.map((row, index) => ({
      data: index,
      columnIndices: row
    }));
    
    template.addSparseConstraints(sparseConstraints);
    this.setupResult = template;
  }
  
  /**
   * Create a new solver instance from the pre-compiled template
   * This is very fast since constraints are already compiled
   */
  prepare(_constraints: StandardConstraints): TemplateSolver {
    if (!this.setupResult) {
      throw new Error('Template not set up - setup() must be called first');
    }
    return this.setupResult.createSolver();
  }
  
  /**
   * Find all solutions using template-based solver
   */
  solveAll(solver: TemplateSolver): unknown {
    return solver.findAll();
  }
  
  /**
   * Find one solution using template-based solver
   */
  solveOne(solver: TemplateSolver): unknown {
    return solver.findOne();
  }
  
  /**
   * Find a specific number of solutions using template-based solver
   */
  solveCount(solver: TemplateSolver, count: number): unknown {
    return solver.find(count);
  }
}