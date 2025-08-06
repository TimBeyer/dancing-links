/**
 * Solver registry
 * Central registration of all available solvers
 */

import { SolverRegistry } from '../types.js';

// Internal solver imports
import { InternalSparseSolver } from '../solvers/InternalSparseSolver.js';
import { InternalBinarySolver } from '../solvers/InternalBinarySolver.js';
import { InternalTemplateSolver } from '../solvers/InternalTemplateSolver.js';
import { InternalGeneratorSolver } from '../solvers/InternalGeneratorSolver.js';

// External solver imports  
import { ExternalDlxlibSolver } from '../solvers/ExternalDlxlibSolver.js';
import { ExternalDanceSolver } from '../solvers/ExternalDanceSolver.js';
import { ExternalDancingLinksAlgorithmSolver } from '../solvers/ExternalDancingLinksAlgorithmSolver.js';

/**
 * Registry of all available solvers
 * Solvers are instantiated once and reused across benchmarks
 */
export const solvers: SolverRegistry = {
  // Internal solvers - our library's different interfaces
  'internal-binary': new InternalBinarySolver(),
  'internal-sparse': new InternalSparseSolver(),
  'internal-template': new InternalTemplateSolver(),
  'internal-generator': new InternalGeneratorSolver(),
  
  // External solvers - competing libraries
  'external-dlxlib': new ExternalDlxlibSolver(),
  'external-dance': new ExternalDanceSolver(),
  'external-dancing-links-algorithm': new ExternalDancingLinksAlgorithmSolver()
};

/**
 * Get solver by name with type safety
 */
export function getSolver(name: string) {
  const solver = solvers[name];
  if (!solver) {
    throw new Error(`Solver '${name}' not found in registry`);
  }
  return solver;
}

/**
 * Get all solver names
 */
export function getSolverNames(): string[] {
  return Object.keys(solvers);
}

/**
 * Get internal solver names only
 */
export function getInternalSolverNames(): string[] {
  return Object.keys(solvers).filter(name => name.startsWith('internal-'));
}

/**
 * Get external solver names only  
 */
export function getExternalSolverNames(): string[] {
  return Object.keys(solvers).filter(name => name.startsWith('external-'));
}