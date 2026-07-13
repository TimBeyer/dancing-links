import { expect } from 'chai'
import {
  createSchedule,
  solveExactSchedule,
  type NavigationGraph,
  type ScheduleInput
} from '../../src/schedule.js'

const lineGraph: NavigationGraph = {
  nodes: [
    { id: 0, x: 0, y: 0 },
    { id: 1, x: 1, y: 0 },
    { id: 2, x: 2, y: 0 }
  ],
  edges: [
    { id: '0-1', a: 0, b: 1 },
    { id: '1-2', a: 1, b: 2 }
  ]
}

const baseInput: ScheduleInput = {
  graph: lineGraph,
  guards: [
    { id: 'amber', node: 0 },
    { id: 'violet', node: 2 }
  ],
  horizon: 1,
  maxSolutions: 32,
  random: () => 0.5
}

describe('real-time patrol scheduling', () => {
  it('chooses exactly one route per guard and services a duty once', () => {
    const result = solveExactSchedule({
      ...baseInput,
      duties: [{ id: 'noise', node: 1, slot: 1, source: 'player' }]
    })

    expect(result.solutions.length).to.be.greaterThan(0)
    for (const solution of result.solutions) {
      expect(solution.map(plan => plan.guardId)).to.have.members(['amber', 'violet'])
      expect(solution.filter(plan => plan.nodes[1] === 1)).to.have.length(1)
      expect(solution.flatMap(plan => plan.coveredDutyIds)).to.deep.equal(['noise'])
    }
  })

  it('uses edge/time constraints to prevent head-on swaps', () => {
    const graph: NavigationGraph = {
      nodes: [
        { id: 0, x: 0, y: 0 },
        { id: 1, x: 1, y: 0 }
      ],
      edges: [{ id: 'door', a: 0, b: 1 }]
    }
    const result = solveExactSchedule({
      graph,
      guards: [
        { id: 'left', node: 0 },
        { id: 'right', node: 1 }
      ],
      horizon: 1,
      maxSolutions: 16,
      random: () => 0.5
    })

    for (const solution of result.solutions) {
      const left = solution.find(plan => plan.guardId === 'left')
      const right = solution.find(plan => plan.guardId === 'right')
      expect(left?.nodes[1] === 1 && right?.nodes[1] === 0).to.equal(false)
    }
  })

  it('removes jammed edges before candidate routes reach the solver', () => {
    const result = solveExactSchedule({
      graph: lineGraph,
      guards: [{ id: 'amber', node: 0 }],
      blockedEdgeIds: new Set(['0-1']),
      horizon: 2,
      maxSolutions: 16,
      random: () => 0.5
    })

    expect(result.solutions.length).to.be.greaterThan(0)
    for (const solution of result.solutions) {
      expect(solution[0]?.nodes).to.deep.equal([0, 0, 0])
    }
  })

  it('reports a contradiction when a required duty is unreachable', () => {
    const result = solveExactSchedule({
      graph: lineGraph,
      guards: [{ id: 'amber', node: 0 }],
      blockedEdgeIds: new Set(['0-1']),
      duties: [{ id: 'impossible', node: 1, slot: 1, source: 'player' }],
      horizon: 1,
      random: () => 0.5
    })

    expect(result.solutions).to.have.length(0)
  })

  it('drops and reports an impossible player duty, preserving a playable patrol', () => {
    const result = createSchedule({
      graph: lineGraph,
      guards: [{ id: 'amber', node: 0 }],
      blockedEdgeIds: new Set(['0-1']),
      duties: [{ id: 'bad-throw', node: 1, slot: 1, source: 'player' }],
      horizon: 1,
      random: () => 0.5
    })

    expect(result.recovery).to.equal('dropped-player-duty')
    expect(result.droppedDutyIds).to.deep.equal(['bad-throw'])
    expect(result.solutions.length).to.be.greaterThan(0)
  })

  it('separately identifies the non-identical routine-duty fallback', () => {
    const result = createSchedule({
      graph: lineGraph,
      guards: [{ id: 'amber', node: 0 }],
      blockedEdgeIds: new Set(['0-1']),
      duties: [{ id: 'bad-patrol', node: 1, slot: 1, source: 'routine' }],
      horizon: 1,
      random: () => 0.5
    })

    expect(result.recovery).to.equal('dropped-routine-duty')
    expect(result.droppedDutyIds).to.deep.equal(['bad-patrol'])
    expect(result.solutions[0]?.[0]?.nodes).to.deep.equal([0, 0])
  })

  it('labels a full sample without claiming that it is the exhaustive count', () => {
    const result = solveExactSchedule({ ...baseInput, maxSolutions: 1 })

    expect(result.sampledSolutions).to.equal(1)
    expect(result.solutionLimitReached).to.equal(true)
  })
})
