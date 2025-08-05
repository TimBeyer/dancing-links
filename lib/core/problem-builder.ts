/**
 * Problem Structure Builder
 * 
 * Converts constraint rows into native Dancing Links data structures.
 * Separated from the search algorithm for better code organization
 * and to enable future optimizations (shared memory, workers, etc.).
 */

import { Row } from '../types/interfaces.js'
import { NodeStore, ColumnStore, estimateCapacity, NULL_INDEX } from './data-structures.js'

const ROOT_COLUMN_OFFSET = 1

/**
 * Configuration for building a problem structure
 */
export interface ProblemConfig<T> {
  numPrimary: number
  numSecondary: number
  rows: Row<T>[]
}

/**
 * Built problem structure ready for search execution
 */
export interface BuiltProblem<T> {
  nodes: NodeStore<T>
  columns: ColumnStore
  numPrimary: number
  numSecondary: number
}

/**
 * Builds Dancing Links data structures from constraint rows
 */
export class ProblemBuilder {
  /**
   * Build native data structures from constraint configuration
   */
  static build<T>(config: ProblemConfig<T>): BuiltProblem<T> {
    const { numPrimary, numSecondary, rows } = config

    // Estimate required capacity and pre-allocate stores
    const { maxNodes, maxColumns } = estimateCapacity(numPrimary, numSecondary, rows)
    const nodes = new NodeStore<T>(maxNodes)
    const columns = new ColumnStore(maxColumns)

    // Build column structure
    this.buildColumns(nodes, columns, numPrimary, numSecondary)
    
    // Build row structure
    this.buildRows(nodes, columns, rows)

    return {
      nodes,
      columns,
      numPrimary,
      numSecondary
    }
  }

  /**
   * Create column headers and linking structure
   */
  private static buildColumns(
    nodes: NodeStore<any>,
    columns: ColumnStore,
    numPrimary: number,
    numSecondary: number
  ): void {
    // Create root column (index 0)
    const rootColIndex = columns.allocateColumn()
    const rootNodeIndex = nodes.allocateNode()
    nodes.initializeNode(rootNodeIndex)
    columns.initializeColumn(rootColIndex, rootNodeIndex)

    // Create primary columns
    for (let i = 0; i < numPrimary; i++) {
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
    if (numPrimary > 0) {
      columns.linkColumns(numPrimary, rootColIndex)
    }

    // Create secondary columns (self-linked)
    for (let i = 0; i < numSecondary; i++) {
      const headNodeIndex = nodes.allocateNode()
      nodes.initializeNode(headNodeIndex)

      const colIndex = columns.allocateColumn()
      columns.initializeColumn(colIndex, headNodeIndex)

      // Secondary columns are self-linked
      columns.linkColumns(colIndex, colIndex)
    }
  }

  /**
   * Create row nodes and link them into the column structure
   */
  private static buildRows<T>(
    nodes: NodeStore<T>,
    columns: ColumnStore,
    rows: Row<T>[]
  ): void {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row) continue

      let rowStartIndex: number = NULL_INDEX

      for (const columnIndex of row.coveredColumns) {
        const nodeIndex = nodes.allocateNode()
        nodes.initializeNode(nodeIndex, columnIndex + ROOT_COLUMN_OFFSET, i, row.data)

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
  }
}