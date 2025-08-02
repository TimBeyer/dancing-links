import Benchmark from 'benchmark'
import { writeFileSync } from 'fs'

// Core library imports
import { find, findRaw } from '../index.js'
import { DancingLinks } from '../lib/new-api.js'
import { getSearchConfig } from '../lib/utils.js'

// Problem imports
import { ALL_CONSTRAINTS } from './pentomino/field.js'
import { generateConstraints, parseStringFormat, printBoard } from './sudoku/index.js'

// External library imports (conditional)
let dlxlib: any, dance: any, dancingLinksAlgorithm: any
let externalLibrariesAvailable = false

/**
 * Parse command line arguments
 */
interface BenchmarkOptions {
  includeExternal: boolean
  jsonOutput: boolean
  jsonFile?: string
  quiet: boolean
}

function parseArgs(): BenchmarkOptions {
  const args = process.argv.slice(2)
  
  const includeExternal = args.includes('--external') || args.includes('--full')
  const jsonFlag = args.find(arg => arg.startsWith('--json'))
  const jsonOutput = !!jsonFlag || args.includes('--json')
  const jsonFile = jsonFlag?.includes('=') ? jsonFlag.split('=')[1] : undefined
  const quiet = args.includes('--quiet')

  return { includeExternal, jsonOutput, jsonFile, quiet }
}

/**
 * Dynamic import of external libraries
 */
async function loadExternalLibraries() {
  try {
    dlxlib = await import('dlxlib')
    dance = await import('dance') 
    dancingLinksAlgorithm = await import('dancing-links-algorithm')
    externalLibrariesAvailable = true
  } catch (error) {
    console.warn('External libraries not available, running in library-only mode')
    externalLibrariesAvailable = false
  }
}

/**
 * Benchmark result interfaces
 */
interface BenchmarkResult {
  name: string
  opsPerSec: number
  margin: number
  runs: number
  deprecated?: boolean
}

interface BenchmarkSection {
  benchmarkName: string
  results: BenchmarkResult[]
}

const allResults: BenchmarkSection[] = []

/**
 * Create sparse constraints from binary constraints
 */
function createSparseConstraints<T>(binaryConstraints: Array<{data: T, row: number[]}>) {
  return binaryConstraints.map(c => ({
    data: c.data,
    columns: c.row.map((val, idx) => val === 1 ? idx : -1).filter(idx => idx !== -1)
  }))
}

/**
 * Add benchmark test to suite
 */
// Track deprecated tests separately since Benchmark.js doesn't support custom metadata
const deprecatedTests = new Set<string>()

function addBenchmarkTest(
  suite: Benchmark.Suite,
  name: string,
  fn: () => void,
  deprecated = false
) {
  suite.add(name, fn)
  if (deprecated) {
    deprecatedTests.add(name)
  }
}

/**
 * Sudoku benchmark
 */
