/**
 * Specialized constraint handlers for zero runtime branching
 * 
 * Replaces abstract base class with interface + delegation pattern
 * Each handler knows its exact types statically, eliminating runtime checks
 */

import {
  Row,
  BinaryNumber,
  SimpleSolverConfig,
  ComplexSolverConfig,
  ConstraintHandler,
  SparseConstraintBatch,
  BinaryConstraintBatch
} from './interfaces.js'

/**
 * Simple constraint handler for columns-only mode
 * Zero branching - columnIndices is always number[], columnValues is always BinaryNumber[]
 */
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
          throw new Error(`Row length ${columnValues.length} does not match columns ${this.numColumns}`)
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

/**
 * Complex constraint handler for primary + secondary columns mode
 * Zero branching - columnIndices is always { primary: number[], secondary: number[] }
 * columnValues is always { primaryRow: BinaryNumber[], secondaryRow: BinaryNumber[] }
 */
export class ComplexConstraintHandler<T> implements ConstraintHandler<T, 'complex'> {
  readonly mode = 'complex' as const
  private constraints: Row<T>[] = []
  private validationEnabled = false
  private numPrimary: number
  private numSecondary: number

  constructor(private config: ComplexSolverConfig) {
    this.numPrimary = config.primaryColumns
    this.numSecondary = config.secondaryColumns
  }

  validateConstraints(): this {
    this.validationEnabled = true
    return this
  }

  addSparseConstraint(data: T, columnIndices: { primary: number[], secondary: number[] }): this {
    return this.addSparseConstraints([{ data, columnIndices }])
  }

  addSparseConstraints(constraints: SparseConstraintBatch<T, 'complex'>): this {
    for (let i = 0; i < constraints.length; i++) {
      const { data, columnIndices } = constraints[i]
      const { primary, secondary } = columnIndices
      
      if (this.validationEnabled) {
        for (let j = 0; j < primary.length; j++) {
          const col = primary[j]
          if (col < 0 || col >= this.numPrimary) {
            throw new Error(`Primary column index ${col} exceeds primaryColumns limit of ${this.numPrimary}`)
          }
        }
      }
      
      const coveredColumns: number[] = [...primary]
      for (let j = 0; j < secondary.length; j++) {
        const col = secondary[j]
        if (this.validationEnabled) {
          if (col < 0 || col >= this.numSecondary) {
            throw new Error(`Secondary column index ${col} exceeds secondaryColumns limit of ${this.numSecondary}`)
          }
        }
        coveredColumns.push(col + this.numPrimary)
      }
      
      this.constraints.push(new Row(coveredColumns, data))
    }
    return this
  }

  addBinaryConstraint(data: T, columnValues: { primaryRow: BinaryNumber[], secondaryRow: BinaryNumber[] }): this {
    return this.addBinaryConstraints([{ data, columnValues }])
  }

  addBinaryConstraints(constraints: BinaryConstraintBatch<T, 'complex'>): this {
    for (let i = 0; i < constraints.length; i++) {
      const { data, columnValues } = constraints[i]
      const { primaryRow, secondaryRow } = columnValues
      
      if (this.validationEnabled) {
        if (primaryRow.length !== this.numPrimary) {
          throw new Error(`Primary row length ${primaryRow.length} does not match primaryColumns ${this.numPrimary}`)
        }
        if (secondaryRow.length !== this.numSecondary) {
          throw new Error(`Secondary row length ${secondaryRow.length} does not match secondaryColumns ${this.numSecondary}`)
        }
      }
      
      const coveredColumns: number[] = []
      
      for (let j = 0; j < primaryRow.length; j++) {
        if (primaryRow[j] === 1) {
          coveredColumns.push(j)
        }
      }
      
      for (let j = 0; j < secondaryRow.length; j++) {
        if (secondaryRow[j] === 1) {
          coveredColumns.push(j + primaryRow.length)
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
    return this.numPrimary
  }

  getNumSecondary(): number {
    return this.numSecondary
  }

  getConfig(): ComplexSolverConfig {
    return this.config
  }
}