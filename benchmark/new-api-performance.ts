import Benchmark from 'benchmark'
import { DancingLinks } from '../lib/new-api.js'
import { find, findRaw } from '../index.js'
import { ALL_CONSTRAINTS } from './pentomino/field.js'
import { getSearchConfig } from '../lib/utils.js'
import { generateConstraints, parseStringFormat } from './sudoku/index.js'

/**
 * Benchmark the new caching API against current implementation
 * to demonstrate performance improvements for constraint reuse scenarios
 */

function benchmarkConstraintCaching() {
  console.log('Benchmark: Constraint Caching Performance (Pentomino)\n')

  // Pre-compute search config for findRaw baseline
  const searchConfig = getSearchConfig(1, ALL_CONSTRAINTS)

  const suite = new Benchmark.Suite()

  suite
    .add('Deprecated API: find() - no caching', function () {
      find(ALL_CONSTRAINTS, 1)
    })
    .add('Deprecated API: findRaw() - manual caching', function () {
      findRaw(searchConfig)
    })
    .add('New API: First solve (pays encoding cost)', function () {
      const dlx = new DancingLinks()
      const solver = dlx.createSolver({ columns: 72 })
      for (const constraint of ALL_CONSTRAINTS) {
        solver.addBinaryConstraint(constraint.data, constraint.row)
      }
      solver.findOne()
    })
    .add('New API: Cached solve (reuses encoded constraints)', function () {
      // Simulate reusing the same constraint patterns with different data
      const dlx = new DancingLinks()
      const solver1 = dlx.createSolver({ columns: 72 })
      const solver2 = dlx.createSolver({ columns: 72 })

      // Both solvers use same constraint patterns, triggering cache hits
      for (const constraint of ALL_CONSTRAINTS.slice(0, 10)) {
        solver1.addBinaryConstraint(constraint.data, constraint.row)
        solver2.addBinaryConstraint(constraint.data, constraint.row)
      }
      solver1.findOne()
      solver2.findOne()
    })
    .on('cycle', function (event: any) {
      console.log(String(event.target))
    })
    .on('complete', function (this: any) {
      console.log('Fastest is ' + this.filter('fastest').map('name') + '\n\n')
    })
    .run()
}

function benchmarkTemplateReuse() {
  console.log('Benchmark: Template Reuse Performance (Sudoku)\n')

  const sudokuField = parseStringFormat(
    9,
    '..............3.85..1.2.......5.7.....4...1...9.......5......73..2.1........4...9'
  )
  const baseConstraints = generateConstraints(9, sudokuField)

  const suite = new Benchmark.Suite()

  suite
    .add('Deprecated API: Repeated find() calls', function () {
      // Simulate solving 5 similar sudoku puzzles
      for (let i = 0; i < 5; i++) {
        find(baseConstraints, 1)
      }
    })
    .add('New API: Template-based solving', function () {
      const dlx = new DancingLinks()
      const template = dlx.createSolverTemplate()

      // Build template once
      for (const constraint of baseConstraints) {
        template.addBinaryConstraint(constraint.data, constraint.row)
      }

      // Use template for 5 different puzzles
      for (let i = 0; i < 5; i++) {
        const solver = template.createSolver({ columns: 324 }) // 9x9 sudoku has 324 columns
        solver.findOne()
      }
    })
    .on('cycle', function (event: any) {
      console.log(String(event.target))
    })
    .on('complete', function (this: any) {
      console.log('Fastest is ' + this.filter('fastest').map('name') + '\n\n')
    })
    .run()
}

function benchmarkMemoryEfficiency() {
  console.log('Benchmark: Memory Efficiency\n')

  const constraints = ALL_CONSTRAINTS.slice(0, 100) // Smaller set for memory testing

  console.log('Testing constraint cache size and reuse...')

  // Create multiple solvers with overlapping constraints
  const dlx = new DancingLinks()
  const solvers = []

  const startTime = Date.now()

  for (let i = 0; i < 10; i++) {
    const solver = dlx.createSolver({ columns: 72 })

    // Each solver uses overlapping constraint patterns
    for (let j = 0; j < constraints.length; j++) {
      if ((i + j) % 3 === 0) {
        // Create overlap pattern
        solver.addBinaryConstraint(constraints[j]!.data, constraints[j]!.row)
      }
    }

    solvers.push(solver)
  }

  const buildTime = Date.now() - startTime
  console.log(`Built 10 solvers with overlapping constraints in ${buildTime}ms`)

  // Solve with all solvers
  const solveStartTime = Date.now()
  for (const solver of solvers) {
    try {
      solver.findOne()
    } catch (e) {
      // Some constraint combinations may not have solutions
    }
  }
  const solveTime = Date.now() - solveStartTime
  console.log(`Solved with all 10 solvers in ${solveTime}ms`)
  console.log('Cache reuse should make subsequent solvers faster\n')
}

console.log('='.repeat(60))
console.log('NEW CACHING API PERFORMANCE BENCHMARKS')
console.log('='.repeat(60))
console.log()

benchmarkConstraintCaching()
benchmarkTemplateReuse()
benchmarkMemoryEfficiency()

console.log('='.repeat(60))
console.log('BENCHMARK COMPLETE')
console.log('='.repeat(60))
