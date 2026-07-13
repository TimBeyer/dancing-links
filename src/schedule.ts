import { DancingLinks } from 'dancing-links'

export interface NavigationNode {
  readonly id: number
  readonly x: number
  readonly y: number
}

export interface NavigationEdge {
  readonly id: string
  readonly a: number
  readonly b: number
}

export interface NavigationGraph {
  readonly nodes: readonly NavigationNode[]
  readonly edges: readonly NavigationEdge[]
}

export interface GuardState {
  readonly id: string
  readonly node: number
}

export interface ScheduleDuty {
  readonly id: string
  readonly node: number
  readonly slot: number
  readonly source: 'routine' | 'player'
}

export interface RoutePlan {
  readonly id: string
  readonly guardId: string
  /** Includes the guard's current node at index zero. */
  readonly nodes: readonly number[]
  readonly coveredDutyIds: readonly string[]
}

export interface NextMoveWeight {
  readonly node: number
  readonly count: number
  readonly probability: number
}

export interface ExactScheduleResult {
  readonly solutions: readonly (readonly RoutePlan[])[]
  readonly nextMoves: Readonly<Record<string, readonly NextMoveWeight[]>>
  readonly sampledSolutions: number
  /** True means search stopped at the limit, so more solutions may exist. */
  readonly solutionLimitReached: boolean
  readonly candidateRoutes: number
  readonly solveMs: number
}

export interface ScheduleResult extends ExactScheduleResult {
  readonly recovery: 'none' | 'dropped-player-duty' | 'dropped-routine-duty'
  readonly droppedDutyIds: readonly string[]
}

export interface ScheduleInput {
  readonly graph: NavigationGraph
  readonly guards: readonly GuardState[]
  readonly duties?: readonly ScheduleDuty[]
  readonly blockedEdgeIds?: ReadonlySet<string>
  readonly horizon?: number
  readonly maxSolutions?: number
  readonly maxRoutesPerGuard?: number
  readonly random?: () => number
}

interface RouteConstraint {
  readonly data: RoutePlan
  readonly columnIndices: {
    readonly primary: number[]
    readonly secondary: number[]
  }
}

interface Neighbor {
  readonly node: number
  readonly edgeIndex: number
  readonly edgeId: string
}

const DEFAULT_HORIZON = 4
const DEFAULT_MAX_SOLUTIONS = 128
const DEFAULT_MAX_ROUTES_PER_GUARD = 384

/**
 * Solve the guards' complete joint future as an exact-cover problem.
 *
 * Primary columns choose exactly one route per guard and service each duty
 * exactly once. Secondary columns reserve node/time and undirected edge/time
 * pairs at most once, preventing guards from overlapping or crossing through
 * one another between planning beats.
 */
export function solveExactSchedule(input: ScheduleInput): ExactScheduleResult {
  const startedAt = performance.now()
  const horizon = input.horizon ?? DEFAULT_HORIZON
  const maxSolutions = input.maxSolutions ?? DEFAULT_MAX_SOLUTIONS
  const maxRoutes = input.maxRoutesPerGuard ?? DEFAULT_MAX_ROUTES_PER_GUARD
  const duties = input.duties ?? []
  const random = input.random ?? Math.random

  validateInput(input, horizon, maxSolutions, maxRoutes)

  const nodeIndex = new Map(input.graph.nodes.map((node, index) => [node.id, index]))
  const edgeIndex = new Map(input.graph.edges.map((edge, index) => [edge.id, index]))
  const adjacency = createAdjacency(input.graph, input.blockedEdgeIds ?? new Set<string>())
  const constraints: RouteConstraint[] = []

  for (let guardIndex = 0; guardIndex < input.guards.length; guardIndex += 1) {
    const guard = input.guards[guardIndex]
    if (!guard) continue

    const plans = enumerateRoutes(guard, adjacency, duties, horizon, maxRoutes, random)
    for (const plan of plans) {
      const primary = [guardIndex]
      for (let dutyIndex = 0; dutyIndex < duties.length; dutyIndex += 1) {
        const duty = duties[dutyIndex]
        if (duty && plan.nodes[duty.slot] === duty.node) {
          primary.push(input.guards.length + dutyIndex)
        }
      }

      const secondary: number[] = []
      for (let slot = 1; slot <= horizon; slot += 1) {
        const currentNode = plan.nodes[slot]
        const previousNode = plan.nodes[slot - 1]
        if (currentNode === undefined || previousNode === undefined) continue

        const currentIndex = nodeIndex.get(currentNode)
        if (currentIndex === undefined) continue
        secondary.push((slot - 1) * input.graph.nodes.length + currentIndex)

        if (currentNode !== previousNode) {
          const traversedEdge = findEdge(adjacency, previousNode, currentNode)
          const traversedIndex = traversedEdge ? edgeIndex.get(traversedEdge.edgeId) : undefined
          if (traversedIndex !== undefined) {
            secondary.push(
              input.graph.nodes.length * horizon +
                (slot - 1) * input.graph.edges.length +
                traversedIndex
            )
          }
        }
      }

      constraints.push({ data: plan, columnIndices: { primary, secondary } })
    }
  }

  const dlx = new DancingLinks<RoutePlan>()
  const solver = dlx.createSolver({
    primaryColumns: input.guards.length + duties.length,
    secondaryColumns: horizon * input.graph.nodes.length + horizon * input.graph.edges.length
  })

  // Route rows are already validated while they are built. Feeding the sparse
  // rows as one batch avoids dense zero-filled matrices and repeated public API
  // calls; that is the published library's fastest normal ingestion path.
  solver.addSparseConstraints(constraints)
  const rawSolutions = solver.find(maxSolutions)
  const guardOrder = new Map(input.guards.map((guard, index) => [guard.id, index]))
  const solutions = rawSolutions.map(solution =>
    solution
      .map(result => result.data)
      .sort((a, b) => (guardOrder.get(a.guardId) ?? 0) - (guardOrder.get(b.guardId) ?? 0))
  )

  return {
    solutions,
    nextMoves: summarizeNextMoves(input.guards, solutions),
    sampledSolutions: solutions.length,
    solutionLimitReached: solutions.length === maxSolutions,
    candidateRoutes: constraints.length,
    solveMs: performance.now() - startedAt
  }
}

