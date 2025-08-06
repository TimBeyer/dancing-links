#!/usr/bin/env node

/**
 * Automated Benchmark Documentation Updater
 *
 * Runs comprehensive benchmarks, compares against other JS Dancing Links libraries,
 * and updates the README with performance comparison tables.
 *
 * Integrates into the release process to ensure benchmark documentation stays current.
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { BenchmarkResult, BenchmarkSection } from '../benchmark/index.js'

/**
 * Configuration for script execution
 */
interface UpdateOptions {
  quiet: boolean
  dryRun: boolean
  benchmarkTimeout: number
}

/**
 * Processed results for documentation generation
 */
interface ProcessedResult extends BenchmarkResult {
  libraryName: string
  relativePerformance: number
  isFastest: boolean
}

interface ProcessedSection {
  benchmarkName: string
  results: ProcessedResult[]
  fastestResult: ProcessedResult
}

/**
 * Main benchmark documentation updater class
 */
class BenchmarkDocUpdater {
  private options: UpdateOptions
  private projectRoot: string

  constructor(options: Partial<UpdateOptions> = {}) {
    this.options = {
      quiet: false,
      dryRun: false,
      benchmarkTimeout: 300000, // 5 minutes
      ...options
    }

    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    this.projectRoot = join(__dirname, '..')
  }

  /**
   * Run the complete benchmark documentation update process
   */
  async updateBenchmarkDocs(): Promise<void> {
    try {
      this.log('Starting benchmark documentation update...')

      // Step 1: Run benchmarks and get JSON results
      const benchmarkData = await this.runBenchmarks()

      // Step 2: Process results for documentation
      const processedSections = this.processBenchmarkData(benchmarkData)

      // Step 3: Generate markdown tables
      const benchmarkMarkdown = this.generateBenchmarkMarkdown(processedSections)

      // Step 4: Update README
      await this.updateReadme(benchmarkMarkdown)

      this.log('Benchmark documentation update completed successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to update benchmark documentation: ${errorMessage}`)
    }
  }

  /**
   * Run comprehensive benchmarks with external library comparisons
   */
  protected async runBenchmarks(): Promise<BenchmarkSection[]> {
    const useFullComparison = !process.env.CI && !this.options.dryRun
    this.log(
      useFullComparison
        ? 'Running comprehensive benchmarks with external library comparisons...'
        : 'Running fast benchmark mode (library-only)...'
    )

    try {
      // Run benchmark:comparison with JSON output
      // Use faster benchmark mode if in CI or testing environment
      const useFullComparison = !process.env.CI && !this.options.dryRun
      const command = useFullComparison
        ? 'npm run benchmark:comparison -- --json --quiet'
        : 'npm run benchmark:json -- --quiet'

      const output = execSync(command, {
        cwd: this.projectRoot,
        timeout: this.options.benchmarkTimeout,
        encoding: 'utf8'
      })

      // Parse JSON output
      const benchmarkData: BenchmarkSection[] = JSON.parse(output.trim())

      this.log(`Successfully completed benchmarks: ${benchmarkData.length} sections`)
      return benchmarkData
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific error cases
        if ('status' in error && (error as any).status === 'TIMEOUT') {
          throw new Error(`Benchmarks timed out after ${this.options.benchmarkTimeout / 1000}s`)
        }

        if ('stderr' in error && (error as any).stderr) {
          throw new Error(`Benchmark execution failed: ${(error as any).stderr}`)
        }
      }

      throw new Error(`Failed to run benchmarks: ${error}`)
    }
  }

  /**
   * Process benchmark data to calculate relative performance metrics
   */
  protected processBenchmarkData(sections: BenchmarkSection[]): ProcessedSection[] {
    return sections.map(section => {
      // Find the fastest result in this section
      const fastestResult = section.results.reduce((fastest, current) =>
        current.opsPerSec > fastest.opsPerSec ? current : fastest
      )

      // Process all results with relative performance
      const processedResults: ProcessedResult[] = section.results.map(result => ({
        ...result,
        libraryName: result.name,
        relativePerformance: result.opsPerSec / fastestResult.opsPerSec,
        isFastest: result.opsPerSec === fastestResult.opsPerSec
      }))

      // Sort by performance (fastest first)
      processedResults.sort((a, b) => b.opsPerSec - a.opsPerSec)

      return {
        benchmarkName: section.benchmarkName,
        results: processedResults,
        fastestResult: processedResults[0]
      }
    })
  }

