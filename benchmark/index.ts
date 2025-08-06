/**
 * Modular benchmark CLI interface
 * Supports dynamic group selection and maintains compatibility with existing CI
 */

import { writeFileSync } from 'fs'
import { BenchmarkOptions, BenchmarkSection, BenchmarkResult } from './types.js'

// Re-export types for external scripts
export { BenchmarkOptions, BenchmarkSection, BenchmarkResult }
import { runBenchmarkGroup, getAvailableGroups, getGroupDescription } from './runner.js'

/**
 * Parse command line arguments
 */
function parseArgs(): BenchmarkOptions & { group?: string; help?: boolean } {
  const args = process.argv.slice(2)

  // Check for help flag
  const help = args.includes('--help')

  // Determine group selection
  let group: string | undefined
  if (args.includes('--release')) {
    group = 'release'
  } else if (args.includes('--external') || args.includes('--full')) {
    group = 'full'
  } else if (args.includes('--pr')) {
    group = 'pr'
  }

  // Default to 'full' if no group specified
  if (!group && !help) {
    group = 'full'
  }

  // Parse other options
  const jsonFlag = args.find(arg => arg.startsWith('--json'))
  const jsonOutput = !!jsonFlag || args.includes('--json')
  const quiet = args.includes('--quiet')

  // Support both --json=filename and positional filename argument
  let jsonFile: string | undefined
  if (jsonFlag?.includes('=')) {
    jsonFile = jsonFlag.split('=')[1]
  } else if (jsonOutput) {
    // If --json is specified without =filename, look for positional argument
    const nonFlagArgs = args.filter(arg => !arg.startsWith('--'))
    jsonFile = nonFlagArgs[0]
  }

  return {
    group,
    help,
    includeExternal: group === 'full' || group === 'release',
    jsonOutput,
    jsonFile,
    quiet
  }
}

/**
 * Output benchmark results
 */
function outputResults(results: BenchmarkSection[], options: BenchmarkOptions): void {
  if (options.jsonOutput) {
    const jsonOutput = JSON.stringify(results, null, 2)

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
 * Show usage information
 */
function showUsage(): void {
  const availableGroups = getAvailableGroups()

  console.log(`
Usage: node benchmark/index.js [options]

Group Options (select one):
  --pr          PR benchmarks: all internal interfaces (default, fast)
  --release     Release benchmarks: sparse vs all external libraries  
  --full        Full benchmarks: everything vs everything

Output Options:
  --json[=file] Output results as JSON (to file if specified)
  --quiet       Suppress console output during benchmarks

Other Options:
  --help        Show this help message

Available Groups:`)

  for (const groupName of availableGroups) {
    const description = getGroupDescription(groupName)
    console.log(`  ${groupName.padEnd(10)} ${description || ''}`)
  }

  console.log(`
Examples:
  node benchmark/index.js                         # PR benchmarks (default)
  node benchmark/index.js --release               # Release benchmarks
  node benchmark/index.js --full                  # Full comparison
  node benchmark/index.js --pr --json=pr.json     # PR with JSON output
  node benchmark/index.js --release --quiet       # Release mode, quiet output
`)
}

/**
 * Main benchmark runner
 */
async function main(): Promise<void> {
  const options = parseArgs()

  // Show help if requested
  if (options.help) {
    showUsage()
    return
  }

  // Ensure we have a group to run
  if (!options.group) {
    console.error('No benchmark group specified. Use --help for usage information.')
    process.exit(1)
  }

  // Display header
  if (!options.quiet) {
    console.log('============================================================')
    console.log('DANCING LINKS PERFORMANCE BENCHMARKS (New System)')
    console.log(`Group: ${options.group} (${getGroupDescription(options.group) || 'Custom group'})`)
    console.log('============================================================')
    console.log()
  }

  try {
    // Run the specified group
    const results = await runBenchmarkGroup(options.group, options)

    // Output results
    outputResults(results, options)

    // Display footer
    if (!options.quiet && !options.jsonOutput) {
      console.log('============================================================')
      console.log('BENCHMARK COMPLETE')
      console.log('============================================================')
    }
  } catch (error) {
    console.error('Benchmark execution failed:', (error as Error).message)
    process.exit(1)
  }
}

// Run main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
