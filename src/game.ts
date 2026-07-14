import { AudioDirector } from './audio.js'
import {
  createSchedule,
  type RoutePlan,
  type ScheduleDuty,
  type ScheduleResult
} from './schedule.js'
import {
  clamp,
  distanceSquared,
  DOOR_EDGE_IDS,
  EDGE_BY_ID,
  ENTRY_NODE,
  EXHIBITS,
  GAME_GRAPH,
  lineOfSightClear,
  moveWithCollisions,
  nearestNode,
  NODE_BY_ID,
  ROUTINE_NODES,
  VAULT_NODE,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './world.js'

interface Player {
  x: number
  y: number
  facing: number
  heat: number
  hasDossier: boolean
}

interface GuardActor {
  readonly id: string
  readonly name: string
  readonly color: string
  readonly startNode: number
  node: number
  fromNode: number
  targetNode: number
  x: number
  y: number
  facing: number
}

interface ActiveDuty extends ScheduleDuty {
  readonly createdBeat: number
}

type GameMode = 'title' | 'playing' | 'paused' | 'won' | 'lost'

const PLAYER_RADIUS = 12
const PLAYER_SPEED = 205
const ECHO_RANGE = 275
const DOOR_RANGE = 74
const MAX_ECHOES = 3
const MAX_JAMS = 2
const GUARD_VISION_RANGE = 205
const GUARD_VISION_HALF_ANGLE = 0.58
const GUARD_STARTS = [0, 9, 13] as const

export class CoverStoryGame {
  private readonly context: CanvasRenderingContext2D
  private readonly keys = new Set<string>()
  private readonly audio = new AudioDirector()
  private readonly objective = requiredElement<HTMLElement>('objective')
  private readonly objectiveDetail = requiredElement<HTMLElement>('objective-detail')
  private readonly objectiveDot = requiredElement<HTMLElement>('objective-dot')
  private readonly futureCount = requiredElement<HTMLElement>('future-count')
  private readonly solveTime = requiredElement<HTMLElement>('solve-time')
  private readonly routeCount = requiredElement<HTMLElement>('route-count')
  private readonly beatCount = requiredElement<HTMLElement>('beat-count')
  private readonly heatValue = requiredElement<HTMLElement>('heat-value')
  private readonly heatFill = requiredElement<HTMLElement>('heat-fill')
  private readonly echoCount = requiredElement<HTMLElement>('echo-count')
  private readonly jamCount = requiredElement<HTMLElement>('jam-count')
  private readonly lifeCount = requiredElement<HTMLElement>('life-count')
  private readonly toastElement = requiredElement<HTMLElement>('toast')
  private readonly overlay = requiredElement<HTMLElement>('overlay')
  private readonly overlayTitle = requiredElement<HTMLElement>('overlay-title')
  private readonly overlayCopy = requiredElement<HTMLElement>('overlay-copy')
  private readonly tutorial = requiredElement<HTMLElement>('tutorial')
  private readonly startButton = requiredElement<HTMLButtonElement>('start-button')

  private mode: GameMode = 'title'
  private player: Player = { x: 80, y: 630, facing: 0, heat: 0, hasDossier: false }
  private guards: GuardActor[] = []
  private duties: ActiveDuty[] = []
  private schedule?: ScheduleResult
  private chosenPlans = new Map<string, RoutePlan>()
  private jammedDoors = new Map<string, number>()
  private beatProgress = 0
  private beatNumber = 0
  private routineCursor = 0
  private echoCharges = MAX_ECHOES
  private jamCharges = MAX_JAMS
  private lives = 3
  private alerts = 0
  private elapsedSeconds = 0
  private lastFrame = performance.now()
  private toastUntil = 0
  private immunityUntil = 0
  private caughtFlash = 0
  private cursor = { x: 600, y: 360, inside: false }
  private lastFootstep = 0

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D is required to run Cover Story')
    this.context = context
    this.bindInput()
    this.startButton.addEventListener('click', () => {
      if (this.mode === 'paused') this.togglePause()
      else this.start()
    })
    requestAnimationFrame(time => this.frame(time))
  }

  private start(): void {
    this.audio.unlock()
    this.lives = 3
    this.alerts = 0
    this.elapsedSeconds = 0
    this.caughtFlash = 0
    this.resetPatrol()
    this.mode = 'playing'
    this.overlay.classList.add('hidden')
    this.toast('Read the futures. Move between them.', '#65e8ff')
  }

  private resetPatrol(): void {
    const entry = NODE_BY_ID.get(ENTRY_NODE)
    if (!entry) throw new Error('Missing entry node')
    this.player = { x: entry.x, y: entry.y, facing: 0, heat: 0, hasDossier: false }
    this.echoCharges = MAX_ECHOES
    this.jamCharges = MAX_JAMS
    this.beatProgress = 0
    this.beatNumber = 0
    this.routineCursor = 0
    this.duties = []
    this.jammedDoors.clear()
    this.guards = [
      this.createGuard('amber', 'AMBER', '#ffd36b', GUARD_STARTS[0]),
      this.createGuard('violet', 'VIOLET', '#c780ff', GUARD_STARTS[1]),
      this.createGuard('red', 'RED', '#ff657c', GUARD_STARTS[2])
    ]
    this.addRoutineDuty()
    this.planBeat()
    this.immunityUntil = performance.now() + 900
  }

  private createGuard(id: string, name: string, color: string, startNode: number): GuardActor {
    const node = NODE_BY_ID.get(startNode)
    if (!node) throw new Error(`Missing guard start node ${startNode}`)
    return {
      id,
      name,
      color,
      startNode,
      node: startNode,
      fromNode: startNode,
      targetNode: startNode,
      x: node.x,
      y: node.y,
      facing: 0
    }
  }

  private bindInput(): void {
    window.addEventListener('keydown', event => {
      const key = event.key.toLowerCase()
      this.keys.add(key)
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        event.preventDefault()
      }

      if (
        key === 'enter' &&
        (this.mode === 'title' || this.mode === 'won' || this.mode === 'lost')
      ) {
        this.start()
      } else if (key === 'escape' && (this.mode === 'playing' || this.mode === 'paused')) {
        this.togglePause()
      } else if (key === 'r' && this.mode !== 'title') {
        this.start()
      } else if (key === 'e' && this.mode === 'playing') {
        this.tryJamDoor()
      } else if (key === ' ' && this.mode === 'playing') {
        this.tryInteract()
      }
    })
    window.addEventListener('keyup', event => this.keys.delete(event.key.toLowerCase()))
    window.addEventListener('blur', () => this.keys.clear())

    this.canvas.addEventListener('pointermove', event => {
      this.cursor = { ...this.toWorldPosition(event), inside: true }
    })
    this.canvas.addEventListener('pointerleave', () => {
      this.cursor.inside = false
    })
    this.canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || this.mode !== 'playing') return
      this.audio.unlock()
      this.throwEcho(this.toWorldPosition(event))
    })
  }

  private toWorldPosition(event: PointerEvent): { x: number; y: number } {
    const bounds = this.canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * WORLD_WIDTH,
      y: ((event.clientY - bounds.top) / bounds.height) * WORLD_HEIGHT
    }
  }

  private togglePause(): void {
    this.mode = this.mode === 'playing' ? 'paused' : 'playing'
    if (this.mode === 'paused') {
      this.showOverlay('SIGNAL PAUSED', 'The patrol futures are frozen.', 'RESUME', false)
    } else {
      this.overlay.classList.add('hidden')
      this.lastFrame = performance.now()
    }
  }

  private frame(time: number): void {
    const delta = Math.min((time - this.lastFrame) / 1000, 0.05)
    this.lastFrame = time
    if (this.mode === 'playing') this.update(delta, time)
    this.render(time)
    this.updateHud(time)
    requestAnimationFrame(nextTime => this.frame(nextTime))
  }

  private update(delta: number, time: number): void {
    this.elapsedSeconds += delta
    this.updatePlayer(delta, time)
    this.updatePatrol(delta)
    this.updateDetection(delta, time)
    this.caughtFlash = Math.max(0, this.caughtFlash - delta * 1.8)
  }

  private updatePlayer(delta: number, time: number): void {
    let dx = 0
    let dy = 0
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1
    if (dx === 0 && dy === 0) return

    const length = Math.hypot(dx, dy)
    dx /= length
    dy /= length
    this.player.facing = Math.atan2(dy, dx)
    const next = moveWithCollisions(
      this.player.x,
      this.player.y,
      dx * PLAYER_SPEED * delta,
      dy * PLAYER_SPEED * delta,
      PLAYER_RADIUS
    )
    this.player.x = next.x
    this.player.y = next.y

    if (time - this.lastFootstep > 310) {
      this.lastFootstep = time
      this.audio.step()
    }
  }

  private updatePatrol(delta: number): void {
    const beatDuration = this.player.hasDossier ? 0.82 : 1.02
    this.beatProgress += delta / beatDuration
    const interpolation = smoothstep(clamp(this.beatProgress, 0, 1))
    for (const guard of this.guards) {
      const from = NODE_BY_ID.get(guard.fromNode)
      const target = NODE_BY_ID.get(guard.targetNode)
      if (!from || !target) continue
      guard.x = from.x + (target.x - from.x) * interpolation
      guard.y = from.y + (target.y - from.y) * interpolation
      if (from.id !== target.id) guard.facing = Math.atan2(target.y - from.y, target.x - from.x)
    }

    if (this.beatProgress < 1) return
    for (const guard of this.guards) {
      guard.node = guard.targetNode
      guard.fromNode = guard.node
      const node = NODE_BY_ID.get(guard.node)
      if (node) {
        guard.x = node.x
        guard.y = node.y
      }
    }

    this.advanceDuties()
    this.advanceDoorJams()
    this.beatNumber += 1
    if (!this.duties.some(duty => duty.source === 'routine')) this.addRoutineDuty()
    this.planBeat()
  }

  private advanceDuties(): void {
    const remaining: ActiveDuty[] = []
    for (const duty of this.duties) {
      if (duty.slot === 1) continue
      remaining.push({ ...duty, slot: duty.slot - 1 })
    }
    this.duties = remaining
  }

  private advanceDoorJams(): void {
    for (const [edgeId, beats] of this.jammedDoors) {
      if (beats <= 1) this.jammedDoors.delete(edgeId)
      else this.jammedDoors.set(edgeId, beats - 1)
    }
  }

  private addRoutineDuty(): void {
    const node = ROUTINE_NODES[this.routineCursor % ROUTINE_NODES.length]
    this.routineCursor += 1
    if (node === undefined) return
    this.duties.push({
      id: `routine-${this.beatNumber}-${this.routineCursor}`,
      node,
      slot: 3,
      source: 'routine',
      createdBeat: this.beatNumber
    })
  }

  private planBeat(): void {
    const result = createSchedule({
      graph: GAME_GRAPH,
      guards: this.guards.map(guard => ({ id: guard.id, node: guard.node })),
      duties: this.duties,
      blockedEdgeIds: new Set(this.jammedDoors.keys()),
      horizon: 4,
      maxSolutions: 128,
      maxRoutesPerGuard: 384
    })
    this.schedule = result
    this.beatProgress = 0

    if (result.droppedDutyIds.length > 0) this.recoverDroppedDuties(result)
    const selected = result.solutions[Math.floor(Math.random() * result.solutions.length)]
    if (!selected) throw new Error('The route-only patrol must always have a solution')
    this.chosenPlans = new Map(selected.map(plan => [plan.guardId, plan]))
    for (const guard of this.guards) {
      guard.fromNode = guard.node
      guard.targetNode = this.chosenPlans.get(guard.id)?.nodes[1] ?? guard.node
    }
  }

  private recoverDroppedDuties(result: ScheduleResult): void {
    const dropped = new Set(result.droppedDutyIds)
    let refundedEchoes = 0
    for (const duty of this.duties) {
      if (dropped.has(duty.id) && duty.source === 'player') refundedEchoes += 1
    }
    this.duties = this.duties.filter(duty => !dropped.has(duty.id))
    this.echoCharges = Math.min(MAX_ECHOES, this.echoCharges + refundedEchoes)
    if (result.recovery === 'dropped-player-duty') {
      this.toast('No valid patrol could hear that echo — charge refunded.', '#ffd36b')
    } else {
      this.toast('Patrol directive contradicted. Autonomous routes restored.', '#ff657c')
    }
  }

  private throwEcho(position: { x: number; y: number }): void {
    if (this.echoCharges <= 0) {
      this.toast('No echo charges left.', '#ff657c')
      return
    }
    if (distanceSquared(this.player.x, this.player.y, position.x, position.y) > ECHO_RANGE ** 2) {
      this.toast('That patrol node is out of throwing range.', '#ffd36b')
      return
    }

    const node = nearestNode(position.x, position.y)
    if (distanceSquared(position.x, position.y, node.x, node.y) > 88 ** 2) {
      this.toast('Aim closer to a glowing patrol node.', '#ffd36b')
      return
    }
    if (this.duties.some(duty => duty.source === 'player' && duty.node === node.id)) {
      this.toast('An echo is already ringing there.', '#ffd36b')
      return
    }

    this.echoCharges -= 1
    this.duties.push({
      id: `echo-${this.beatNumber}-${performance.now().toFixed(0)}`,
      node: node.id,
      slot: 2,
      source: 'player',
      createdBeat: this.beatNumber
    })
    this.audio.echo()
    this.toast('Echo queued. Watch the next patrol futures bend.', '#65e8ff')
  }

  private tryJamDoor(): void {
    if (this.jamCharges <= 0) {
      this.toast('No gate spikes left.', '#ff657c')
      return
    }

    let closest: { id: string; distance: number } | undefined
    for (const edgeId of DOOR_EDGE_IDS) {
      const edge = EDGE_BY_ID.get(edgeId)
      const a = edge ? NODE_BY_ID.get(edge.a) : undefined
      const b = edge ? NODE_BY_ID.get(edge.b) : undefined
      if (!a || !b) continue
      const midpointX = (a.x + b.x) / 2
      const midpointY = (a.y + b.y) / 2
      const candidateDistance = distanceSquared(this.player.x, this.player.y, midpointX, midpointY)
      if (!closest || candidateDistance < closest.distance) {
        closest = { id: edgeId, distance: candidateDistance }
      }
    }

    if (!closest || closest.distance > DOOR_RANGE ** 2) {
      this.toast('Move beside a magenta gate to jam it.', '#ffd36b')
      return
    }
    if (this.jammedDoors.has(closest.id)) {
      this.toast('That gate is already jammed.', '#ffd36b')
      return
    }

    this.jamCharges -= 1
    this.jammedDoors.set(closest.id, 4)
    this.audio.jam()
    this.toast('Gate jammed for four planning beats.', '#ff70d7')
  }

  private tryInteract(): void {
    const vault = NODE_BY_ID.get(VAULT_NODE)
    const entry = NODE_BY_ID.get(ENTRY_NODE)
    if (!vault || !entry) return

    if (
      !this.player.hasDossier &&
      distanceSquared(this.player.x, this.player.y, vault.x, vault.y) < 52 ** 2
    ) {
      this.player.hasDossier = true
      this.player.heat = Math.max(this.player.heat, 12)
      this.audio.pickup()
      this.toast('DOSSIER ACQUIRED — patrol tempo increased.', '#65e8ff')
      return
    }
    if (
      this.player.hasDossier &&
      distanceSquared(this.player.x, this.player.y, entry.x, entry.y) < 55 ** 2
    ) {
      this.win()
      return
    }
    this.toast('Nothing here responds to your cipher.', '#8ea0b5')
  }

  private updateDetection(delta: number, time: number): void {
    let seen = false
    let closestDistance = Number.POSITIVE_INFINITY
    for (const guard of this.guards) {
      const dx = this.player.x - guard.x
      const dy = this.player.y - guard.y
      const distance = Math.hypot(dx, dy)
      if (distance < 25 && time > this.immunityUntil) {
        this.getCaught()
        return
      }
      if (distance > GUARD_VISION_RANGE) continue
      const angle = Math.atan2(dy, dx)
      if (Math.abs(normalizeAngle(angle - guard.facing)) > GUARD_VISION_HALF_ANGLE) continue
      if (!lineOfSightClear(guard.x, guard.y, this.player.x, this.player.y)) continue
      seen = true
      closestDistance = Math.min(closestDistance, distance)
    }

    if (seen && time > this.immunityUntil) {
      const proximity = 1 - closestDistance / GUARD_VISION_RANGE
      const pressure = this.player.hasDossier ? 58 : 43
      this.player.heat += delta * pressure * (1 + proximity * 0.9)
    } else {
      this.player.heat -= delta * (this.player.hasDossier ? 20 : 30)
    }
    this.player.heat = clamp(this.player.heat, 0, 100)
    if (this.player.heat >= 100) this.getCaught()
  }

  private getCaught(): void {
    this.audio.alert()
    this.alerts += 1
    this.lives -= 1
    this.caughtFlash = 1
    if (this.lives <= 0) {
      this.mode = 'lost'
      this.showOverlay(
        'ALL STORIES COLLAPSED',
        `The patrol resolved your identity in ${formatTime(this.elapsedSeconds)}.`,
        'TRY ANOTHER FUTURE',
        false
      )
      return
    }
    this.resetPatrol()
    this.toast('COVER BLOWN — new identity inserted at the entrance.', '#ff657c')
  }

  private win(): void {
    this.mode = 'won'
    const score = Math.max(
      0,
      Math.round(
        12000 -
          this.elapsedSeconds * 75 -
          this.alerts * 1500 +
          this.lives * 500 +
          (this.echoCharges + this.jamCharges) * 250
      )
    )
    const best = Math.max(Number(localStorage.getItem('cover-story-best') ?? 0), score)
    localStorage.setItem('cover-story-best', String(best))
    this.audio.success()
    this.showOverlay(
      'THE COVER HOLDS',
      `Dossier extracted in ${formatTime(this.elapsedSeconds)} · ${this.alerts} blown ${
        this.alerts === 1 ? 'identity' : 'identities'
      } · score ${score.toLocaleString()} · best ${best.toLocaleString()}`,
      'RUN IT AGAIN',
      false
    )
  }

  private showOverlay(title: string, copy: string, button: string, showTutorial: boolean): void {
    this.overlayTitle.textContent = title
    this.overlayCopy.textContent = copy
    this.startButton.textContent = button
    this.tutorial.classList.toggle('hidden', !showTutorial)
    this.overlay.classList.remove('hidden')
  }

  private toast(message: string, color: string): void {
    this.toastElement.textContent = message
    this.toastElement.style.setProperty('--toast-color', color)
    this.toastElement.classList.add('visible')
    this.toastUntil = performance.now() + 2600
  }

  private updateHud(time: number): void {
    const sample = this.schedule?.sampledSolutions ?? 0
    this.futureCount.textContent = this.schedule?.solutionLimitReached
      ? `${sample}+`
      : String(sample)
    this.solveTime.textContent = this.schedule ? `${this.schedule.solveMs.toFixed(2)}ms` : '—'
    this.routeCount.textContent = String(this.schedule?.candidateRoutes ?? '—')
    this.beatCount.textContent = String(this.beatNumber + 1).padStart(2, '0')
    this.heatValue.textContent = `${Math.round(this.player.heat)}%`
    this.heatFill.style.width = `${this.player.heat}%`
    this.heatFill.classList.toggle('danger', this.player.heat > 66)
    this.echoCount.textContent = String(this.echoCharges)
    this.jamCount.textContent = String(this.jamCharges)
    this.lifeCount.textContent = Array.from({ length: 3 }, (_, index) =>
      index < this.lives ? '●' : '○'
    ).join(' ')

    if (this.player.hasDossier) {
      this.objective.textContent = 'Extract the dossier'
      this.objectiveDetail.textContent = 'Return to the green insertion point'
      this.objectiveDot.classList.add('active')
    } else {
      this.objective.textContent = 'Reach the archive'
      this.objectiveDetail.textContent = 'Press Space inside the cyan vault'
      this.objectiveDot.classList.remove('active')
    }
    if (time > this.toastUntil) this.toastElement.classList.remove('visible')
  }

  private render(time: number): void {
    const context = this.context
    context.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.drawFloor(context)
    this.drawGraph(context)
    this.drawFutureField(context, time)
    this.drawExhibits(context)
    this.drawDoors(context, time)
    this.drawObjectives(context, time)
    this.drawDuties(context, time)
    this.drawGuards(context)
    this.drawPlayer(context, time)
    this.drawCursor(context, time)

    if (this.caughtFlash > 0) {
      context.fillStyle = `rgba(255, 50, 82, ${this.caughtFlash * 0.28})`
      context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    }
  }

  private drawFloor(context: CanvasRenderingContext2D): void {
    const gradient = context.createLinearGradient(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    gradient.addColorStop(0, '#0a1220')
    gradient.addColorStop(0.55, '#08101b')
    gradient.addColorStop(1, '#10101d')
    context.fillStyle = gradient
    context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

    context.strokeStyle = 'rgba(103, 232, 255, 0.035)'
    context.lineWidth = 1
    for (let x = 40; x < WORLD_WIDTH; x += 40) {
      context.beginPath()
      context.moveTo(x, 0)
      context.lineTo(x, WORLD_HEIGHT)
      context.stroke()
    }
    for (let y = 40; y < WORLD_HEIGHT; y += 40) {
      context.beginPath()
      context.moveTo(0, y)
      context.lineTo(WORLD_WIDTH, y)
      context.stroke()
    }

    context.strokeStyle = 'rgba(127, 154, 180, 0.3)'
    context.lineWidth = 3
    context.strokeRect(32, 32, WORLD_WIDTH - 64, WORLD_HEIGHT - 64)
  }

  private drawGraph(context: CanvasRenderingContext2D): void {
    context.save()
    context.strokeStyle = 'rgba(119, 168, 190, 0.11)'
    context.lineWidth = 2
    context.setLineDash([4, 12])
    for (const edge of GAME_GRAPH.edges) {
      const a = NODE_BY_ID.get(edge.a)
      const b = NODE_BY_ID.get(edge.b)
      if (!a || !b) continue
      context.beginPath()
      context.moveTo(a.x, a.y)
      context.lineTo(b.x, b.y)
      context.stroke()
    }
    context.setLineDash([])
    for (const node of GAME_GRAPH.nodes) {
      context.fillStyle = 'rgba(101, 232, 255, 0.22)'
      context.beginPath()
      context.arc(node.x, node.y, 3, 0, Math.PI * 2)
      context.fill()
    }
    context.restore()
  }

  private drawFutureField(context: CanvasRenderingContext2D, time: number): void {
    if (!this.schedule) return
    context.save()
    context.globalCompositeOperation = 'lighter'
    for (const guard of this.guards) {
      const moves = this.schedule.nextMoves[guard.id] ?? []
      for (const move of moves) {
        const destination = NODE_BY_ID.get(move.node)
        const origin = NODE_BY_ID.get(guard.fromNode)
        if (!destination || !origin) continue
        const pulse = 0.8 + Math.sin(time * 0.004 + move.node) * 0.2
        context.strokeStyle = colorWithAlpha(guard.color, (0.1 + move.probability * 0.4) * pulse)
        context.lineWidth = 1 + move.probability * 7
        context.setLineDash(move.node === guard.fromNode ? [2, 7] : [9, 7])
        context.lineDashOffset = -time * 0.018
        context.beginPath()
        context.moveTo(origin.x, origin.y)
        context.lineTo(destination.x, destination.y)
        context.stroke()

        context.fillStyle = colorWithAlpha(guard.color, 0.08 + move.probability * 0.28)
        context.beginPath()
        context.arc(destination.x, destination.y, 8 + move.probability * 13, 0, Math.PI * 2)
        context.fill()
      }
    }
    context.restore()
  }

  private drawExhibits(context: CanvasRenderingContext2D): void {
    for (const exhibit of EXHIBITS) {
      context.save()
      context.shadowColor = exhibit.accent
      context.shadowBlur = 16
      context.fillStyle = '#111927'
      context.strokeStyle = colorWithAlpha(exhibit.accent, 0.42)
      context.lineWidth = 2
      context.beginPath()
      context.roundRect(exhibit.x, exhibit.y, exhibit.width, exhibit.height, 8)
      context.fill()
      context.stroke()
      context.shadowBlur = 0

      const inner = context.createLinearGradient(
        exhibit.x,
        exhibit.y,
        exhibit.x + exhibit.width,
        exhibit.y + exhibit.height
      )
      inner.addColorStop(0, colorWithAlpha(exhibit.accent, 0.22))
      inner.addColorStop(1, 'rgba(4, 9, 16, 0.15)')
      context.fillStyle = inner
      context.fillRect(exhibit.x + 10, exhibit.y + 10, exhibit.width - 20, exhibit.height - 38)
      context.fillStyle = 'rgba(221, 237, 245, 0.52)'
      context.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace'
      context.fillText(exhibit.title, exhibit.x + 10, exhibit.y + exhibit.height - 12)
      context.restore()
    }
  }

  private drawDoors(context: CanvasRenderingContext2D, time: number): void {
    for (const edgeId of DOOR_EDGE_IDS) {
      const edge = EDGE_BY_ID.get(edgeId)
      const a = edge ? NODE_BY_ID.get(edge.a) : undefined
      const b = edge ? NODE_BY_ID.get(edge.b) : undefined
      if (!a || !b) continue
      const x = (a.x + b.x) / 2
      const y = (a.y + b.y) / 2
      const angle = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2
      const jammed = this.jammedDoors.get(edgeId)
      const length = 34
      context.save()
      context.translate(x, y)
      context.rotate(angle)
      context.shadowColor = jammed ? '#ff405f' : '#ff70d7'
      context.shadowBlur = jammed ? 18 + Math.sin(time * 0.015) * 6 : 8
      context.strokeStyle = jammed ? '#ff405f' : '#ff70d7'
      context.lineWidth = jammed ? 6 : 3
      context.beginPath()
      context.moveTo(-length, 0)
      context.lineTo(length, 0)
      context.stroke()
      context.shadowBlur = 0
      context.fillStyle = '#09111c'
      context.font = 'bold 9px ui-monospace, SFMono-Regular, Menlo, monospace'
      context.textAlign = 'center'
      context.fillText(jammed ? `${jammed}▮` : 'GATE', 0, -7)
      context.restore()
    }
  }

  private drawObjectives(context: CanvasRenderingContext2D, time: number): void {
    const vault = NODE_BY_ID.get(VAULT_NODE)
    const entry = NODE_BY_ID.get(ENTRY_NODE)
    if (!vault || !entry) return
    const pulse = 1 + Math.sin(time * 0.005) * 0.12

    context.save()
    context.shadowBlur = 22
    context.shadowColor = this.player.hasDossier ? '#526476' : '#65e8ff'
    context.fillStyle = this.player.hasDossier ? '#18202c' : '#65e8ff'
    context.beginPath()
    context.arc(vault.x, vault.y, 17 * pulse, 0, Math.PI * 2)
    context.fill()
    context.shadowColor = '#78ffa8'
    context.fillStyle = this.player.hasDossier ? '#78ffa8' : '#244536'
    context.beginPath()
    context.arc(entry.x, entry.y, 20 * pulse, 0, Math.PI * 2)
    context.fill()
    context.shadowBlur = 0
    context.fillStyle = '#071019'
    context.font = 'bold 10px ui-monospace, SFMono-Regular, Menlo, monospace'
    context.textAlign = 'center'
    context.fillText(this.player.hasDossier ? 'EMPTY' : 'VAULT', vault.x, vault.y + 4)
    context.fillText(this.player.hasDossier ? 'EXIT' : 'IN', entry.x, entry.y + 4)
    context.restore()
  }

  private drawDuties(context: CanvasRenderingContext2D, time: number): void {
    for (const duty of this.duties) {
      const node = NODE_BY_ID.get(duty.node)
      if (!node) continue
      const color = duty.source === 'player' ? '#65e8ff' : '#ffd36b'
      const radius = 23 + ((time * 0.06 + duty.createdBeat * 17) % 28)
      context.save()
      context.strokeStyle = colorWithAlpha(color, 1 - (radius - 23) / 32)
      context.lineWidth = 2
      context.beginPath()
      context.arc(node.x, node.y, radius, 0, Math.PI * 2)
      context.stroke()
      context.fillStyle = color
      context.font = 'bold 10px ui-monospace, SFMono-Regular, Menlo, monospace'
      context.textAlign = 'center'
      context.fillText(
        duty.source === 'player' ? `ECHO ${duty.slot}` : `DUTY ${duty.slot}`,
        node.x,
        node.y - 29
      )
      context.restore()
    }
  }

  private drawGuards(context: CanvasRenderingContext2D): void {
    for (const guard of this.guards) {
      const range = GUARD_VISION_RANGE
      context.save()
      context.translate(guard.x, guard.y)
      context.rotate(guard.facing)
      const cone = context.createRadialGradient(0, 0, 5, 0, 0, range)
      cone.addColorStop(0, colorWithAlpha(guard.color, 0.23))
      cone.addColorStop(0.72, colorWithAlpha(guard.color, 0.09))
      cone.addColorStop(1, colorWithAlpha(guard.color, 0))
      context.fillStyle = cone
      context.beginPath()
      context.moveTo(0, 0)
      context.arc(0, 0, range, -GUARD_VISION_HALF_ANGLE, GUARD_VISION_HALF_ANGLE)
      context.closePath()
      context.fill()
      context.restore()

      context.save()
      context.translate(guard.x, guard.y)
      context.rotate(guard.facing)
      context.shadowColor = guard.color
      context.shadowBlur = 14
      context.fillStyle = guard.color
      context.beginPath()
      context.moveTo(16, 0)
      context.lineTo(-10, 11)
      context.lineTo(-6, 0)
      context.lineTo(-10, -11)
      context.closePath()
      context.fill()
      context.shadowBlur = 0
      context.restore()

      // Keep identity labels in screen space. Rotating them with the actor made
      // half the patrol names upside-down and slowed recognition during play.
      context.fillStyle = 'rgba(235, 246, 252, 0.74)'
      context.font = 'bold 9px ui-monospace, SFMono-Regular, Menlo, monospace'
      context.textAlign = 'center'
      context.fillText(guard.name, guard.x, guard.y - 20)
    }
  }

  private drawPlayer(context: CanvasRenderingContext2D, time: number): void {
    context.save()
    context.translate(this.player.x, this.player.y)
    context.shadowColor = this.player.hasDossier ? '#ffffff' : '#65e8ff'
    context.shadowBlur = 16 + Math.sin(time * 0.008) * 4
    context.fillStyle = '#ecfbff'
    context.beginPath()
    context.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2)
    context.fill()
    context.shadowBlur = 0
    context.rotate(this.player.facing)
    context.fillStyle = '#071019'
    context.beginPath()
    context.moveTo(11, 0)
    context.lineTo(-3, 5)
    context.lineTo(-3, -5)
    context.closePath()
    context.fill()
    if (this.player.hasDossier) {
      context.strokeStyle = '#65e8ff'
      context.lineWidth = 2
      context.strokeRect(-7, -7, 14, 14)
    }
    context.restore()
  }

  private drawCursor(context: CanvasRenderingContext2D, time: number): void {
    if (!this.cursor.inside || this.mode !== 'playing') return
    const node = nearestNode(this.cursor.x, this.cursor.y)
    const inRange = distanceSquared(this.player.x, this.player.y, node.x, node.y) <= ECHO_RANGE ** 2
    context.save()
    context.strokeStyle = inRange ? '#65e8ff' : '#ff657c'
    context.globalAlpha = 0.55 + Math.sin(time * 0.01) * 0.2
    context.lineWidth = 2
    context.beginPath()
    context.arc(node.x, node.y, 13, 0, Math.PI * 2)
    context.stroke()
    context.restore()
  }
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing required element #${id}`)
  return element as T
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value)
}

function normalizeAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

function colorWithAlpha(hex: string, alpha: number): string {
  const red = Number.parseInt(hex.slice(1, 3), 16)
  const green = Number.parseInt(hex.slice(3, 5), 16)
  const blue = Number.parseInt(hex.slice(5, 7), 16)
  return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}
