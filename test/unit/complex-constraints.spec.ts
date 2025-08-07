/**
 * Comprehensive tests for complex constraint behavior
 * 
 * Complex constraints have:
 * - Primary constraints: MUST be covered exactly once
 * - Secondary constraints: MAY be covered, but if covered, only once (no collisions)
 */

import { expect } from 'chai'
import { DancingLinks } from '../../lib/solvers/factory.js'
import type { Result } from '../../lib/types/interfaces.js'

describe('Complex Constraints', () => {
  describe('Basic Complex Constraint Behavior', () => {
    it('should handle primary constraints that must be covered exactly once', () => {
      // 2 primary, 1 secondary constraint
      const dlx = new DancingLinks<string>()
      const solver = dlx.createSolver({ primaryColumns: 2, secondaryColumns: 1 })
      
      // Row 1: covers primary [0,1], secondary []
      solver.addSparseConstraint('row1', { primary: [0, 1], secondary: [] })
      
      // Should find exactly one solution since all primaries are covered
      const solutions = solver.findAll()
      expect(solutions).to.have.length(1)
      expect(solutions[0]).to.have.length(1)
      expect(solutions[0][0].data).to.equal('row1')
    })

    it('should allow secondary constraints to be left uncovered', () => {
      // 1 primary, 2 secondary constraints  
      const dlx = new DancingLinks<string>()
      const solver = dlx.createSolver({ primaryColumns: 1, secondaryColumns: 2 })
      
      // Row 1: covers primary [0], ignores both secondaries
      solver.addSparseConstraint('row1', { primary: [0], secondary: [] })
      
      // Should find solution even though secondaries are uncovered
      const solutions = solver.findAll()
      expect(solutions).to.have.length(1)
      expect(solutions[0][0].data).to.equal('row1')
    })

    it('should prevent collisions in secondary constraints', () => {
      // 1 primary, 1 secondary constraint
      const dlx = new DancingLinks<string>()
      const solver = dlx.createSolver({ primaryColumns: 1, secondaryColumns: 1 })
      
      // Row 1: covers primary [0], secondary [0]
      solver.addSparseConstraint('row1', { primary: [0], secondary: [0] })
      
      // Row 2: would also cover secondary [0] - this should create collision
      solver.addSparseConstraint('row2', { primary: [], secondary: [0] })
      
      // Should find only one solution since row2 can't be used (secondary collision)
      const solutions = solver.findAll()
      expect(solutions).to.have.length(1)
      expect(solutions[0][0].data).to.equal('row1')
    })
  })

  describe('Complex Multi-Row Scenarios', () => {
    it('should handle mixed primary/secondary constraint scenarios', () => {
      // 2 primary (must cover), 2 secondary (optional, no conflicts)
      const dlx = new DancingLinks<string>()
      const solver = dlx.createSolver({ primaryColumns: 2, secondaryColumns: 2 })
      
      // Row 1: primary [0], secondary [0]
      solver.addSparseConstraint('A', { primary: [0], secondary: [0] })
      
      // Row 2: primary [1], secondary [1] 
      solver.addSparseConstraint('B', { primary: [1], secondary: [1] })
      
      // Row 3: primary [0,1], secondary [] (covers both primaries, no secondaries)
      solver.addSparseConstraint('C', { primary: [0, 1], secondary: [] })
      
      const solutions = solver.findAll()
      
      // Should find 2 solutions:
      // Solution 1: Rows A + B (covers all primaries, uses both secondaries)
      // Solution 2: Row C only (covers all primaries, leaves secondaries unused)
      expect(solutions).to.have.length(2)
      
      const solutionData = solutions.map((sol: Result<string>[]) => 
        sol.map((row: Result<string>) => row.data).sort()
      ).sort((a: string[], b: string[]) => a.length - b.length)
      
      expect(solutionData[0]).to.deep.equal(['C'])
      expect(solutionData[1]).to.deep.equal(['A', 'B'])
    })

    it('should solve constraint satisfaction with optional secondaries', () => {
      // Simulate a simple constraint satisfaction problem:
      // Primary: 3 tasks that must be assigned
      // Secondary: 2 resources that can be used but aren't required
      
      const dlx = new DancingLinks<string>()
      const solver = dlx.createSolver({ primaryColumns: 3, secondaryColumns: 2 })
      
      // Task assignments with optional resource usage
      solver.addSparseConstraint('task1_with_resource1', { primary: [0], secondary: [0] })
      solver.addSparseConstraint('task1_no_resource', { primary: [0], secondary: [] })
      solver.addSparseConstraint('task2_with_resource2', { primary: [1], secondary: [1] })
      solver.addSparseConstraint('task2_no_resource', { primary: [1], secondary: [] })
      solver.addSparseConstraint('task3_no_resource', { primary: [2], secondary: [] })
      
      const solutions = solver.findAll()
      
      // Should find multiple valid solutions
      expect(solutions.length).to.be.greaterThan(1)
      
      // Each solution should cover all 3 primary constraints exactly once
      for (const solution of solutions) {
        expect(solution).to.have.length(3) // One choice per primary constraint
        
        // Verify each solution has valid structure
        for (const row of solution) {
          expect(row.data).to.be.a('string')
        }
      }
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle empty secondary constraints', () => {
      const dlx = new DancingLinks<string>()
      const solver = dlx.createSolver({ primaryColumns: 1, secondaryColumns: 2 })
      
      solver.addSparseConstraint('row1', { primary: [0], secondary: [] })
      
      const solutions = solver.findAll()
      expect(solutions).to.have.length(1)
      expect(solutions[0][0].data).to.equal('row1')
    })

    it('should handle empty primary constraints', () => {
      const dlx = new DancingLinks<string>()
      const solver = dlx.createSolver({ primaryColumns: 1, secondaryColumns: 1 })
      
      // Row with no primary coverage - this should not contribute to solutions
      // since primary [0] would remain uncovered
      solver.addSparseConstraint('secondary_only', { primary: [], secondary: [0] })
      solver.addSparseConstraint('covers_primary', { primary: [0], secondary: [] })
      
      const solutions = solver.findAll()
      expect(solutions).to.have.length(1)
      expect(solutions[0]).to.have.length(1)
      expect(solutions[0][0].data).to.equal('covers_primary')
    })

    it('should handle scenarios with no valid solutions', () => {
      const dlx = new DancingLinks<string>()
      const solver = dlx.createSolver({ primaryColumns: 2, secondaryColumns: 1 })
      
      // Only cover primary [0], leaving primary [1] uncovered
      solver.addSparseConstraint('incomplete', { primary: [0], secondary: [0] })
      
      const solutions = solver.findAll()
      expect(solutions).to.have.length(0) // No solutions since primary [1] uncovered
    })
  })

  describe('Binary Constraint Format Compatibility', () => {
    it('should produce identical results for binary and sparse complex constraints', () => {
      // Test same problem with both formats
      const dlx1 = new DancingLinks<string>()
      const sparseSolver = dlx1.createSolver({ primaryColumns: 2, secondaryColumns: 1 })
      
      const dlx2 = new DancingLinks<string>()
      const binarySolver = dlx2.createSolver({ primaryColumns: 2, secondaryColumns: 1 })
      
      // Sparse format
      sparseSolver.addSparseConstraint('A', { primary: [0], secondary: [0] })
      sparseSolver.addSparseConstraint('B', { primary: [1], secondary: [] })
      
      // Binary format (equivalent)
      binarySolver.addBinaryConstraint('A', { primaryRow: [1, 0], secondaryRow: [1] })
      binarySolver.addBinaryConstraint('B', { primaryRow: [0, 1], secondaryRow: [0] })
      
      const sparseSolutions = sparseSolver.findAll()
      const binarySolutions = binarySolver.findAll()
      
      expect(sparseSolutions).to.have.length(binarySolutions.length)
      expect(sparseSolutions).to.have.length(1)
      
      // Both should find same solution structure
      expect(sparseSolutions[0]).to.have.length(2)
      expect(binarySolutions[0]).to.have.length(2)
    })
  })
})