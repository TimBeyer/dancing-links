/**
 * Benchmark case definitions
 * Each case defines a specific problem scenario and execution strategy
 */

import { BenchmarkCase } from '../types.js';

/**
 * All benchmark cases available in the system
 * Cases can be selected by groups using their IDs and tags
 */
export const cases: BenchmarkCase[] = [
  {
    id: 'sudoku-hard',
    name: 'A solution to the sudoku',
    problemType: 'sudoku',
    parameters: { 
      puzzle: '..............3.85..1.2.......5.7.....4...1...9.......5......73..2.1........4...9' 
    },
    executeStrategy: (solver, prepared) => solver.solveAll(prepared),
    tags: ['sudoku', 'single-solution', 'pr-suitable', 'release-suitable']
  },
  
  {
    id: 'pentomino-1',
    name: 'Finding one pentomino tiling on a 6x10 field',
    problemType: 'pentomino',
    parameters: {},
    executeStrategy: (solver, prepared) => solver.solveOne(prepared),
    tags: ['pentomino', 'single-solution', 'quick', 'pr-suitable', 'release-suitable']
  },
  
  {
    id: 'pentomino-10',
    name: 'Finding ten pentomino tilings on a 6x10 field',
    problemType: 'pentomino',
    parameters: {},
    executeStrategy: (solver, prepared) => solver.solveCount(prepared, 10),
    tags: ['pentomino', 'multiple-solutions', 'medium', 'pr-suitable', 'release-suitable']
  },
  
  {
    id: 'pentomino-100',
    name: 'Finding one hundred pentomino tilings on a 6x10 field',
    problemType: 'pentomino',
    parameters: {},
    executeStrategy: (solver, prepared) => solver.solveCount(prepared, 100),
    tags: ['pentomino', 'multiple-solutions', 'intensive', 'pr-suitable', 'release-suitable']
  }
  
  // Future cases can be added here:
  // - N-Queens variants
  // - Different sudoku difficulties  
  // - Different pentomino field sizes
  // - Custom constraint problems
];