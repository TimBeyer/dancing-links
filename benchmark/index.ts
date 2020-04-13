import * as Benchmark from 'benchmark'
import * as dlxlib from 'dlxlib'
import * as dance from 'dance'
import * as dancingLinksAlgorithm from 'dancing-links-algorithm'

// import { createConstraints } from './n-queens'
import { find, findRaw } from '..'
import { ALL_CONSTRAINTS } from './pentomino/field'
import { getSearchConfig } from '../lib/utils'
import { generateConstraints, parseStringFormat, printBoard } from './sudoku'

function benchmarkSudoku() {
  console.log('Benchmark: A solution to the sodoku\n')
  const sudokuField = parseStringFormat(
    9,
    '..............3.85..1.2.......5.7.....4...1...9.......5......73..2.1........4...9'
  )
  console.log(printBoard(9, sudokuField), '\n')

  // Picked from https://github.com/attractivechaos/plb/blob/master/sudoku/sudoku.txt
  const constraints = generateConstraints(9, sudokuField)
  const plainRows = constraints.map((c) => c.row)
  const searchConfig = getSearchConfig(Infinity, constraints)

  const suite = new Benchmark.Suite()

  suite
    .add('dancing-links find', function () {
      find(constraints, Infinity)
    })
    .add('dancing-links findRaw', function () {
      findRaw(searchConfig)
    })
    .add('dlxlib', function () {
      dlxlib.solve(plainRows)
    })
    .add('dance', function () {
      dance.solve(plainRows, {})
    })
    .add('dancing-links-algorithm', function () {
      dancingLinksAlgorithm.solve(plainRows)
    })
    .on('cycle', function (event) {
      console.log(String(event.target))
    })
    .on('complete', function () {
      console.log('Fastest is ' + this.filter('fastest').map('name') + '\n\n')
    })
    .run()
}
function benchmarkOneTiling() {
  console.log('Benchmark: Finding one pentomino tiling on a 6x10 field\n')

  const dlxlibConstraints = ALL_CONSTRAINTS.map((constraint) => constraint.row)
  const searchConfig = getSearchConfig(1, ALL_CONSTRAINTS)

  const suite = new Benchmark.Suite()

  suite
    .add('dancing-links find', function () {
      find(ALL_CONSTRAINTS, 1)
    })
    .add('dancing-links findRaw', function () {
      findRaw(searchConfig)
    })
    .add('dlxlib', function () {
      dlxlib.solve(dlxlibConstraints, null, null, 1)
    })
    .add('dance', function () {
      dance.solve(dlxlibConstraints, {
        maxSolutions: 1,
      })
    })
    .on('cycle', function (event) {
      console.log(String(event.target))
    })
    .on('complete', function () {
      console.log('Fastest is ' + this.filter('fastest').map('name') + '\n\n')
    })
    .run()
}

function benchmarkTenTilings() {
  console.log('Benchmark: Finding ten pentomino tilings on a 6x10 field\n')

  const dlxlibConstraints = ALL_CONSTRAINTS.map((constraint) => constraint.row)
  const searchConfig = getSearchConfig(10, ALL_CONSTRAINTS)

  const suite = new Benchmark.Suite()

  suite
    .add('dancing-links find', function () {
      find(ALL_CONSTRAINTS, 10)
    })
    .add('dancing-links findRaw', function () {
      findRaw(searchConfig)
    })
    .add('dlxlib', function () {
      dlxlib.solve(dlxlibConstraints, null, null, 10)
    })
    .add('dance', function () {
      dance.solve(dlxlibConstraints, {
        maxSolutions: 10,
      })
    })
    .on('cycle', function (event) {
      console.log(String(event.target))
    })
    .on('complete', function () {
      console.log('\nFastest is ' + this.filter('fastest').map('name') + '\n\n')
    })
    .run()
}

function benchmarkHundredTilings() {
  console.log('Benchmark: Finding one hundred pentomino tilings on a 6x10 field\n')

  const dlxlibConstraints = ALL_CONSTRAINTS.map((constraint) => constraint.row)
  const searchConfig = getSearchConfig(100, ALL_CONSTRAINTS)

  const suite = new Benchmark.Suite()

  suite
    .add('dancing-links find', function () {
      find(ALL_CONSTRAINTS, 100)
    })
    .add('dancing-links findRaw', function () {
      findRaw(searchConfig)
    })
    .add('dlxlib', function () {
      dlxlib.solve(dlxlibConstraints, null, null, 100)
    })
    .add('dance', function () {
      dance.solve(dlxlibConstraints, {
        maxSolutions: 100,
      })
    })
    .on('cycle', function (event) {
      console.log(String(event.target))
    })
    .on('complete', function () {
      console.log('\nFastest is ' + this.filter('fastest').map('name') + '\n\n')
    })
    .run()
}

benchmarkSudoku()
benchmarkOneTiling()
benchmarkTenTilings()
benchmarkHundredTilings()
