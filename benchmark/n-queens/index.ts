import { createEncoder } from './encoder.js'
import { ComplexConstraint } from '../../index.js'

export function createConstraints(fieldSize: number): ComplexConstraint[] {
  const encode = createEncoder(fieldSize)
  const constraints: ComplexConstraint[] = []

  for (let x = 0; x < fieldSize; x++) {
    for (let y = 0; y < fieldSize; y++) {
      constraints.push(encode(x, y))
    }
  }

  return constraints
}
