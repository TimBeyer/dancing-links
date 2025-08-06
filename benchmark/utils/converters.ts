/**
 * Constraint format conversion utilities
 */

import { StandardConstraints } from '../types.js'

/**
 * Result of flattening constraints with column assignments
 */
export interface FlattenedConstraints {
  numColumns: number
  rows: number[][]
  primaryColumns: number
}

/**
 * Flatten primary and secondary constraints into a single constraint matrix
 * with proper column number assignments
 */
export function flattenConstraints(constraints: StandardConstraints): FlattenedConstraints {
  const primaryRows = constraints.primaryConstraints
  const secondaryRows = constraints.secondaryConstraints || []

  // Calculate number of primary columns
  const primaryColumns = primaryRows.length > 0 ? Math.max(0, ...primaryRows.flat()) + 1 : 0

  // Secondary constraints get column numbers starting after primary columns
  const secondaryColumnOffset = primaryColumns
  const offsetSecondaryRows = secondaryRows.map(row => row.map(col => col + secondaryColumnOffset))

  // Calculate total number of columns
  const secondaryColumns = secondaryRows.length > 0 ? Math.max(0, ...secondaryRows.flat()) + 1 : 0
  const totalColumns = primaryColumns + secondaryColumns

  // Combine all rows
  const allRows = [...primaryRows, ...offsetSecondaryRows]

  return {
    numColumns: totalColumns,
    rows: allRows,
    primaryColumns
  }
}

/**
 * Convert StandardConstraints to binary matrix format
 * Used by external libraries that expect binary constraint matrices
 */
export function convertToBinary(constraints: StandardConstraints): number[][] {
  const flattened = flattenConstraints(constraints)
  return convertSparseToBinary(flattened.rows, flattened.numColumns)
}

/**
 * Convert sparse constraint rows to binary matrix format
 * Helper function for binary conversion
 */
function convertSparseToBinary(sparseRows: number[][], numColumns: number): number[][] {
  const matrix = new Array(sparseRows.length)
  for (let i = 0; i < sparseRows.length; i++) {
    matrix[i] = new Array(numColumns).fill(0)
    for (const col of sparseRows[i]) {
      matrix[i][col] = 1
    }
  }
  return matrix
}

/**
 * Validate that a solver supports secondary constraints
 * Throws an error if secondary constraints are present but not supported
 */
export function validateSecondarySupport(
  constraints: StandardConstraints,
  solverName: string
): void {
  const hasSecondary =
    constraints.secondaryConstraints && constraints.secondaryConstraints.length > 0

  if (hasSecondary && !SECONDARY_CONSTRAINT_SOLVERS.has(solverName)) {
    throw new Error(`Solver ${solverName} does not support secondary constraints`)
  }
}

/**
 * Set of solver names that support secondary constraints
 * Only our Dancing Links solvers currently support this feature
 */
const SECONDARY_CONSTRAINT_SOLVERS = new Set([
  'dancing-links (binary)',
  'dancing-links (sparse)',
  'dancing-links template',
  'dancing-links generator'
])
