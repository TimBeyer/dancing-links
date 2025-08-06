/**
 * Sudoku problem definition for the benchmark system
 */

import { StandardConstraints, SudokuParams } from '../../types.js'
import { generateConstraints, parseStringFormat, SudokuInput } from './index.js'

/**
 * Generate standardized constraints for a sudoku puzzle
 * Sudoku only uses primary constraints - all constraints must be covered exactly once
 */
export function generateSudokuConstraints(params: SudokuParams): StandardConstraints {
  // Parse the string format puzzle into the format expected by existing code
  const sudokuField = parseStringFormat(9, params.puzzle)

  // Generate constraints using existing sudoku constraint generation
  const constraints = generateConstraints(9, sudokuField)

  // Convert to standardized format
  // The existing constraint generation returns binary constraint rows
  // We need to convert them to sparse format (column indices)
  const binaryRows = constraints.map(constraint => constraint.row)
  const primaryConstraints = binaryRows.map(binaryRow => {
    const columnIndices = []
    for (let i = 0; i < binaryRow.length; i++) {
      if (binaryRow[i] === 1) {
        columnIndices.push(i)
      }
    }
    return columnIndices
  })

  return {
    primaryConstraints,
    // No secondary constraints for sudoku
    columnNames: generateSudokuColumnNames()
  }
}

/**
 * Generate descriptive column names for sudoku constraints
 * Useful for debugging and display purposes
 */
function generateSudokuColumnNames(): string[] {
  const names: string[] = []

  // Position constraints: cell(r,c) for each cell
  for (let row = 1; row <= 9; row++) {
    for (let col = 1; col <= 9; col++) {
      names.push(`cell(${row},${col})`)
    }
  }

  // Row constraints: row(r,n) for each row and number
  for (let row = 1; row <= 9; row++) {
    for (let num = 1; num <= 9; num++) {
      names.push(`row(${row},${num})`)
    }
  }

  // Column constraints: col(c,n) for each column and number
  for (let col = 1; col <= 9; col++) {
    for (let num = 1; num <= 9; num++) {
      names.push(`col(${col},${num})`)
    }
  }

  // Box constraints: box(b,n) for each 3x3 box and number
  for (let box = 1; box <= 9; box++) {
    for (let num = 1; num <= 9; num++) {
      names.push(`box(${box},${num})`)
    }
  }

  return names
}

/**
 * Re-export types from existing sudoku module for convenience
 */
export type { SudokuInput }
