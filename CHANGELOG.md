# Changelog

## [3.2.2](https://github.com/TimBeyer/node-dlx/compare/v3.2.1...v3.2.2) (2025-07-31)

## [3.2.1](https://github.com/TimBeyer/node-dlx/compare/v3.2.0...v3.2.1) (2025-07-31)


### Bug Fixes

* use correct npm script for coverage in test workflow ([335db17](https://github.com/TimBeyer/node-dlx/commit/335db1749ce02ba12e03946fb037dc9b006f5b66))

# [3.2.0](https://github.com/TimBeyer/node-dlx/compare/v3.1.0...v3.2.0) (2025-07-31)

### Bug Fixes

- correct typo 'sodoku' to 'sudoku' in benchmark output ([6a550e1](https://github.com/TimBeyer/node-dlx/commit/6a550e1c183b19f63e146db8c3241892e4a6bdf6))
- enable profiler with vscode compatible output format ([84352c7](https://github.com/TimBeyer/node-dlx/commit/84352c7eeb701e321113786774d60f09acb64746))

### Features

- add development benchmark comparing Original AoS vs SoA ([0e4d3fb](https://github.com/TimBeyer/node-dlx/commit/0e4d3fb341b950f0fe9a982844a7a9c7892ed256))
- implement Struct-of-Arrays data structures for Dancing Links ([89613e6](https://github.com/TimBeyer/node-dlx/commit/89613e6158bb2b2bbb613c7270237226352710ca))
- separate fast benchmarks from library comparison benchmarks ([37a289b](https://github.com/TimBeyer/node-dlx/commit/37a289b0b5c12d7b6f12cebd1e13ed9673b93856))
- use classes instead of POJOs for better lookup performance ([584ba0e](https://github.com/TimBeyer/node-dlx/commit/584ba0eaf43221a3d38bd28d0d0feac3fbe7b544))

### Performance Improvements

- complete systematic optimization testing ([085ada8](https://github.com/TimBeyer/node-dlx/commit/085ada8540d6358da5c744f7a0b3ce4a3946660f))
- phase 1a enhanced column selection heuristic - reverted ([b4e3340](https://github.com/TimBeyer/node-dlx/commit/b4e3340c843936440db378dac62c7b14d4c889cf))
- phase 1b column length tracking - implementation failed ([f3d9a98](https://github.com/TimBeyer/node-dlx/commit/f3d9a9839c3260b9cafab24825ffe9fcc1dd1fcc))
- phase 2a unit propagation - kept ([d2d3a84](https://github.com/TimBeyer/node-dlx/commit/d2d3a846fe796ead39c6de5ac76cdc1208a1ebe5))
- phase 2b memory layout optimization - reverted ([a668d6a](https://github.com/TimBeyer/node-dlx/commit/a668d6aa09ea219bb0b5c7cf5937d3b363861de7))
- phase 2b memory layout optimization retry - reverted ([bdb4fcf](https://github.com/TimBeyer/node-dlx/commit/bdb4fcfbe419bc6be5d8b2b6a4a8c2285267d005))
- phase 3a symmetry breaking - conceptual failure ([21f8a47](https://github.com/TimBeyer/node-dlx/commit/21f8a473d1d3471688f0a65e84c6ef2dfd35c622))
- remaining opt 1 cache warming - reverted ([f546461](https://github.com/TimBeyer/node-dlx/commit/f5464611426cc555a917e65fc42d11b86899a5ff))
- remaining opt 4 extended unit propagation - reverted ([0acf8bc](https://github.com/TimBeyer/node-dlx/commit/0acf8bc26a41962824ff8fab249a22e47eb835ed))
- systematic optimization testing - Tests 1-5 complete ([3474482](https://github.com/TimBeyer/node-dlx/commit/34744823807e706f36eb400243ef93ee0cb635c0))
- test 7 inline forward function - reverted ([b5fa57b](https://github.com/TimBeyer/node-dlx/commit/b5fa57b99e43f6b229d3e304393d7a951e54af66))
- test 8 local variable caching - reverted ([6248b88](https://github.com/TimBeyer/node-dlx/commit/6248b88c7c1aea93aca3c891ea535247a96d5cbb))
- test 9 pre-calculate next pointers - kept ([62a78c8](https://github.com/TimBeyer/node-dlx/commit/62a78c8d606202cf45e6dc72866a843a31510a2c))

# [3.1.0](https://github.com/TimBeyer/node-dlx/compare/v3.0.0...v3.1.0) (2025-07-15)

### Bug Fixes

- add workflow dependency and build step to release workflow ([70aa08f](https://github.com/TimBeyer/node-dlx/commit/70aa08f6cf8d0f7c2e6c520b348361fed8ee83b3))
- replace custom commitlint logic with wagoid/commitlint-github-action ([837f7ec](https://github.com/TimBeyer/node-dlx/commit/837f7ecf75bac4cfa31c331a30009f9f301d7273))
- revert CHANGELOG.md formatting and remove commitlint script ([01f4e9a](https://github.com/TimBeyer/node-dlx/commit/01f4e9a88e6f422f86a78b274c0975cefc9e3118))

### Features

- implement release automation formatting and conventional commits improvements ([192a55a](https://github.com/TimBeyer/node-dlx/commit/192a55aaf1dd98ccb61ba60c6abcefcaf2715033))

# [3.0.0](https://github.com/TimBeyer/node-dlx/compare/v2.1.1...v3.0.0) (2025-07-15)

- feat!: require Node.js 20+ and add conventional commits guidelines ([8fab697](https://github.com/TimBeyer/node-dlx/commit/8fab697c82fe8af95ecdf60e3d5575e799d658e2))

### Bug Fixes

- missing Result type ([031e0ca](https://github.com/TimBeyer/node-dlx/commit/031e0ca2a0be3cce77d1f70bed14668be9517e48))

### BREAKING CHANGES

- Node.js 20+ is now required. The minimum supported Node.js version has been increased from 18 to 20 to align with the modernized CI/CD pipeline and take advantage of newer Node.js features.

Co-authored-by: TimBeyer <2362075+TimBeyer@users.noreply.github.com>
