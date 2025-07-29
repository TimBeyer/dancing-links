/**
 * Knuth's Dancing Links
 * Original paper: https://arxiv.org/pdf/cs/0011047.pdf
 * Implementation ported from: https://github.com/shreevatsa/knuth-literate-programs/blob/master/programs/dance.pdf
 *
 * Code runs in a state machine in order to avoid recursion
 * and in order to work around the lack of `goto` in JS
 */

import { Result, SearchConfig } from './interfaces.js'

enum SearchState {
  FORWARD,
  ADVANCE,
  BACKUP,
  RECOVER,
  DONE
}

class Node<T> {
  left: Node<T> | null = null
  right: Node<T> | null = null
  up: Node<T> | null = null
  down: Node<T> | null = null
  col: Column<T> | null = null
  index = -1
  data: T | null = null
}
class Column<T> {
  head: Node<T>
  len = 0
  prev: Column<T> | null = null
  next: Column<T> | null = null
  constructor(head: Node<T>) {
    this.head = head
  }
}

export function search<T>(config: SearchConfig<T>) {
  const { numSolutions, numPrimary, numSecondary, rows } = config
  const root: Column<T> = new Column(new Node())

  const colArray: Column<T>[] = [root]
  const nodeArray: Node<T>[] = []
  const solutions: Result<T>[][] = []

  let currentSearchState: SearchState = SearchState.FORWARD
  let running = true
  let level = 0
  const choice: Node<T>[] = []
  let bestCol: Column<T>
  let currentNode: Node<T>

  function readColumnNames() {
    // Skip root node
    let curColIndex = 1

    for (let i = 0; i < numPrimary; i++) {
      const head: Node<T> = new Node()
      head.up = head
      head.down = head

      const column: Column<T> = new Column(head)

      const prevColumn = colArray[curColIndex - 1]
      if (prevColumn) {
        column.prev = prevColumn
        prevColumn.next = column
      }

      colArray[curColIndex] = column
      curColIndex = curColIndex + 1
    }

    const lastCol = colArray[curColIndex - 1]!
    // Link the last primary constraint to wrap back into the root
    lastCol.next = root
    root.prev = lastCol

    for (let i = 0; i < numSecondary; i++) {
      const head: Node<T> = new Node()
      head.up = head
      head.down = head

      const column: Column<T> = new Column(head)

      column.prev = column
      column.next = column

      colArray[curColIndex] = column
      curColIndex = curColIndex + 1
    }
  }

  function readRows() {
    let curNodeIndex = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row) continue

      let rowStart: Node<T> | undefined = undefined

      for (const columnIndex of row.coveredColumns) {
        const node: Node<T> = new Node()
        node.left = node
        node.right = node
        node.down = node
        node.up = node
        node.index = i
        node.data = row.data

        nodeArray[curNodeIndex] = node

        if (!rowStart) {
          rowStart = node
        } else {
          node.left = nodeArray[curNodeIndex - 1]!
          nodeArray[curNodeIndex - 1]!.right = node
        }

        const col = colArray[columnIndex + 1]!
        node.col = col

        node.up = col.head.up!
        col.head.up!.down = node

        col.head.up = node
        node.down = col.head

        col.len = col.len + 1
        curNodeIndex = curNodeIndex + 1
      }

      if (rowStart) {
        rowStart.left = nodeArray[curNodeIndex - 1]!
        nodeArray[curNodeIndex - 1]!.right = rowStart
      }
    }
  }

  function cover(c: Column<T>) {
    const l = c.prev!
    const r = c.next!

    // Unlink column
    l.next = r
    r.prev = l

    // From to to bottom, left to right unlink every row node from its column
    for (let rr = c.head.down!; rr !== c.head; rr = rr.down!) {
      for (let nn = rr.right!; nn !== rr; nn = nn.right!) {
        const uu = nn.up!
        const dd = nn.down!

        uu.down = dd
        dd.up = uu

        nn.col!.len -= 1
      }
    }
  }

  function uncover(c: Column<T>) {
    // From bottom to top, right to left relink every row node to its column
    for (let rr = c.head.up!; rr !== c.head; rr = rr.up!) {
      for (let nn = rr.left!; nn !== rr; nn = nn.left!) {
        const uu = nn.up!
        const dd = nn.down!

        uu.down = nn
        dd.up = nn

        nn.col!.len += 1
      }
    }

    const l = c.prev!
    const r = c.next!

    // Unlink column
    l.next = c
    r.prev = c
  }

  function pickBestColum() {
    let lowestLen = root.next!.len
    let lowest = root.next!

    for (let curCol = root.next!; curCol !== root; curCol = curCol.next!) {
      const length = curCol.len
      if (length < lowestLen) {
        lowestLen = length
        lowest = curCol
      }
    }

    bestCol = lowest
  }

  function forward() {
    pickBestColum()
    cover(bestCol)

    currentNode = bestCol.head.down!
    choice[level] = currentNode

    currentSearchState = SearchState.ADVANCE
  }

  function recordSolution() {
    const results: Result<T>[] = []
    for (let l = 0; l <= level; l++) {
      const node = choice[l]!
      results.push({
        index: node.index!,
        data: node.data!
      })
    }

    solutions.push(results)
  }

  function advance() {
    if (currentNode === bestCol.head) {
      currentSearchState = SearchState.BACKUP
      return
    }

    for (let pp = currentNode.right!; pp !== currentNode; pp = pp.right!) {
      cover(pp.col!)
    }

    if (root.next === root) {
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
    uncover(bestCol)

    if (level === 0) {
      currentSearchState = SearchState.DONE
      return
    }

    level = level - 1

    currentNode = choice[level]!
    bestCol = currentNode.col!

    currentSearchState = SearchState.RECOVER
  }

  function recover() {
    for (let pp = currentNode.left!; pp !== currentNode; pp = pp.left!) {
      uncover(pp.col!)
    }
    currentNode = currentNode.down!
    choice[level] = currentNode
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
