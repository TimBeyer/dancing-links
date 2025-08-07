/**
 * Problem Builder - Constructs Dancing Links matrix from constraint rows
 *
 * Converts constraint data into optimized Struct-of-Arrays format for algorithm execution.
 * Pre-allocates storage based on matrix analysis to avoid dynamic resizing during search.
 */

import { ConstraintRow } from '../types/interfaces.js'
import { NodeStore, ColumnStore, calculateCapacity, NULL_INDEX } from './data-structures.js'

/**
 * Search context for Dancing Links algorithm state
 * Contains all data structures and state needed for resumable search
 */
export interface SearchContext<T> {
  nodes: NodeStore<T>
  columns: ColumnStore
  level: number
  choice: (number | null)[]
  hasStarted: boolean
  bestColIndex: number
  currentNodeIndex: number
}

/**
 * Problem specification interface for constraint matrix construction
 */
interface ProblemConfig<T> {
  numPrimary: number
  numSecondary: number
  rows: ConstraintRow<T>[]
}

const ROOT_COLUMN_OFFSET = 1

/**
 * Main ProblemBuilder class
 * Builds Dancing Links matrix from constraint specifications
 */
export class ProblemBuilder {
  /**
   * Build search context from constraint rows
   */
  static buildContext<T>(config: ProblemConfig<T>): SearchContext<T> {
    const { numNodes, numColumns } = calculateCapacity(
      config.numPrimary,
      config.numSecondary,
      config.rows
    )

    const nodes = new NodeStore<T>(numNodes)
    const columns = new ColumnStore(numColumns)

    // Create root column (algorithm requirement)
    const rootColIndex = columns.allocateColumn()
    const rootNodeIndex = nodes.allocateNode()
    nodes.initializeNode(rootNodeIndex)
    columns.initializeColumn(rootColIndex, rootNodeIndex)

    // Create primary columns
    for (let i = 0; i < config.numPrimary; i++) {
      const headNodeIndex = nodes.allocateNode()
      nodes.initializeNode(headNodeIndex)

      const colIndex = columns.allocateColumn()
      columns.initializeColumn(colIndex, headNodeIndex)

      // Link to previous column
      if (i === 0) {
        // First primary column links to root
        columns.linkColumns(rootColIndex, colIndex)
      } else {
        // Link to previous column
        columns.linkColumns(colIndex - 1, colIndex)
      }
    }

    // Close the circular link: last primary -> root
    if (config.numPrimary > 0) {
      columns.linkColumns(config.numPrimary, rootColIndex)
    }

    // Create secondary columns (self-linked)
    for (let i = 0; i < config.numSecondary; i++) {
      const headNodeIndex = nodes.allocateNode()
      nodes.initializeNode(headNodeIndex)

      const colIndex = columns.allocateColumn()
      columns.initializeColumn(colIndex, headNodeIndex)

      // Secondary columns are self-linked
      columns.linkColumns(colIndex, colIndex)
    }

    // Process constraint rows into matrix structure
    for (let rowIdx = 0; rowIdx < config.rows.length; rowIdx++) {
      const row = config.rows[rowIdx]
      let rowStartIndex = NULL_INDEX

      for (const columnIndex of row.coveredColumns) {
        const nodeIndex = nodes.allocateNode()
        nodes.initializeNode(nodeIndex, columnIndex + ROOT_COLUMN_OFFSET, rowIdx, row.data)

        if (rowStartIndex === NULL_INDEX) {
          rowStartIndex = nodeIndex
        } else {
          // Link horizontally to previous node in row
          nodes.linkHorizontal(nodeIndex - 1, nodeIndex)
        }

        // Link vertically into column
        const colIndex = columnIndex + ROOT_COLUMN_OFFSET
        const colHeadIndex = columns.head[colIndex]
        const lastInColIndex = nodes.up[colHeadIndex]

        nodes.linkVertical(lastInColIndex, nodeIndex)
        nodes.linkVertical(nodeIndex, colHeadIndex)

        columns.len[colIndex]++
      }

      // Close horizontal circular link for the row
      if (rowStartIndex !== NULL_INDEX && row.coveredColumns.length > 1) {
        const lastNodeIndex = nodes.size - 1
        nodes.linkHorizontal(lastNodeIndex, rowStartIndex)
      }
    }

    return {
      nodes,
      columns,
      level: 0,
      choice: new Array(config.rows.length).fill(null),
      hasStarted: false,
      bestColIndex: 0,
      currentNodeIndex: 0
    }
  }
}
