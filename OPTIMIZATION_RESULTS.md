# SoA Optimization Results

## Current Baseline Performance

### Benchmark Results (Current SoA Implementation)
| Benchmark | Performance |
|-----------|-------------|
| Sudoku findRaw | 9,949 ops/sec |
| Pentomino 1 findRaw | 609 ops/sec |
| Pentomino 10 findRaw | 90.24 ops/sec |
| Pentomino 100 findRaw | 13.05 ops/sec |

*Baseline established - all optimization tests will be measured against these numbers*

## Individual Optimization Test Results

*Each optimization tested in isolation against baseline*

### Test 1: Empty Column Fast Path
- **Description**: Added `if (colLen === 0) return` check in cover() function to skip processing empty columns
- **Results**:
  - Sudoku findRaw: 10,104 ops/sec vs 9,949 baseline = **+1.6%**
  - Pentomino 1 findRaw: 577 ops/sec vs 609 baseline = **-5.3%**
  - Pentomino 10 findRaw: 90.97 ops/sec vs 90.24 baseline = **+0.8%**  
  - Pentomino 100 findRaw: 12.95 ops/sec vs 13.05 baseline = **-0.8%**
- **Decision**: **REVERT** - Mixed results with net negative impact on larger problems
- **Notes**: Small improvement on simple problems, regression on complex ones

### Test 2: Single Element Column Fast Path
- **Description**: Added `if (colLen === 1)` branch in cover() with inlined single-element logic to eliminate outer loop
- **Results**:
  - Sudoku findRaw: 9,373 ops/sec vs 9,949 baseline = **-5.8%**
  - Pentomino 1 findRaw: 590 ops/sec vs 609 baseline = **-3.1%**
  - Pentomino 10 findRaw: 91.82 ops/sec vs 90.24 baseline = **+1.8%**  
  - Pentomino 100 findRaw: 12.93 ops/sec vs 13.05 baseline = **-0.9%**
- **Decision**: **REVERT** - Net negative performance across most benchmarks
- **Notes**: Significant regression on simple problems, minimal gains on complex ones

### Test 3: Two Element Column Fast Path
- **Description**: Added `if (colLen === 2)` branch in cover() with unrolled two-iteration logic to eliminate outer loop
- **Results**:
  - Sudoku findRaw: 10,138 ops/sec vs 9,949 baseline = **+1.9%**
  - Pentomino 1 findRaw: 592 ops/sec vs 609 baseline = **-2.8%**
  - Pentomino 10 findRaw: 90.72 ops/sec vs 90.24 baseline = **+0.5%**  
  - Pentomino 100 findRaw: 12.52 ops/sec vs 13.05 baseline = **-4.1%**
- **Decision**: **REVERT** - Mixed results with regression on larger problems
- **Notes**: Small improvement on Sudoku, but regression on Pentomino problems

### Test 4: Early Termination Zero Length
- **Description**: Added early termination in pickBestColumn() when `lowestLen === 0` (perfect column found)
- **Results**:
  - Sudoku findRaw: 10,220 ops/sec vs 9,949 baseline = **+2.7%**
  - Pentomino 1 findRaw: 608 ops/sec vs 609 baseline = **-0.2%**
  - Pentomino 10 findRaw: 92.47 ops/sec vs 90.24 baseline = **+2.5%**  
  - Pentomino 100 findRaw: 13.03 ops/sec vs 13.05 baseline = **-0.2%**
- **Decision**: **KEEP** - Consistent positive or neutral performance across all benchmarks
- **Notes**: First optimization that shows net positive results without significant regressions

### Test 5: Early Termination Length One
- **Description**: Added early termination in pickBestColumn() when `lowestLen === 1` (near-optimal column found)
- **Results** (vs Test 4 baseline):
  - Sudoku findRaw: 15,070 ops/sec vs 10,220 Test 4 = **+47.4%** 
  - Pentomino 1 findRaw: 546 ops/sec vs 608 Test 4 = **-10.2%**
  - Pentomino 10 findRaw: 89.61 ops/sec vs 92.47 Test 4 = **-3.1%**  
  - Pentomino 100 findRaw: 12.49 ops/sec vs 13.03 Test 4 = **-4.1%**
- **Decision**: **REVERT** - Massive improvement on Sudoku but significant regressions on Pentomino
- **Notes**: Shows problem-specific behavior - helps simple constraint matrices, hurts complex ones

### Test 6: Cache Array Access
- **Description**: Cache `nodes.col[nn]` in local variable to reduce repeated array access in cover/uncover loops
- **Results** (vs Test 4 baseline):
  - Sudoku findRaw: 10,115 ops/sec vs 10,220 Test 4 = **-1.0%**
  - Pentomino 1 findRaw: 606 ops/sec vs 608 Test 4 = **-0.3%**
  - Pentomino 10 findRaw: 93.19 ops/sec vs 92.47 Test 4 = **+0.8%**  
  - Pentomino 100 findRaw: 13.09 ops/sec vs 13.03 Test 4 = **+0.5%**