/**
 * Keep a bad player input from breaking the real-time loop.
 *
 * The ordinary case performs exactly one solve. Only after a contradiction do
 * we retry, newest player duties first, and report every removed duty so the UI
 * can fizzle/refund it. If the fixed patrol itself is contradictory, routine
 * duties are removed as a final safety valve while collision constraints and
 * one-route-per-guard remain intact.
 */
export function createSchedule(input: ScheduleInput): ScheduleResult {
  let totalSolveMs = 0
  let result = solveExactSchedule(input)
  totalSolveMs += result.solveMs
  if (result.solutions.length > 0) {
    return withRecovery(result, 'none', [], totalSolveMs)
  }

  const duties = [...(input.duties ?? [])]
  const droppedDutyIds: string[] = []
  for (let index = duties.length - 1; index >= 0; index -= 1) {
    const duty = duties[index]
    if (!duty || duty.source !== 'player') continue

    duties.splice(index, 1)
    droppedDutyIds.push(duty.id)
    result = solveExactSchedule({ ...input, duties })
    totalSolveMs += result.solveMs
    if (result.solutions.length > 0) {
      return withRecovery(result, 'dropped-player-duty', droppedDutyIds, totalSolveMs)
    }
  }

  const routineDutyIds = duties.filter(duty => duty.source === 'routine').map(duty => duty.id)
  result = solveExactSchedule({ ...input, duties: [] })
  totalSolveMs += result.solveMs
  return withRecovery(
    result,
    'dropped-routine-duty',
    [...droppedDutyIds, ...routineDutyIds],
    totalSolveMs
  )
}

function withRecovery(
  result: ExactScheduleResult,
  recovery: ScheduleResult['recovery'],
  droppedDutyIds: readonly string[],
  solveMs: number
): ScheduleResult {
  return { ...result, recovery, droppedDutyIds, solveMs }
}

function validateInput(
  input: ScheduleInput,
  horizon: number,
  maxSolutions: number,
  maxRoutes: number
): void {
  if (input.guards.length === 0) throw new Error('At least one guard is required')
  if (!Number.isInteger(horizon) || horizon < 1)
    throw new Error('Horizon must be a positive integer')
  if (!Number.isInteger(maxSolutions) || maxSolutions < 1) {
    throw new Error('maxSolutions must be a positive integer')
  }
  if (!Number.isInteger(maxRoutes) || maxRoutes < 1) {
    throw new Error('maxRoutesPerGuard must be a positive integer')
  }

  const nodeIds = new Set(input.graph.nodes.map(node => node.id))
  const guardIds = new Set<string>()
  const occupiedNodes = new Set<number>()
  for (const guard of input.guards) {
    if (!nodeIds.has(guard.node)) throw new Error(`Guard ${guard.id} starts outside the graph`)
    if (guardIds.has(guard.id)) throw new Error(`Duplicate guard id: ${guard.id}`)
    if (occupiedNodes.has(guard.node)) throw new Error('Guards must start on distinct nodes')
    guardIds.add(guard.id)
    occupiedNodes.add(guard.node)
  }

  const dutyIds = new Set<string>()
  for (const duty of input.duties ?? []) {
    if (!nodeIds.has(duty.node)) throw new Error(`Duty ${duty.id} is outside the graph`)
    if (duty.slot < 1 || duty.slot > horizon) {
      throw new Error(`Duty ${duty.id} falls outside the planning horizon`)
    }
    if (dutyIds.has(duty.id)) throw new Error(`Duplicate duty id: ${duty.id}`)
    dutyIds.add(duty.id)
  }
}

