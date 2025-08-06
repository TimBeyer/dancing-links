/**
 * Problem registry
 * Central registration of all available problem definitions
 */

import { ProblemRegistry } from '../types.js';

// Problem definition imports
import { generateSudokuConstraints } from '../problems/sudoku/definition.js';
import { generatePentominoConstraints } from '../problems/pentomino/definition.js';

/**
 * Registry of all available problem definitions
 * Maps problem type names to their constraint generation functions
 */
export const problems: ProblemRegistry = {
  sudoku: generateSudokuConstraints,
  pentomino: generatePentominoConstraints,
  'n-queens': (() => { throw new Error('N-Queens not implemented yet'); }) as any // TODO: implement
};

/**
 * Get problem definition by name with type safety
 */
export function getProblem<T extends keyof ProblemRegistry>(name: T): ProblemRegistry[T] {
  const problem = problems[name];
  if (!problem) {
    throw new Error(`Problem '${name}' not found in registry`);
  }
  return problem;
}

/**
 * Get all problem names
 */
export function getProblemNames(): string[] {
  return Object.keys(problems);
}