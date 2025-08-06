/**
 * Solver registry
 * Central registration of all available solvers
 */

import { SolverRegistry } from '../types.js';

// Dancing Links solver imports
import { DancingLinksSparseSolver } from '../solvers/InternalSparseSolver.js';
import { DancingLinksBinarySolver } from '../solvers/InternalBinarySolver.js';
import { DancingLinksTemplateSolver } from '../solvers/InternalTemplateSolver.js';
import { DancingLinksGeneratorSolver } from '../solvers/InternalGeneratorSolver.js';

// External library solver imports  
import { DlxlibSolver } from '../solvers/ExternalDlxlibSolver.js';
import { DanceSolver } from '../solvers/ExternalDanceSolver.js';
import { DancingLinksAlgorithmSolver } from '../solvers/ExternalDancingLinksAlgorithmSolver.js';

// Create solver instances
const dancingLinksBinary = new DancingLinksBinarySolver();
const dancingLinksSparse = new DancingLinksSparseSolver();
const dancingLinksTemplate = new DancingLinksTemplateSolver();
const dancingLinksGenerator = new DancingLinksGeneratorSolver();
const dlxlib = new DlxlibSolver();
const dance = new DanceSolver();
const dancingLinksAlgorithm = new DancingLinksAlgorithmSolver();

/**
 * Registry of all available solvers
 * Uses the static name property from each solver class
 */
export const solvers: SolverRegistry = {
  [DancingLinksBinarySolver.name]: dancingLinksBinary,
  [DancingLinksSparseSolver.name]: dancingLinksSparse,
  [DancingLinksTemplateSolver.name]: dancingLinksTemplate,
  [DancingLinksGeneratorSolver.name]: dancingLinksGenerator,
  [DlxlibSolver.name]: dlxlib,
  [DanceSolver.name]: dance,
  [DancingLinksAlgorithmSolver.name]: dancingLinksAlgorithm
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
 * Get Dancing Links solver names (our library)
 */
export function getDancingLinksSolverNames(): string[] {
  return [
    DancingLinksBinarySolver.name,
    DancingLinksSparseSolver.name,
    DancingLinksTemplateSolver.name,
    DancingLinksGeneratorSolver.name
  ];
}

/**
 * Get external library solver names
 */
export function getExternalSolverNames(): string[] {
  return [
    DlxlibSolver.name,
    DanceSolver.name,
    DancingLinksAlgorithmSolver.name
  ];
}