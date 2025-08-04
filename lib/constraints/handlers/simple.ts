/**
 * Simple constraint handler for columns-only mode
 * 
 * Zero branching - columnIndices is always number[], columnValues is always BinaryNumber[]
 */

import {
  Row,
  BinaryNumber,
  SimpleSolverConfig,
  ConstraintHandler,
  SparseConstraintBatch,
  BinaryConstraintBatch
} from '../../types/interfaces.js'

export class SimpleConstraintHandler<T> implements ConstraintHandler<T, 'simple'> {
  readonly mode = 'simple' as const
  private constraints: Row<T>[] = []
  private validationEnabled = false
  private numColumns: number

  constructor(private config: SimpleSolverConfig) {
    this.numColumns = config.columns
  }

  validateConstraints(): this {
    this.validationEnabled = true
    return this
  }

  addSparseConstraint(data: T, columnIndices: number[]): this {
    return this.addSparseConstraints([{ data, columnIndices }])
  }

  addSparseConstraints(constraints: SparseConstraintBatch<T, 'simple'>): this {
    for (let i = 0; i < constraints.length; i++) {
      const { data, columnIndices } = constraints[i]

      if (this.validationEnabled) {
        for (let j = 0; j < columnIndices.length; j++) {
          const col = columnIndices[j]
          if (col < 0 || col >= this.numColumns) {
            throw new Error(`Column index ${col} exceeds columns limit of ${this.numColumns}`)
          }
        }
      }

      this.constraints.push(new Row(columnIndices, data))
    }
    return this
  }

  addBinaryConstraint(data: T, columnValues: BinaryNumber[]): this {
    return this.addBinaryConstraints([{ data, columnValues }])
  }

  addBinaryConstraints(constraints: BinaryConstraintBatch<T, 'simple'>): this {
    for (let i = 0; i < constraints.length; i++) {
      const { data, columnValues } = constraints[i]

      if (this.validationEnabled) {
        if (columnValues.length !== this.numColumns) {
          throw new Error(
            `Row length ${columnValues.length} does not match columns ${this.numColumns}`
          )
        }
      }

      const coveredColumns: number[] = []
      for (let j = 0; j < columnValues.length; j++) {
        if (columnValues[j] === 1) {
          coveredColumns.push(j)
        }
      }

      this.constraints.push(new Row(coveredColumns, data))
    }
    return this
  }

  addRow(row: Row<T>): this {
    this.constraints.push(row)
    return this
  }

  addRows(rows: Row<T>[]): this {
    this.constraints.push(...rows)
    return this
  }

  getConstraints(): Row<T>[] {
    return this.constraints
  }

  getNumPrimary(): number {
    return this.numColumns
  }

  getNumSecondary(): number {
    return 0
  }

  getConfig(): SimpleSolverConfig {
    return this.config
  }
}