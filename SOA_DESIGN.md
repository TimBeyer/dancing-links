# Struct-of-Arrays (SoA) Architecture Design

## Current Performance Baseline
- Sudoku findRaw: 12,696 ops/sec
- Pentomino 1 tiling findRaw: 510 ops/sec
- Pentomino 10 tilings findRaw: 79.68 ops/sec
- Pentomino 100 tilings findRaw: 10.47 ops/sec

## Architecture Overview

### Current Array-of-Structs (AoS) Problems
1. **Memory fragmentation**: Node objects scattered in memory
2. **Cache misses**: Accessing node.left requires loading entire node object
3. **Pointer chasing**: Each traversal requires multiple memory jumps
4. **GC overhead**: Many small objects create garbage collection pressure

### Target Struct-of-Arrays (SoA) Benefits
1. **Cache locality**: Related data stored contiguously 
2. **Fewer cache misses**: Accessing left[i] loads nearby indices
3. **Reduced memory overhead**: No object headers per node
4. **Better memory layout**: Arrays enable prefetching

## Data Structure Design

### NodeStore (replaces Node<T> objects)
```typescript
class NodeStore<T> {
  private capacity: number
  private size: number = 0
  
  // Typed arrays for numeric fields (better cache performance)
  readonly left: Int32Array     // Node indices (-1 for null)
  readonly right: Int32Array
  readonly up: Int32Array  
  readonly down: Int32Array
  readonly col: Int32Array      // Column indices (-1 for null)
  readonly rowIndex: Int32Array // Original row index
  
  // Generic array for data (can't use typed array)
  readonly data: Array<T | null>
  
  constructor(maxNodes: number) {
    this.capacity = maxNodes
    this.left = new Int32Array(maxNodes)
    this.right = new Int32Array(maxNodes) 
    this.up = new Int32Array(maxNodes)
    this.down = new Int32Array(maxNodes)
    this.col = new Int32Array(maxNodes)
    this.rowIndex = new Int32Array(maxNodes)
    this.data = new Array(maxNodes)
  }
  
  allocateNode(): number {
    if (this.size >= this.capacity) {
      throw new Error('NodeStore capacity exceeded')
    }
    return this.size++
  }
}
```

### ColumnStore (replaces Column<T> objects)  
```typescript
class ColumnStore {
  private capacity: number
  private size: number = 0
  
  readonly head: Int32Array     // Head node indices
  readonly len: Int32Array      // Column lengths
  readonly prev: Int32Array     // Previous column indices (-1 for null)
  readonly next: Int32Array     // Next column indices (-1 for null)
  
  constructor(maxColumns: number) {
    this.capacity = maxColumns
    this.head = new Int32Array(maxColumns)
    this.len = new Int32Array(maxColumns)
    this.prev = new Int32Array(maxColumns)
    this.next = new Int32Array(maxColumns)
  }
  
  allocateColumn(): number {
    if (this.size >= this.capacity) {
      throw new Error('ColumnStore capacity exceeded')
    }
    return this.size++
  }
}
```

## Implementation Strategy

### Phase 1: Core Data Structures
1. Implement NodeStore and ColumnStore classes
2. Add capacity estimation logic based on input constraints
3. Create index-based accessors to replace pointer operations

### Phase 2: Algorithm Adaptation
1. Refactor `cover()` and `uncover()` to use array indices
2. Update node traversal patterns in state machine
3. Replace pointer comparisons with index comparisons

### Phase 3: Memory Layout Optimization
1. Pre-allocate stores based on constraint analysis
2. Optimize index access patterns for cache locality
3. Consider SIMD opportunities for batch operations

## Critical Performance Areas

### Cover/Uncover Operations (Most Frequent)
**Current**: 
```typescript
for (let rr = c.head.down!; rr !== c.head; rr = rr.down!) {
  for (let nn = rr.right!; nn !== rr; nn = nn.right!) {
    const uu = nn.up!
    const dd = nn.down!
    uu.down = dd
    dd.up = uu
    nn.col!.len -= 1
  }
}
```

**SoA Target**:
```typescript  
for (let rr = nodes.down[colHead]; rr !== colHead; rr = nodes.down[rr]) {
  for (let nn = nodes.right[rr]; nn !== rr; nn = nodes.right[nn]) {
    const uu = nodes.up[nn]
    const dd = nodes.down[nn]
    nodes.down[uu] = dd
    nodes.up[dd] = uu
    columns.len[nodes.col[nn]]--
  }
}
```

### Benefits Analysis
1. **Cache lines**: Loading left[i] likely prefetches left[i+1], left[i+2]...
2. **Memory bandwidth**: Better utilization of memory bus width
3. **Branch prediction**: More predictable access patterns
4. **SIMD potential**: Could vectorize some operations in future

### Capacity Estimation
```typescript
function estimateCapacity<T>(config: SearchConfig<T>) {
  const maxNodes = config.rows.reduce((sum, row) => 
    sum + (row?.coveredColumns.length || 0), 0
  )
  const maxColumns = config.numPrimary + config.numSecondary + 1 // +1 for root
  return { maxNodes, maxColumns }
}
```

## Success Metrics
- Target: 15-25% performance improvement 
- Maintain API compatibility
- Pass all existing unit tests
- Manageable code complexity increase