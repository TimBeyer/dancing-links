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
 * - Struct-of-Arrays data layout using adaptive 16/32-bit navigation fields
 * - Index-based references with a width-appropriate reserved sentinel
 * - Pre-allocated storage based on constraint matrix analysis
 * - State machine pattern to avoid recursion and enable goto-like control flow
 *
 * ALGORITHM OPTIMIZATIONS:
 * - Early termination for impossible constraints (columns with 0 options)
 * - Unit propagation for forced moves (columns with 1 option)
 * - Pre-calculated pointers to reduce data dependencies
 * - Local typed-array aliases to avoid repeated object-property loads in hot loops
 */

import { ConstraintRow, Result } from '../types/interfaces.js'
import { ColumnStore, NodeStore } from './data-structures.js'
import { SearchContext } from './problem-builder.js'

/**
 * Hide a column and every row that intersects it.
 *
 * Keep this hot operation at module scope so repeated searches share one
 * function identity. Creating it inside search causes optimized callers to
 * deoptimize when the next search installs a different closure at the same
 * call site.
 */
function cover(nodes: NodeStore, columns: ColumnStore, colIndex: number): void {
  const { down, up, col, rowIndex, rowStart } = nodes
  const { len, prev, next } = columns
  const leftColIndex = prev[colIndex]
  const rightColIndex = next[colIndex]
  next[leftColIndex] = rightColIndex
  prev[rightColIndex] = leftColIndex
  const colHeadIndex = colIndex
  for (let rr = down[colHeadIndex]; rr !== colHeadIndex; ) {
    const nextRR = down[rr]
    const row = rowIndex[rr]
    const firstInRow = rowStart[row]
    const afterRow = rowStart[row + 1]
    // This pair is the circular right traversal expressed as two contiguous
    // ranges. It preserves DLX ordering while removing a dependent pointer load
    // from every visited node and exposing linear access to the CPU prefetcher.
    for (let nn = rr + 1; nn < afterRow; nn++) {
      const uu = up[nn]
      const dd = down[nn]
      down[uu] = dd
      up[dd] = uu
      len[col[nn]]--
    }
    for (let nn = firstInRow; nn < rr; nn++) {
      const uu = up[nn]
      const dd = down[nn]
      down[uu] = dd
      up[dd] = uu
      len[col[nn]]--
    }
    rr = nextRR
  }
}
/** Restore a previously covered column. */
function uncover(nodes: NodeStore, columns: ColumnStore, colIndex: number): void {
  const { down, up, col, rowIndex, rowStart } = nodes
  const { len, prev, next } = columns
  const colHeadIndex = colIndex
  for (let rr = up[colHeadIndex]; rr !== colHeadIndex; ) {
    const nextRR = up[rr]
    const row = rowIndex[rr]
    const firstInRow = rowStart[row]
    const afterRow = rowStart[row + 1]
    // Reverse the exact contiguous ranges used by cover so vertical links are
    // restored in DLX order without a per-node left-pointer dependency.
    for (let nn = rr - 1; nn >= firstInRow; nn--) {
      const uu = up[nn]
      const dd = down[nn]
      down[uu] = nn
      up[dd] = nn
      len[col[nn]]++
    }
    for (let nn = afterRow - 1; nn > rr; nn--) {
      const uu = up[nn]
      const dd = down[nn]
      down[uu] = nn
      up[dd] = nn
      len[col[nn]]++
    }
    rr = nextRR
  }
  const leftColIndex = prev[colIndex]
  const rightColIndex = next[colIndex]
  next[leftColIndex] = colIndex
  prev[rightColIndex] = colIndex
}
/**
 * Cover every other column in a chosen row as one hot operation.
 *
 * A typical exact-cover row touches several columns. Batching them here loads
 * the typed-array views once and crosses the JS function boundary once per row,
 * rather than once per column, while preserving the circular rightward order.
 */
