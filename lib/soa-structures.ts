/**
 * Struct-of-Arrays (SoA) data structures for Dancing Links
 * 
 * Replaces Array-of-Structs approach with typed arrays for better
 * cache locality and memory performance.
 * 
 * PERFORMANCE BENEFITS:
 * - Cache line efficiency: Loading left[i] prefetches left[i+1], left[i+2]...
 * - Memory bandwidth: Better utilization of 64-byte cache lines
 * - Allocation overhead: Single allocation vs many small objects
 * - GC pressure: Reduced object count, less garbage collection
 * 
 * TRADE-OFFS:
 * - Setup cost: Pre-allocation requires capacity estimation
 * - Access overhead: Array bounds checking vs direct pointer access
 * - Memory usage: Fixed allocation vs dynamic growth
 * 
 * OPTIMAL USE CASES:
 * - Large constraint matrices (>100 nodes)
 * - Memory-bound problems where cache misses dominate
 * - Long-running searches that amortize setup costs
 */

const NULL_INDEX = -1

export class NodeStore<T> {
  private capacity: number
  private _size: number = 0
  
  // Typed arrays for numeric fields - better cache performance
  readonly left: Int32Array      // Node indices (NULL_INDEX for null)
  readonly right: Int32Array
  readonly up: Int32Array  
  readonly down: Int32Array
  readonly col: Int32Array       // Column indices (NULL_INDEX for null)
  readonly rowIndex: Int32Array  // Original row index from input
  
  // Generic array for data (can't use typed array for generic T)
  readonly data: Array<T | null>
  
  constructor(maxNodes: number) {
    this.capacity = maxNodes
    this.left = new Int32Array(maxNodes).fill(NULL_INDEX)
    this.right = new Int32Array(maxNodes).fill(NULL_INDEX)
    this.up = new Int32Array(maxNodes).fill(NULL_INDEX)
    this.down = new Int32Array(maxNodes).fill(NULL_INDEX)
    this.col = new Int32Array(maxNodes).fill(NULL_INDEX)
    this.rowIndex = new Int32Array(maxNodes).fill(NULL_INDEX)
    this.data = new Array(maxNodes).fill(null)
  }
  
  /**
   * Allocate a new node and return its index
   */
  allocateNode(): number {
    if (this._size >= this.capacity) {
      throw new Error(`NodeStore capacity exceeded: ${this.capacity}`)
    }
    return this._size++
  }
  
  /**
   * Initialize a node with self-referencing links (circular)
   */
  initializeNode(nodeIndex: number, colIndex: number = NULL_INDEX, rowIdx: number = NULL_INDEX, nodeData: T | null = null): void {
    this.left[nodeIndex] = nodeIndex
    this.right[nodeIndex] = nodeIndex
    this.up[nodeIndex] = nodeIndex
    this.down[nodeIndex] = nodeIndex
    this.col[nodeIndex] = colIndex
    this.rowIndex[nodeIndex] = rowIdx
    this.data[nodeIndex] = nodeData
  }
  
  /**
   * Link two nodes horizontally (left-right)
   */
  linkHorizontal(leftIndex: number, rightIndex: number): void {
    this.right[leftIndex] = rightIndex
    this.left[rightIndex] = leftIndex
  }
  
  /**
   * Link two nodes vertically (up-down)
   */
  linkVertical(upIndex: number, downIndex: number): void {
    this.down[upIndex] = downIndex
    this.up[downIndex] = upIndex
  }
  
  get size(): number {
    return this._size
  }
}

export class ColumnStore {
  private capacity: number
  private _size: number = 0
  
  readonly head: Int32Array      // Head node indices
  readonly len: Int32Array       // Column lengths
  readonly prev: Int32Array      // Previous column indices (NULL_INDEX for null)
  readonly next: Int32Array      // Next column indices (NULL_INDEX for null)
  
  constructor(maxColumns: number) {
    this.capacity = maxColumns
    this.head = new Int32Array(maxColumns).fill(NULL_INDEX)
    this.len = new Int32Array(maxColumns).fill(0)
    this.prev = new Int32Array(maxColumns).fill(NULL_INDEX)
    this.next = new Int32Array(maxColumns).fill(NULL_INDEX)
  }
  
  /**
   * Allocate a new column and return its index
   */
  allocateColumn(): number {
    if (this._size >= this.capacity) {
      throw new Error(`ColumnStore capacity exceeded: ${this.capacity}`)
    }
    return this._size++
  }
  
  /**
   * Initialize a column with given head node
   */
  initializeColumn(colIndex: number, headNodeIndex: number): void {
    this.head[colIndex] = headNodeIndex
    this.len[colIndex] = 0
    this.prev[colIndex] = NULL_INDEX
    this.next[colIndex] = NULL_INDEX
  }
  
  /**
   * Link two columns horizontally
   */
  linkColumns(leftIndex: number, rightIndex: number): void {
    this.next[leftIndex] = rightIndex
    this.prev[rightIndex] = leftIndex
  }
  
  get size(): number {
    return this._size
  }
}

/**
 * Estimate required capacity for stores based on search configuration
 */
export function estimateCapacity(numPrimary: number, numSecondary: number, rows: Array<{coveredColumns: number[]} | undefined>): {maxNodes: number, maxColumns: number} {
  // Count row nodes
  const rowNodes = rows.reduce((sum, row) => 
    sum + (row?.coveredColumns.length || 0), 0
  )
  
  // Count column head nodes: 1 root + numPrimary + numSecondary
  const headNodes = 1 + numPrimary + numSecondary
  
  const maxNodes = rowNodes + headNodes
  const maxColumns = numPrimary + numSecondary + 1 // +1 for root column
  return { maxNodes, maxColumns }
}

export { NULL_INDEX }