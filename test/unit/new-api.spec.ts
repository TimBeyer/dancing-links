import { expect } from 'chai'
import { DancingLinks } from '../../lib/new-api.js'
import { SimpleConstraint } from '../../lib/interfaces.js'

describe('New Caching API', function () {
  describe('DancingLinks Factory', function () {
    it('should create a DancingLinks instance', function () {
      const dlx = new DancingLinks()
      expect(dlx).to.be.instanceOf(DancingLinks)
    })

    it('should create a ProblemSolver', function () {
      const dlx = new DancingLinks()
      const solver = dlx.createSolver({ columns: 1 })
      
      // Add a simple constraint and verify it works
      solver.addBinaryConstraint(0, [1])
      expect(() => solver.findAll()).to.not.throw()
    })

    it('should create a SolverTemplate', function () {
      const dlx = new DancingLinks()
      const template = dlx.createSolverTemplate()
      
      // Just verify we can create solver from template
      expect(() => template.createSolver({ columns: 1 })).to.not.throw()
    })
  })

  describe('ProblemSolver', function () {
    it('should solve a simple exact cover problem', function () {
      const dlx = new DancingLinks()
      const solver = dlx.createSolver<number>({ columns: 3 })

      const constraints: SimpleConstraint<number>[] = [
        { data: 0, row: [1, 0, 0] },
        { data: 1, row: [0, 1, 0] },
        { data: 2, row: [0, 0, 1] },
        { data: 3, row: [1, 0, 1] }
      ]

      for (const c of constraints) {
        solver.addBinaryConstraint(c.data, c.row)
      }

      const solutions = solver.findAll()

      expect(solutions).to.have.length(2)
      
      const solutionData = []
      for (const solution of solutions) {
        const data = []
        for (const result of solution) {
          data.push(result.data)
        }
        data.sort()
        solutionData.push(data)
      }
      
      expect(solutionData).to.deep.include([0, 1, 2])
      expect(solutionData).to.deep.include([1, 3])
    })

    it('should support fluent interface for adding constraints', function () {
      const dlx = new DancingLinks()
      const solver = dlx.createSolver<number>({ columns: 3 })

      const result = solver
        .addBinaryConstraint(0, [1, 0, 0])
        .addBinaryConstraint(1, [0, 1, 0])
        .addBinaryConstraint(2, [0, 0, 1])

      expect(result).to.equal(solver)
    })

    it('should support findOne, findAll, and find with specific count', function () {
      const dlx = new DancingLinks()
      const solver = dlx.createSolver<number>({ columns: 3 })

      solver
        .addBinaryConstraint(0, [1, 0, 0])
        .addBinaryConstraint(1, [0, 1, 0])
        .addBinaryConstraint(2, [0, 0, 1])
        .addBinaryConstraint(3, [1, 0, 1])

      const oneSolution = solver.findOne()
      const twoSolutions = solver.find(2)
      const allSolutions = solver.findAll()

      expect(oneSolution).to.have.length(1)
      expect(twoSolutions).to.have.length(2)
      expect(allSolutions).to.have.length(2)
    })
  })

  describe('SolverTemplate', function () {
    it('should create solvers with template constraints pre-loaded', function () {
      const dlx = new DancingLinks()
      const template = dlx.createSolverTemplate<number>()

      template
        .addBinaryConstraint(0, [1, 0, 0])
        .addBinaryConstraint(1, [0, 1, 0])

      const solver = template.createSolver({ columns: 3 })
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
      const dlx = new DancingLinks()
      const template = dlx.createSolverTemplate<string>()

      template
        .addBinaryConstraint('base1', [1, 0])
        .addBinaryConstraint('base2', [0, 1])

      const solver1 = template.createSolver({ columns: 2 })
      const solver2 = template.createSolver({ columns: 2 })

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
      const dlx = new DancingLinks()
      const template = dlx.createSolverTemplate<number>()

      const result = template
        .addBinaryConstraint(0, [1, 0, 0])
        .addBinaryConstraint(1, [0, 1, 0])

      expect(result).to.equal(template)
    })
  })

  describe('Dual Interface Support', function () {
    it('should support sparse constraint format', function () {
      const dlx = new DancingLinks()
      const solver = dlx.createSolver<number>({ columns: 3 })

      // Add constraints using sparse format (recommended)
      solver.addSparseConstraint(0, [0])       // covers column 0
      solver.addSparseConstraint(1, [1])       // covers column 1
      solver.addSparseConstraint(2, [2])       // covers column 2
      solver.addSparseConstraint(3, [0, 2])    // covers columns 0 and 2

      const solutions = solver.findAll()
      expect(solutions).to.have.length(2)

      const solutionData = []
      for (const solution of solutions) {
        const data = []
        for (const result of solution) {
          data.push(result.data)
        }
        data.sort()
        solutionData.push(data)
      }
      
      expect(solutionData).to.deep.include([0, 1, 2])
      expect(solutionData).to.deep.include([1, 3])
    })

    it('should support binary constraint format for compatibility', function () {
      const dlx = new DancingLinks()
      const solver = dlx.createSolver<number>({ columns: 3 })

      // Add constraints using binary format (for compatibility)
      solver.addBinaryConstraint(0, [1, 0, 0])
      solver.addBinaryConstraint(1, [0, 1, 0])
      solver.addBinaryConstraint(2, [0, 0, 1])
      solver.addBinaryConstraint(3, [1, 0, 1])

      const solutions = solver.findAll()
      expect(solutions).to.have.length(2)

      const solutionData = []
      for (const solution of solutions) {
        const data = []
        for (const result of solution) {
          data.push(result.data)
        }
        data.sort()
        solutionData.push(data)
      }
      
      expect(solutionData).to.deep.include([0, 1, 2])
      expect(solutionData).to.deep.include([1, 3])
    })

    it('should produce identical results for sparse and binary formats', function () {
      const dlx = new DancingLinks()
      
      const sparseSolver = dlx.createSolver<string>({ columns: 3 })
      sparseSolver.addSparseConstraint('s0', [0])
      sparseSolver.addSparseConstraint('s1', [1])
      sparseSolver.addSparseConstraint('s2', [2])

      const binarySolver = dlx.createSolver<string>({ columns: 3 })
      binarySolver.addBinaryConstraint('b0', [1, 0, 0])
      binarySolver.addBinaryConstraint('b1', [0, 1, 0])
      binarySolver.addBinaryConstraint('b2', [0, 0, 1])

      const sparseSolutions = sparseSolver.findAll()
      const binarySolutions = binarySolver.findAll()

      expect(sparseSolutions).to.have.length(binarySolutions.length)
      expect(sparseSolutions[0]).to.have.length(binarySolutions[0]!.length)
    })

    it('should support templates with both constraint formats', function () {
      const dlx = new DancingLinks()
      const template = dlx.createSolverTemplate<string>()

      // Mix sparse and binary constraints in template
      template.addSparseConstraint('sparse-base', [0])
      template.addBinaryConstraint('binary-base', [0, 1])

      const solver = template.createSolver({ columns: 3 })
      solver.addSparseConstraint('sparse-extra', [2])

      const solutions = solver.findAll()
      expect(solutions).to.have.length.greaterThan(0)
    })
  })

  describe('Constraint Caching', function () {
    it('should cache identical constraints across different solvers', function () {
      const dlx = new DancingLinks()
      
      const constraint1 = { data: 'test1', row: [1, 0, 1] as (0 | 1)[] }
      const constraint2 = { data: 'test2', row: [1, 0, 1] as (0 | 1)[] }
      
      const solver1 = dlx.createSolver<string>({ columns: 3 })
      const solver2 = dlx.createSolver<string>({ columns: 3 })
      
      solver1.addBinaryConstraint(constraint1.data, constraint1.row)
      solver2.addBinaryConstraint(constraint2.data, constraint2.row)
      
      expect(() => solver1.findAll()).to.not.throw()
      expect(() => solver2.findAll()).to.not.throw()
    })
  })

  describe('Type-Safe Solver Configurations', function () {
    describe('Simple Solver Configuration', function () {
      it('should create solver with simple configuration', function () {
        const dlx = new DancingLinks()
        const solver = dlx.createSolver({ columns: 3 })
        
        solver.addSparseConstraint('test1', [0])
        solver.addSparseConstraint('test2', [1])
        solver.addBinaryConstraint('test3', [0, 0, 1])
        
        const solutions = solver.findAll()
        expect(solutions).to.have.length.greaterThan(0)
      })

      it('should validate sparse constraint column indices', function () {
        const dlx = new DancingLinks()
        const solver = dlx.createSolver({ columns: 3 })
        
        expect(() => solver.addSparseConstraint('test', [0, 3])).to.throw('Column index 3 exceeds columns limit of 3')
        expect(() => solver.addSparseConstraint('test', [-1])).to.throw('Column index -1 exceeds columns limit of 3')
      })

      it('should validate binary constraint row length', function () {
        const dlx = new DancingLinks()
        const solver = dlx.createSolver({ columns: 3 })
        
        expect(() => solver.addBinaryConstraint('test', [1, 0])).to.throw('Row length 2 does not match columns 3')
        expect(() => solver.addBinaryConstraint('test', [1, 0, 1, 0])).to.throw('Row length 4 does not match columns 3')
      })
    })

    describe('Complex Solver Configuration', function () {
      it('should create solver with complex configuration', function () {
        const dlx = new DancingLinks()
        const solver = dlx.createSolver({ primaryColumns: 2, secondaryColumns: 2 })
        
        solver.addSparseConstraint('test1', { primary: [0], secondary: [] })
        solver.addSparseConstraint('test2', { primary: [1], secondary: [] })
        solver.addBinaryConstraint('test3', { primaryRow: [0, 0], secondaryRow: [1, 0] })
        solver.addBinaryConstraint('test4', { primaryRow: [0, 0], secondaryRow: [0, 1] })
        
        const solutions = solver.findAll()
        expect(solutions).to.have.length.greaterThan(0)
      })

      it('should validate complex sparse constraint column indices', function () {
        const dlx = new DancingLinks()
        const solver = dlx.createSolver({ primaryColumns: 2, secondaryColumns: 2 })
        
        expect(() => solver.addSparseConstraint('test', { primary: [2], secondary: [] }))
          .to.throw('Primary column index 2 exceeds primaryColumns limit of 2')
        
        expect(() => solver.addSparseConstraint('test', { primary: [], secondary: [2] }))
          .to.throw('Secondary column index 2 exceeds secondaryColumns limit of 2')
      })

      it('should validate complex binary constraint row lengths', function () {
        const dlx = new DancingLinks()
        const solver = dlx.createSolver({ primaryColumns: 2, secondaryColumns: 2 })
        
        expect(() => solver.addBinaryConstraint('test', { primaryRow: [1], secondaryRow: [0, 1] }))
          .to.throw('Primary row length 1 does not match primaryColumns 2')
        
        expect(() => solver.addBinaryConstraint('test', { primaryRow: [1, 0], secondaryRow: [1] }))
          .to.throw('Secondary row length 1 does not match secondaryColumns 2')
      })
    })

  })
})