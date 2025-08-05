import { expect } from 'chai'
import { DancingLinks } from '../../index.js'

describe('SolverTemplate', function () {
  it('should create solvers with template constraints pre-loaded', function () {
    const dlx = new DancingLinks<number>()
    const template = dlx.createSolverTemplate({ columns: 3 })

    template.addBinaryConstraint(0, [1, 0, 0]).addBinaryConstraint(1, [0, 1, 0])

    const solver = template.createSolver()
    solver.addBinaryConstraint(2, [0, 0, 1])

    const solutions = solver.findAll()
    expect(solutions).to.have.length(1)

    const resultData = []
    for (const result of solutions[0]!) {
      resultData.push(result.data)
    }
    resultData.sort()

    expect(resultData).to.deep.equal([0, 1, 2])
  })

  it('should enable constraint reuse across multiple solvers', function () {
    const dlx = new DancingLinks<string>()
    const template = dlx.createSolverTemplate({ columns: 2 })

    template.addBinaryConstraint('base1', [1, 0]).addBinaryConstraint('base2', [0, 1])

    const solver1 = template.createSolver()
    const solver2 = template.createSolver()

    const solutions1 = solver1.findAll()
    const solutions2 = solver2.findAll()

    expect(solutions1).to.have.length(1)
    expect(solutions2).to.have.length(1)

    const data1 = []
    for (const result of solutions1[0]!) {
      data1.push(result.data)
    }
    data1.sort()

    const data2 = []
    for (const result of solutions2[0]!) {
      data2.push(result.data)
    }
    data2.sort()

    expect(data1).to.deep.equal(['base1', 'base2'])
    expect(data2).to.deep.equal(['base1', 'base2'])
  })

  it('should support fluent interface for adding constraints', function () {
    const dlx = new DancingLinks<number>()
    const template = dlx.createSolverTemplate({ columns: 3 })

    const result = template.addBinaryConstraint(0, [1, 0, 0]).addBinaryConstraint(1, [0, 1, 0])

    expect(result).to.equal(template)
  })

  it('should validate template constraints at creation time', function () {
    const dlx = new DancingLinks<string>()
    const template = dlx.createSolverTemplate({ columns: 3 }).validateConstraints()

    // Should validate constraints when adding to template
    expect(() => template.addSparseConstraint('test', [0, 3])).to.throw(
      'Column index 3 exceeds columns limit of 3'
    )
    expect(() => template.addBinaryConstraint('test', [1, 0])).to.throw(
      'Row length 2 does not match columns 3'
    )
  })

  describe('Solver Independence & Side Effects', function () {
    it('should maintain solver independence when adding constraints', function () {
      const dlx = new DancingLinks<string>()
      const template = dlx.createSolverTemplate({ columns: 3 })
      
      // Add base constraints to template
      template.addSparseConstraint('base1', [0])
      template.addSparseConstraint('base2', [1])
      
      const solver1 = template.createSolver()
      const solver2 = template.createSolver()
      
      // Add extra constraint only to solver1
      solver1.addSparseConstraint('extra1', [2])
      
      // solver2 should not see extra1
      const solutions1 = solver1.findAll()
      const solutions2 = solver2.findAll()
      
      // solver1 should have all three constraints
      expect(solutions1).to.have.length(1)
      const data1 = solutions1[0]!.map(r => r.data).sort()
      expect(data1).to.deep.equal(['base1', 'base2', 'extra1'])
      
      // solver2 should only have base constraints
      expect(solutions2).to.have.length(0) // No solution with only base1, base2
    })

    it('should maintain solver independence after solving', function () {
      const dlx = new DancingLinks<string>()
      const template = dlx.createSolverTemplate({ columns: 3 })
      
      template.addSparseConstraint('base1', [0])
      template.addSparseConstraint('base2', [1])
      template.addSparseConstraint('base3', [2])
      
      const solver1 = template.createSolver()
      const solver2 = template.createSolver()
      
      // Solve with solver1 (this mutates internal search state)
      const solutions1 = solver1.findAll()
      expect(solutions1).to.have.length(1)
      
      // solver2 should still work correctly after solver1 was used
      const solutions2 = solver2.findAll()  
      expect(solutions2).to.have.length(1)
      expect(solutions2[0]!.map(r => r.data).sort()).to.deep.equal(['base1', 'base2', 'base3'])
    })

    it('should support concurrent solving from same template', function () {
      const dlx = new DancingLinks<number>()
      const template = dlx.createSolverTemplate({ columns: 2 })
      
      // Create a problem with exactly one solution
      template.addBinaryConstraint(1, [1, 0])
      template.addBinaryConstraint(2, [0, 1])
      
      const solver1 = template.createSolver()
      const solver2 = template.createSolver()
      const solver3 = template.createSolver()
      
      // All should find the same solution independently
      const solutions1 = solver1.findAll()
      const solutions2 = solver2.findAll()
      const solutions3 = solver3.findAll()
      
      expect(solutions1).to.have.length(1)
      expect(solutions2).to.have.length(1)
      expect(solutions3).to.have.length(1)
      
      // All should have identical solutions
      const data1 = solutions1[0]!.map(r => r.data).sort()
      const data2 = solutions2[0]!.map(r => r.data).sort()
      const data3 = solutions3[0]!.map(r => r.data).sort()
      
      expect(data1).to.deep.equal([1, 2])
      expect(data2).to.deep.equal([1, 2])
      expect(data3).to.deep.equal([1, 2])
    })
  })

  describe('Template State Isolation', function () {
    it('should isolate template modifications from existing solvers', function () {
      const dlx = new DancingLinks<string>()
      const template = dlx.createSolverTemplate({ columns: 3 })
      
      template.addSparseConstraint('base1', [0])
      template.addSparseConstraint('base2', [1])
      
      // Create solver from template
      const solver1 = template.createSolver()
      solver1.addSparseConstraint('solver1-extra', [2])
      
      // Modify template after creating solver (add constraint for column 2)
      template.addSparseConstraint('template-new', [2])
      
      // Create new solver from modified template
      const solver2 = template.createSolver()
      
      const solutions1 = solver1.findAll()
      const solutions2 = solver2.findAll()
      
      // solver1 should have original template + its extra (no template-new)
      expect(solutions1).to.have.length(1)
      const data1 = solutions1[0]!.map(r => r.data).sort()
      expect(data1).to.deep.equal(['base1', 'base2', 'solver1-extra'])
      
      // solver2 should have modified template constraints (including template-new)
      expect(solutions2).to.have.length(1)  
      const data2 = solutions2[0]!.map(r => r.data).sort()
      expect(data2).to.deep.equal(['base1', 'base2', 'template-new'])
    })

    it('should never modify existing solver constraints when template changes', function () {
      const dlx = new DancingLinks<string>()
      const template = dlx.createSolverTemplate({ columns: 4 })
      
      // Step 1: Create template with initial constraints
      template.addSparseConstraint('template-base-1', [0])
      template.addSparseConstraint('template-base-2', [1])
      
      // Step 2: Create solver1 from template snapshot
      const solver1 = template.createSolver()
      
      // Step 3: Add more constraints to template AFTER creating solver1
      template.addSparseConstraint('template-added-later', [2])
      
      // Step 4: Create solver2 from updated template
      const solver2 = template.createSolver()
      
      // Step 5: Complete both solvers with their own constraints
      solver1.addSparseConstraint('solver1-specific', [2, 3])
      solver2.addSparseConstraint('solver2-specific', [3])
      
      // Step 6: Test the core invariant - solver1 should NOT see 'template-added-later'
      const solutions1 = solver1.findAll()
      const solutions2 = solver2.findAll()
      
      expect(solutions1).to.have.length(1)
      const data1 = solutions1[0]!.map(r => r.data).sort()
      expect(data1).to.deep.equal(['solver1-specific', 'template-base-1', 'template-base-2'])
      
      // solver1 should NOT have 'template-added-later' even though it was added to template
      expect(data1).to.not.include('template-added-later')
      
      expect(solutions2).to.have.length(1)
      const data2 = solutions2[0]!.map(r => r.data).sort()
      expect(data2).to.deep.equal(['solver2-specific', 'template-added-later', 'template-base-1', 'template-base-2'])
      
      // solver2 SHOULD have 'template-added-later' because it was created after the addition
      expect(data2).to.include('template-added-later')
    })

    it('should not corrupt template state when solving', function () {
      const dlx = new DancingLinks<string>()
      const template = dlx.createSolverTemplate({ columns: 3 })
      
      template.addSparseConstraint('base1', [0])
      template.addSparseConstraint('base2', [1])
      template.addSparseConstraint('base3', [2])
      
      // Create and solve multiple times
      const solver1 = template.createSolver()
      solver1.findAll()
      solver1.findOne()
      solver1.find(5)
      
      // Template should still work for new solvers
      const solver2 = template.createSolver()
      const solutions = solver2.findAll()
      
      expect(solutions).to.have.length(1)
      const data = solutions[0]!.map(r => r.data).sort()
      expect(data).to.deep.equal(['base1', 'base2', 'base3'])
    })
  })

  describe('Complex Reuse Patterns', function () {
    it('should work with empty template and solver-specific constraints', function () {
      const dlx = new DancingLinks<string>()
      const emptyTemplate = dlx.createSolverTemplate({ columns: 3 })
      
      const solver1 = emptyTemplate.createSolver()
      solver1.addSparseConstraint('s1-1', [0])
      solver1.addSparseConstraint('s1-2', [1])
      solver1.addSparseConstraint('s1-3', [2])
      
      const solver2 = emptyTemplate.createSolver()
      solver2.addBinaryConstraint('s2-1', [1, 1, 0])
      solver2.addBinaryConstraint('s2-2', [0, 0, 1])
      
      const solutions1 = solver1.findAll()
      const solutions2 = solver2.findAll()
      
      expect(solutions1).to.have.length(1)
      expect(solutions1[0]!.map(r => r.data).sort()).to.deep.equal(['s1-1', 's1-2', 's1-3'])
      
      expect(solutions2).to.have.length(1)
      expect(solutions2[0]!.map(r => r.data).sort()).to.deep.equal(['s2-1', 's2-2'])
    })

    it('should handle mixed constraint types in templates', function () {
      const dlx = new DancingLinks<string>()
      const template = dlx.createSolverTemplate({ columns: 4 })
      
      // Mix sparse and binary constraints in template
      template.addSparseConstraint('sparse1', [0, 1])
      template.addBinaryConstraint('binary1', [0, 0, 1, 1])
      
      const solver = template.createSolver()
      const solutions = solver.findAll()
      
      expect(solutions).to.have.length(1)
      const data = solutions[0]!.map(r => r.data).sort()
      expect(data).to.deep.equal(['binary1', 'sparse1'])
    })

    it('should maintain performance after heavy template reuse', function () {
      const dlx = new DancingLinks<number>()
      const template = dlx.createSolverTemplate({ columns: 5 })
      
      // Add multiple constraints to template
      template.addBinaryConstraint(1, [1, 0, 0, 0, 0])
      template.addBinaryConstraint(2, [0, 1, 0, 0, 0])
      template.addBinaryConstraint(3, [0, 0, 1, 0, 0])
      template.addBinaryConstraint(4, [0, 0, 0, 1, 0])
      template.addBinaryConstraint(5, [0, 0, 0, 0, 1])
      
      // Create many solvers and solve them
      for (let i = 0; i < 10; i++) {
        const solver = template.createSolver()
        const solutions = solver.findAll()
        expect(solutions).to.have.length(1)
        expect(solutions[0]!).to.have.length(5)
      }
    })
  })

  describe('Edge Cases', function () {
    it('should handle template with no solutions', function () {
      const dlx = new DancingLinks<string>()
      const template = dlx.createSolverTemplate({ columns: 2 })
      
      // Create impossible constraints (column 0 must be covered twice)
      template.addSparseConstraint('impossible1', [0])
      template.addSparseConstraint('impossible2', [0])
      
      const solver1 = template.createSolver()
      const solver2 = template.createSolver()
      
      const solutions1 = solver1.findAll()
      const solutions2 = solver2.findAll()
      
      expect(solutions1).to.have.length(0)
      expect(solutions2).to.have.length(0)
    })

    it('should propagate template validation to created solvers', function () {
      const dlx = new DancingLinks<string>()
      const template = dlx.createSolverTemplate({ columns: 3 }).validateConstraints()
      
      template.addSparseConstraint('base', [0])
      
      const solver = template.createSolver()
      
      // Solver should inherit validation from template
      expect(() => solver.addSparseConstraint('invalid', [5])).to.throw(
        'Column index 5 exceeds columns limit of 3'
      )
    })

    it('should work with large templates', function () {
      const dlx = new DancingLinks<number>()
      const template = dlx.createSolverTemplate({ columns: 20 })
      
      // Add many constraints to template
      for (let i = 0; i < 20; i++) {
        const constraint = new Array(20).fill(0)
        constraint[i] = 1
        template.addBinaryConstraint(i, constraint)
      }
      
      const solver = template.createSolver()
      const solutions = solver.findAll()
      
      expect(solutions).to.have.length(1)
      expect(solutions[0]!).to.have.length(20)
      
      // Verify all numbers 0-19 are present
      const data = solutions[0]!.map(r => r.data).sort((a, b) => a - b)
      expect(data).to.deep.equal(Array.from({ length: 20 }, (_, i) => i))
    })
  })
})
