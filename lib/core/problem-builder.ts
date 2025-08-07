/**
 * Problem Structure Builder
 *
 * Converts constraint rows into native Dancing Links data structures.
 * Separated from the search algorithm for better code organization
 * and to enable future optimizations (shared memory, workers, etc.).
 */

import { ConstraintRow } from '../types/interfaces.js'
import {
  NodeStore,
  ColumnStore,
  calculateCapacity,
  NULL_INDEX
} from './data-structures.js'

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

const ROOT_COLUMN_OFFSET = 1

/**
 * Configuration for building a problem structure
 */
export interface ProblemConfig<T> {
  numPrimary: number
  numSecondary: number
  rows: ConstraintRow<T>[]
}

/**
 * Configuration for building a problem structure directly from sparse constraints
 * Bypasses ConstraintRow<T>[] intermediate format for better performance
 */
export interface SparseProblemConfig<T> {
  numPrimary: number
  numSecondary: number
  sparseConstraints: Array<{ data: T; coveredColumns: number[] }>
}

/**
 * Abstract base class for building Dancing Links data structures
 * Uses strategy pattern to handle different constraint formats
 */
abstract class ProblemBuilderBase<TConstraint> {
  /**
   * Extract data from a constraint of type TConstraint
   */
  protected abstract extractData(constraint: TConstraint): any

  /**
   * Extract covered columns from a constraint of type TConstraint
   */
  protected abstract extractCoveredColumns(constraint: TConstraint): number[]

  /**
   * Calculate capacity requirements for constraints
   */
  protected abstract calculateCapacity(
    numPrimary: number,
    numSecondary: number,
    constraints: TConstraint[]
  ): { maxNodes: number; maxColumns: number }

  /**
   * Build SearchContext using the constraint extraction strategy
   */
  protected buildContext<T>(
    numPrimary: number,
    numSecondary: number,
    constraints: TConstraint[]
  ): SearchContext<T> {
    // Calculate required capacity and pre-allocate stores
    const { maxNodes, maxColumns } = this.calculateCapacity(numPrimary, numSecondary, constraints)
    const nodes = new NodeStore<T>(maxNodes)
    const columns = new ColumnStore(maxColumns)

    // Build column structure
    this.buildColumns(nodes, columns, numPrimary, numSecondary)

    // Build row structure using constraint extraction strategy
    this.buildRows(nodes, columns, constraints)

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
   * Create column headers and linking structure (common for all constraint formats)
   */
  protected buildColumns(
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
   * Create row nodes using constraint extraction strategy (unified algorithm)
   */
  protected buildRows<T>(
    nodes: NodeStore<T>,
    columns: ColumnStore,
    constraints: TConstraint[]
  ): void {
    for (let i = 0; i < constraints.length; i++) {
      const constraint = constraints[i]
      const data = this.extractData(constraint) as T
      const coveredColumns = this.extractCoveredColumns(constraint)

      let rowStartIndex: number = NULL_INDEX

      for (const columnIndex of coveredColumns) {
        const nodeIndex = nodes.allocateNode()
        nodes.initializeNode(nodeIndex, columnIndex + ROOT_COLUMN_OFFSET, i, data)

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
      if (rowStartIndex !== NULL_INDEX && coveredColumns.length > 1) {
        const lastNodeIndex = nodes.size - 1
        nodes.linkHorizontal(lastNodeIndex, rowStartIndex)
      }
    }
  }
}

/**
 * Concrete builder for ConstraintRow<T> constraints
 */
class RowBasedProblemBuilder<T> extends ProblemBuilderBase<ConstraintRow<T>> {
  protected extractData(row: ConstraintRow<T>): T {
    return row.data
  }

  protected extractCoveredColumns(row: ConstraintRow<T>): number[] {
    return row.coveredColumns
  }

  protected calculateCapacity(
    numPrimary: number,
    numSecondary: number,
    rows: ConstraintRow<T>[]
  ): { maxNodes: number; maxColumns: number } {
    return calculateCapacity(numPrimary, numSecondary, rows)
  }

  static buildContext<T>(config: ProblemConfig<T>): SearchContext<T> {
    const builder = new RowBasedProblemBuilder<T>()
    return builder.buildContext(config.numPrimary, config.numSecondary, config.rows)
  }
}

/**
 * Concrete builder for sparse constraints
 */
class SparseConstraintProblemBuilder<T> extends ProblemBuilderBase<{
  data: T
  coveredColumns: number[]
}> {
  protected extractData(constraint: { data: T; coveredColumns: number[] }): T {
    return constraint.data
  }

  protected extractCoveredColumns(constraint: { data: T; coveredColumns: number[] }): number[] {
    return constraint.coveredColumns
  }

  protected calculateCapacity(
    numPrimary: number,
    numSecondary: number,
    sparseConstraints: Array<{ data: T; coveredColumns: number[] }>
  ): { maxNodes: number; maxColumns: number } {
    return calculateCapacity(numPrimary, numSecondary, sparseConstraints)
  }

  static buildContextFromSparse<T>(config: SparseProblemConfig<T>): SearchContext<T> {
    const builder = new SparseConstraintProblemBuilder<T>()
    return builder.buildContext(config.numPrimary, config.numSecondary, config.sparseConstraints)
  }
}

/**
 * Unified ProblemBuilder interface - maintains backward compatibility
 */
export class ProblemBuilder {
  /**
   * Build SearchContext for resumable search from ConstraintRow<T> configuration
   */
  static buildContext<T>(config: ProblemConfig<T>): SearchContext<T> {
    return RowBasedProblemBuilder.buildContext(config)
  }

  /**
   * Build SearchContext directly from sparse constraints for better performance
   */
  static buildContextFromSparse<T>(config: SparseProblemConfig<T>): SearchContext<T> {
    return SparseConstraintProblemBuilder.buildContextFromSparse(config)
  }
}
