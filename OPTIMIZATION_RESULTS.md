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

*...continue for each test...*

## Final Results Summary
*To be updated after all individual tests are complete*

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