function benchmarkSudoku(options: BenchmarkOptions): Promise<void> {
  return new Promise(resolve => {
    if (!options.quiet) {
      console.log('Benchmark: A solution to the sudoku\n')
      const sudokuField = parseStringFormat(
        9,
        '..............3.85..1.2.......5.7.....4...1...9.......5......73..2.1........4...9'
      )
      console.log(printBoard(9, sudokuField), '\n')
    }

    const sudokuField = parseStringFormat(
      9,
      '..............3.85..1.2.......5.7.....4...1...9.......5......73..2.1........4...9'
    )
    const constraints = generateConstraints(9, sudokuField)
    const searchConfig = getSearchConfig(Infinity, constraints)
    const sparseConstraints = createSparseConstraints(constraints)
    const plainRows = constraints.map(c => c.row)
    
    // Pre-format constraints for batch operations
    const binaryConstraintsBatch = constraints.map(c => ({
      data: c.data,
      columnValues: c.row
    }))
    const sparseConstraintsBatch = sparseConstraints.map(c => ({
      data: c.data,
      columnIndices: c.columns
    }))

    const suite = new Benchmark.Suite()
    const results: BenchmarkResult[] = []

    // Our library implementations
    addBenchmarkTest(suite, 'dancing-links find', () => {
      find(constraints, Infinity)
    }, true)

    addBenchmarkTest(suite, 'dancing-links findRaw', () => {
      findRaw(searchConfig)
    }, true)

    addBenchmarkTest(suite, 'dancing-links new (binary)', () => {
      const dlx = new DancingLinks<any>()
      const solver = dlx.createSolver({ columns: 324 }) // 9x9 sudoku = 324 columns
      solver.addBinaryConstraints(binaryConstraintsBatch)
      solver.findAll()
    })

    addBenchmarkTest(suite, 'dancing-links new (sparse)', () => {
      const dlx = new DancingLinks<any>()
      const solver = dlx.createSolver({ columns: 324 })
      solver.addSparseConstraints(sparseConstraintsBatch)
      solver.findAll()
    })

    addBenchmarkTest(suite, 'dancing-links template', () => {
      const dlx = new DancingLinks<any>()
      const template = dlx.createSolverTemplate({ columns: 324 })
      
      // Build template with base constraints
      template.addSparseConstraints(sparseConstraintsBatch)
      
      // Use template
      const solver = template.createSolver()
      solver.findAll()
    })

    // External libraries (if requested and available)
    if (options.includeExternal && externalLibrariesAvailable) {
      addBenchmarkTest(suite, 'dlxlib', () => {
        dlxlib.solve(plainRows)
      })

      addBenchmarkTest(suite, 'dance', () => {
        dance.solve(plainRows, {})
      })

      addBenchmarkTest(suite, 'dancing-links-algorithm', () => {
        dancingLinksAlgorithm.solve(plainRows)
      })
    }

    suite
      .on('cycle', function (event: Benchmark.Event) {
        const benchmark = event.target
        if (!options.quiet) {
          console.log(String(event.target))
        }
        
        if (benchmark.name && benchmark.hz && benchmark.stats) {
          results.push({
            name: benchmark.name,
            opsPerSec: benchmark.hz,
            margin: benchmark.stats.rme,
            runs: benchmark.stats.sample.length,
            deprecated: deprecatedTests.has(benchmark.name || '')
          })
        }
      })
      .on('complete', function (this: any) {
        if (!options.quiet) {
          console.log('Fastest is ' + this.filter('fastest').map('name') + '\n\n')
        }
        
        allResults.push({
          benchmarkName: 'A solution to the sudoku',
          results
        })
        resolve()
      })
      .run()
  })
}

/**
 * Pentomino benchmark (one solution)
 */
