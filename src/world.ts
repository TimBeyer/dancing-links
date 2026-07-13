import type { NavigationEdge, NavigationGraph, NavigationNode } from './schedule.js'

export const WORLD_WIDTH = 1200
export const WORLD_HEIGHT = 720

export interface Rectangle {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly title: string
  readonly accent: string
}

const nodes: NavigationNode[] = [
  { id: 0, x: 80, y: 90 },
  { id: 1, x: 340, y: 90 },
  { id: 2, x: 600, y: 90 },
  { id: 3, x: 860, y: 90 },
  { id: 4, x: 1120, y: 90 },
  { id: 5, x: 80, y: 360 },
  { id: 6, x: 340, y: 360 },
  { id: 7, x: 600, y: 360 },
  { id: 8, x: 860, y: 360 },
  { id: 9, x: 1120, y: 360 },
  { id: 10, x: 80, y: 630 },
  { id: 11, x: 340, y: 630 },
  { id: 12, x: 600, y: 630 },
  { id: 13, x: 860, y: 630 },
  { id: 14, x: 1120, y: 630 }
]

function edge(a: number, b: number): NavigationEdge {
  return { id: `${Math.min(a, b)}-${Math.max(a, b)}`, a, b }
}

const edges: NavigationEdge[] = [
  edge(0, 1),
  edge(1, 2),
  edge(2, 3),
  edge(3, 4),
  edge(5, 6),
  edge(6, 7),
  edge(7, 8),
  edge(8, 9),
  edge(10, 11),
  edge(11, 12),
  edge(12, 13),
  edge(13, 14),
  edge(0, 5),
  edge(5, 10),
  edge(1, 6),
  edge(6, 11),
  edge(2, 7),
  edge(7, 12),
  edge(3, 8),
  edge(8, 13),
  edge(4, 9),
  edge(9, 14)
]

export const GAME_GRAPH: NavigationGraph = { nodes, edges }

export const EXHIBITS: readonly Rectangle[] = [
  { x: 145, y: 165, width: 130, height: 120, title: 'RED STUDY', accent: '#ff546f' },
  { x: 405, y: 165, width: 130, height: 120, title: 'GLASS MEMORY', accent: '#65e8ff' },
  { x: 665, y: 165, width: 130, height: 120, title: 'FALSE SUN', accent: '#ffd36b' },
  { x: 925, y: 165, width: 130, height: 120, title: 'VOID / 7', accent: '#c780ff' },
  { x: 145, y: 435, width: 130, height: 120, title: 'BLUE NOISE', accent: '#65e8ff' },
  { x: 405, y: 435, width: 130, height: 120, title: 'AFTERIMAGE', accent: '#c780ff' },
  { x: 665, y: 435, width: 130, height: 120, title: 'SOFT MACHINE', accent: '#ff546f' },
  { x: 925, y: 435, width: 130, height: 120, title: 'NIGHT BLOOM', accent: '#ffd36b' }
]

export const DOOR_EDGE_IDS = ['1-2', '6-7', '7-8', '12-13'] as const
export const ROUTINE_NODES = [2, 6, 8, 12, 3, 11, 7, 9, 1, 13] as const
export const ENTRY_NODE = 10
export const VAULT_NODE = 4

// These maps are created once because rendering, hit-testing, and patrol
// interpolation all query them every frame. Rebuilding either map at 60 fps
// would repeat identical array scans without changing gameplay behavior.
export const NODE_BY_ID = new Map(GAME_GRAPH.nodes.map(node => [node.id, node]))
export const EDGE_BY_ID = new Map(GAME_GRAPH.edges.map(item => [item.id, item]))

export function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

export function nearestNode(x: number, y: number): NavigationNode {
  let nearest = GAME_GRAPH.nodes[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const node of GAME_GRAPH.nodes) {
    const candidateDistance = distanceSquared(x, y, node.x, node.y)
    if (candidateDistance < bestDistance) {
      nearest = node
      bestDistance = candidateDistance
    }
  }
  if (!nearest) throw new Error('The museum requires at least one patrol node')
  return nearest
}

export function lineOfSightClear(ax: number, ay: number, bx: number, by: number): boolean {
  return !EXHIBITS.some(obstacle => segmentIntersectsRectangle(ax, ay, bx, by, obstacle, 5))
}

export function moveWithCollisions(
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius: number
): { x: number; y: number } {
  let nextX = clamp(x + dx, 34 + radius, WORLD_WIDTH - 34 - radius)
  if (EXHIBITS.some(obstacle => circleIntersectsRectangle(nextX, y, radius, obstacle))) {
    nextX = x
  }

  let nextY = clamp(y + dy, 34 + radius, WORLD_HEIGHT - 34 - radius)
  if (EXHIBITS.some(obstacle => circleIntersectsRectangle(nextX, nextY, radius, obstacle))) {
    nextY = y
  }
  return { x: nextX, y: nextY }
}

function circleIntersectsRectangle(
  x: number,
  y: number,
  radius: number,
  rectangle: Rectangle
): boolean {
  const nearestX = clamp(x, rectangle.x, rectangle.x + rectangle.width)
  const nearestY = clamp(y, rectangle.y, rectangle.y + rectangle.height)
  return distanceSquared(x, y, nearestX, nearestY) < radius * radius
}

function segmentIntersectsRectangle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  rectangle: Rectangle,
  padding: number
): boolean {
  const left = rectangle.x - padding
  const right = rectangle.x + rectangle.width + padding
  const top = rectangle.y - padding
  const bottom = rectangle.y + rectangle.height + padding

  return (
    segmentsIntersect(ax, ay, bx, by, left, top, right, top) ||
    segmentsIntersect(ax, ay, bx, by, right, top, right, bottom) ||
    segmentsIntersect(ax, ay, bx, by, right, bottom, left, bottom) ||
    segmentsIntersect(ax, ay, bx, by, left, bottom, left, top)
  )
}

function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): boolean {
  const denominator = (ax - bx) * (cy - dy) - (ay - by) * (cx - dx)
  if (Math.abs(denominator) < 0.0001) return false
  const t = ((ax - cx) * (cy - dy) - (ay - cy) * (cx - dx)) / denominator
  const u = -((ax - bx) * (ay - cy) - (ay - by) * (ax - cx)) / denominator
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}