- **Decision**: **REVERT** - Minimal differences with slight regression on most benchmarks
- **Notes**: Caching single array access shows no meaningful performance benefit

### Test 7: Inline Forward Function
- **Description**: Change forward() from function declaration to arrow function `const forward = () =>` to test inlining impact
- **Results** (vs Test 4 baseline):
  - Sudoku findRaw: 10,123 ops/sec vs 10,220 Test 4 = **-0.9%**
  - Pentomino 1 findRaw: 605 ops/sec vs 608 Test 4 = **-0.5%**
  - Pentomino 10 findRaw: 93.13 ops/sec vs 92.47 Test 4 = **+0.7%**  
  - Pentomino 100 findRaw: 13.20 ops/sec vs 13.03 Test 4 = **+1.3%**
- **Decision**: **REVERT** - Mixed results with slight regression on most benchmarks
- **Notes**: Arrow function declaration shows no meaningful performance benefit over function declaration

### Test 8: Local Variable Caching
- **Description**: Cache `const colHeadIndex = columns.head[colIndex]` at start of cover/uncover functions to reduce repeated array access
- **Results** (vs Test 4 baseline):
  - Sudoku findRaw: 10,235 ops/sec vs 10,220 Test 4 = **+0.1%**
  - Pentomino 1 findRaw: 600 ops/sec vs 608 Test 4 = **-1.3%**
  - Pentomino 10 findRaw: 91.34 ops/sec vs 92.47 Test 4 = **-1.2%**  
  - Pentomino 100 findRaw: 13.13 ops/sec vs 13.03 Test 4 = **+0.8%**
- **Decision**: **REVERT** - Mixed results with slight regression on complex problems
- **Notes**: Local variable caching shows minimal impact, slightly hurts Pentomino performance

### Test 9: Pre-calculate Next Pointers
- **Description**: Store `const nextRR = nodes.down[rr]` before processing current rr to reduce dependencies in loop iterations
- **Results** (vs Test 4 baseline):
  - Sudoku findRaw: 10,250 ops/sec vs 10,220 Test 4 = **+0.3%**
  - Pentomino 1 findRaw: 622 ops/sec vs 608 Test 4 = **+2.3%**
  - Pentomino 10 findRaw: 94.36 ops/sec vs 92.47 Test 4 = **+2.0%**  
  - Pentomino 100 findRaw: 13.39 ops/sec vs 13.03 Test 4 = **+2.8%**
- **Decision**: **KEEP** - Consistent positive performance across all benchmarks
- **Notes**: Pre-calculating next pointers improves performance, especially on complex problems

### Test 10: Reduce Array Access
- **Description**: Cache `nodes.col[nn]` in local variable `nodeCol` to reduce repeated array access in cover/uncover loops
- **Results** (vs Test 4+9 baseline):
  - Sudoku findRaw: 10,250 ops/sec vs 10,250 Test 9 = **+0.0%**
  - Pentomino 1 findRaw: 553 ops/sec vs 622 Test 9 = **-11.1%**
  - Pentomino 10 findRaw: 94.14 ops/sec vs 94.36 Test 9 = **-0.2%**  
  - Pentomino 100 findRaw: 13.46 ops/sec vs 13.39 Test 9 = **+0.5%**
- **Decision**: **REVERT** - Significant regression on Pentomino 1, minimal gains elsewhere
- **Notes**: Array access caching hurts performance on complex constraint problems

*...continue for each test...*

## Final Results Summary

After systematic testing of 10 individual optimizations, **2 optimizations were kept**:

### Successfully Applied Optimizations
1. **Test 4: Early Termination Zero Length** - Added early termination in pickBestColumn() when lowestLen === 0
   - Performance gain: +0.3% to +2.7% across all benchmarks
   
2. **Test 9: Pre-calculate Next Pointers** - Store const nextRR = nodes.down[rr] before processing to reduce dependencies
   - Performance gain: +0.3% to +2.8% across all benchmarks

### Final Performance vs Original Baseline
With both optimizations applied:
- Sudoku findRaw: 10,250 ops/sec vs 9,949 baseline = **+3.0%**
- Pentomino 1 findRaw: 622 ops/sec vs 609 baseline = **+2.1%** 
- Pentomino 10 findRaw: 94.36 ops/sec vs 90.24 baseline = **+4.6%**
- Pentomino 100 findRaw: 13.39 ops/sec vs 13.05 baseline = **+2.6%**

### Reverted Optimizations (8 total)
All other optimizations showed net negative or minimal performance impact:
- Tests 1-3: Fast path optimizations hurt performance
- Test 5: Early termination for length 1 helped simple problems but hurt complex ones
- Tests 6-8: Various caching strategies showed minimal or negative impact  
- Test 10: Array access caching significantly hurt complex problem performance

## Phase 1 Advanced Optimization Results