function benchmarkOneTiling(options: BenchmarkOptions): Promise<void> {
  return new Promise(resolve => {
    if (!options.quiet) {
      console.log('Benchmark: Finding one pentomino tiling on a 6x10 field\n')
    }

    const searchConfig = getSearchConfig(1, ALL_CONSTRAINTS)
    const sparseConstraints = createSparseConstraints(ALL_CONSTRAINTS)
    const plainRows = ALL_CONSTRAINTS.map(c => c.row)
    
    // Pre-format constraints for batch operations
    const binaryConstraintsBatch = ALL_CONSTRAINTS.map(c => ({
      data: c.data,
      columnValues: c.row
    }))
    const sparseConstraintsBatch = sparseConstraints.map(c => ({
      data: c.data,
      columnIndices: c.columns
    }))

    const suite = new Benchmark.Suite()
    const results: BenchmarkResult[] = []

    // Our library implementations
    addBenchmarkTest(suite, 'dancing-links find', () => {
      find(ALL_CONSTRAINTS, 1)
    }, true)

    addBenchmarkTest(suite, 'dancing-links findRaw', () => {
      findRaw(searchConfig)
    }, true)

    addBenchmarkTest(suite, 'dancing-links new (binary)', () => {
      const dlx = new DancingLinks<any>()
      const solver = dlx.createSolver({ columns: 72 })
      solver.addBinaryConstraints(binaryConstraintsBatch)
      solver.findOne()
    })

    addBenchmarkTest(suite, 'dancing-links new (sparse)', () => {
      const dlx = new DancingLinks<any>()
      const solver = dlx.createSolver({ columns: 72 })
      solver.addSparseConstraints(sparseConstraintsBatch)
      solver.findOne()
    })

    addBenchmarkTest(suite, 'dancing-links template', () => {
      const dlx = new DancingLinks<any>()
      const template = dlx.createSolverTemplate({ columns: 72 })
      
      // Build template with base constraints
      template.addSparseConstraints(sparseConstraintsBatch)
      
      // Use template
      const solver = template.createSolver()
      solver.findOne()
    })

    // External libraries (if requested and available)
    if (options.includeExternal && externalLibrariesAvailable) {
      addBenchmarkTest(suite, 'dlxlib', () => {
        dlxlib.solve(plainRows, null, null, 1)
      })

      addBenchmarkTest(suite, 'dance', () => {
        dance.solve(plainRows, { maxSolutions: 1 })
      })
    }

    suite
      .on('cycle', function (event: Benchmark.Event) {
        const benchmark = event.target
        if (!options.quiet) {
          console.log(String(event.target))
        }
        
        if (benchmark.name && benchmark.hz && benchmark.stats) {
          results.push({
            name: benchmark.name,
            opsPerSec: benchmark.hz,
            margin: benchmark.stats.rme,
            runs: benchmark.stats.sample.length,
            deprecated: deprecatedTests.has(benchmark.name || '')
          })
        }
      })
      .on('complete', function (this: any) {
        if (!options.quiet) {
          console.log('Fastest is ' + this.filter('fastest').map('name') + '\n\n')
        }
        
        allResults.push({
          benchmarkName: 'Finding one pentomino tiling on a 6x10 field',
          results
        })
        resolve()
      })
      .run()
  })
}

/**
 * Pentomino benchmark (ten solutions)
 */
function benchmarkTenTilings(options: BenchmarkOptions): Promise<void> {
  return new Promise(resolve => {
    if (!options.quiet) {
      console.log('Benchmark: Finding ten pentomino tilings on a 6x10 field\n')
    }

    const searchConfig = getSearchConfig(10, ALL_CONSTRAINTS)
    const sparseConstraints = createSparseConstraints(ALL_CONSTRAINTS)
    const plainRows = ALL_CONSTRAINTS.map(c => c.row)
    
    // Pre-format constraints for batch operations
    const binaryConstraintsBatch = ALL_CONSTRAINTS.map(c => ({
      data: c.data,
      columnValues: c.row
    }))
    const sparseConstraintsBatch = sparseConstraints.map(c => ({
      data: c.data,
      columnIndices: c.columns
    }))

    const suite = new Benchmark.Suite()
    const results: BenchmarkResult[] = []

    // Our library implementations
    addBenchmarkTest(suite, 'dancing-links find', () => {
      find(ALL_CONSTRAINTS, 10)
    }, true)

    addBenchmarkTest(suite, 'dancing-links findRaw', () => {
      findRaw(searchConfig)
    }, true)

    addBenchmarkTest(suite, 'dancing-links new (binary)', () => {
      const dlx = new DancingLinks<any>()
      const solver = dlx.createSolver({ columns: 72 })
      solver.addBinaryConstraints(binaryConstraintsBatch)
      solver.find(10)
    })

    addBenchmarkTest(suite, 'dancing-links new (sparse)', () => {
      const dlx = new DancingLinks<any>()
      const solver = dlx.createSolver({ columns: 72 })
      solver.addSparseConstraints(sparseConstraintsBatch)
      solver.find(10)
    })

    addBenchmarkTest(suite, 'dancing-links template', () => {
      const dlx = new DancingLinks<any>()
      const template = dlx.createSolverTemplate({ columns: 72 })
      
      // Build template with base constraints
      template.addSparseConstraints(sparseConstraintsBatch)
      
      // Use template
      const solver = template.createSolver()
      solver.find(10)
    })

    // External libraries (if requested and available)
    if (options.includeExternal && externalLibrariesAvailable) {
      addBenchmarkTest(suite, 'dlxlib', () => {
        dlxlib.solve(plainRows, null, null, 10)
      })

      addBenchmarkTest(suite, 'dance', () => {
        dance.solve(plainRows, { maxSolutions: 10 })
      })
    }

    suite
      .on('cycle', function (event: Benchmark.Event) {
        const benchmark = event.target
        if (!options.quiet) {
          console.log(String(event.target))
        }
        
        if (benchmark.name && benchmark.hz && benchmark.stats) {
          results.push({
            name: benchmark.name,
            opsPerSec: benchmark.hz,
            margin: benchmark.stats.rme,
            runs: benchmark.stats.sample.length,
            deprecated: deprecatedTests.has(benchmark.name || '')
          })
        }
      })
      .on('complete', function (this: any) {
        if (!options.quiet) {
          console.log('\nFastest is ' + this.filter('fastest').map('name') + '\n\n')
        }
        
        allResults.push({
          benchmarkName: 'Finding ten pentomino tilings on a 6x10 field',
          results
        })
        resolve()
      })
      .run()
  })
}

