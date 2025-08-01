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