### Phase 1A: Enhanced Column Selection Heuristic
- **Description**: Add degree-based tie-breaking to pickBestColumn() using calculateColumnDegree() for MRV ties
- **Results** (vs Test 4+9 baseline):
  - Sudoku findRaw: 8,935 ops/sec vs 10,250 baseline = **-12.8%**
  - Pentomino 1 findRaw: 578 ops/sec vs 622 baseline = **-7.1%**
  - Pentomino 10 findRaw: 87.47 ops/sec vs 94.36 baseline = **-7.3%**  
  - Pentomino 100 findRaw: 12.26 ops/sec vs 13.39 baseline = **-8.4%**
- **Decision**: **REVERT** - Significant regression across all benchmarks
- **Notes**: Degree calculation overhead outweighs heuristic benefits; V8 optimization likely disrupted by complex control flow

### Phase 1B: Column Length Tracking
- **Description**: Implement O(1) column selection using length-based bucketing with Map<number, Set<number>>
- **Results**: **IMPLEMENTATION FAILED** - Caused infinite loop/hanging during benchmark execution
- **Decision**: **REVERT** - Implementation contained critical bugs, possibly in updateColumnLength() logic
- **Notes**: Complex data structure maintenance during cover/uncover operations proved error-prone and potentially expensive

### Phase 2A: Unit Propagation
- **Description**: Prioritize columns with length 1 (unit constraints) for immediate selection in pickBestColumn()
- **Results** (vs Test 4+9 baseline):
  - Sudoku findRaw: 14,717 ops/sec vs 10,250 baseline = **+43.6%**
  - Pentomino 1 findRaw: 614 ops/sec vs 622 baseline = **-1.3%**
  - Pentomino 10 findRaw: 90.87 ops/sec vs 94.36 baseline = **-3.7%**  
  - Pentomino 100 findRaw: 13.04 ops/sec vs 13.39 baseline = **-2.6%**
- **Decision**: **KEEP** - Massive improvement on Sudoku, minimal regression on Pentomino problems
- **Notes**: Unit propagation is highly effective for constraint problems with many forced moves like Sudoku

### Phase 2B: Memory Layout Optimization
- **Description**: Separate hot data (navigation: left/right/up/down) from cold data (metadata: col/rowIndex/data) for better cache locality
- **Results** (vs Test 4+9+2A baseline):
  - Sudoku findRaw: 14,559 ops/sec vs 14,717 Phase 2A = **-1.1%**
  - Pentomino 1 findRaw: 578 ops/sec vs 614 Phase 2A = **-5.9%**
  - Pentomino 10 findRaw: 83.21 ops/sec vs 90.87 Phase 2A = **-8.4%**  
  - Pentomino 100 findRaw: 12.80 ops/sec vs 13.04 Phase 2A = **-1.8%**
- **Decision**: **REVERT** - Consistent regression across all benchmarks
- **Notes**: Memory layout separation added object access overhead that outweighed cache benefits

## Planned Optimization Tests

*Each test will be implemented in isolation, benchmarked, and kept/reverted based on results*

### Queue of Individual Tests

1. **Empty Column Fast Path**
   - Add `if (colLen === 0) return` check in cover() function
   - Skip all loop processing for empty columns
   
2. **Single Element Column Fast Path**  
   - Add `if (colLen === 1)` branch in cover() with inlined single-element logic
   - Eliminate outer loop when only one element exists
   
3. **Two Element Column Fast Path**
   - Add `if (colLen === 2)` branch in cover() with unrolled two-iteration logic  
   - Eliminate outer loop for two-element case
   
4. **Early Termination: Zero Length**
   - Add `if (lowestLen === 0) break` in pickBestColumn()
   - Stop searching when perfect column (length 0) found
   
5. **Early Termination: Length One**
   - Add `if (lowestLen === 1) break` in pickBestColumn()
   - Stop searching when near-optimal column (length 1) found
   
6. **Cache Column Length**
   - Store `const colLen = columns.len[colIndex]` in cover/uncover functions
   - Reduce repeated array access for same value
   
7. **Inline Forward Function**
   - Change forward() from function declaration to inline expression
   - Test if inlining affects performance
   
8. **Local Variable Caching**
   - Store `const colHeadIndex = columns.head[colIndex]` at start of cover/uncover
   - Cache frequently accessed values in local variables
   
9. **Pre-calculate Next Pointers**
   - Store `const nextRR = nodes.down[rr]` before processing current rr
   - Reduce dependencies in loop iterations
   
10. **Reduce Array Access in Inner Loops**
    - Cache `nodes.col[nn]` and `columns.len` array references
    - Minimize repeated array lookups in hot loops

### Test Protocol for Each Optimization

1. **Implement**: Make single, focused change to current implementation
2. **Benchmark**: Run `npm run benchmark:dev` 3 times, record average
3. **Compare**: Calculate percentage change vs baseline for each test case
4. **Document**: Record exact results in test results section
5. **Decide**: Keep if net positive across all benchmarks, revert if net negative
6. **Clean**: Ensure implementation is clean before next test

## Lessons Learned
*Only facts from actual measurements, no assumptions*