function coverRow(nodes: NodeStore, columns: ColumnStore, currentNodeIndex: number): void {
  const { down, up, col, rowIndex, rowStart } = nodes
  const { len, prev, next } = columns
  const chosenRow = rowIndex[currentNodeIndex]
  const firstChosenNode = rowStart[chosenRow]
  const afterChosenRow = rowStart[chosenRow + 1]
  let pp = currentNodeIndex + 1
  let afterRange = afterChosenRow
  while (true) {
    for (; pp < afterRange; pp++) {
      const colIndex = col[pp]
      const leftColIndex = prev[colIndex]
      const rightColIndex = next[colIndex]
      next[leftColIndex] = rightColIndex
      prev[rightColIndex] = leftColIndex
      for (let rr = down[colIndex]; rr !== colIndex; ) {
        const nextRR = down[rr]
        const row = rowIndex[rr]
        const firstInRow = rowStart[row]
        const afterRow = rowStart[row + 1]
        for (let nn = rr + 1; nn < afterRow; nn++) {
          const uu = up[nn]
          const dd = down[nn]
          down[uu] = dd
          up[dd] = uu
          len[col[nn]]--
        }
        for (let nn = firstInRow; nn < rr; nn++) {
          const uu = up[nn]
          const dd = down[nn]
          down[uu] = dd
          up[dd] = uu
          len[col[nn]]--
        }
        rr = nextRR
      }
    }
    if (afterRange === currentNodeIndex) {
      return
    }
    pp = firstChosenNode
    afterRange = currentNodeIndex
  }
}
/** Restore a chosen row's other columns in the exact reverse order of coverRow. */
function uncoverRow(nodes: NodeStore, columns: ColumnStore, currentNodeIndex: number): void {
  const { down, up, col, rowIndex, rowStart } = nodes
  const { len, prev, next } = columns
  const chosenRow = rowIndex[currentNodeIndex]
  const firstChosenNode = rowStart[chosenRow]
  const afterChosenRow = rowStart[chosenRow + 1]
  let pp = currentNodeIndex - 1
  let beforeRange = firstChosenNode - 1
  while (true) {
    for (; pp > beforeRange; pp--) {
      const colIndex = col[pp]
      for (let rr = up[colIndex]; rr !== colIndex; ) {
        const nextRR = up[rr]
        const row = rowIndex[rr]
        const firstInRow = rowStart[row]
        const afterRow = rowStart[row + 1]
        for (let nn = rr - 1; nn >= firstInRow; nn--) {
          const uu = up[nn]
          const dd = down[nn]
          down[uu] = nn
          up[dd] = nn
          len[col[nn]]++
        }
        for (let nn = afterRow - 1; nn > rr; nn--) {
          const uu = up[nn]
          const dd = down[nn]
          down[uu] = nn
          up[dd] = nn
          len[col[nn]]++
        }
        rr = nextRR
      }
      const leftColIndex = prev[colIndex]
      const rightColIndex = next[colIndex]
      next[leftColIndex] = colIndex
      prev[rightColIndex] = colIndex
    }
    if (beforeRange === currentNodeIndex) {
      return
    }
    pp = afterChosenRow - 1
    beforeRange = currentNodeIndex
  }
}
/** Select the shortest active primary column. */
function pickBestColumn(columns: ColumnStore): number {
  const rootColIndex = 0
  const { len, next } = columns
  const rootNext = next[rootColIndex]
  let lowestLen = len[rootNext]
  let lowest = rootNext

  // Zero is the absolute lower bound, so an impossible first column makes the
  // rest of the minimum-selection scan redundant.
  if (lowestLen === 0) {
    return lowest
  }

  for (
    let curColIndex = next[rootNext];
    curColIndex !== rootColIndex;
    curColIndex = next[curColIndex]
  ) {
    const length = len[curColIndex]

    // A unit column is forced. Prioritizing it propagates that constraint
    // immediately and avoids exploring a wider branching column first.
    if (length === 1) {
      return curColIndex
    }

    if (length < lowestLen) {
      lowestLen = length
      lowest = curColIndex

      // No later column can improve on zero.
      if (lowestLen === 0) {
        break
      }
    }
  }

  return lowest
}

/**
 * Materialize one solution outside the search loop's optimization unit.
 *
 * Object creation is rare relative to link updates. Isolating it here keeps
 * allocation feedback out of the hot state machine, while the exact-size result
 * array avoids dynamic growth for each solution that is returned.
 */
