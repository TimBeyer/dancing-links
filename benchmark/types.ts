/**
 * Core type definitions for the modular benchmark system
 */

/**
 * Standardized constraint format that all problems output
 */
export interface StandardConstraints {
  primaryConstraints: number[][]; // Must be covered exactly once
  secondaryConstraints?: number[][]; // Can be covered at most once (optional)
  columnNames?: string[]; // Optional for debugging/display
}

/**
 * Base class for all solver implementations
 */
export abstract class Solver<TSetup = void, TPrepared = unknown> {
  protected setupResult?: TSetup;
  
  /**
   * Optional setup once per case (e.g., template creation)
   * Called outside of benchmark timing
   */
  setup?(_constraints: StandardConstraints): void {
    // Default: no setup needed
  }
  
  /**
   * Prepare constraints for this solver's format
   * Called once per case, outside of benchmark timing
   */
  abstract prepare(constraints: StandardConstraints): TPrepared;
  
  /**
   * Find all solutions
   */
  abstract solveAll(prepared: TPrepared): unknown;
  
  /**
   * Find one solution
   */
  abstract solveOne(prepared: TPrepared): unknown;
  
  /**
   * Find a specific number of solutions
   */
  abstract solveCount(prepared: TPrepared, count: number): unknown;
}

/**
 * Problem parameter types
 */
export interface SudokuParams {
  puzzle: string;
}

export interface PentominoParams {
  // Currently no parameters needed
}

export interface NQueensParams {
  n: number;
}

/**
 * Problem type discriminated union
 */
export type ProblemType = 'sudoku' | 'pentomino' | 'n-queens';

/**
 * Problem parameters mapped to their types
 */
export type ProblemParameters<T extends ProblemType> = 
  T extends 'sudoku' ? SudokuParams :
  T extends 'pentomino' ? PentominoParams :
  T extends 'n-queens' ? NQueensParams :
  never;

/**
 * Benchmark case definition with proper type inference
 */
export interface BenchmarkCase<T extends ProblemType = ProblemType, TPrepared = unknown> {
  id: string;
  name: string;
  problemType: T;
  parameters: ProblemParameters<T>;
  executeStrategy<TSolver extends Solver<any, TPrepared>>(
    solver: TSolver, 
    prepared: TPrepared
  ): unknown;
  tags: string[];
}

/**
 * Benchmark group definition
 */
export interface BenchmarkGroup {
  name: string;
  description: string;
  caseIds: string[];
  solverNames: string[];
}

/**
 * Benchmark execution options
 */
export interface BenchmarkOptions {
  includeExternal: boolean;
  jsonOutput: boolean;
  jsonFile?: string;
  quiet: boolean;
}

/**
 * Individual benchmark result
 */
export interface BenchmarkResult {
  name: string;
  opsPerSec: number;
  margin: number;
  runs: number;
  deprecated?: boolean;
}

/**
 * Benchmark section (group of related tests)
 */
export interface BenchmarkSection {
  benchmarkName: string;
  results: BenchmarkResult[];
}

/**
 * Problem definition function type
 */
export type ProblemDefinition<T extends ProblemType> = (params: ProblemParameters<T>) => StandardConstraints;

/**
 * Solver registry type
 */
export type SolverRegistry = Record<string, Solver>;

/**
 * Problem registry type with proper typing
 */
export type ProblemRegistry = {
  [K in ProblemType]: ProblemDefinition<K>;
};