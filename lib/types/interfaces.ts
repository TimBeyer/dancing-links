export class Row<T> {
  constructor(
    public coveredColumns: number[],
    public data: T
  ) {}
}

export interface Result<T> {
  data: T
  index: number
}

export type BinaryNumber = 0 | 1

// SearchConfig removed - now handled by ProblemBuilder interface

export interface SimpleConstraint<T = any> {
  row: BinaryNumber[]
  data: T
}

export interface ComplexConstraint<T = any> {
  primaryRow: BinaryNumber[]
  secondaryRow: BinaryNumber[]
  data: T
}

/**
 * Sparse constraint format (RECOMMENDED for performance)
 * 2-4x faster than binary format, better caching performance
 */
export interface SparseConstraint<T = any> {
  data: T
  columns: number[]
}

/**
 * Binary constraint format (for compatibility)
 */
export type BinaryConstraint<T = any> = SimpleConstraint<T> | ComplexConstraint<T>

/**
 * Solver configuration interfaces
 */
export interface SimpleSolverConfig {
  columns: number
}

export interface ComplexSolverConfig {
  primaryColumns: number
  secondaryColumns: number
}

export type SolverConfig = SimpleSolverConfig | ComplexSolverConfig

/**
 * Type guards for solver configurations
 */
export function isComplexSolverConfig(config: SolverConfig): config is ComplexSolverConfig {
  return 'secondaryColumns' in config
}

/**
 * Complex constraint formats for type-safe solvers
 */
export interface ComplexSparseConstraint<T = any> {
  data: T
  primary: number[]
  secondary: number[]
}

export interface ComplexBinaryConstraint<T = any> {
  data: T
  primaryRow: BinaryNumber[]
  secondaryRow: BinaryNumber[]
}

/**
 * Solver mode type definition
 */
export type SolverMode = 'simple' | 'complex'

/**
 * Mode-dependent type definitions for clean, descriptive API signatures
 */
export type SparseColumnIndices<Mode extends SolverMode> = Mode extends 'complex'
  ? { primary: number[]; secondary: number[] }
  : number[]

export type BinaryColumnValues<Mode extends SolverMode> = Mode extends 'complex'
  ? { primaryRow: BinaryNumber[]; secondaryRow: BinaryNumber[] }
  : BinaryNumber[]

/**
 * Mode-dependent config type mapping
 */
export type ConfigForMode<Mode extends SolverMode> = Mode extends 'complex'
  ? ComplexSolverConfig
  : SimpleSolverConfig

/**
 * Batch constraint types for clean API signatures
 */
export type SparseConstraintBatch<T, Mode extends SolverMode> = Array<{
  data: T
  columnIndices: SparseColumnIndices<Mode>
}>

export type BinaryConstraintBatch<T, Mode extends SolverMode> = Array<{
  data: T
  columnValues: BinaryColumnValues<Mode>
}>

/**
 * Interface for constraint handling with type-safe operations
 * Provides zero runtime branching through delegation pattern
 */
export interface ConstraintHandler<T, Mode extends SolverMode> {
  readonly mode: Mode
  validateConstraints(): this
  addSparseConstraint(data: T, columnIndices: SparseColumnIndices<Mode>): this
  addSparseConstraints(constraints: SparseConstraintBatch<T, Mode>): this
  addBinaryConstraint(data: T, columnValues: BinaryColumnValues<Mode>): this
  addBinaryConstraints(constraints: BinaryConstraintBatch<T, Mode>): this
  addRow(row: Row<T>): this
  addRows(rows: Row<T>[]): this
  getConstraints(): Row<T>[]
  getNumPrimary(): number
  getNumSecondary(): number
  getConfig(): ConfigForMode<Mode>
  isValidationEnabled(): boolean
}
