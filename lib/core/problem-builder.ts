/**
 * Problem Builder - Constructs Dancing Links matrix from constraint rows
 *
 * Converts constraint data into optimized Struct-of-Arrays format for algorithm execution.
 * Pre-allocates storage based on matrix analysis to avoid dynamic resizing during search.
 */

import { ConstraintRow } from '../types/interfaces.js'
import { NodeStore, ColumnStore, calculateCapacity, NULL_INDEX } from './data-structures.js'

/**
 * Search context for resumable Dancing Links algorithm execution
 *
 * Captures the algorithm state needed to pause and resume search operations.
 * This enables generator-style iteration without modifying the core algorithm
 * to use generators directly.
 */
export interface SearchContext<T> {
  /** Current depth in the search tree */
  level: number

  /** Stack of node indices chosen at each search level */
  choice: number[]

  /** Column selected for covering at current level */
  bestColIndex: number

  /** Current node being tried in the selected column */
  currentNodeIndex: number

  /** Whether this context has been used for search before */
  hasStarted: boolean

  /** Constraint matrix nodes with their current link state */
  nodes: NodeStore<T>

  /** Column headers with their current lengths and links */
  columns: ColumnStore
}

/**
 * Configuration for building a problem structure
 */
export interface ProblemConfig<T> {
  numPrimary: number
  numSecondary: number
  rows: ConstraintRow<T>[]
}

const ROOT_COLUMN_OFFSET = 1

/**
 * Builds Dancing Links data structures from constraint rows
 */
export class ProblemBuilder {
  /**
   * Build SearchContext for resumable search from constraint configuration
   */
  static buildContext<T>(config: ProblemConfig<T>): SearchContext<T> {
    const { numPrimary, numSecondary, rows } = config

    // Calculate required capacity and pre-allocate stores
    const { numNodes, numColumns } = calculateCapacity(numPrimary, numSecondary, rows)
    const nodes = new NodeStore<T>(numNodes)
    const columns = new ColumnStore(numColumns)

    // Build column structure
    this.buildColumns(nodes, columns, numPrimary, numSecondary)

    // Build row structure
    this.buildRows(nodes, columns, rows)

    return {
      level: 0,
      choice: [],
      bestColIndex: 0,
      currentNodeIndex: 0,
      hasStarted: false,
      nodes,
      columns
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
  private static buildRows<T>(nodes: NodeStore<T>, columns: ColumnStore, rows: ConstraintRow<T>[]): void {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
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
