/**
 * Exact node-count workloads for the Uint16/Int32 storage boundary.
 *
 * Column 1 appears only in the final row and is placed last in that row. Search
 * must therefore select the matrix's highest-index node, then cover/uncover the
 * other 63 columns. The 65,535- and 65,536-node variants differ by one filler
 * node, exercising behavior immediately on both sides of the fallback cutoff.
 */

import { IndexWidthParams, StandardConstraints } from '../../types.js'

export const INDEX_WIDTH_PRIMARY_COLUMNS = 64
const HEADER_NODES = INDEX_WIDTH_PRIMARY_COLUMNS + 1
const PADDING_ROWS = 1_038
const FORCED_COLUMN = 1

export function generateIndexWidthConstraints(params: IndexWidthParams): StandardConstraints {
  const paddingRow: number[] = []
  for (let column = 0; column < INDEX_WIDTH_PRIMARY_COLUMNS; column++) {
    if (column !== FORCED_COLUMN) {
      paddingRow.push(column)
    }
  }

  const terminalRow = [...paddingRow, FORCED_COLUMN]
  const fixedNodes = HEADER_NODES + PADDING_ROWS * paddingRow.length + terminalRow.length
  const fillerWidth = params.nodeCount - fixedNodes
  if (fillerWidth !== 12 && fillerWidth !== 13) {
    throw new Error(`Unsupported index-width node count: ${params.nodeCount}`)
  }

  // Reusing one immutable padding array keeps input setup compact. Timed solver
  // ingestion still creates every row record and matrix node from scratch.
  const primaryConstraints = new Array<number[]>(PADDING_ROWS + 2)
  for (let row = 0; row < PADDING_ROWS; row++) {
    primaryConstraints[row] = paddingRow
  }
  primaryConstraints[PADDING_ROWS] = paddingRow.slice(0, fillerWidth)
  primaryConstraints[PADDING_ROWS + 1] = terminalRow

  return { primaryConstraints }
}
