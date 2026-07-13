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

  it('should append unchecked sparse batches without overwriting or leaving gaps', function () {
    const emptySolver = new DancingLinks<string>().createSolver({ columns: 1 })
    emptySolver.addSparseConstraints([])
    expect(() => emptySolver.findAll()).to.throw('Cannot solve problem with no constraints')

    const solver = new DancingLinks<string>().createSolver({ columns: 3 })
    solver.addSparseConstraint('zero', [0])
    solver.addSparseConstraints([])
    solver.addSparseConstraints([
      { data: 'one', columnIndices: [1] },
      { data: 'two', columnIndices: [2] }
    ])

    const solutions = solver.findAll()
    expect(solutions).to.have.length(1)
    expect(solutions[0]!.slice().sort((a, b) => a.index - b.index)).to.deep.equal([
      { index: 0, data: 'zero' },
      { index: 1, data: 'one' },
      { index: 2, data: 'two' }
    ])
  })

  it('should commit only completed unchecked rows when reading a later row throws', function () {
    const solver = new DancingLinks<string>().createSolver({ columns: 2 })
    const throwingConstraint = {
      data: 'invalid',
      get columnIndices(): number[] {
        throw new Error('input access failed')
      }
    }

    expect(() =>
      solver.addSparseConstraints([
        { data: 'kept', columnIndices: [0] },
        throwingConstraint,
        { data: 'later', columnIndices: [1] }
      ])
    ).to.throw('input access failed')

    solver.addSparseConstraint('replacement', [1])
    const solutions = solver.findAll()
    expect(solutions).to.have.length(1)
    expect(solutions[0]!.slice().sort((a, b) => a.index - b.index)).to.deep.equal([
      { index: 0, data: 'kept' },
      { index: 1, data: 'replacement' }
    ])
  })

  it('should append after rows added reentrantly by an input getter', function () {
    const solver = new DancingLinks<string>().createSolver({ columns: 3 })
    const reentrantConstraint = {
      data: 'outer',
      get columnIndices(): number[] {
        solver.addSparseConstraint('nested', [1])
        return [0]
      }
    }

    solver.addSparseConstraints([reentrantConstraint, { data: 'later', columnIndices: [2] }])

    const solutions = solver.findAll()
    expect(solutions).to.have.length(1)
    expect(solutions[0]!.slice().sort((a, b) => a.index - b.index)).to.deep.equal([
      { index: 0, data: 'nested' },
      { index: 1, data: 'outer' },
      { index: 2, data: 'later' }
    ])
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
