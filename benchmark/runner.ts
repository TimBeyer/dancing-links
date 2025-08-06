/**
 * Benchmark execution engine
 * Orchestrates running benchmark groups with proper timing and result collection
 */

import Benchmark from 'benchmark';
import { BenchmarkOptions, BenchmarkSection, BenchmarkResult } from './types.js';

// Configuration imports
import { cases } from './config/cases.js';
import { groups } from './config/groups.js';
import { problems } from './config/problems.js';
import { solvers } from './config/solvers.js';

// Track deprecated tests (for compatibility with existing benchmark system)
const deprecatedTests = new Set<string>();

/**
 * Run a specific benchmark group by name
 */
export async function runBenchmarkGroup(
  groupName: string, 
  options: BenchmarkOptions
): Promise<BenchmarkSection[]> {
  const group = groups.find(g => g.name === groupName);
  if (!group) {
    throw new Error(`Benchmark group '${groupName}' not found`);
  }
  
  if (!options.quiet) {
    console.log(`Running ${group.name} benchmarks: ${group.description}`);
  }
  
  return runBenchmarks(group.caseIds, group.solverNames, options);
}

/**
 * Run benchmarks for specified cases and solvers
 */
async function runBenchmarks(
  caseIds: string[],
  solverNames: string[],
  options: BenchmarkOptions
): Promise<BenchmarkSection[]> {
  const results: BenchmarkSection[] = [];
  
  for (const caseId of caseIds) {
    const benchmarkCase = cases.find(c => c.id === caseId);
    if (!benchmarkCase) {
      if (!options.quiet) {
        console.warn(`Case '${caseId}' not found, skipping`);
      }
      continue;
    }
    
    if (!options.quiet) {
      console.log(`\nBenchmark: ${benchmarkCase.name}\n`);
    }
    
    // Generate constraints for this case
    const problemFn = problems[benchmarkCase.problemType];
    if (!problemFn) {
      if (!options.quiet) {
        console.warn(`Problem type '${benchmarkCase.problemType}' not found, skipping`);
      }
      continue;
    }
    
    const constraints = problemFn(benchmarkCase.parameters);
    const suite = new Benchmark.Suite();
    
    // Add each solver to the benchmark suite
    for (const solverName of solverNames) {
      const solver = solvers[solverName];
      if (!solver) {
        if (!options.quiet) {
          console.warn(`Solver '${solverName}' not found, skipping`);
        }
        continue;
      }
      
      try {
        // Setup once per case (outside of timing)
        solver.setup?.(constraints);
        
        // Prepare once per case (outside of timing)  
        const prepared = solver.prepare(constraints);
        
        // Add benchmark test - clean execution, no branching!
        const testName = `${solverName}`;
        suite.add(testName, function() {
          benchmarkCase.executeStrategy(solver, prepared);
        });
        
      } catch (error) {
        if (!options.quiet) {
          console.warn(`Skipping ${solverName} for ${caseId}: ${(error as Error).message}`);
        }
      }
    }
    
    // Run the suite for this case
    const sectionResult = await runSuite(suite, benchmarkCase.name, options);
    results.push(sectionResult);
  }
  
  return results;
}

/**
 * Run a Benchmark.js suite and collect results
 */
function runSuite(
  suite: Benchmark.Suite, 
  sectionName: string, 
  options: BenchmarkOptions
): Promise<BenchmarkSection> {
  return new Promise((resolve) => {
    const sectionResults: BenchmarkResult[] = [];
    
    suite
      .on('cycle', function(event: Benchmark.Event) {
        const benchmark = event.target;
        
        if (!options.quiet) {
          console.log(String(event.target));
        }
        
        // Collect result data
        if (benchmark.name && benchmark.hz && benchmark.stats) {
          sectionResults.push({
            name: benchmark.name,
            opsPerSec: benchmark.hz,
            margin: benchmark.stats.rme,
            runs: benchmark.stats.sample.length,
            deprecated: deprecatedTests.has(benchmark.name)
          });
        }
      })
      .on('complete', function(this: any) {
        if (!options.quiet) {
          console.log('Fastest is ' + this.filter('fastest').map('name') + '\n\n');
        }
        
        resolve({
          benchmarkName: sectionName,
          results: sectionResults
        });
      })
      .run();
  });
}

/**
 * Get list of available groups
 */
export function getAvailableGroups(): string[] {
  return groups.map(g => g.name);
}

/**
 * Get group description by name
 */
export function getGroupDescription(groupName: string): string | undefined {
  const group = groups.find(g => g.name === groupName);
  return group?.description;
}