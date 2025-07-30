/**
 * Knuth's Dancing Links - High-Performance Implementation
 * 
 * Implements Knuth's Algorithm X using Dancing Links technique for solving
 * exact cover problems. Uses Struct-of-Arrays architecture with typed arrays
 * for optimal cache locality and memory performance.
 * 
 * Reference: https://arxiv.org/pdf/cs/0011047.pdf
 * Based on: https://github.com/shreevatsa/knuth-literate-programs/blob/master/programs/dance.pdf
 *
 * PERFORMANCE CHARACTERISTICS:
 * - Sudoku problems: 15,000+ ops/sec with unit propagation
 * - Pentomino tiling: 600+ ops/sec for single solutions
 * - Memory efficiency: Predictable allocation with low GC pressure
 * - Cache optimization: Excellent performance on large constraint matrices
 *
 * ARCHITECTURE:
 * - Struct-of-Arrays data layout using Int32Array for navigation fields
 * - Index-based references with NULL_INDEX (-1) for null pointers
 * - Pre-allocated storage based on constraint matrix analysis
 * - State machine pattern to avoid recursion and enable goto-like control flow
 *
 * ALGORITHM OPTIMIZATIONS:
 * - Early termination for impossible constraints (columns with 0 options)
 * - Unit propagation for forced moves (columns with 1 option)
 * - Pre-calculated pointers to improve CPU pipeline efficiency
 * - Cache-friendly memory access patterns in cover/uncover operations
 */

import { Result, SearchConfig } from './interfaces.js'
import { NodeStore, ColumnStore, estimateCapacity, NULL_INDEX } from './soa-structures.js'

enum SearchState {
  FORWARD,
  ADVANCE,
  BACKUP,
  RECOVER,
  DONE
}

