/**
 * Honest end-to-end benchmarks for adaptive 16/32-bit storage.
 *
 * Prepared input rows live outside timing like the other sparse benchmarks, but
 * every measured operation creates a public solver, ingests all constraints,
 * builds fresh typed-array stores, and exhaustively searches them. No compiled
 * topology or result is reused between operations.
 */

import { DancingLinks } from '../../index.js'
import { ProblemBuilder } from '../../lib/core/problem-builder.js'
import type { ConstraintRow, SparseConstraintBatch } from '../../lib/types/interfaces.js'
import {
  generateIndexWidthConstraints,
  INDEX_WIDTH_PRIMARY_COLUMNS
} from '../problems/index-width/definition.js'
import { Solver, StandardConstraints } from '../types.js'

interface PreparedIndexWidth {
  readonly nodeCount: number
  readonly constraints: SparseConstraintBatch<number, 'simple'>
  readonly rows: ConstraintRow<number>[]
}

interface PreparedMixedWidths {
  readonly uint16: PreparedIndexWidth
  readonly int32: PreparedIndexWidth
}

function prepareRows(constraints: StandardConstraints): PreparedIndexWidth {
  const sparse = constraints.primaryConstraints.map((columnIndices, data) => ({
    data,
    columnIndices
  }))
  const rows = sparse.map(({ data, columnIndices }) => ({
    coveredColumns: columnIndices,
    data
  }))
  let rowNodes = 0
  for (const row of rows) {
    rowNodes += row.coveredColumns.length
  }
  const prepared = {
    nodeCount: INDEX_WIDTH_PRIMARY_COLUMNS + 1 + rowNodes,
    constraints: sparse,
    rows
  }
  verifyWidthAndSearch(prepared)
  return prepared
}

/** Prove once, outside timing, that the intended fallback and hot search path run. */
function verifyWidthAndSearch(prepared: PreparedIndexWidth): void {
  if (prepared.nodeCount !== 0xffff && prepared.nodeCount !== 0x10000) {
    throw new Error(`Unexpected index-width matrix size: ${prepared.nodeCount}`)
  }

  const context = ProblemBuilder.buildContext({
    numPrimary: INDEX_WIDTH_PRIMARY_COLUMNS,
    numSecondary: 0,
    rows: prepared.rows
  })
  const ExpectedNodeIndexArray = prepared.nodeCount === 0xffff ? Uint16Array : Int32Array
  const views: Array<
    [
      Int32Array<ArrayBufferLike> | Uint16Array<ArrayBufferLike>,
      typeof Int32Array | typeof Uint16Array
    ]
  > = [
    [context.nodes.up, ExpectedNodeIndexArray],
    [context.nodes.down, ExpectedNodeIndexArray],
    [context.nodes.col, Uint16Array],
    [context.nodes.rowIndex, Uint16Array],
    [context.nodes.rowStart, ExpectedNodeIndexArray],
    [context.columns.len, ExpectedNodeIndexArray],
    [context.columns.prev, ExpectedNodeIndexArray],
    [context.columns.next, ExpectedNodeIndexArray]
  ]
  for (const [view, ExpectedArray] of views) {
    if (!(view instanceof ExpectedArray)) {
      throw new Error(`Matrix ${prepared.nodeCount} selected the wrong integer storage width`)
    }
  }

  // Root occupies index 0, so primary column 1 has header index 2. It contains
  // only the terminal row, whose forced node was deliberately written last.
  const highestNode = prepared.nodeCount - 1
  if (context.nodes.down[2] !== highestNode) {
    throw new Error(`Search will not select the expected high node ${highestNode}`)
  }

  // Exercise the same public batch-ingestion/build/search path used by the timed
  // operation once outside timing. This prevents a handler regression from
  // producing a fast but incorrect benchmark while the direct builder check
  // above still happens to pass.
  const solutions = solveFreshAll(prepared)
  const terminalRow = prepared.rows.length - 1
  if (
    solutions.length !== 1 ||
    solutions[0]?.length !== 1 ||
    solutions[0][0]?.index !== terminalRow
  ) {
    throw new Error(
      `Index-width matrix ${prepared.nodeCount} did not produce its terminal solution`
    )
  }
}

function solveFreshAll(prepared: PreparedIndexWidth) {
  const solver = new DancingLinks<number>().createSolver({
    columns: INDEX_WIDTH_PRIMARY_COLUMNS
  })
  solver.addSparseConstraints(prepared.constraints)
  return solver.findAll()
}

function solveFreshOne(prepared: PreparedIndexWidth): unknown {
  const solver = new DancingLinks<number>().createSolver({
    columns: INDEX_WIDTH_PRIMARY_COLUMNS
  })
  solver.addSparseConstraints(prepared.constraints)
  return solver.findOne()
}

function solveFreshCount(prepared: PreparedIndexWidth, count: number): unknown {
  const solver = new DancingLinks<number>().createSolver({
    columns: INDEX_WIDTH_PRIMARY_COLUMNS
  })
  solver.addSparseConstraints(prepared.constraints)
  return solver.find(count)
}

export class IndexWidthFreshSolver extends Solver<void, PreparedIndexWidth> {
  static readonly name = 'dancing-links (fresh build + exhaustive search)'

  prepare(constraints: StandardConstraints): PreparedIndexWidth {
    return prepareRows(constraints)
  }

  solveAll(prepared: PreparedIndexWidth): unknown {
    return solveFreshAll(prepared)
  }

  solveOne(prepared: PreparedIndexWidth): unknown {
    return solveFreshOne(prepared)
  }

  solveCount(prepared: PreparedIndexWidth, count: number): unknown {
    return solveFreshCount(prepared, count)
  }
}

export class IndexWidthMixedSolver extends Solver<void, PreparedMixedWidths> {
  static readonly name = 'dancing-links (fresh Uint16 → Int32 pair)'

  prepare(int32Constraints: StandardConstraints): PreparedMixedWidths {
    // The case supplies the 32-bit half. Generate and verify the adjacent 16-bit
    // half once so every timed pair alternates the shared kernels across widths.
    return {
      uint16: prepareRows(generateIndexWidthConstraints({ nodeCount: 0xffff })),
      int32: prepareRows(int32Constraints)
    }
  }

  solveAll(prepared: PreparedMixedWidths): unknown {
    return [solveFreshAll(prepared.uint16), solveFreshAll(prepared.int32)]
  }

  solveOne(prepared: PreparedMixedWidths): unknown {
    return [solveFreshOne(prepared.uint16), solveFreshOne(prepared.int32)]
  }

  solveCount(prepared: PreparedMixedWidths, count: number): unknown {
    return [solveFreshCount(prepared.uint16, count), solveFreshCount(prepared.int32, count)]
  }
}
