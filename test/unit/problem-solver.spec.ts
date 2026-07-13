import { expect } from 'chai'
import { DancingLinks } from '../../index.js'
import type { SimpleConstraint } from '../../index.js'
import { search } from '../../lib/core/algorithm.js'
import { ProblemBuilder } from '../../lib/core/problem-builder.js'

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

  it('should preserve behavior when the matrix requires 32-bit indices', function () {
    this.timeout(10_000)

    const solver = new DancingLinks<number>().createSolver({ columns: 1 })
    const constraints = Array.from({ length: 65_536 }, (_, data) => ({
      data,
      columnIndices: [0]
    }))

    solver.addSparseConstraints(constraints)

    // The column length itself exceeds Uint16 capacity, so this exercises both
    // the node-index and column-length fallbacks rather than only the threshold.
    const solutions = solver.findOne()
    expect(solutions).to.have.length(1)
    expect(solutions[0]).to.have.length(1)
  })

  it('should preserve row data when only row indices require 32 bits', function () {
    this.timeout(10_000)

    const solver = new DancingLinks<number>().createSolver({ columns: 1 })
    const constraints = Array.from({ length: 65_536 }, (_, data) => ({
      data,
      columnIndices: [] as number[]
    }))
    constraints.push({ data: 65_536, columnIndices: [0] })

    const context = ProblemBuilder.buildContext({
      numPrimary: 1,
      numSecondary: 0,
      rows: constraints.map(({ data, columnIndices }) => ({ coveredColumns: columnIndices, data }))
    })
    // A high row index no longer widens unrelated node and column domains. Only
    // rowIndex needs Int32, while navigation and metadata remain compact.
    expect(context.nodes.rowIndex).to.be.instanceOf(Int32Array)
    for (const view of [
      context.nodes.up,
      context.nodes.down,
      context.nodes.col,
      context.nodes.rowStart,
      context.columns.len,
      context.columns.prev,
      context.columns.next
    ]) {
      expect(view).to.be.instanceOf(Uint16Array)
    }

    solver.addSparseConstraints(constraints)

    // Empty rows add no nodes, so this crosses only the row-index boundary.
    // The selected row must still point at its high-index input payload.
    const solutions = solver.findOne()
    expect(solutions).to.have.length(1)
    expect(solutions[0]).to.deep.equal([{ index: 65_536, data: 65_536 }])
  })

  it('should align independently widened node and row index views', function () {
    this.timeout(10_000)

    // One empty row followed by 65,535 single-node rows creates an odd 65,537
    // node count and a row index of 65,535. The mixed 32/16/32-bit layout needs
    // padding between col and rowIndex, so this also guards the shared buffer's
    // alignment fallback rather than testing only even-sized cutoff matrices.
    const rows = Array.from({ length: 65_536 }, (_, data) => ({
      coveredColumns: data === 0 ? [] : [0],
      data
    }))
    const context = ProblemBuilder.buildContext({ numPrimary: 1, numSecondary: 0, rows })

    expect(context.nodes.size).to.equal(65_537)
    expect(context.nodes.up).to.be.instanceOf(Int32Array)
    expect(context.nodes.down).to.be.instanceOf(Int32Array)
    expect(context.nodes.rowStart).to.be.instanceOf(Int32Array)
    expect(context.nodes.col).to.be.instanceOf(Uint16Array)
    expect(context.nodes.rowIndex).to.be.instanceOf(Int32Array)
    expect(context.nodes.rowIndex[65_536]).to.equal(65_535)
  })

  it('should widen column IDs before the Uint16 sentinel becomes a valid ID', function () {
    this.timeout(10_000)

    const context = ProblemBuilder.buildContext({
      numPrimary: 65_535,
      numSecondary: 0,
      rows: [{ coveredColumns: [65_534], data: 'highest-column' }]
    })

    // Root + 65,535 columns makes 65,535 a real header index, so col must
    // widen instead of confusing that value with Uint16's reserved sentinel.
    // The odd node count also exercises padding before the 32-bit rowStart view.
    expect(context.nodes.size).to.equal(65_537)
    expect(context.nodes.col).to.be.instanceOf(Int32Array)
    expect(context.nodes.col[65_536]).to.equal(65_535)
    expect(context.nodes.rowIndex).to.be.instanceOf(Uint16Array)
    expect(context.nodes.rowStart).to.be.instanceOf(Int32Array)
    expect(context.nodes.rowStart[0]).to.equal(65_536)
    expect(context.nodes.rowStart[1]).to.equal(65_537)
  })

  it('should search the highest node on both sides of the storage-width cutoff', function () {
    this.timeout(10_000)

    const padding = Array.from({ length: 64 }, (_, column) => column).filter(column => column !== 1)

    for (const nodeCount of [65_535, 65_536] as const) {
      const rows = Array.from({ length: 1_038 }, (_, data) => ({
        coveredColumns: padding,
        data
      }))
      rows.push({ coveredColumns: padding.slice(0, nodeCount === 65_535 ? 12 : 13), data: 1_038 })
      rows.push({ coveredColumns: [...padding, 1], data: 1_039 })

      const context = ProblemBuilder.buildContext({
        numPrimary: 64,
        numSecondary: 0,
        rows
      })
      const ExpectedNodeIndexArray = nodeCount === 65_535 ? Uint16Array : Int32Array
      const views: Array<
        [
          Int32Array<ArrayBufferLike> | Uint16Array<ArrayBufferLike>,
          typeof Int32Array | typeof Uint16Array
        ]
      > = [
        [context.nodes.up, ExpectedNodeIndexArray],
        [context.nodes.down, ExpectedNodeIndexArray],
        [context.nodes.col, Uint16Array],
        [context.nodes.rowIndex, Uint16Array],
        [context.nodes.rowStart, ExpectedNodeIndexArray],
        [context.columns.len, ExpectedNodeIndexArray],
        [context.columns.prev, ExpectedNodeIndexArray],
        [context.columns.next, ExpectedNodeIndexArray]
      ]
      for (const [view, ExpectedArray] of views) {
        expect(view instanceof ExpectedArray).to.equal(true)
      }

      const clonedContext = ProblemBuilder.cloneContext(context)
      expect(clonedContext.nodes.up).to.not.equal(context.nodes.up)
      expect(clonedContext.nodes.down).to.not.equal(context.nodes.down)
      expect(clonedContext.nodes.col).to.equal(context.nodes.col)
      expect(clonedContext.nodes.rowIndex).to.equal(context.nodes.rowIndex)
      expect(clonedContext.nodes.rowStart).to.equal(context.nodes.rowStart)
      const clonedViews = [
        clonedContext.nodes.up,
        clonedContext.nodes.down,
        clonedContext.nodes.col,
        clonedContext.nodes.rowIndex,
        clonedContext.nodes.rowStart,
        clonedContext.columns.len,
        clonedContext.columns.prev,
        clonedContext.columns.next
      ]
      for (let i = 0; i < views.length; i++) {
        expect(clonedViews[i]!.constructor).to.equal(views[i]![0].constructor)
      }

      // Primary column 1 has header index 2 and only the terminal row. Keeping
      // its node last proves search traverses index 65,534/65,535, rather than
      // merely allocating the width-specific store without exercising it.
      expect(context.nodes.size).to.equal(nodeCount)
      expect(context.nodes.down[2]).to.equal(nodeCount - 1)
      expect(search(clonedContext, Infinity)).to.deep.equal([[{ index: 1_039, data: 1_039 }]])
      // Search through the public batch-ingestion path as well as inspecting the
      // direct builder context, so the fallback test covers the same behavior
      // users and the end-to-end width benchmarks execute.
      const solver = new DancingLinks<number>().createSolver({ columns: 64 })
      solver.addSparseConstraints(
        rows.map(({ coveredColumns, data }) => ({ columnIndices: coveredColumns, data }))
      )
      const solutions = solver.findAll()
      expect(solutions).to.deep.equal([[{ index: 1_039, data: 1_039 }]])
    }
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

    it('should resume after a solution found at the root search level', function () {
      const solver = new DancingLinks<string>().createSolver({ columns: 1 })
      solver.addSparseConstraints([
        { data: 'first', columnIndices: [0] },
        { data: 'second', columnIndices: [0] }
      ])

      // Both solutions are direct choices in the root column. The resumable
      // search must recover the first row before advancing to the second.
      expect([...solver.createGenerator()]).to.deep.equal([
        [{ index: 0, data: 'first' }],
        [{ index: 1, data: 'second' }]
      ])
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