function createAdjacency(
  graph: NavigationGraph,
  blockedEdgeIds: ReadonlySet<string>
): ReadonlyMap<number, readonly Neighbor[]> {
  const adjacency = new Map<number, Neighbor[]>()
  for (const node of graph.nodes) adjacency.set(node.id, [])

  for (let index = 0; index < graph.edges.length; index += 1) {
    const edge = graph.edges[index]
    if (!edge || blockedEdgeIds.has(edge.id)) continue
    adjacency.get(edge.a)?.push({ node: edge.b, edgeIndex: index, edgeId: edge.id })
    adjacency.get(edge.b)?.push({ node: edge.a, edgeIndex: index, edgeId: edge.id })
  }
  return adjacency
}

function enumerateRoutes(
  guard: GuardState,
  adjacency: ReadonlyMap<number, readonly Neighbor[]>,
  duties: readonly ScheduleDuty[],
  horizon: number,
  maxRoutes: number,
  random: () => number
): RoutePlan[] {
  const paths: number[][] = []
  const path = [guard.node]

  const visit = (slot: number): void => {
    if (paths.length >= maxRoutes) return
    if (slot > horizon) {
      paths.push([...path])
      return
    }

    const current = path[path.length - 1]
    if (current === undefined) return
    const previous = path[path.length - 2]
    let options = [...(adjacency.get(current) ?? [])]

    // Immediate reversals add many visually redundant A-B-A futures. When
    // another exit exists, omitting them shrinks the row set before DLX sees it;
    // dead ends retain reversal so route generation never strands a guard.
    if (previous !== undefined && previous !== current && options.length > 1) {
      options = options.filter(option => option.node !== previous)
    }

    shuffleInPlace(options, random)
    const justWaited = previous === current
    if (!justWaited || options.length === 0) {
      options.push({ node: current, edgeIndex: -1, edgeId: '' })
    }

    for (const option of options) {
      path.push(option.node)
      visit(slot + 1)
      path.pop()
      if (paths.length >= maxRoutes) break
    }
  }

  visit(1)

  const holdingPath = Array.from({ length: horizon + 1 }, () => guard.node)
  if (!paths.some(candidate => candidate.every((node, index) => node === holdingPath[index]))) {
    paths.push(holdingPath)
  }

  // Numeric ids and indices are carried through the hot path. Avoiding string
  // parsing and lookup objects per time slot materially reduces allocation when
  // the schedule is rebuilt every beat.
  return paths.map((nodes, routeIndex) => {
    const coveredDutyIds = duties
      .filter(duty => nodes[duty.slot] === duty.node)
      .map(duty => duty.id)
    return {
      id: `${guard.id}:${routeIndex}`,
      guardId: guard.id,
      nodes,
      coveredDutyIds
    }
  })
}

function shuffleInPlace<T>(items: T[], random: () => number): void {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    const item = items[index]
    const replacement = items[other]
    if (item === undefined || replacement === undefined) continue
    items[index] = replacement
    items[other] = item
  }
}

function findEdge(
  adjacency: ReadonlyMap<number, readonly Neighbor[]>,
  from: number,
  to: number
): Neighbor | undefined {
  return adjacency.get(from)?.find(neighbor => neighbor.node === to)
}

function summarizeNextMoves(
  guards: readonly GuardState[],
  solutions: readonly (readonly RoutePlan[])[]
): Readonly<Record<string, readonly NextMoveWeight[]>> {
  const summary: Record<string, NextMoveWeight[]> = {}
  for (const guard of guards) {
    const counts = new Map<number, number>()
    for (const solution of solutions) {
      const plan = solution.find(candidate => candidate.guardId === guard.id)
      const next = plan?.nodes[1]
      if (next !== undefined) counts.set(next, (counts.get(next) ?? 0) + 1)
    }
    summary[guard.id] = [...counts]
      .map(([node, count]) => ({
        node,
        count,
        probability: solutions.length === 0 ? 0 : count / solutions.length
      }))
      .sort((a, b) => b.count - a.count)
  }
  return summary
}