function materializeSolution<T>(
  nodes: NodeStore,
  rows: ConstraintRow<T>[],
  choice: number[],
  deepestLevel: number
): Result<T>[] {
  const results = new Array<Result<T>>(deepestLevel + 1)
  for (let level = 0; level <= deepestLevel; level++) {
    const nodeIndex = choice[level]!
    results[level] = {
      index: nodes.rowIndex[nodeIndex],
      data: rows[nodes.rowIndex[nodeIndex]].data
    }
  }
  return results
}

/**
 * State machine states for Dancing Links search algorithm
 *
 * The algorithm uses explicit state transitions to avoid recursion and enable
 * resumable search for generator-style iteration.
 */
enum SearchState {
  /** Select next column to cover and prepare for choice iteration */
  FORWARD,
  /** Try current choice by covering intersecting columns */
  ADVANCE,
  /** Backtrack by uncovering columns when no valid choices remain */
  BACKUP,
  /** Restore state after backtracking to try next choice */
  RECOVER,
  /** Search completed - either found enough solutions or exhausted search space */
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
  const { down, col } = nodes
  const { next } = columns
  const solutions: Result<T>[][] = []

  let currentSearchState: SearchState

  if (!context.hasStarted) {
    currentSearchState = SearchState.FORWARD
    context.hasStarted = true
  } else if (context.level > 0) {
    currentSearchState = SearchState.RECOVER
  } else {
    // Must be: hasStarted=true && level=0 (backtracked to root)
    /**
     * Search exhaustion detection: level 0 with hasStarted=true indicates
     * that we've backtracked all the way from the deepest search level back
     * to the root, meaning all possible solution branches have been explored.
     *
     * This state occurs when:
     * 1. We've found solutions and backtracked to find more
     * 2. We've exhausted all choices at every level
     * 3. No more solutions exist in the search space
     */
    return []
  }

  // Root column is always at index 0 (created by ProblemBuilder)
  const rootColIndex = 0

  // Keep the state transitions in one stable function. Besides avoiding call
  // overhead, this prevents V8 from deoptimizing on fresh nested-function
  // identities every time a new problem is solved.
  while (true) {
    switch (currentSearchState as SearchState) {
      case SearchState.FORWARD: {
        const bestColIndex = pickBestColumn(columns)
        context.bestColIndex = bestColIndex
        cover(nodes, columns, bestColIndex)

        const currentNodeIndex = down[bestColIndex]
        context.currentNodeIndex = currentNodeIndex
        context.choice[context.level] = currentNodeIndex
        currentSearchState = SearchState.ADVANCE
        break
      }
      case SearchState.ADVANCE: {
        const currentNodeIndex = context.currentNodeIndex
        if (currentNodeIndex === context.bestColIndex) {
          currentSearchState = SearchState.BACKUP
          break
        }

        coverRow(nodes, columns, currentNodeIndex)

        if (next[rootColIndex] === rootColIndex) {
          solutions.push(materializeSolution(nodes, context.rows, context.choice, context.level))

          currentSearchState =
            solutions.length === numSolutions ? SearchState.DONE : SearchState.RECOVER
          break
        }

        context.level++
        currentSearchState = SearchState.FORWARD
        break
      }
      case SearchState.BACKUP:
        uncover(nodes, columns, context.bestColIndex)

        if (context.level === 0) {
          currentSearchState = SearchState.DONE
          break
        }

        context.level--
        context.currentNodeIndex = context.choice[context.level]!
        context.bestColIndex = col[context.currentNodeIndex]
        currentSearchState = SearchState.RECOVER
        break
      case SearchState.RECOVER: {
        const currentNodeIndex = context.currentNodeIndex
        uncoverRow(nodes, columns, currentNodeIndex)
        const nextNodeIndex = down[currentNodeIndex]
        context.currentNodeIndex = nextNodeIndex
        context.choice[context.level] = nextNodeIndex
        currentSearchState = SearchState.ADVANCE
        break
      }
      default:
        return solutions
    }
  }
}
