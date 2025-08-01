#!/usr/bin/env node

/**
 * Benchmark Comparison Script
 * 
 * Compares benchmark results between baseline and PR branches.
 * Parsing logic is abstracted to easily switch from text to structured data.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parser interface for benchmark results
 * Abstract away parsing logic to easily replace with structured data parser
 */
class BenchmarkParser {
  /**
   * Parse structured JSON benchmark output
   * @param {string} output - JSON benchmark output
   * @returns {Array<{name: string, opsPerSec: number, margin: number}>}
   */
  static parse(output) {
    const benchmarkSections = JSON.parse(output);
    const results = [];
    
    for (const section of benchmarkSections) {
      const { benchmarkName, results: sectionResults } = section;
      
      for (const result of sectionResults) {
        results.push({
          name: `${benchmarkName} | ${result.name}`,
          benchmarkName: benchmarkName,
          libraryName: result.name,
          opsPerSec: result.opsPerSec,
          margin: result.margin,
          runs: result.runs
        });
      }
    }
    
    return results;
  }
}

/**
 * Compare benchmark results and generate comparison report
 */
class BenchmarkComparator {
  constructor(baselineResults, prResults) {
    this.baselineResults = baselineResults;
    this.prResults = prResults;
  }

  /**
   * Generate markdown comparison table
   */
  generateMarkdown() {
    const comparisons = this.calculateComparisons();
    
    if (comparisons.length === 0) {
      return '⚠️ No comparable benchmark results found.';
    }

    let markdown = '## 🚀 Benchmark Results\n\n';
    
    // Group comparisons by benchmark type
    const groupedComparisons = this.groupComparisonsByBenchmark(comparisons);
    
    for (const [benchmarkName, benchmarkComparisons] of Object.entries(groupedComparisons)) {
      markdown += `### ${benchmarkName}\n\n`;
      markdown += '| Library | Baseline (ops/sec) | PR (ops/sec) | Change | Performance |\n';
      markdown += '|---------|-------------------|--------------|---------|-------------|\n';

      for (const comp of benchmarkComparisons) {
        const changeSign = comp.percentChange >= 0 ? '+' : '';
        const performanceIcon = this.getPerformanceIcon(comp.percentChange);
        
        markdown += `| ${comp.pr.libraryName} `;
        markdown += `| ${comp.baseline.opsPerSec.toLocaleString()} ±${comp.baseline.margin}% `;
        markdown += `| ${comp.pr.opsPerSec.toLocaleString()} ±${comp.pr.margin}% `;
        markdown += `| ${changeSign}${comp.percentChange.toFixed(2)}% `;
        markdown += `| ${performanceIcon} |\n`;
      }
      
      markdown += '\n';
    }

    markdown += `*Updated: ${new Date().toISOString()}*\n`;
    
    return markdown;
  }

  /**
   * Group comparisons by benchmark type for cleaner display
   */
  groupComparisonsByBenchmark(comparisons) {
    const grouped = {};
    
    for (const comp of comparisons) {
      const benchmarkName = comp.pr.benchmarkName;
      if (!grouped[benchmarkName]) {
        grouped[benchmarkName] = [];
      }
      grouped[benchmarkName].push(comp);
    }
    
    // Sort libraries within each benchmark for consistency
    for (const benchmarkName of Object.keys(grouped)) {
      grouped[benchmarkName].sort((a, b) => a.pr.libraryName.localeCompare(b.pr.libraryName));
    }
    
    return grouped;
  }

  /**
   * Calculate performance comparisons between baseline and PR
   */
  calculateComparisons() {
    const comparisons = [];
    
    for (const prResult of this.prResults) {
      const baselineResult = this.baselineResults.find(b => b.name === prResult.name);
      
      if (baselineResult) {
        const percentChange = ((prResult.opsPerSec - baselineResult.opsPerSec) / baselineResult.opsPerSec) * 100;
        
        comparisons.push({
          name: prResult.name,
          baseline: baselineResult,
          pr: prResult,
          percentChange
        });
      }
    }
    
    return comparisons;
  }

  /**
   * Get performance indicator icon based on percentage change
   */
  getPerformanceIcon(percentChange) {
    if (percentChange >= 10) return '🚀 Significant improvement';
    if (percentChange >= 2) return '✅ Improvement';
    if (percentChange >= -2) return '➡️ No significant change';
    if (percentChange >= -10) return '⚠️ Minor regression';
    return '🔴 Significant regression';
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('Usage: node compare-benchmarks.js <baseline-file> <pr-file>');
    process.exit(1);
  }

  const [baselineFile, prFile] = args;

  try {
    // Read benchmark output files
    const baselineOutput = readFileSync(baselineFile, 'utf8');
    const prOutput = readFileSync(prFile, 'utf8');

    // Parse results using abstracted parser
    const baselineResults = BenchmarkParser.parse(baselineOutput);
    const prResults = BenchmarkParser.parse(prOutput);

    // Generate comparison report
    const comparator = new BenchmarkComparator(baselineResults, prResults);
    const markdown = comparator.generateMarkdown();

    // Output markdown for GitHub comment
    console.log(markdown);

  } catch (error) {
    console.error('Error comparing benchmarks:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}