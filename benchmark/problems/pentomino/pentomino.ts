export type BinaryInt = 0 | 1

export const NUM_PENTOMINOS = 12
export enum PentominoType {
  F = 0,
  I = 1,
  L = 2,
  N = 3,
  P = 4,
  T = 5,
  U = 6,
  V = 7,
  W = 8,
  X = 9,
  Y = 10,
  Z = 11
}

export interface Pentomino {
  type: PentominoType
  id: string
  width: number
  height: number
  matrix: BinaryInt[]
}

const BASE_PENTOMINOS: Pentomino[] = [
  {
    type: PentominoType.F,
    id: 'F',
    width: 3,
    height: 3,
    matrix: [0, 1, 1, 1, 1, 0, 0, 1, 0]
  },
  {
    type: PentominoType.I,
    id: 'I',
    width: 1,
    height: 5,
    matrix: [1, 1, 1, 1, 1]
  },
  {
    type: PentominoType.L,
    id: 'L',
    width: 2,
    height: 4,
    matrix: [1, 0, 1, 0, 1, 0, 1, 1]
  },
  {
    type: PentominoType.N,
    id: 'N',
    width: 2,
    height: 4,
    matrix: [0, 1, 0, 1, 1, 1, 1, 0]
  },
  {
    type: PentominoType.P,
    id: 'P',
    width: 2,
    height: 3,
    matrix: [1, 1, 1, 1, 1, 0]
  },
  {
    type: PentominoType.T,
    id: 'T',
    width: 3,
    height: 3,
    matrix: [1, 1, 1, 0, 1, 0, 0, 1, 0]
  },
  {
    type: PentominoType.U,
    id: 'U',
    width: 3,
    height: 2,
    matrix: [1, 0, 1, 1, 1, 1]
  },
  {
    type: PentominoType.V,
    id: 'V',
    width: 3,
    height: 3,
    matrix: [1, 0, 0, 1, 0, 0, 1, 1, 1]
  },
  {
    type: PentominoType.W,
    id: 'W',
    width: 3,
    height: 3,
    matrix: [0, 1, 1, 1, 1, 0, 1, 0, 0]
  },
  {
    type: PentominoType.X,
    id: 'X',
    width: 3,
    height: 3,
    matrix: [0, 1, 0, 1, 1, 1, 0, 1, 0]
  },
  {
    type: PentominoType.Y,
    id: 'Y',
    width: 2,
    height: 4,
    matrix: [0, 1, 1, 1, 0, 1, 0, 1]
  },
  {
    type: PentominoType.Z,
    id: 'Z',
    width: 3,
    height: 3,
    matrix: [1, 1, 0, 0, 1, 0, 0, 1, 1]
  }
]

function isEqual(p1: Pentomino, p2: Pentomino): boolean {
  if (p1.type !== p2.type) {
    return false
  }

  if (p1.width !== p2.width) {
    return false
  }

  if (p1.height !== p2.height) {
    return false
  }

  // Not the most efficient way of checking whether
  // both matrices are equal, but should be OK for the small sizes here
  return p1.matrix.join('') === p2.matrix.join('')
}

function getIndex(x: number, y: number, width: number) {
  return y * width + x
}

export function rotatePentomino(pentomino: Pentomino): Pentomino {
  const width = pentomino.height
  const height = pentomino.width

  const matrix: BinaryInt[] = []

  for (let x = 0; x < pentomino.width; x++) {
    for (let y = 0; y < pentomino.height; y++) {
      const from = getIndex(x, y, pentomino.width)
      const to = getIndex(width - y - 1, x, width)

      matrix[to] = pentomino.matrix[from]
    }
  }

  return {
    type: pentomino.type,
    id: pentomino.id,
    width,
    height,
    matrix
  }
}

export function mirrorPentomino(pentomino: Pentomino): Pentomino {
  const { width, height, type, id } = pentomino
  const matrix: BinaryInt[] = []

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const from = getIndex(x, y, width)
      const to = getIndex(x, height - y - 1, width)

      matrix[to] = pentomino.matrix[from]
    }
  }

  return {
    type,
    width,
    height,
    matrix,
    id
  }
}

export const ALL_PENTOMINOS: Pentomino[] = BASE_PENTOMINOS.reduce<Pentomino[]>(
  (allPentominos, pentomino) => {
    const derivedPentominos: Pentomino[] = []

    for (let i = 0; i < 4; i++) {
      let rotated = pentomino
      let mirrorRotated = mirrorPentomino(pentomino)

      for (let rotations = 0; rotations < i; rotations++) {
        rotated = rotatePentomino(rotated)
        mirrorRotated = rotatePentomino(mirrorRotated)
      }

      // Skip redundant rotations
      if (!derivedPentominos.some(p => isEqual(p, rotated))) {
        derivedPentominos.push(rotated)
      }

      if (!derivedPentominos.some(p => isEqual(p, mirrorRotated))) {
        derivedPentominos.push(mirrorRotated)
      }
    }

    return [...allPentominos, ...derivedPentominos]
  },
  []
)
