import Benchmark from 'benchmark'

// Import both implementations
import { find as findSoA, findRaw as findRawSoA } from '../index.js'
import { search as searchOriginal } from '../lib/index-original.js'
import { ALL_CONSTRAINTS } from './pentomino/field.js'
import { getSearchConfig } from '../lib/utils.js'
import { generateConstraints, parseStringFormat, printBoard } from './sudoku/index.js'

// Wrapper functions for original implementation
function findOriginal<T>(constraints: any[], numSolutions: number) {
  const config = getSearchConfig(numSolutions, constraints)
  return searchOriginal<T>(config)
}

function findRawOriginal<T>(config: any) {
  return searchOriginal<T>(config)
}

function benchmarkSudoku() {
  console.log('Benchmark: A solution to the sudoku (Original vs SoA)\n')
  const sudokuField = parseStringFormat(
    9,
    '..............3.85..1.2.......5.7.....4...1...9.......5......73..2.1........4...9'
  )
  console.log(printBoard(9, sudokuField), '\n')

  const constraints = generateConstraints(9, sudokuField)
  const searchConfig = getSearchConfig(Infinity, constraints)

  const suite = new Benchmark.Suite()

  suite
    .add('Original AoS find', function () {
      findOriginal(constraints, Infinity)
    })
    .add('Original AoS findRaw', function () {
      findRawOriginal(searchConfig)
    })
    .add('SoA find', function () {
      findSoA(constraints, Infinity)
    })
    .add('SoA findRaw', function () {
      findRawSoA(searchConfig)
    })
    .on('cycle', function (event: any) {
      console.log(String(event.target))
    })
    .on('complete', function (this: any) {
      console.log('Fastest is ' + this.filter('fastest').map('name') + '\n\n')
    })
    .run()
}

function benchmarkOneTiling() {
  console.log('Benchmark: Finding one pentomino tiling on a 6x10 field (Original vs SoA)\n')

  const searchConfig = getSearchConfig(1, ALL_CONSTRAINTS)

  const suite = new Benchmark.Suite()

  suite
    .add('Original AoS find', function () {
      findOriginal(ALL_CONSTRAINTS, 1)
    })
    .add('Original AoS findRaw', function () {
      findRawOriginal(searchConfig)
    })
    .add('SoA find', function () {
      findSoA(ALL_CONSTRAINTS, 1)
    })
    .add('SoA findRaw', function () {
      findRawSoA(searchConfig)
    })
    .on('cycle', function (event: any) {
      console.log(String(event.target))
    })
    .on('complete', function (this: any) {
      console.log('Fastest is ' + this.filter('fastest').map('name') + '\n\n')
    })
    .run()
}

function benchmarkTenTilings() {
  console.log('Benchmark: Finding ten pentomino tilings on a 6x10 field (Original vs SoA)\n')

  const searchConfig = getSearchConfig(10, ALL_CONSTRAINTS)

  const suite = new Benchmark.Suite()

  suite
    .add('Original AoS find', function () {
      findOriginal(ALL_CONSTRAINTS, 10)
    })
    .add('Original AoS findRaw', function () {
      findRawOriginal(searchConfig)
    })
    .add('SoA find', function () {
      findSoA(ALL_CONSTRAINTS, 10)
    })
    .add('SoA findRaw', function () {
      findRawSoA(searchConfig)
    })
    .on('cycle', function (event: any) {
      console.log(String(event.target))
    })
    .on('complete', function (this: any) {
      console.log('Fastest is ' + this.filter('fastest').map('name') + '\n\n')
    })
    .run()
}

function benchmarkHundredTilings() {
  console.log('Benchmark: Finding one hundred pentomino tilings on a 6x10 field (Original vs SoA)\n')

  const searchConfig = getSearchConfig(100, ALL_CONSTRAINTS)

  const suite = new Benchmark.Suite()

  suite
    .add('Original AoS find', function () {
      findOriginal(ALL_CONSTRAINTS, 100)
    })
    .add('Original AoS findRaw', function () {
      findRawOriginal(searchConfig)
    })
    .add('SoA find', function () {
      findSoA(ALL_CONSTRAINTS, 100)
    })
    .add('SoA findRaw', function () {
      findRawSoA(searchConfig)
    })
    .on('cycle', function (event: any) {
      console.log(String(event.target))
    })
    .on('complete', function (this: any) {
      console.log('Fastest is ' + this.filter('fastest').map('name') + '\n\n')
    })
    .run()
}

benchmarkSudoku()
benchmarkOneTiling()
benchmarkTenTilings()
benchmarkHundredTilings()