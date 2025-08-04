/**
 * Dancing Links - High-performance exact cover solver
 *
 * Main library exports
 */

// Factory class for creating solvers and templates
export { DancingLinks } from './solvers/factory.js'

// Individual solver classes (for advanced usage)
export { ProblemSolver } from './solvers/solver.js'
export { SolverTemplate } from './solvers/template.js'

// Core interfaces and types
export {
  BinaryConstraint,
  SparseConstraint,
  SimpleConstraint,
  ComplexConstraint,
  Row,
  Result,
  BinaryNumber
} from './types/interfaces.js'
