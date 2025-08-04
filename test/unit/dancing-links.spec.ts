import { expect } from 'chai'
import { DancingLinks } from '../../index.js'

describe('DancingLinks Factory', function () {
  it('should create a DancingLinks instance', function () {
    const dlx = new DancingLinks<number>()
    expect(dlx).to.be.instanceOf(DancingLinks)
  })

  it('should create a ProblemSolver', function () {
    const dlx = new DancingLinks<number>()
    const solver = dlx.createSolver({ columns: 1 })

    // Add a simple constraint and verify it works
    solver.addBinaryConstraint(0, [1])
    expect(() => solver.findAll()).to.not.throw()
  })

  it('should create a SolverTemplate', function () {
    const dlx = new DancingLinks<number>()
    const template = dlx.createSolverTemplate({ columns: 1 })

    // Just verify we can create solver from template
    expect(() => template.createSolver()).to.not.throw()
  })
})