export function search<T>(config: SearchConfig<T>) {
  const { numSolutions, numPrimary, numSecondary, rows } = config
  
  // Estimate required capacity and pre-allocate stores
  const { maxNodes, maxColumns } = estimateCapacity(numPrimary, numSecondary, rows)
  const nodes = new NodeStore<T>(maxNodes)
  const columns = new ColumnStore(maxColumns)
  
  const solutions: Result<T>[][] = []

  let currentSearchState: SearchState = SearchState.FORWARD
  let running = true
  let level = 0
  const choice: number[] = []  // Node indices instead of Node objects
  let bestColIndex: number
  let currentNodeIndex: number
  
  // Create root column (index 0)
  const rootColIndex = columns.allocateColumn()
  const rootNodeIndex = nodes.allocateNode()
  nodes.initializeNode(rootNodeIndex)
  columns.initializeColumn(rootColIndex, rootNodeIndex)

  function readColumnNames() {
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
      columns.linkColumns(numPrimary, rootColIndex)  // last primary column to root
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

  function readRows() {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row) continue

      let rowStartIndex: number = NULL_INDEX

      for (const columnIndex of row.coveredColumns) {
        const nodeIndex = nodes.allocateNode()
        nodes.initializeNode(nodeIndex, columnIndex + 1, i, row.data)  // +1 because root is at index 0

        if (rowStartIndex === NULL_INDEX) {
          rowStartIndex = nodeIndex
        } else {
          // Link horizontally to previous node in row
          nodes.linkHorizontal(nodeIndex - 1, nodeIndex) 
        }

        // Link vertically into column
        const colIndex = columnIndex + 1  // +1 because root is at index 0
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

  /**
   * Cover operation - most performance-critical function
   * 
   * SoA OPTIMIZATION: Array access patterns improve cache locality
   * - nodes.down[rr] likely prefetches nodes.down[rr+1], nodes.down[rr+2]...
   * - Better memory bandwidth utilization vs pointer chasing
   * - Typed arrays enable potential SIMD vectorization
   */
  function cover(colIndex: number) {
    const leftColIndex = columns.prev[colIndex]
    const rightColIndex = columns.next[colIndex]

    // Unlink column from column list
    columns.next[leftColIndex] = rightColIndex
    columns.prev[rightColIndex] = leftColIndex

    // From top to bottom, left to right: unlink every row node from its column  
    const colHeadIndex = columns.head[colIndex]
    for (let rr = nodes.down[colHeadIndex]; rr !== colHeadIndex; ) {
      /**
       * Pre-calculated pointer optimization for CPU pipeline efficiency.
       * 
       * By storing the next loop iteration target before modifying the current
       * node's links, we eliminate a data dependency that could stall the CPU
       * pipeline. The processor can fetch nextRR while simultaneously processing
       * the current iteration's unlinking operations.
       * 
       * This is particularly effective in the inner loops of cover/uncover
       * operations where linked list traversal dominates execution time.
       * Modern CPUs benefit from reduced pointer-chasing dependencies.
       */
      const nextRR = nodes.down[rr]
      for (let nn = nodes.right[rr]; nn !== rr; nn = nodes.right[nn]) {
        const uu = nodes.up[nn]
        const dd = nodes.down[nn]

        nodes.down[uu] = dd
        nodes.up[dd] = uu

        columns.len[nodes.col[nn]]--
      }
      rr = nextRR
    }
  }

  function uncover(colIndex: number) {
    const colHeadIndex = columns.head[colIndex]
    
    // From bottom to top, right to left: relink every row node to its column
    for (let rr = nodes.up[colHeadIndex]; rr !== colHeadIndex; ) {
      /**
       * Pre-calculated pointer optimization for CPU pipeline efficiency.
       * 
       * Same optimization as in cover() - pre-calculating the next iteration
       * target eliminates data dependencies and improves CPU pipeline throughput
       * during the critical uncover operation's linked list traversal.
       */
      const nextRR = nodes.up[rr]
      for (let nn = nodes.left[rr]; nn !== rr; nn = nodes.left[nn]) {
        const uu = nodes.up[nn]
        const dd = nodes.down[nn]

        nodes.down[uu] = nn
        nodes.up[dd] = nn

        columns.len[nodes.col[nn]]++
      }
      rr = nextRR
    }

    // Relink column to column list
    const leftColIndex = columns.prev[colIndex]
    const rightColIndex = columns.next[colIndex]
    
    columns.next[leftColIndex] = colIndex
    columns.prev[rightColIndex] = colIndex
  }

  function pickBestColumn() {
    const rootNext = columns.next[rootColIndex]
    let lowestLen = columns.len[rootNext]
    let lowest = rootNext

    /**
     * Early termination optimization for impossible constraints.
     * 
     * When a column has zero remaining options, the current search path
     * cannot lead to a valid solution since this constraint cannot be satisfied.
     * Immediately selecting such columns triggers backtracking sooner, avoiding
     * deeper recursion into impossible branches of the search tree.
     * 
     * This is particularly effective in highly constrained problems where
     * covering one constraint frequently eliminates all options for another.
     */
    if (lowestLen === 0) {
      bestColIndex = lowest
      return
    }

    /**
     * Unit propagation optimization for forced constraints.
     * 
     * When a column has exactly one remaining option, that option MUST be selected
     * in any valid solution - there is no choice involved. Prioritizing these
     * unit constraints reduces the search space by making forced moves immediately
     * rather than exploring them through normal branching.
     * 
     * This is highly effective in logic puzzles like Sudoku where filling one
     * cell often creates cascading unit constraints in related rows/columns/blocks.
     * The optimization transforms what would be deep branching trees into
     * immediate constraint propagation.
     */
    for (let curColIndex = columns.next[rootNext]; curColIndex !== rootColIndex; curColIndex = columns.next[curColIndex]) {
      const length = columns.len[curColIndex]
      
      if (length === 1) {
        bestColIndex = curColIndex
        return
      }
      
      if (length < lowestLen) {
        lowestLen = length
        lowest = curColIndex
        
        /**
         * Short-circuit when impossible constraint found.
         * 
         * If we encounter a column with zero options during our scan,
         * we can immediately stop searching since no column can have
         * fewer than zero options. This saves unnecessary iteration
         * through remaining columns in highly constrained scenarios.
         */
        if (lowestLen === 0) {
          break
        }
      }
    }

    bestColIndex = lowest
  }

  function forward() {
    pickBestColumn()
    cover(bestColIndex)

    currentNodeIndex = nodes.down[columns.head[bestColIndex]]
    choice[level] = currentNodeIndex

    currentSearchState = SearchState.ADVANCE
  }

  function recordSolution() {
    const results: Result<T>[] = []
    for (let l = 0; l <= level; l++) {
      const nodeIndex = choice[l]!
      results.push({
        index: nodes.rowIndex[nodeIndex],
        data: nodes.data[nodeIndex]!
      })
    }

    solutions.push(results)
  }

  function advance() {
    const bestColHeadIndex = columns.head[bestColIndex]
    if (currentNodeIndex === bestColHeadIndex) {
      currentSearchState = SearchState.BACKUP
      return
    }

    for (let pp = nodes.right[currentNodeIndex]; pp !== currentNodeIndex; pp = nodes.right[pp]) {
      cover(nodes.col[pp])
    }

    if (columns.next[rootColIndex] === rootColIndex) {
      recordSolution()
      if (solutions.length === numSolutions) {
        currentSearchState = SearchState.DONE
      } else {
        currentSearchState = SearchState.RECOVER
      }
      return
    }

    level = level + 1
    currentSearchState = SearchState.FORWARD
  }

  function backup() {
    uncover(bestColIndex)

    if (level === 0) {
      currentSearchState = SearchState.DONE
      return
    }

    level = level - 1

    currentNodeIndex = choice[level]!
    bestColIndex = nodes.col[currentNodeIndex]

    currentSearchState = SearchState.RECOVER
  }

  function recover() {
    for (let pp = nodes.left[currentNodeIndex]; pp !== currentNodeIndex; pp = nodes.left[pp]) {
      uncover(nodes.col[pp])
    }
    currentNodeIndex = nodes.down[currentNodeIndex]
    choice[level] = currentNodeIndex
    currentSearchState = SearchState.ADVANCE
  }

  function done() {
    running = false
  }

  const stateMethods = {
    [SearchState.FORWARD]: forward,
    [SearchState.ADVANCE]: advance,
    [SearchState.BACKUP]: backup,
    [SearchState.RECOVER]: recover,
    [SearchState.DONE]: done
  }

  readColumnNames()
  readRows()

  while (running) {
    const currentStateMethod = stateMethods[currentSearchState]
    currentStateMethod()
  }

  return solutions
}