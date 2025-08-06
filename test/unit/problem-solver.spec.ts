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

  describe('Generator Interface', function () {
    it('should yield solutions that match findAll() results', function () {
      const dlx = new DancingLinks<number>()
      const solver = dlx.createSolver({ columns: 3 })

      solver
        .addBinaryConstraint(0, [1, 0, 0])
        .addBinaryConstraint(1, [0, 1, 0])
        .addBinaryConstraint(2, [0, 0, 1])
        .addBinaryConstraint(3, [1, 0, 1])

      const allSolutions = solver.findAll()
      const generatorSolutions = []

      for (const solution of solver.createGenerator()) {
        generatorSolutions.push(solution)
      }

      expect(generatorSolutions).to.have.length(2)

      const normalizeAndSort = (solutions: typeof allSolutions) =>
        solutions
          .map(solution => solution.map(r => r.data).sort())
          .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))

      expect(normalizeAndSort(generatorSolutions)).to.deep.equal(normalizeAndSort(allSolutions))
    })

    it('should support early termination', function () {
      const dlx = new DancingLinks<number>()
      const solver = dlx.createSolver({ columns: 3 })

      solver
        .addBinaryConstraint(0, [1, 0, 0])
        .addBinaryConstraint(1, [0, 1, 0])
        .addBinaryConstraint(2, [0, 0, 1])
        .addBinaryConstraint(3, [1, 0, 1])

      const solutions = []
      for (const solution of solver.createGenerator()) {
        solutions.push(solution)
        if (solutions.length === 1) break
      }

      expect(solutions).to.have.length(1)
    })

    it('should handle problems with no solutions', function () {
      const dlx = new DancingLinks<number>()
      const solver = dlx.createSolver({ columns: 2 })

      solver.addBinaryConstraint(0, [1, 0]).addBinaryConstraint(1, [1, 0])

      const solutions = []
      for (const solution of solver.createGenerator()) {
        solutions.push(solution)
      }

      expect(solutions).to.have.length(0)
    })

    it('should handle empty constraint set', function () {
      const dlx = new DancingLinks<number>()
      const solver = dlx.createSolver({ columns: 3 })

      expect(() => {
        const gen = solver.createGenerator()
        gen.next() // Generator functions are lazy, need to call next() to execute
      }).to.throw('Cannot solve problem with no constraints')
    })

    it('should create independent generators', function () {
      const dlx = new DancingLinks<number>()
      const solver = dlx.createSolver({ columns: 2 })

      solver.addBinaryConstraint(1, [1, 0]).addBinaryConstraint(2, [0, 1])

      const solutions1 = []
      for (const solution of solver.createGenerator()) {
        solutions1.push(solution)
      }

      const solutions2 = []
      for (const solution of solver.createGenerator()) {
        solutions2.push(solution)
      }

      expect(solutions1).to.have.length(1)
      expect(solutions2).to.have.length(1)

      const data1 = solutions1[0]!.map(r => r.data).sort()
      const data2 = solutions2[0]!.map(r => r.data).sort()
      expect(data1).to.deep.equal([1, 2])
      expect(data2).to.deep.equal([1, 2])
    })
  })
})
