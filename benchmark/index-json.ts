import Benchmark from 'benchmark'
import { writeFileSync } from 'fs'

import { find, findRaw } from '../index.js'
import { ALL_CONSTRAINTS } from './pentomino/field.js'
import { getSearchConfig } from '../lib/utils.js'
import { generateConstraints, parseStringFormat } from './sudoku/index.js'

interface BenchmarkResult {
  name: string
  opsPerSec: number
  margin: number
  runs: number
}

interface BenchmarkSection {
  benchmarkName: string
  results: BenchmarkResult[]
}

const allResults: BenchmarkSection[] = []

function benchmarkSudoku(): Promise<void> {
  return new Promise(resolve => {
    const sudokuField = parseStringFormat(
      9,
      '..............3.85..1.2.......5.7.....4...1...9.......5......73..2.1........4...9'
    )

    const constraints = generateConstraints(9, sudokuField)
    const searchConfig = getSearchConfig(Infinity, constraints)

    const suite = new Benchmark.Suite()
    const results: BenchmarkResult[] = []

    suite
      .add('dancing-links find', function () {
        find(constraints, Infinity)
      })
      .add('dancing-links findRaw', function () {
        findRaw(searchConfig)
      })
      .on('cycle', function (event: Benchmark.Event) {
        const benchmark = event.target
        results.push({
          name: benchmark.name,
          opsPerSec: benchmark.hz,
          margin: benchmark.stats.rme,
          runs: benchmark.stats.sample.length
        })
      })
      .on('complete', function () {
        allResults.push({
          benchmarkName: 'A solution to the sudoku',
          results
        })
        resolve()
      })
      .run()
  })
}

function benchmarkOneTiling(): Promise<void> {
  return new Promise(resolve => {
    const searchConfig = getSearchConfig(1, ALL_CONSTRAINTS)
    const suite = new Benchmark.Suite()
    const results: BenchmarkResult[] = []

    suite
      .add('dancing-links find', function () {
        find(ALL_CONSTRAINTS, 1)
      })
      .add('dancing-links findRaw', function () {
        findRaw(searchConfig)
      })
      .on('cycle', function (event: Benchmark.Event) {
        const benchmark = event.target
        results.push({
          name: benchmark.name,
          opsPerSec: benchmark.hz,
          margin: benchmark.stats.rme,
          runs: benchmark.stats.sample.length
        })
      })
      .on('complete', function () {
        allResults.push({
          benchmarkName: 'Finding one pentomino tiling on a 6x10 field',
          results
        })
        resolve()
      })
      .run()
  })
}

function benchmarkTenTilings(): Promise<void> {
  return new Promise(resolve => {
    const searchConfig = getSearchConfig(10, ALL_CONSTRAINTS)
    const suite = new Benchmark.Suite()
    const results: BenchmarkResult[] = []

    suite
      .add('dancing-links find', function () {
        find(ALL_CONSTRAINTS, 10)
      })
      .add('dancing-links findRaw', function () {
        findRaw(searchConfig)
      })
      .on('cycle', function (event: Benchmark.Event) {
        const benchmark = event.target
        results.push({
          name: benchmark.name,
          opsPerSec: benchmark.hz,
          margin: benchmark.stats.rme,
          runs: benchmark.stats.sample.length
        })
      })
      .on('complete', function () {
        allResults.push({
          benchmarkName: 'Finding ten pentomino tilings on a 6x10 field',
          results
        })
        resolve()
      })
      .run()
  })
}

function benchmarkHundredTilings(): Promise<void> {
  return new Promise(resolve => {
    const searchConfig = getSearchConfig(100, ALL_CONSTRAINTS)
    const suite = new Benchmark.Suite()
    const results: BenchmarkResult[] = []

    suite
      .add('dancing-links find', function () {
        find(ALL_CONSTRAINTS, 100)
      })
      .add('dancing-links findRaw', function () {
        findRaw(searchConfig)
      })
      .on('cycle', function (event: Benchmark.Event) {
        const benchmark = event.target
        results.push({
          name: benchmark.name,
          opsPerSec: benchmark.hz,
          margin: benchmark.stats.rme,
          runs: benchmark.stats.sample.length
        })
      })
      .on('complete', function () {
        allResults.push({
          benchmarkName: 'Finding one hundred pentomino tilings on a 6x10 field',
          results
        })
        resolve()
      })
      .run()
  })
}

async function runAllBenchmarks() {
  await benchmarkSudoku()
  await benchmarkOneTiling()
  await benchmarkTenTilings()
  await benchmarkHundredTilings()

  const outputFile = process.argv[2]
  const jsonOutput = JSON.stringify(allResults, null, 2)

  if (outputFile) {
    // Write to file
    writeFileSync(outputFile, jsonOutput)
    console.log(`Benchmark results written to ${outputFile}`)
  } else {
    // Output to stdout
    console.log(jsonOutput)
  }
}

runAllBenchmarks().catch(console.error)
