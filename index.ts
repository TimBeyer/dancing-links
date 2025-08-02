import { Constraint, SearchConfig } from './lib/interfaces.js'
import { search } from './lib/index.js'

import { getSearchConfig } from './lib/utils.js'

/**
 * @deprecated Use new DancingLinks API for better performance:
 * const dlx = new DancingLinks()
 * const solver = dlx.createSolver({ columns: numColumns })
 * constraints.forEach(c => solver.addBinaryConstraint(c.data, c.row))
 * return solver.findAll()
 */
export function findAll<T = any>(constraints: Constraint<T>[]) {
  return search<T>(getSearchConfig(Infinity, constraints))
}

/**
 * @deprecated Use new DancingLinks API for better performance:
 * const dlx = new DancingLinks()
 * const solver = dlx.createSolver({ columns: numColumns })
 * constraints.forEach(c => solver.addBinaryConstraint(c.data, c.row))
 * return solver.findOne()
 */
export function findOne<T = any>(constraints: Constraint<T>[]) {
  return search<T>(getSearchConfig(1, constraints))
}

/**
 * @deprecated Use new DancingLinks API for better performance:
 * const dlx = new DancingLinks()
 * const solver = dlx.createSolver({ columns: numColumns })
 * constraints.forEach(c => solver.addBinaryConstraint(c.data, c.row))
 * return solver.find(numSolutions)
 */
export function find<T = any>(constraints: Constraint<T>[], numSolutions: number) {
  return search<T>(getSearchConfig(numSolutions, constraints))
}

/**
 * @deprecated Use new DancingLinks API for better performance and cleaner interface:
 * const dlx = new DancingLinks()
 * const solver = dlx.createSolver({ columns: numColumns })
 * Use solver.addSparseConstraint() or solver.addBinaryConstraint() instead
 * return solver.find(numSolutions)
 */
export function findRaw<T = any>(config: SearchConfig<T>) {
  return search<T>(config)
}

// New high-performance API
export { DancingLinks } from './lib/new-api.js'

// Legacy utilities (deprecated)
export { getSearchConfig } from './lib/utils.js'

export {
  Constraint,
  BinaryConstraint,
  SparseConstraint,
  SimpleConstraint,
  ComplexConstraint,
  SearchConfig,
  Row,
  Result
} from './lib/interfaces.js'
