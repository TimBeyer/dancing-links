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
  nodes: NodeStore

  /** Column headers with their current lengths and links */
  columns: ColumnStore

  /**
   * Original rows, indexed by each node's rowIndex. One reference per input row
   * avoids duplicating the generic data payload on every matrix node.
   */
  rows: ConstraintRow<T>[]
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
 * Write the once-per-matrix row boundary outside buildRows' hot optimization unit.
 *
 * V8 can enter buildRows through on-stack replacement before this final keyed
 * store has type feedback, then deoptimize the entire construction loop when it
 * reaches the store. This stable helper gathers feedback independently and lets
 * the row-building loop stay optimized through its return.
 */
function writeFinalRowBoundary(nodes: NodeStore, rowCount: number, nextNodeIndex: number): void {
  nodes.rowStart[rowCount] = nextNodeIndex
}

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
    const nodes = new NodeStore(numNodes, rows.length, numColumns)
    const columns = new ColumnStore(numColumns, numNodes)

    // Build column structure
    this.buildColumns(nodes, columns, numPrimary, numSecondary)

    // Build row structure
    const nextNodeIndex = this.buildRows(nodes, columns, rows)
    writeFinalRowBoundary(nodes, rows.length, nextNodeIndex)

    return {
      level: 0,
      choice: [],
      bestColIndex: 0,
      currentNodeIndex: 0,
      hasStarted: false,
      nodes,
      columns,
      rows
    }
  }

  /**
   * Clone an immutable, fully linked problem layout for a fresh search.
   *
   * Mutable node links and column state occupy contiguous backing regions, so
   * this path is two native memory copies regardless of matrix shape. Immutable
   * node metadata remains shared. Reusable templates therefore avoid rebuilding
   * thousands of links in JavaScript and avoid copying bytes search cannot write.
   */
  static cloneContext<T>(template: SearchContext<T>): SearchContext<T> {
    return {
      level: 0,
      choice: [],
      bestColIndex: 0,
      currentNodeIndex: 0,
      hasStarted: false,
      nodes: template.nodes.clone(),
      columns: template.columns.clone(),
      rows: template.rows
    }
  }

  /**
   * Create column headers and linking structure
   */
  private static buildColumns(
    nodes: NodeStore,
    columns: ColumnStore,
    numPrimary: number,
    numSecondary: number
  ): void {
    const { up, down, col, rowIndex } = nodes
    const { prev, next } = columns

    // Header nodes are the first nodes and are allocated in column order. This
    // identity layout removes a column-to-header lookup from every cover and
    // uncover operation. Direct bulk writes also avoid allocation checks and
    // small linking-method calls while the matrix is being constructed.
    for (let colIndex = 0; colIndex < columns.size; colIndex++) {
      up[colIndex] = colIndex
      down[colIndex] = colIndex
      col[colIndex] = NULL_INDEX
      rowIndex[colIndex] = NULL_INDEX
    }

    // Only primary columns participate in the root's circular list.
    if (numPrimary === 0) {
      prev[0] = NULL_INDEX
      next[0] = NULL_INDEX
    } else {
      prev[0] = numPrimary
      next[0] = 1
      for (let colIndex = 1; colIndex <= numPrimary; colIndex++) {
        prev[colIndex] = colIndex - 1
        next[colIndex] = colIndex === numPrimary ? 0 : colIndex + 1
      }
    }

    // Secondary columns are absent from the root list but retain self-links so
    // cover/uncover can use the same branch-free pointer updates for both kinds.
    const firstSecondary = numPrimary + ROOT_COLUMN_OFFSET
    for (let colIndex = firstSecondary; colIndex < firstSecondary + numSecondary; colIndex++) {
      prev[colIndex] = colIndex
      next[colIndex] = colIndex
    }
  }

  /**
   * Create row nodes and link them into the column structure
   */
  private static buildRows<T>(
    nodes: NodeStore,
    columns: ColumnStore,
    rows: ConstraintRow<T>[]
  ): number {
    const { up, down, col, rowIndex, rowStart } = nodes
    const { len } = columns
    let nextNodeIndex = columns.size

    for (let i = 0; i < rows.length; i++) {
      const coveredColumns = rows[i].coveredColumns
      const rowLength = coveredColumns.length
      const rowStartIndex = nextNodeIndex
      rowStart[i] = rowStartIndex

      // Rows never change horizontally, so their contiguous boundaries replace
      // per-node left/right pointers. Sequential scans avoid pointer chasing,
      // save two arrays, and give the CPU predictable adjacent memory accesses.
      for (let j = 0; j < rowLength; j++) {
        const nodeIndex = nextNodeIndex++
        const colIndex = coveredColumns[j] + ROOT_COLUMN_OFFSET
        const lastInColIndex = up[colIndex]

        up[nodeIndex] = lastInColIndex
        down[nodeIndex] = colIndex
        col[nodeIndex] = colIndex
        rowIndex[nodeIndex] = i

        down[lastInColIndex] = nodeIndex
        up[colIndex] = nodeIndex
        len[colIndex]++
      }
    }

    return nextNodeIndex
  }
}
