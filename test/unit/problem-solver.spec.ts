import { expect } from 'chai'
import { DancingLinks, SimpleConstraint } from '../../index.js'

describe('ProblemSolver', function () {
  it('should solve a simple exact cover problem', function () {
    const dlx = new DancingLinks<number>()
    const solver = dlx.createSolver({ columns: 3 })

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
    const dlx = new DancingLinks<number>()
    const solver = dlx.createSolver({ columns: 3 })

    const result = solver
      .addBinaryConstraint(0, [1, 0, 0])
      .addBinaryConstraint(1, [0, 1, 0])
      .addBinaryConstraint(2, [0, 0, 1])

    expect(result).to.equal(solver)
  })

  it('should support findOne, findAll, and find with specific count', function () {
    const dlx = new DancingLinks<number>()
    const solver = dlx.createSolver({ columns: 3 })

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

  it('should process identical constraints across different solvers', function () {
    const dlx = new DancingLinks<string>()

    const constraint1 = { data: 'test1', row: [1, 0, 1] as (0 | 1)[] }
    const constraint2 = { data: 'test2', row: [1, 0, 1] as (0 | 1)[] }

    const solver1 = dlx.createSolver({ columns: 3 })
    const solver2 = dlx.createSolver({ columns: 3 })

    solver1.addBinaryConstraint(constraint1.data, constraint1.row)
    solver2.addBinaryConstraint(constraint2.data, constraint2.row)

    expect(() => solver1.findAll()).to.not.throw()
    expect(() => solver2.findAll()).to.not.throw()
  })
})