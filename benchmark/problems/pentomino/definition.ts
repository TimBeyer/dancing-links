/**
 * Pentomino problem definition for the benchmark system
 */

import { StandardConstraints, PentominoParams } from '../../types.js';
import { ALL_CONSTRAINTS, PlacedPentomino } from './field.js';

/**
 * Generate standardized constraints for pentomino tiling
 * Pentomino only uses primary constraints - all constraints must be covered exactly once
 */
export function generatePentominoConstraints(_params: PentominoParams): StandardConstraints {
  // Use existing constraint generation from pentomino field
  // ALL_CONSTRAINTS contains all possible piece placements on a 6x10 field
  // The existing constraints are in binary format, convert to sparse
  const binaryRows = ALL_CONSTRAINTS.map(constraint => constraint.row);
  const primaryConstraints = binaryRows.map(binaryRow => {
    const columnIndices = [];
    for (let i = 0; i < binaryRow.length; i++) {
      if (binaryRow[i] === 1) {
        columnIndices.push(i);
      }
    }
    return columnIndices;
  });
  
  return {
    primaryConstraints,
    // No secondary constraints for pentomino
    columnNames: generatePentominoColumnNames()
  };
}

/**
 * Generate descriptive column names for pentomino constraints
 * Useful for debugging and display purposes
 */
function generatePentominoColumnNames(): string[] {
  const names: string[] = [];
  
  // Piece constraints: Each of the 12 pentomino pieces must be placed exactly once
  const pieceNames = ['F', 'I', 'L', 'N', 'P', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  for (const piece of pieceNames) {
    names.push(`piece(${piece})`);
  }
  
  // Position constraints: Each cell on the 6x10 field must be covered exactly once
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 10; col++) {
      names.push(`pos(${row},${col})`);
    }
  }
  
  return names;
}

/**
 * Re-export types from existing pentomino module for convenience
 */
export type { PlacedPentomino };