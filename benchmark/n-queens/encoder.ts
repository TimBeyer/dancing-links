import { ComplexConstraint, BinaryNumber } from '../../index.js'

function constant<T>(t: T): () => T {
  return () => t
}

function times<T>(n: number, fn: () => T): T[] {
  const returnValue: T[] = []

  for (let i = 0; i < n; i++) {
    returnValue.push(fn())
  }

  return returnValue
}

function oneAt(length: number, index: number): BinaryNumber[] {
  let array = times(length, constant(0 as BinaryNumber))
  array[index] = 1
  return array
}

function getDiagonalIndex(
  fieldSize: number,
  x: number,
  y: number,
  reverse: boolean = false
): number {
  return reverse ? x + y : fieldSize + x - y - 1
}

export function createEncoder(fieldSize: number) {
  const primaryRow = function (x: number, y: number): BinaryNumber[] {
    const row = oneAt(fieldSize, x)
    const column = oneAt(fieldSize, y)
    return [...row, ...column] as BinaryNumber[]
  }

  const secondaryRow = function (x: number, y: number): BinaryNumber[] {
    const numDiagonals = 2 * fieldSize - 1
    const diagonal = oneAt(numDiagonals, getDiagonalIndex(fieldSize, x, y))
    const reverseDiagonal = oneAt(numDiagonals, getDiagonalIndex(fieldSize, x, y, true))

    return [...diagonal, ...reverseDiagonal] as BinaryNumber[]
  }

  return function encodePosition(x: number, y: number): ComplexConstraint {
    return {
      data: {
        position: [x, y]
      },
      primaryRow: primaryRow(x, y),
      secondaryRow: secondaryRow(x, y)
    }
  }
}
