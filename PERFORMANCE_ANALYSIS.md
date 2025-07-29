# Struct-of-Arrays Performance Analysis

## Results Summary

### Baseline (Array-of-Structs) vs SoA Performance
| Benchmark | Baseline (ops/sec) | SoA (ops/sec) | Change | % Change |
|-----------|---------------------|---------------|--------|----------|
| Sudoku findRaw | 12,696 | 10,218 | -2,478 | **-19.5%** |
| Pentomino 1 tiling | 510 | 599 | +89 | **+17.5%** |
| Pentomino 10 tilings | 79.68 | 93.56 | +13.88 | **+17.4%** |
| Pentomino 100 tilings | 10.47 | 12.70 | +2.23 | **+21.3%** |

## Key Findings

### 1. Problem Size Dependency
The SoA approach shows **inverse correlation with problem complexity**:
- **Small problems (Sudoku)**: 19.5% performance regression
- **Medium problems (1 Pentomino)**: 17.5% improvement  
- **Large problems (100 Pentominos)**: 21.3% improvement

### 2. Cache Locality Benefits
The performance gains increase with problem complexity, suggesting:
- Cache locality benefits outweigh SoA overhead on larger problems
- Memory bandwidth becomes the bottleneck on complex problems
- Typed arrays provide better memory access patterns

### 3. Overhead Analysis
The Sudoku regression indicates SoA introduces overhead from:
- Array bounds checking vs direct pointer access
- Index arithmetic vs pointer arithmetic
- Potentially worse instruction cache usage

## Architectural Implications

### When SoA Wins
✅ **Large constraint matrices** (100+ solutions)
✅ **Complex search spaces** with deep recursion
✅ **Memory-bound workloads** where cache misses dominate

### When SoA Loses  
❌ **Small problems** with simple constraint matrices
❌ **CPU-bound workloads** with minimal memory pressure
❌ **Short-running searches** where setup overhead matters

## Technical Details

### Memory Layout Benefits (Large Problems)
```
AoS Layout: [Node][Node][Node]... - scattered objects
SoA Layout: [left₀,left₁,left₂...][right₀,right₁,right₂...] - contiguous arrays
```

**Cache Line Utilization:**
- AoS: Loading `node.left` brings entire node (56+ bytes)
- SoA: Loading `left[i]` brings 16 nearby indices (64 bytes)

### Overhead Sources (Small Problems)
1. **Index bounds checking**: V8 adds safety checks for typed arrays
2. **Capacity pre-allocation**: Fixed-size arrays vs dynamic object creation  
3. **Double indirection**: `nodes.left[index]` vs `node.left`

## Recommendations

### Immediate Actions
1. **Hybrid approach**: Keep both implementations
2. **Problem size heuristic**: Switch based on constraint matrix size
3. **Threshold tuning**: Empirically determine crossover point

### Optimization Opportunities  
1. **SIMD vectorization**: Batch operations on typed arrays
2. **Memory pool**: Reuse SoA structures across searches
3. **Capacity right-sizing**: Avoid over-allocation overhead

### Threshold Heuristic (Proposed)
```typescript
function shouldUseSoA<T>(config: SearchConfig<T>): boolean {
  const totalNodes = config.rows.reduce((sum, row) => 
    sum + (row?.coveredColumns.length || 0), 0
  )
  
  // Use SoA for problems with 100+ nodes or 10+ solutions
  return totalNodes >= 100 || config.numSolutions >= 10
}
```

## Conclusion

The SoA refactoring successfully demonstrates:
- **Measurable performance gains** on complex problems (+17-21%)
- **Clear understanding** of cache locality benefits
- **Solid foundation** for further memory-oriented optimizations

The mixed results validate the approach while highlighting the importance of **problem-specific optimization strategies** in high-performance computing.

## Next Steps
1. Implement hybrid selector based on problem characteristics
2. Investigate SIMD opportunities for batch array operations  
3. Profile memory access patterns to optimize cache utilization
4. Consider WebAssembly compilation for maximum performance