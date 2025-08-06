/**
 * Benchmark group definitions
 * Groups define matrices of case/solver combinations for different benchmark scenarios
 */

import type { CaseId } from './cases.js'
import type { SolverId } from './solvers.js'
import {
  internalSolvers,
  externalSolvers,
  externalSolversWithoutDancingLinksAlgorithm
} from './solvers.js'

type BenchmarkMatrix = Record<CaseId, readonly SolverId[]>

interface BenchmarkGroup {
  readonly name: string
  readonly description: string
  readonly matrix: BenchmarkMatrix
}

/**
 * All benchmark groups available in the system
 * Groups are selected via CLI arguments and define explicit solver-case combinations
 */
export const groups = {
  internal: {
    name: 'internal',
    description:
      'Internal solver benchmarks: regression testing across all internal implementations',
    matrix: {
      'sudoku-hard': internalSolvers,
      'pentomino-1': internalSolvers,
      'pentomino-10': internalSolvers,
      'pentomino-100': internalSolvers
    }
  },

  competitive: {
    name: 'competitive',
    description: 'Competitive benchmarks: our main solvers vs external libraries',
    matrix: {
      'sudoku-hard': ['sparse', 'binary', ...externalSolvers],
      'pentomino-1': ['sparse', 'binary', ...externalSolversWithoutDancingLinksAlgorithm],
      'pentomino-10': ['sparse', 'binary', ...externalSolversWithoutDancingLinksAlgorithm],
      'pentomino-100': ['sparse', 'binary', ...externalSolversWithoutDancingLinksAlgorithm]
    }
  },

  comprehensive: {
    name: 'comprehensive',
    description:
      'Comprehensive benchmarks: detailed analysis across all viable solver-case combinations',
    matrix: {
      'sudoku-hard': [...internalSolvers, ...externalSolvers],
      'pentomino-1': [...internalSolvers, ...externalSolversWithoutDancingLinksAlgorithm],
      'pentomino-10': [...internalSolvers, ...externalSolversWithoutDancingLinksAlgorithm],
      'pentomino-100': [...internalSolvers, ...externalSolversWithoutDancingLinksAlgorithm]
    }
  }
} as const satisfies Record<string, BenchmarkGroup>

export type GroupId = keyof typeof groups

/**
 * Get group by name with error handling
 */
export function getGroup(name: string): BenchmarkGroup | undefined {
  return groups[name as GroupId]
}
