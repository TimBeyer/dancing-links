/**
 * Benchmark case definitions
 * Each case defines a specific problem scenario and execution strategy
 */

import { BenchmarkCase } from '../types.js'

/**
 * All benchmark cases available in the system
 * Cases can be selected by groups using their IDs in the matrix configuration
 */
export const cases = {
  'sudoku-hard': {
    id: 'sudoku-hard',
    name: 'All solutions to the sudoku',
    problemType: 'sudoku',
    parameters: {
      puzzle: '..............3.85..1.2.......5.7.....4...1...9.......5......73..2.1........4...9'
    },
    executeStrategy: (solver, prepared) => solver.solveAll(prepared)
  } satisfies BenchmarkCase<'sudoku'>,

  'pentomino-1': {
    id: 'pentomino-1',
    name: 'Finding one pentomino tiling on a 6x10 field',
    problemType: 'pentomino',
    parameters: {},
    executeStrategy: (solver, prepared) => solver.solveOne(prepared)
  } satisfies BenchmarkCase<'pentomino'>,

  'pentomino-10': {
    id: 'pentomino-10',
    name: 'Finding ten pentomino tilings on a 6x10 field',
    problemType: 'pentomino',
    parameters: {},
    executeStrategy: (solver, prepared) => solver.solveCount(prepared, 10)
  } satisfies BenchmarkCase<'pentomino'>,

  'pentomino-100': {
    id: 'pentomino-100',
    name: 'Finding one hundred pentomino tilings on a 6x10 field',
    problemType: 'pentomino',
    parameters: {},
    executeStrategy: (solver, prepared) => solver.solveCount(prepared, 100)
  } satisfies BenchmarkCase<'pentomino'>
} as const

export type CaseId = keyof typeof cases
