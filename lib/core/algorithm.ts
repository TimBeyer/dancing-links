/**
 * Knuth's Dancing Links Implementation
 *
 * Implements Knuth's Algorithm X using Dancing Links technique for solving
 * exact cover problems. Uses Struct-of-Arrays architecture with typed arrays.
 *
 * Reference: https://arxiv.org/pdf/cs/0011047.pdf
 * Based on: https://github.com/shreevatsa/knuth-literate-programs/blob/master/programs/dance.pdf
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
 * - Pre-calculated pointers to reduce data dependencies
 */

import { Result } from '../types/interfaces.js'
import { SearchContext } from './problem-builder.js'

enum SearchState {
  FORWARD,
  ADVANCE,
  BACKUP,
  RECOVER,
  DONE
}

/**
 * Execute Dancing Links search using SearchContext for resumable state
 *
 * The context preserves algorithm state between calls, enabling generator-style
 * iteration without modifying the core algorithm to use generators directly.
 */
export function search<T>(context: SearchContext<T>, numSolutions: number): Result<T>[][] {
  const { nodes, columns } = context
  const solutions: Result<T>[][] = []

  // Determine how to start based on context state
  let currentSearchState: SearchState
  let running = true

  if (!context.hasStarted) {
    currentSearchState = SearchState.FORWARD
    context.hasStarted = true
  } else if (context.level > 0) {
    // Resume from previous search
    currentSearchState = SearchState.RECOVER
  } else {
    // Exhausted all solutions
    return []
  }

  // Root column is always at index 0 (created by ProblemBuilder)
  const rootColIndex = 0

  /**
   * Cover operation - hide a column and all rows that intersect it
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
      // Store next pointer before modifying current node's links
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
      // Store next pointer before modifying current node's links
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
      context.bestColIndex = lowest
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
    for (
      let curColIndex = columns.next[rootNext];
      curColIndex !== rootColIndex;
      curColIndex = columns.next[curColIndex]
    ) {
      const length = columns.len[curColIndex]

      if (length === 1) {
        context.bestColIndex = curColIndex
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

    context.bestColIndex = lowest
  }

  function forward() {
    pickBestColumn()
    cover(context.bestColIndex)

    context.currentNodeIndex = nodes.down[columns.head[context.bestColIndex]]
    context.choice[context.level] = context.currentNodeIndex

    currentSearchState = SearchState.ADVANCE
  }

  function recordSolution() {
    const results: Result<T>[] = []
    for (let l = 0; l <= context.level; l++) {
      const nodeIndex = context.choice[l]!
      results.push({
        index: nodes.rowIndex[nodeIndex],
        data: nodes.data[nodeIndex]!
      })
    }

    solutions.push(results)
  }

  function advance() {
    const bestColHeadIndex = columns.head[context.bestColIndex]
    if (context.currentNodeIndex === bestColHeadIndex) {
      currentSearchState = SearchState.BACKUP
      return
    }

    for (
      let pp = nodes.right[context.currentNodeIndex];
      pp !== context.currentNodeIndex;
      pp = nodes.right[pp]
    ) {
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

    context.level = context.level + 1
    currentSearchState = SearchState.FORWARD
  }

  function backup() {
    uncover(context.bestColIndex)

    if (context.level === 0) {
      currentSearchState = SearchState.DONE
      return
    }

    context.level = context.level - 1

    context.currentNodeIndex = context.choice[context.level]!
    context.bestColIndex = nodes.col[context.currentNodeIndex]

    currentSearchState = SearchState.RECOVER
  }

  function recover() {
    for (
      let pp = nodes.left[context.currentNodeIndex];
      pp !== context.currentNodeIndex;
      pp = nodes.left[pp]
    ) {
      uncover(nodes.col[pp])
    }
    context.currentNodeIndex = nodes.down[context.currentNodeIndex]
    context.choice[context.level] = context.currentNodeIndex
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

  // Execute search state machine
  while (running) {
    const currentStateMethod = stateMethods[currentSearchState]
    currentStateMethod()
  }

  return solutions
}