  /**
   * Generate markdown tables for benchmark results
   */
  protected generateBenchmarkMarkdown(sections: ProcessedSection[]): string {
    const timestamp = new Date().toISOString().split('T')[0]

    let markdown = `## Benchmarks

This section contains performance comparisons against other JavaScript Dancing Links libraries, updated automatically during releases.

`

    // Add collapsible section
    markdown += `<details>
<summary><strong>📊 Performance Comparison (Click to expand)</strong></summary>

All benchmarks run on the same machine with identical test cases. Results show operations per second (higher is better).

`

    // Generate tables for each benchmark type
    for (const section of sections) {
      markdown += `### ${section.benchmarkName}

| Library | Ops/Sec | Relative Performance | Margin of Error |
|---------|---------|---------------------|-----------------|
`

      for (const result of section.results) {
        const libraryName = result.deprecated ? `${result.libraryName}*` : result.libraryName
        const opsFormatted = result.opsPerSec.toLocaleString('en-US', { maximumFractionDigits: 0 })
        const relativeFormatted = result.isFastest
          ? '**1.00x (fastest)**'
          : `${result.relativePerformance.toFixed(2)}x`
        const marginFormatted = `±${result.margin.toFixed(2)}%`

        markdown += `| ${libraryName} | ${opsFormatted} | ${relativeFormatted} | ${marginFormatted} |\n`
      }

      markdown += '\n'
    }

    // Add footnotes and metadata
    markdown += `*Deprecated: Library may have known issues or is no longer maintained.

**Testing Environment:**
- Node.js ${process.version}
- Libraries: dlxlib, dance, dancing-links-algorithm
- Test cases: Sudoku solving, pentomino tiling (1, 10, 100 solutions)

*Last updated: ${timestamp}*

</details>

`

    return markdown
  }

  /**
   * Update README.md with new benchmark section
   */
  private async updateReadme(benchmarkMarkdown: string): Promise<void> {
    const readmePath = join(this.projectRoot, 'README.md')

    try {
      let readmeContent = readFileSync(readmePath, 'utf8')

      // Define markers for the benchmark section
      const startMarker = '## Benchmarks'
      const endMarker = '## Implementation Notes'

      // Check if benchmark section already exists
      const startIndex = readmeContent.indexOf(startMarker)
      const endIndex = readmeContent.indexOf(endMarker)

      if (startIndex === -1) {
        // No existing benchmark section - add before Implementation Notes
        if (endIndex === -1) {
          // No Implementation Notes section - add at the end
          readmeContent += '\n' + benchmarkMarkdown
        } else {
          // Insert before Implementation Notes
          readmeContent =
            readmeContent.slice(0, endIndex) +
            benchmarkMarkdown +
            '\n' +
            readmeContent.slice(endIndex)
        }
      } else {
        // Replace existing benchmark section
        if (endIndex === -1 || endIndex < startIndex) {
          // Benchmark section exists but no end marker - replace to end of file
          readmeContent = readmeContent.slice(0, startIndex) + benchmarkMarkdown
        } else {
          // Replace section between markers
          readmeContent =
            readmeContent.slice(0, startIndex) + benchmarkMarkdown + readmeContent.slice(endIndex)
        }
      }

      if (this.options.dryRun) {
        this.log('DRY RUN: Would update README.md with new benchmark section')
        this.log(`New benchmark section length: ${benchmarkMarkdown.length} characters`)
      } else {
        writeFileSync(readmePath, readmeContent)
        this.log('Successfully updated README.md with new benchmark results')
      }
    } catch (error) {
      throw new Error(`Failed to update README.md: ${error}`)
    }
  }

  /**
   * Log message (respects quiet mode)
   */
  protected log(message: string): void {
    if (!this.options.quiet) {
      console.log(`[benchmark-docs] ${message}`)
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): UpdateOptions & { help?: boolean } {
  const args = process.argv.slice(2)

  return {
    quiet: args.includes('--quiet'),
    dryRun: args.includes('--dry-run'),
    help: args.includes('--help') || args.includes('-h'),
    benchmarkTimeout: 300000 // 5 minutes default
  }
}

/**
 * Show usage information
 */
function showUsage(): void {
  console.log(`
Usage: node scripts/update-benchmark-docs.js [options]

Updates README.md with current benchmark results comparing against other
JavaScript Dancing Links libraries.

Options:
  --quiet           Suppress progress output
  --dry-run         Show what would be changed without modifying files
  --help, -h        Show this help message

Examples:
  node built/scripts/update-benchmark-docs.js           # Update with progress output
  node built/scripts/update-benchmark-docs.js --quiet   # Update silently
  node built/scripts/update-benchmark-docs.js --dry-run # Preview changes only

The script runs comprehensive benchmarks including external library comparisons
and automatically updates the README with formatted comparison tables.
`)
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const options = parseArgs()

  if (options.help) {
    showUsage()
    process.exit(0)
  }

  try {
    const updater = new BenchmarkDocUpdater(options)
    await updater.updateBenchmarkDocs()

    if (!options.quiet) {
      console.log('✅ Benchmark documentation update completed successfully')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error(`❌ ${message}`)
    process.exit(1)
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('update-benchmark-docs.js')) {
  main().catch(error => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
}

export { BenchmarkDocUpdater, type UpdateOptions }
