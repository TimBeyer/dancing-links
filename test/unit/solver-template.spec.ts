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
})
