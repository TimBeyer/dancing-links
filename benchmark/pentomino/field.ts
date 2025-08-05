import { Pentomino, NUM_PENTOMINOS, ALL_PENTOMINOS } from './pentomino.js'
import { SimpleConstraint } from '../../index.js'

function times<T>(n: number, fn: () => T): T[] {
  const returnValue: T[] = []

  for (let i = 0; i < n; i++) {
    returnValue.push(fn())
  }

  return returnValue
}

function constant<T>(t: T): () => T {
  return () => t
}

function getIndex(x: number, y: number, width: number) {
  return y * width + x
}

export interface PlacedPentomino {
  x: number
  y: number
  p: Pentomino
}

export class Field {
  private width: number
  private height: number

  private placedPentominos: PlacedPentomino[] = []

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  place(x: number, y: number, p: Pentomino): PlacedPentomino {
    const placed = {
      x,
      y,
      p
    }

    this.placedPentominos.push(placed)

    return placed
  }

  canPlace(x: number, y: number, p: Pentomino) {
    const widthFits = x + p.width <= this.width
    const heightFits = y + p.height <= this.height

    return widthFits && heightFits
  }

  constraintFor(x: number, y: number, p: Pentomino): SimpleConstraint<PlacedPentomino> {
    // Ensure we can only place one per type including rotations
    const typeConstraint = times(NUM_PENTOMINOS, constant(0)) as (1 | 0)[]
    typeConstraint[p.type] = 1

    const placeConstraint = times(this.width * this.height, constant(0)) as (1 | 0)[]

    for (let xBoard = 0; xBoard < this.width; xBoard++) {
      for (let yBoard = 0; yBoard < this.height; yBoard++) {
        const isInXRange = xBoard >= x && xBoard < x + p.width
        const isInYRange = yBoard >= y && yBoard < y + p.height

        if (isInXRange && isInYRange) {
          const xP = xBoard - x
          const yP = yBoard - y

          const val = p.matrix[getIndex(xP, yP, p.width)]

          placeConstraint[getIndex(xBoard, yBoard, this.width)] = val
        }
      }
    }

    return {
      data: {
        p,
        x,
        y
      },
      row: [...typeConstraint, ...placeConstraint]
    }
  }

  printAt(x: number, y: number, p: Pentomino): void {
    let printOut = []
    for (let yBoard = 0; yBoard < this.height; yBoard++) {
      for (let xBoard = 0; xBoard < this.width; xBoard++) {
        const isInXRange = xBoard >= x && xBoard < x + p.width
        const isInYRange = yBoard >= y && yBoard < y + p.height

        if (isInXRange && isInYRange) {
          const xP = xBoard - x
          const yP = yBoard - y

          const val = p.matrix[getIndex(xP, yP, p.width)]

          printOut.push(val)
        } else {
          printOut.push(0)
        }
      }
      printOut.push('\n')
    }
    console.log(printOut.join(''))
  }

  print(): void {
    let printOut = times(this.width * this.height, () => ' ')

    for (let yBoard = 0; yBoard < this.height; yBoard++) {
      for (let xBoard = 0; xBoard < this.width; xBoard++) {
        for (const { x, y, p } of this.placedPentominos) {
          const isInXRange = xBoard >= x && xBoard < x + p.width
          const isInYRange = yBoard >= y && yBoard < y + p.height

          if (isInXRange && isInYRange) {
            const xP = xBoard - x
            const yP = yBoard - y

            const val = p.matrix[getIndex(xP, yP, p.width)]

            if (val) {
              printOut[getIndex(xBoard, yBoard, this.width)] = p.id
            }
          }
        }
      }
    }

    console.log(printOut.join('\n'))
  }
}

const FIELD_WIDTH = 6
const FIELD_HEIGHT = 10

const field = new Field(FIELD_WIDTH, FIELD_HEIGHT)

export const ALL_CONSTRAINTS: SimpleConstraint<PlacedPentomino>[] = []

for (const p of ALL_PENTOMINOS) {
  for (let x = 0; x < FIELD_WIDTH; x++) {
    for (let y = 0; y < FIELD_HEIGHT; y++) {
      if (field.canPlace(x, y, p)) {
        ALL_CONSTRAINTS.push(field.constraintFor(x, y, p))
      }
    }
  }
}
