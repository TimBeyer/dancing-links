/**
 * Solver registry
 * Central registration of all available solvers
 */

// Dancing Links solver imports
import { DancingLinksSparseSolver } from '../solvers/InternalSparseSolver.js'
import { DancingLinksBinarySolver } from '../solvers/InternalBinarySolver.js'
import { DancingLinksTemplateSolver } from '../solvers/InternalTemplateSolver.js'
import { DancingLinksGeneratorSolver } from '../solvers/InternalGeneratorSolver.js'
import { DancingLinksFastSolver } from '../solvers/InternalFastSolver.js'

// External library solver imports
import { DlxlibSolver } from '../solvers/ExternalDlxlibSolver.js'
import { DanceSolver } from '../solvers/ExternalDanceSolver.js'
import { DancingLinksAlgorithmSolver } from '../solvers/ExternalDancingLinksAlgorithmSolver.js'

/**
 * Registry of all available solver classes
 * Maps short IDs to solver classes for matrix configuration
 */
export const solvers = {
  sparse: DancingLinksSparseSolver,
  binary: DancingLinksBinarySolver,
  template: DancingLinksTemplateSolver,
  generator: DancingLinksGeneratorSolver,
  fast: DancingLinksFastSolver,
  dlxlib: DlxlibSolver,
  dance: DanceSolver,
  'dancing-links-algorithm': DancingLinksAlgorithmSolver
} as const

export type SolverId = keyof typeof solvers

// Helper arrays for common solver groupings
export const internalSolvers: readonly SolverId[] = ['sparse', 'binary', 'template', 'generator', 'fast']
export const externalSolvers: readonly SolverId[] = ['dlxlib', 'dance', 'dancing-links-algorithm']
export const externalSolversWithoutDancingLinksAlgorithm: readonly SolverId[] = ['dlxlib', 'dance']
