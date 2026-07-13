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

export class NodeStore {
  readonly size: number
  private readonly buffer: ArrayBuffer

  readonly up: IndexArray
  readonly down: IndexArray
  readonly col: IndexArray // Column indices (sentinel for headers)
  readonly rowIndex: IndexArray // Original row index from input
  readonly rowStart: IndexArray // Contiguous node boundaries for each row

  constructor(
    maxNodes: number,
    maxRows: number,
    sourceBuffer?: ArrayBuffer,
    immutableSource?: NodeStore
  ) {
    this.size = maxNodes
    // Most exact-cover matrices fit below the reserved Uint16 sentinel. Using
    // 16-bit indices halves navigation bandwidth and working-set size; larger
    // matrices transparently retain 32-bit indices with identical semantics.
    const IndexArrayConstructor = maxNodes <= UINT16_SENTINEL ? Uint16Array : Int32Array
    const bytesPerElement = IndexArrayConstructor.BYTES_PER_ELEMENT
    const nodeFieldBytes = maxNodes * bytesPerElement
    const bufferBytes = immutableSource
      ? nodeFieldBytes * 2
      : nodeFieldBytes * 4 + (maxRows + 1) * bytesPerElement
    this.buffer = sourceBuffer ?? new ArrayBuffer(bufferBytes)

    // ProblemBuilder writes every used slot directly. Typed arrays already
    // arrive zeroed, so sentinel fills would add redundant full memory passes
    // before the useful construction writes begin. One backing allocation also
    // reduces allocator/GC bookkeeping and keeps the navigation tables within a
    // compact virtual-memory range while retaining the SoA access pattern.
    this.up = new IndexArrayConstructor(this.buffer, 0, maxNodes)
    this.down = new IndexArrayConstructor(this.buffer, nodeFieldBytes, maxNodes)
    if (immutableSource) {
      // Search writes only up/down. Template clones share these read-only views,
      // cutting copied node bytes by 60% while keeping ordinary builds in one
      // allocation. The private template owns their lifetime and is never searched.
      this.col = immutableSource.col
      this.rowIndex = immutableSource.rowIndex
      this.rowStart = immutableSource.rowStart
    } else {
      this.col = new IndexArrayConstructor(this.buffer, nodeFieldBytes * 2, maxNodes)
      this.rowIndex = new IndexArrayConstructor(this.buffer, nodeFieldBytes * 3, maxNodes)
      this.rowStart = new IndexArrayConstructor(this.buffer, nodeFieldBytes * 4, maxRows + 1)
    }
  }

  clone(): NodeStore {
    // The mutable navigation views occupy the buffer's leading contiguous range,
    // so one native slice copies exactly the state a fresh search can modify.
    const mutableBytes = this.up.byteLength + this.down.byteLength
    return new NodeStore(
      this.size,
      this.rowStart.length - 1,
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