/**
 * Pentomino benchmark (hundred solutions)
 */
function benchmarkHundredTilings(options: BenchmarkOptions): Promise<void> {
  return new Promise(resolve => {
    if (!options.quiet) {
      console.log('Benchmark: Finding one hundred pentomino tilings on a 6x10 field\n')
    }

    const searchConfig = getSearchConfig(100, ALL_CONSTRAINTS)
    const sparseConstraints = createSparseConstraints(ALL_CONSTRAINTS)
    const plainRows = ALL_CONSTRAINTS.map(c => c.row)
    
    // Pre-format constraints for batch operations
    const binaryConstraintsBatch = ALL_CONSTRAINTS.map(c => ({
      data: c.data,
      columnValues: c.row
    }))
    const sparseConstraintsBatch = sparseConstraints.map(c => ({
      data: c.data,
      columnIndices: c.columns
    }))

    const suite = new Benchmark.Suite()
    const results: BenchmarkResult[] = []

    // Our library implementations
    addBenchmarkTest(suite, 'dancing-links find', () => {
      find(ALL_CONSTRAINTS, 100)
    }, true)

    addBenchmarkTest(suite, 'dancing-links findRaw', () => {
      findRaw(searchConfig)
    }, true)

    addBenchmarkTest(suite, 'dancing-links new (binary)', () => {
      const dlx = new DancingLinks<any>()
      const solver = dlx.createSolver({ columns: 72 })
      solver.addBinaryConstraints(binaryConstraintsBatch)
      solver.find(100)
    })

    addBenchmarkTest(suite, 'dancing-links new (sparse)', () => {
      const dlx = new DancingLinks<any>()
      const solver = dlx.createSolver({ columns: 72 })
      solver.addSparseConstraints(sparseConstraintsBatch)
      solver.find(100)
    })

    addBenchmarkTest(suite, 'dancing-links template', () => {
      const dlx = new DancingLinks<any>()
      const template = dlx.createSolverTemplate({ columns: 72 })
      
      // Build template with base constraints
      template.addSparseConstraints(sparseConstraintsBatch)
      
      // Use template
      const solver = template.createSolver()
      solver.find(100)
    })

    // External libraries (if requested and available)
    if (options.includeExternal && externalLibrariesAvailable) {
      addBenchmarkTest(suite, 'dlxlib', () => {
        dlxlib.solve(plainRows, null, null, 100)
      })

      addBenchmarkTest(suite, 'dance', () => {
        dance.solve(plainRows, { maxSolutions: 100 })
      })
    }

    suite
      .on('cycle', function (event: Benchmark.Event) {
        const benchmark = event.target
        if (!options.quiet) {
          console.log(String(event.target))
        }
        
        if (benchmark.name && benchmark.hz && benchmark.stats) {
          results.push({
            name: benchmark.name,
            opsPerSec: benchmark.hz,
            margin: benchmark.stats.rme,
            runs: benchmark.stats.sample.length,
            deprecated: deprecatedTests.has(benchmark.name || '')
          })
        }
      })
      .on('complete', function (this: any) {
        if (!options.quiet) {
          console.log('\nFastest is ' + this.filter('fastest').map('name') + '\n\n')
        }
        
        allResults.push({
          benchmarkName: 'Finding one hundred pentomino tilings on a 6x10 field',
          results
        })
        resolve()
      })
      .run()
  })
}

