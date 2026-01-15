/**
 * Benchmark execution engine
 * Orchestrates running benchmark groups with proper timing and result collection
 */

import { Bench } from 'tinybench'
import { BenchmarkOptions, BenchmarkSection, BenchmarkResult } from './types.js'

// Configuration imports
import { cases } from './config/cases.js'
import { groups, getGroup } from './config/groups.js'
import { problems } from './config/problems.js'
import { solvers } from './config/solvers.js'

// Track deprecated tests (for compatibility with existing benchmark system)
const deprecatedTests = new Set<string>()

/**
 * Run a specific benchmark group by name
 */
export async function runBenchmarkGroup(
  groupName: string,
  options: BenchmarkOptions
): Promise<BenchmarkSection[]> {
  const group = getGroup(groupName)
  if (!group) {
    throw new Error(`Benchmark group '${groupName}' not found`)
  }

  if (!options.quiet) {
    console.log(`Running ${group.name} benchmarks: ${group.description}`)
  }

  return runBenchmarksFromMatrix(group.matrix, options)
}

/**
 * Run benchmarks based on a matrix configuration
 */
async function runBenchmarksFromMatrix(
  matrix: Record<string, readonly string[]>,
  options: BenchmarkOptions
): Promise<BenchmarkSection[]> {
  const results: BenchmarkSection[] = []

  for (const [caseId, solverIds] of Object.entries(matrix)) {
    const benchmarkCase = cases[caseId as keyof typeof cases]
    if (!benchmarkCase) {
      if (!options.quiet) {
        console.warn(`Case '${caseId}' not found, skipping`)
      }
      continue
    }

    if (!options.quiet) {
      console.log(`\nBenchmark: ${benchmarkCase.name}\n`)
    }

    // Generate constraints for this case
    const problemFn = problems[benchmarkCase.problemType]
    if (!problemFn) {
      if (!options.quiet) {
        console.warn(`Problem type '${benchmarkCase.problemType}' not found, skipping`)
      }
      continue
    }

    const constraints = problemFn(benchmarkCase.parameters as any) // Type assertion needed due to discriminated union
    const bench = new Bench()

    // Add each solver to the benchmark suite
    for (const solverId of solverIds) {
      const SolverClass = solvers[solverId as keyof typeof solvers]
      if (!SolverClass) {
        if (!options.quiet) {
          console.warn(`Solver '${solverId}' not found, skipping`)
        }
        continue
      }

      try {
        // Create fresh solver instance for this benchmark
        const solver = new SolverClass()

        // Setup once per case (outside of timing)
        solver.setup?.(constraints)

        // Prepare once per case (outside of timing)
        const prepared = solver.prepare(constraints)

        // Add benchmark test - clean execution, no branching!
        const testName = SolverClass.name
        bench.add(testName, () => {
          benchmarkCase.executeStrategy(solver, prepared)
        })
      } catch (error) {
        if (!options.quiet) {
          console.warn(`Skipping ${solverId} for ${caseId}: ${(error as Error).message}`)
        }
      }
    }

    // Run the suite for this case
    const sectionResult = await runBench(bench, benchmarkCase.name, options)
    results.push(sectionResult)
  }

  return results
}

/**
 * Run a tinybench suite and collect results
 */
async function runBench(
  bench: Bench,
  sectionName: string,
  options: BenchmarkOptions
): Promise<BenchmarkSection> {
  // Set up event listener for cycle events
  if (!options.quiet) {
    bench.addEventListener('cycle', event => {
      const task = event.task
      if (task && task.result && task.result.state === 'completed') {
        // Format output similar to Benchmark.js
        // In tinybench, throughput.mean is operations per second (Hz)
        const opsPerSec = task.result.throughput.mean
        const margin = task.result.throughput.rme
        const runs = task.result.throughput.samplesCount
        console.log(
          `${task.name} x ${opsPerSec.toLocaleString('en-US', { maximumFractionDigits: 2 })} ops/sec \xb1${margin.toFixed(2)}% (${runs} runs sampled)`
        )
      }
    })
  }

  // Run the benchmark
  await bench.run()

  // Collect results
  const sectionResults: BenchmarkResult[] = []
  for (const task of bench.tasks) {
    if (task.result && task.result.state === 'completed') {
      // In tinybench, throughput.mean is operations per second (Hz equivalent)
      sectionResults.push({
        name: task.name,
        opsPerSec: task.result.throughput.mean,
        margin: task.result.throughput.rme,
        runs: task.result.throughput.samplesCount,
        deprecated: deprecatedTests.has(task.name)
      })
    }
  }

  // Find and display fastest
  if (!options.quiet && sectionResults.length > 0) {
    const fastest = sectionResults.reduce((prev, current) =>
      prev.opsPerSec > current.opsPerSec ? prev : current
    )
    console.log(`Fastest is ${fastest.name}\n\n`)
  }

  return {
    benchmarkName: sectionName,
    results: sectionResults
  }
}

/**
 * Get list of available groups
 */
export function getAvailableGroups(): string[] {
  return Object.keys(groups)
}

/**
 * Get group description by name
 */
export function getGroupDescription(groupName: string): string | undefined {
  const group = getGroup(groupName)
  return group?.description
}
