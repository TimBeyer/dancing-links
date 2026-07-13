/**
 * Struct-of-Arrays (SoA) data structures for Dancing Links
 *
 * Implementation using typed arrays for better memory efficiency.
 *
 * ARCHITECTURE:
 * - NodeStore: Contains node data in separate integer typed-array fields
 * - ColumnStore: Contains column data in separate integer typed-array fields
 * - Index-based references: Uses array indices and a width-appropriate sentinel
 * - Pre-allocated storage: Fixed-size arrays determined by constraint matrix analysis
 *
 * DESIGN CONSIDERATIONS:
 * - Setup cost: Requires capacity estimation during initialization
 * - Memory pattern: Fixed allocation vs dynamic growth
 * - Access pattern: Array indexing with bounds checking
 * - Code style: Index-based operations throughout algorithms
 */

const NULL_INDEX = -1
const UINT16_SENTINEL = 0xffff

type IndexArray = Int32Array | Uint16Array

function alignOffset(offset: number, bytesPerElement: number): number {
  return Math.ceil(offset / bytesPerElement) * bytesPerElement
}

export class NodeStore {
  readonly size: number
  private readonly maxRows: number
  private readonly maxColumns: number
  private readonly buffer: ArrayBuffer

  readonly up: IndexArray
  readonly down: IndexArray
  readonly col: IndexArray // Column indices (sentinel for headers)
  readonly rowIndex: IndexArray // Original row index from input
  readonly rowStart: IndexArray // Contiguous node boundaries for each row

  constructor(
    maxNodes: number,
    maxRows: number,
    maxColumns: number,
    sourceBuffer?: ArrayBuffer,
    immutableSource?: NodeStore
  ) {
    this.size = maxNodes
    this.maxRows = maxRows
    this.maxColumns = maxColumns
    // Each field follows the domain of the values it stores. A large node table
    // needs 32-bit navigation and row boundaries, but its column IDs and row IDs
    // often still fit in 16 bits. Keeping those metadata streams narrow halves
    // their search bandwidth and keeps the shared kernels' col/rowIndex load
    // sites monomorphic when only navigation crosses the node-width boundary.
    const NodeIndexArray = maxNodes <= UINT16_SENTINEL ? Uint16Array : Int32Array
    const ColumnIndexArray = maxColumns <= UINT16_SENTINEL ? Uint16Array : Int32Array
    const RowIndexArray = maxRows <= UINT16_SENTINEL ? Uint16Array : Int32Array
    const nodeFieldBytes = maxNodes * NodeIndexArray.BYTES_PER_ELEMENT
    const mutableBytes = nodeFieldBytes * 2

    let colOffset = mutableBytes
    let rowIndexOffset = mutableBytes
    let rowStartOffset = mutableBytes
    let bufferBytes = mutableBytes
    if (!immutableSource) {
      // Mixed-width views still share one allocation. Aligning only where a
      // wider constructor requires it avoids separate buffers and their extra
      // allocator/GC bookkeeping while adding at most a few padding bytes.
      colOffset = alignOffset(bufferBytes, ColumnIndexArray.BYTES_PER_ELEMENT)
      bufferBytes = colOffset + maxNodes * ColumnIndexArray.BYTES_PER_ELEMENT
      rowIndexOffset = alignOffset(bufferBytes, RowIndexArray.BYTES_PER_ELEMENT)
      bufferBytes = rowIndexOffset + maxNodes * RowIndexArray.BYTES_PER_ELEMENT
      rowStartOffset = alignOffset(bufferBytes, NodeIndexArray.BYTES_PER_ELEMENT)
      bufferBytes = rowStartOffset + (maxRows + 1) * NodeIndexArray.BYTES_PER_ELEMENT
    }
    this.buffer = sourceBuffer ?? new ArrayBuffer(bufferBytes)

    // ProblemBuilder writes every used slot directly. Typed arrays already
    // arrive zeroed, so sentinel fills would add redundant full memory passes
    // before the useful construction writes begin. One backing allocation also
    // reduces allocator/GC bookkeeping and keeps the navigation tables within a
    // compact virtual-memory range while retaining the SoA access pattern.
    this.up = new NodeIndexArray(this.buffer, 0, maxNodes)
    this.down = new NodeIndexArray(this.buffer, nodeFieldBytes, maxNodes)
    if (immutableSource) {
      // Search writes only up/down. Template clones share every read-only view,
      // so native copying remains limited to navigation bytes even when metadata
      // uses an independently narrower width. The private template owns the
      // shared views' lifetime and is never searched.
      this.col = immutableSource.col
      this.rowIndex = immutableSource.rowIndex
      this.rowStart = immutableSource.rowStart
    } else {
      this.col = new ColumnIndexArray(this.buffer, colOffset, maxNodes)
      this.rowIndex = new RowIndexArray(this.buffer, rowIndexOffset, maxNodes)
      this.rowStart = new NodeIndexArray(this.buffer, rowStartOffset, maxRows + 1)
    }
  }

  clone(): NodeStore {
    // The mutable navigation views occupy the buffer's leading contiguous range,
    // so one native slice copies exactly the state a fresh search can modify.
    const mutableBytes = this.up.byteLength + this.down.byteLength
    return new NodeStore(
      this.size,
      this.maxRows,
      this.maxColumns,
      this.buffer.slice(0, mutableBytes),
      this
    )
  }
}

export class ColumnStore {
  readonly size: number
  private readonly maxNodes: number
  private readonly buffer: ArrayBuffer

  readonly len: IndexArray // Column lengths
  readonly prev: IndexArray // Previous column indices (sentinel for null)
  readonly next: IndexArray // Next column indices (sentinel for null)

  constructor(maxColumns: number, maxNodes: number, sourceBuffer?: ArrayBuffer) {
    this.size = maxColumns
    this.maxNodes = maxNodes
    // Column lengths cannot exceed the total node count, so the node-width
    // decision safely applies to all three column fields as well.
    const IndexArrayConstructor = maxNodes <= UINT16_SENTINEL ? Uint16Array : Int32Array
    const fieldBytes = maxColumns * IndexArrayConstructor.BYTES_PER_ELEMENT
    this.buffer = sourceBuffer ?? new ArrayBuffer(fieldBytes * 3)
    this.len = new IndexArrayConstructor(this.buffer, 0, maxColumns)
    this.prev = new IndexArrayConstructor(this.buffer, fieldBytes, maxColumns)
    this.next = new IndexArrayConstructor(this.buffer, fieldBytes * 2, maxColumns)
  }

  clone(): ColumnStore {
    return new ColumnStore(this.size, this.maxNodes, this.buffer.slice(0))
  }
}

/**
 * Internal constraint interface for capacity calculation
 * Unifies ConstraintRow<T> and sparse constraint formats
 */
interface ConstraintWithColumns {
  coveredColumns: number[]
}

/**
 * Calculate required capacity for stores based on constraints
 * Uses for...of loops for performance and readability
 */
export function calculateCapacity(
  numPrimary: number,
  numSecondary: number,
  constraints: Array<ConstraintWithColumns>
): { numNodes: number; numColumns: number } {
  // Count row nodes with for...of loop for performance
  let rowNodes = 0
  for (const constraint of constraints) {
    rowNodes += constraint.coveredColumns.length
  }

  // Count column head nodes: 1 root + numPrimary + numSecondary
  const headNodes = 1 + numPrimary + numSecondary

  const numNodes = rowNodes + headNodes
  const numColumns = numPrimary + numSecondary + 1 // +1 for root column
  return { numNodes, numColumns }
}

export { NULL_INDEX }
