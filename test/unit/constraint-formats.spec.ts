import { expect } from 'chai'
import { DancingLinks } from '../../index.js'

describe('Constraint Formats', function () {
  it('should support sparse constraint format', function () {
    const dlx = new DancingLinks<number>()
    const solver = dlx.createSolver({ columns: 3 })

    // Add constraints using sparse format (recommended)
    solver.addSparseConstraint(0, [0]) // covers column 0
    solver.addSparseConstraint(1, [1]) // covers column 1
    solver.addSparseConstraint(2, [2]) // covers column 2
    solver.addSparseConstraint(3, [0, 2]) // covers columns 0 and 2

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
    const dlx = new DancingLinks<number>()
    const solver = dlx.createSolver({ columns: 3 })

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
    const dlx = new DancingLinks<string>()

    const sparseSolver = dlx.createSolver({ columns: 3 })
    sparseSolver.addSparseConstraint('s0', [0])
    sparseSolver.addSparseConstraint('s1', [1])
    sparseSolver.addSparseConstraint('s2', [2])

    const binarySolver = dlx.createSolver({ columns: 3 })
    binarySolver.addBinaryConstraint('b0', [1, 0, 0])
    binarySolver.addBinaryConstraint('b1', [0, 1, 0])
    binarySolver.addBinaryConstraint('b2', [0, 0, 1])

    const sparseSolutions = sparseSolver.findAll()
    const binarySolutions = binarySolver.findAll()

    expect(sparseSolutions).to.have.length(binarySolutions.length)
    expect(sparseSolutions[0]).to.have.length(binarySolutions[0]!.length)
  })

  it('should support templates with both constraint formats', function () {
    const dlx = new DancingLinks<string>()
    const template = dlx.createSolverTemplate({ columns: 3 })

    // Mix sparse and binary constraints in template
    template.addSparseConstraint('sparse-base', [0])
    template.addBinaryConstraint('binary-base', [0, 1, 0])

    const solver = template.createSolver()
    solver.addSparseConstraint('sparse-extra', [2])

    const solutions = solver.findAll()
    expect(solutions).to.have.length.greaterThan(0)
  })
})
