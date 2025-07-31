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
   * Parse benchmark output and extract performance metrics
   * @param {string} output - Raw benchmark output
   * @returns {Array<{name: string, opsPerSec: number, margin: number}>}
   */
  static parse(output) {
    // Current implementation: regex parsing of text output
    return this.parseTextOutput(output);
  }

  /**
   * Parse text-based benchmark output (current format)
   * This method can be replaced when structured output is available
   */
  static parseTextOutput(output) {
    const results = [];
    
    // Match lines like: "dancing-links find x 3,771 ops/sec ±2.06% (92 runs sampled)"
    const benchmarkRegex = /^(.+?)\s+x\s+([\d,]+)\s+ops\/sec\s+±([\d.]+)%/gm;
    
    let match;
    while ((match = benchmarkRegex.exec(output)) !== null) {
      const [, name, opsPerSecStr, marginStr] = match;
      const opsPerSec = parseFloat(opsPerSecStr.replace(/,/g, ''));
      const margin = parseFloat(marginStr);
      
      if (!isNaN(opsPerSec) && !isNaN(margin)) {
        results.push({
          name: name.trim(),
          opsPerSec,
          margin
        });
      }
    }
    
    return results;
  }

  /**
   * Future: Parse structured JSON/CSV output
   * Replace parseTextOutput() call in parse() method when available
   */
  static parseStructuredOutput(output) {
    // TODO: Implement when benchmark tool outputs structured data
    // Example: return JSON.parse(output).benchmarks;
    throw new Error('Structured output parsing not yet implemented');
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
    markdown += '| Benchmark | Baseline (ops/sec) | PR (ops/sec) | Change | Performance |\n';
    markdown += '|-----------|-------------------|--------------|---------|-------------|\n';

    for (const comp of comparisons) {
      const changeSign = comp.percentChange >= 0 ? '+' : '';
      const performanceIcon = this.getPerformanceIcon(comp.percentChange);
      
      markdown += `| ${comp.name} `;
      markdown += `| ${comp.baseline.opsPerSec.toLocaleString()} ±${comp.baseline.margin}% `;
      markdown += `| ${comp.pr.opsPerSec.toLocaleString()} ±${comp.pr.margin}% `;
      markdown += `| ${changeSign}${comp.percentChange.toFixed(2)}% `;
      markdown += `| ${performanceIcon} |\n`;
    }

    markdown += `\n*Updated: ${new Date().toISOString()}*\n`;
    
    return markdown;
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