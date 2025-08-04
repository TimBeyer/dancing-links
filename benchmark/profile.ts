import { createWriteStream } from 'fs'
import profiler from 'v8-profiler-next'
import { DancingLinks } from '../index.js'
import { ALL_CONSTRAINTS } from './pentomino/field.js'

profiler.setGenerateType(1)
profiler.startProfiling('dancing-links', true)

const dlx = new DancingLinks()
const solver = dlx.createSolver({ columns: 72 })
solver.addBinaryConstraints(ALL_CONSTRAINTS)
solver.findAll()

const profile = profiler.stopProfiling()

profile.export().pipe(createWriteStream('profile.cpuprofile'))