/**
 * Output results
 */
function outputResults(options: BenchmarkOptions) {
  if (options.jsonOutput) {
    const jsonOutput = JSON.stringify(allResults, null, 2)
    
    if (options.jsonFile) {
      writeFileSync(options.jsonFile, jsonOutput)
      if (!options.quiet) {
        console.log(`Benchmark results written to ${options.jsonFile}`)
      }
    } else {
      console.log(jsonOutput)
    }
  }
}

/**
 * Main benchmark runner
 */
async function runAllBenchmarks() {
  const options = parseArgs()
  
  // Load external libraries if needed
  if (options.includeExternal) {
    await loadExternalLibraries()
  }
  
  if (!options.quiet) {
    console.log('============================================================')
    console.log('DANCING LINKS PERFORMANCE BENCHMARKS')
    if (options.includeExternal) {
      console.log('Mode: Full comparison (including external libraries)')
    } else {
      console.log('Mode: Library-only (fast CI mode)')
    }
    console.log('============================================================')
    console.log()
    
    // Validate column counts to ensure hardcoded values are correct
    console.log('Validating constraint dimensions...')
    
    // Sudoku validation
    const sudokuField = parseStringFormat(9, '..............3.85..1.2.......5.7.....4...1...9.......5......73..2.1........4...9')
    const sudokuConstraints = generateConstraints(9, sudokuField)
    const sudokuMaxColumn = Math.max(...sudokuConstraints.flatMap(c => c.row.map((val, idx) => val === 1 ? idx : -1).filter(idx => idx !== -1)))
    console.log(`Sudoku: Expected 324 columns, actual max column index: ${sudokuMaxColumn} (${sudokuMaxColumn + 1} columns)`)
    
    // Pentomino validation  
    const pentominoMaxColumn = Math.max(...ALL_CONSTRAINTS.flatMap(c => c.row.map((val, idx) => val === 1 ? idx : -1).filter(idx => idx !== -1)))
    console.log(`Pentomino: Expected 72 columns, actual max column index: ${pentominoMaxColumn} (${pentominoMaxColumn + 1} columns)`)
    console.log()
  }

  // Run all benchmarks
  await benchmarkSudoku(options)
  await benchmarkOneTiling(options)
  await benchmarkTenTilings(options)
  await benchmarkHundredTilings(options)

  // Output results
  outputResults(options)
  
  if (!options.quiet && !options.jsonOutput) {
    console.log('============================================================')
    console.log('BENCHMARK COMPLETE')
    console.log('============================================================')
  }
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
Usage: node benchmark/index.js [options]

Options:
  --external, --full    Include external library comparisons (dlxlib, dance, etc.)
  --json[=file]         Output results as JSON (to file if specified)
  --quiet               Suppress console output during benchmarks
  --help                Show this help message

Examples:
  node benchmark/index.js                      # Fast mode (library only)
  node benchmark/index.js --external           # Full comparison mode
  node benchmark/index.js --json=results.json  # Fast mode with JSON output
  node benchmark/index.js --external --json    # Full mode with JSON to stdout
`)
}

// Run benchmarks or show help
if (process.argv.includes('--help')) {
  showUsage()
} else {
  runAllBenchmarks().catch(console.error)
}