import { expect } from 'chai'
import { DancingLinks } from '../../index.js'

describe('Solver Configurations', function () {
  describe('Simple Solver Configuration', function () {
    it('should create solver with simple configuration', function () {
      const dlx = new DancingLinks<string>()
      const solver = dlx.createSolver({ columns: 3 })

      solver.addSparseConstraint('test1', [0])
      solver.addSparseConstraint('test2', [1])
      solver.addBinaryConstraint('test3', [0, 0, 1])

      const solutions = solver.findAll()
      expect(solutions).to.have.length.greaterThan(0)
    })

    it('should validate sparse constraint column indices', function () {
      const dlx = new DancingLinks<string>()
      const solver = dlx.createSolver({ columns: 3 }).validateConstraints()

      expect(() => solver.addSparseConstraint('test', [0, 3])).to.throw(
        'Column index 3 exceeds columns limit of 3'
      )
      expect(() => solver.addSparseConstraint('test', [-1])).to.throw(
        'Column index -1 exceeds columns limit of 3'
      )
    })

    it('should validate binary constraint row length', function () {
      const dlx = new DancingLinks<string>()
      const solver = dlx.createSolver({ columns: 3 }).validateConstraints()

      expect(() => solver.addBinaryConstraint('test', [1, 0])).to.throw(
        'Row length 2 does not match columns 3'
      )
      expect(() => solver.addBinaryConstraint('test', [1, 0, 1, 0])).to.throw(
        'Row length 4 does not match columns 3'
      )
    })
  })

  describe('Complex Solver Configuration', function () {
    it('should create solver with complex configuration', function () {
      const dlx = new DancingLinks<string>()
      const solver = dlx.createSolver({ primaryColumns: 2, secondaryColumns: 2 })

      solver.addSparseConstraint('test1', { primary: [0], secondary: [] })
      solver.addSparseConstraint('test2', { primary: [1], secondary: [] })
      solver.addBinaryConstraint('test3', { primaryRow: [0, 0], secondaryRow: [1, 0] })
      solver.addBinaryConstraint('test4', { primaryRow: [0, 0], secondaryRow: [0, 1] })

      const solutions = solver.findAll()
      expect(solutions).to.have.length.greaterThan(0)
    })

    it('should validate complex sparse constraint column indices', function () {
      const dlx = new DancingLinks<string>()
      const solver = dlx
        .createSolver({ primaryColumns: 2, secondaryColumns: 2 })
        .validateConstraints()

      expect(() => solver.addSparseConstraint('test', { primary: [2], secondary: [] })).to.throw(
        'Primary column index 2 exceeds primaryColumns limit of 2'
      )

      expect(() => solver.addSparseConstraint('test', { primary: [], secondary: [2] })).to.throw(
        'Secondary column index 2 exceeds secondaryColumns limit of 2'
      )
    })

    it('should validate complex binary constraint row lengths', function () {
      const dlx = new DancingLinks<string>()
      const solver = dlx
        .createSolver({ primaryColumns: 2, secondaryColumns: 2 })
        .validateConstraints()

      expect(() =>
        solver.addBinaryConstraint('test', { primaryRow: [1], secondaryRow: [0, 1] })
      ).to.throw('Primary row length 1 does not match primaryColumns 2')

      expect(() =>
        solver.addBinaryConstraint('test', { primaryRow: [1, 0], secondaryRow: [1] })
      ).to.throw('Secondary row length 1 does not match secondaryColumns 2')
    })
  })
})
