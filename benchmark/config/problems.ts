/**
 * Problem registry
 * Central registration of all available problem definitions
 */

import { ProblemRegistry, ProblemDefinition } from '../types.js';

// Problem definition imports
import { generateSudokuConstraints } from '../problems/sudoku.js';
import { generatePentominoConstraints } from '../problems/pentomino.js';

/**
 * Registry of all available problem definitions
 * Maps problem type names to their constraint generation functions
 */
export const problems: ProblemRegistry = {
  sudoku: generateSudokuConstraints as ProblemDefinition<unknown>,
  pentomino: generatePentominoConstraints as ProblemDefinition<unknown>
  
  // Future problems can be added here:
  // 'n-queens': generateNQueensConstraints,
  // 'latin-square': generateLatinSquareConstraints,
  // 'graph-coloring': generateGraphColoringConstraints
};

/**
 * Get problem definition by name with type safety
 */
export function getProblem(name: string) {
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