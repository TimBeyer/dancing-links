import {
  Constraint,
  Row,
  isSimpleConstraint,
  isComplexConstraint,
  SearchConfig
} from './interfaces.js'

type BinaryInt = 0 | 1

function binaryToSparseRow(binaryRow: BinaryInt[], offset: number = 0): number[] {
  const sparseRow: number[] = []

  for (let i = 0; i < binaryRow.length; i++) {
    const value = binaryRow[i]
    if (value !== undefined && value === 1) {
      sparseRow.push(i + offset)
    }
  }

  return sparseRow
}

function getParams(constraint: Constraint) {
  let numPrimary: number = 0
  let numSecondary: number = 0

  if (isSimpleConstraint(constraint)) {
    numPrimary = constraint.row.length
  } else if (isComplexConstraint(constraint)) {
    numPrimary = constraint.primaryRow.length
    numSecondary = constraint.secondaryRow.length
  }

  return {
    numPrimary,
    numSecondary
  }
}

export function getSearchConfig<T = any>(
  numSolutions: number,
  constraints: Constraint<T>[]
): SearchConfig<T> {
  if (constraints.length === 0) {
    throw new Error('Constraints array cannot be empty')
  }

  const { numPrimary, numSecondary } = getParams(constraints[0]!)
  const sparseConstraints: Row<T>[] = constraints.map(c => {
    const data = c.data
    let coveredColumns: number[]
    if (isSimpleConstraint(c)) {
      coveredColumns = binaryToSparseRow(c.row)
    } else if (isComplexConstraint(c)) {
      coveredColumns = binaryToSparseRow(c.primaryRow).concat(
        binaryToSparseRow(c.secondaryRow, numPrimary)
      )
    } else {
      throw new Error('Invalid constraint type')
    }

    return {
      data,
      coveredColumns
    }
  })

  return {
    numPrimary,
    numSecondary,
    numSolutions,
    rows: sparseConstraints
  }
}
