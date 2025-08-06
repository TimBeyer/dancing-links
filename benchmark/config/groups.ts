/**
 * Benchmark group definitions
 * Groups define which cases and solvers to run for different scenarios
 */

import { DancingLinksSparseSolver } from '../solvers/InternalSparseSolver.js'
import { BenchmarkGroup } from '../types.js'
import { getDancingLinksSolverNames, getExternalSolverNames } from './solvers.js'

/**
 * All benchmark groups available in the system
 * Different groups are used for different scenarios (release, PR, development)
 */
export const groups: BenchmarkGroup[] = [
  {
    name: 'release',
    description: 'Release benchmarks: sparse vs all external libraries',
    caseIds: ['sudoku-hard', 'pentomino-1', 'pentomino-10', 'pentomino-100'],
    solverNames: [
      DancingLinksSparseSolver.name, // Only our fastest interface for competitive comparison
      ...getExternalSolverNames()
    ]
  },

  {
    name: 'pr',
    description: 'PR benchmarks: all internal interfaces for regression testing',
    caseIds: ['sudoku-hard', 'pentomino-1', 'pentomino-10', 'pentomino-100'],
    solverNames: getDancingLinksSolverNames()
  },

  {
    name: 'full',
    description: 'Full benchmarks: everything vs everything',
    caseIds: ['sudoku-hard', 'pentomino-1', 'pentomino-10', 'pentomino-100'],
    solverNames: [...getDancingLinksSolverNames(), ...getExternalSolverNames()]
  }

  // Future groups can be added for specific scenarios:
  // - 'internal-only': All internal solvers, all cases
  // - 'external-only': All external solvers, all cases
  // - 'template-focus': Template vs other internal solvers
  // - 'single-solution': Only cases that find one solution
  // - 'multiple-solution': Only cases that find multiple solutions
]
