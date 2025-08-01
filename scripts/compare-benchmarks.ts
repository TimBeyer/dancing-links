#!/usr/bin/env node

/**
 * Benchmark Comparison Script
 *
 * Compares benchmark results between baseline and PR branches.
 * Parsing logic is abstracted to easily switch from text to structured data.
 */

import { readFileSync } from 'fs'

interface BenchmarkResult {
  name: string
  benchmarkName: string
  libraryName: string
  opsPerSec: number
  margin: number
  runs?: number
}

interface BenchmarkSection {
  benchmarkName: string
  results: Array<{
    name: string
    opsPerSec: number
    margin: number
    runs: number
  }>
}

interface ComparisonResult {
  name: string
  baseline: BenchmarkResult
  pr: BenchmarkResult
  percentChange: number
}

/**
 * Parser interface for benchmark results
 * Abstract away parsing logic to easily replace with structured data parser
 */
class BenchmarkParser {
  /**
   * Parse structured JSON benchmark output
   */
  static parse(output: string): BenchmarkResult[] {
    try {
      const benchmarkSections: BenchmarkSection[] = JSON.parse(output)
      const results: BenchmarkResult[] = []

      for (const section of benchmarkSections) {
        const { benchmarkName, results: sectionResults } = section

        for (const result of sectionResults) {
          results.push({
            name: `${benchmarkName} | ${result.name}`,
            benchmarkName: benchmarkName,
            libraryName: result.name,
            opsPerSec: result.opsPerSec,
            margin: result.margin,
            runs: result.runs
          })
        }
      }

      return results
    } catch (error) {
      console.error('Failed to parse benchmark JSON:', error)
      console.error('Output length:', output.length, 'characters')
      console.error(
        'Output preview:',
        output.substring(0, 100).replace(/[^\x20-\x7E]/g, '?') + '...'
      )
      return []
    }
  }
}

/**
 * Compare benchmark results and generate comparison report
 */
class BenchmarkComparator {
  private baselineResults: BenchmarkResult[]
  private prResults: BenchmarkResult[]

  constructor(baselineResults: BenchmarkResult[], prResults: BenchmarkResult[]) {
    this.baselineResults = baselineResults
    this.prResults = prResults
  }

  /**
   * Generate markdown comparison table
   */
  generateMarkdown(): string {
    const comparisons = this.calculateComparisons()

    if (this.baselineResults.length === 0 && this.prResults.length === 0) {
      return '❌ Both baseline and PR benchmarks failed to run.'
    }

    if (this.baselineResults.length === 0) {
      return '❌ Baseline benchmark failed to run. Cannot compare results.'
    }

    if (this.prResults.length === 0) {
      return '❌ PR benchmark failed to run. Cannot compare results.'
    }

    if (comparisons.length === 0) {
      return '⚠️ No comparable benchmark results found.'
    }

    let markdown = '## 🚀 Benchmark Results\n\n'

    // Group comparisons by benchmark type
    const groupedComparisons = this.groupComparisonsByBenchmark(comparisons)

    for (const [benchmarkName, benchmarkComparisons] of Object.entries(groupedComparisons)) {
      markdown += `### ${benchmarkName}\n\n`
      markdown += '| Library | Baseline (ops/sec) | PR (ops/sec) | Change | Performance |\n'
      markdown += '|---------|-------------------|--------------|---------|-------------|\n'

      for (const comp of benchmarkComparisons) {
        const changeSign = comp.percentChange >= 0 ? '+' : ''
        const performanceIcon = this.getPerformanceIcon(comp.percentChange)

        markdown += `| ${comp.pr.libraryName} `
        markdown += `| ${comp.baseline.opsPerSec.toLocaleString()} ±${comp.baseline.margin}% `
        markdown += `| ${comp.pr.opsPerSec.toLocaleString()} ±${comp.pr.margin}% `
        markdown += `| ${changeSign}${comp.percentChange.toFixed(2)}% `
        markdown += `| ${performanceIcon} |\n`
      }

      markdown += '\n'
    }

    markdown += `*Updated: ${new Date().toISOString()}*\n`

    return markdown
  }

  /**
   * Group comparisons by benchmark type for cleaner display
   */
  groupComparisonsByBenchmark(comparisons: ComparisonResult[]): Record<string, ComparisonResult[]> {
    const grouped: Record<string, ComparisonResult[]> = {}

    for (const comp of comparisons) {
      const benchmarkName = comp.pr.benchmarkName
      if (!grouped[benchmarkName]) {
        grouped[benchmarkName] = []
      }
      grouped[benchmarkName].push(comp)
    }

    // Sort libraries within each benchmark for consistency
    for (const benchmarkName of Object.keys(grouped)) {
      grouped[benchmarkName].sort((a, b) => a.pr.libraryName.localeCompare(b.pr.libraryName))
    }

    return grouped
  }

  /**
   * Calculate performance comparisons between baseline and PR
   */
  calculateComparisons(): ComparisonResult[] {
    const comparisons: ComparisonResult[] = []

    for (const prResult of this.prResults) {
      const baselineResult = this.baselineResults.find(b => b.name === prResult.name)

      if (baselineResult) {
        const percentChange =
          ((prResult.opsPerSec - baselineResult.opsPerSec) / baselineResult.opsPerSec) * 100

        comparisons.push({
          name: prResult.name,
          baseline: baselineResult,
          pr: prResult,
          percentChange
        })
      }
    }

    return comparisons
  }

  /**
   * Get performance indicator icon based on percentage change
   */
  getPerformanceIcon(percentChange: number): string {
    if (percentChange >= 10) return '🚀 Significant improvement'
    if (percentChange >= 2) return '✅ Improvement'
    if (percentChange >= -2) return '➡️ No significant change'
    if (percentChange >= -10) return '⚠️ Minor regression'
    return '🔴 Significant regression'
  }
}

/**
 * Main function
 */
function main(): void {
  const args = process.argv.slice(2)

  if (args.length !== 2) {
    console.error('Usage: node compare-benchmarks.ts <baseline-file> <pr-file>')
    process.exit(1)
  }

  const [baselineFile, prFile] = args

  try {
    // Read benchmark output files
    const baselineOutput = readFileSync(baselineFile, 'utf8')
    const prOutput = readFileSync(prFile, 'utf8')

    // Parse results using abstracted parser
    const baselineResults = BenchmarkParser.parse(baselineOutput)
    const prResults = BenchmarkParser.parse(prOutput)

    // Generate comparison report
    const comparator = new BenchmarkComparator(baselineResults, prResults)
    const markdown = comparator.generateMarkdown()

    // Output markdown for GitHub comment
    console.log(markdown)
  } catch (error) {
    console.error('Error comparing benchmarks:', (error as Error).message)
    process.exit(1)
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('compare-benchmarks.js')) {
  main()
}
