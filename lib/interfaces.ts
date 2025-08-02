export interface Row<T> {
  coveredColumns: number[]
  data: T
}

export interface Result<T> {
  data: T
  index: number
}

export type BinaryNumber = 0 | 1

export interface SearchConfig<T = any> {
  numPrimary: number
  numSecondary: number
  numSolutions: number
  rows: Row<T>[]
}

export interface SimpleConstraint<T = any> {
  row: BinaryNumber[]
  data: T
}

export interface ComplexConstraint<T = any> {
  primaryRow: BinaryNumber[]
  secondaryRow: BinaryNumber[]
  data: T
}

export function isSimpleConstraint(arg: any): arg is SimpleConstraint {
  return arg.row !== undefined
}

export function isComplexConstraint(arg: any): arg is ComplexConstraint {
  return arg.primaryRow !== undefined && arg.secondaryRow !== undefined
}

export function isSparseConstraint(arg: any): arg is SparseConstraint {
  return arg.columns !== undefined && Array.isArray(arg.columns)
}

export function isComplexSparseConstraint(arg: any): arg is ComplexSparseConstraint {
  return arg.primary !== undefined && arg.secondary !== undefined && Array.isArray(arg.primary) && Array.isArray(arg.secondary)
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

export type Constraint<T = any> = BinaryConstraint<T> | SparseConstraint<T>

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
 * Mode-dependent type definitions for clean, descriptive API signatures
 */
export type SparseColumnIndices<Mode extends 'simple' | 'complex'> = 
  Mode extends 'complex' 
    ? { primary: number[], secondary: number[] }
    : number[]

export type BinaryColumnValues<Mode extends 'simple' | 'complex'> = 
  Mode extends 'complex'
    ? { primaryRow: BinaryNumber[], secondaryRow: BinaryNumber[] }
    : BinaryNumber[]
