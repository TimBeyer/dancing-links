# Changelog

## [4.3.5](https://github.com/TimBeyer/dancing-links/compare/v4.3.4...v4.3.5) (2026-01-15)


### Bug Fixes

* increase benchmark timeout from 5 to 15 minutes ([97ad58d](https://github.com/TimBeyer/dancing-links/commit/97ad58d14319582217349d0d835b0b2bf729d09b))


### Performance Improvements

* configure benchmark options per-test for better control ([de40bd7](https://github.com/TimBeyer/dancing-links/commit/de40bd7f3c13d48f7b5e6c7dc515165f4ddb34fd))
* increase benchmark sample sizes for more stable results ([d75c3b1](https://github.com/TimBeyer/dancing-links/commit/d75c3b17942125d8db6f37739391e055b81bad3e))


### Reverts

* remove custom benchmark options, use Benchmark.js defaults ([756652e](https://github.com/TimBeyer/dancing-links/commit/756652e2bfc8c0ce8aa1ae25202900ee06ce68cb))

## [4.3.4](https://github.com/TimBeyer/dancing-links/compare/v4.3.3...v4.3.4) (2026-01-15)


### Bug Fixes

* add version parsing step for setup actions ([87bacb5](https://github.com/TimBeyer/dancing-links/commit/87bacb59a5374d367cf54f0617f1a773acedf9c6))
* correct GitHub Actions expression syntax in workflows ([db351de](https://github.com/TimBeyer/dancing-links/commit/db351dec6378048e6ee24420ab570ddafe7682c4))
* use matrix includes instead of replace() function ([e0dab4e](https://github.com/TimBeyer/dancing-links/commit/e0dab4e8ff3c54f2e9f83927ffb1fcb304478aff))

## [4.3.3](https://github.com/TimBeyer/dancing-links/compare/v4.3.2...v4.3.3) (2026-01-14)

## [4.3.2](https://github.com/TimBeyer/dancing-links/compare/v4.3.1...v4.3.2) (2025-08-15)


### Performance Improvements

* use switch/case instead of dictionary lookup for state machine ([d695c26](https://github.com/TimBeyer/dancing-links/commit/d695c26a9e11f729e26a55536a2c4e077f78455a))

## [4.3.1](https://github.com/TimBeyer/dancing-links/compare/v4.3.0...v4.3.1) (2025-08-08)

# [4.3.0](https://github.com/TimBeyer/dancing-links/compare/v4.2.2...v4.3.0) (2025-08-07)


### Features

* add fast solver with batch constraint optimization ([317064d](https://github.com/TimBeyer/dancing-links/commit/317064dc7a18f40cb1f1a4b16a15e17dd540c0d9))


### Performance Improvements

* unify constraint system with efficient ConstraintRow POJOs ([1fefdcb](https://github.com/TimBeyer/dancing-links/commit/1fefdcb8ec8f5625e3bafa118470be84a9bc6ce5))

## [4.2.2](https://github.com/TimBeyer/dancing-links/compare/v4.2.1...v4.2.2) (2025-08-07)

# [4.2.0](https://github.com/TimBeyer/dancing-links/compare/v4.1.0...v4.2.0) (2025-08-06)


### Bug Fixes

* correct path resolution and JSON parsing in benchmark docs script ([d168af8](https://github.com/TimBeyer/dancing-links/commit/d168af8d9dc73a3d83f2e99694019b6b3119e907))
* eliminate mutable instance state from benchmark solvers ([784d71c](https://github.com/TimBeyer/dancing-links/commit/784d71cc57f06f60f231799ef083c1c0eb0198a4))
* format ops/sec to 2 decimal places in benchmark results ([442006f](https://github.com/TimBeyer/dancing-links/commit/442006faef2a2367aed633079089b8a4f9179a23))
* preserve full precision in benchmark results ([ba5deed](https://github.com/TimBeyer/dancing-links/commit/ba5deed10c183b3c12a91eab081cb23f594238d4))
* properly separate main and dev TypeScript configurations ([488bb50](https://github.com/TimBeyer/dancing-links/commit/488bb50f70fd9419dc5cb0e4cdb6e3e24c4d93d3))
* replace any type with proper types in template solver ([f83adba](https://github.com/TimBeyer/dancing-links/commit/f83adba9f09f2182ad781a79a3294a8c00d1ed73))
* round margin percentages to 2 decimal places in benchmark comparisons ([2071d38](https://github.com/TimBeyer/dancing-links/commit/2071d384299361003f034ebac7a16f3c4565f55d))
* working modular benchmark system ([370e45a](https://github.com/TimBeyer/dancing-links/commit/370e45aa3c671a773c70afa31f92740b23c847c5))


### Features

* add automated benchmark documentation system ([4534e2a](https://github.com/TimBeyer/dancing-links/commit/4534e2a24976077cfc4c9acb971a2be89b7144e6))
* implement descriptive solver names with static name property ([ae67510](https://github.com/TimBeyer/dancing-links/commit/ae675104d782f0ab466d7cd0044ca8ccdba64154))
* include binary solver in competitive benchmarks for fair comparison ([1f7d445](https://github.com/TimBeyer/dancing-links/commit/1f7d44595eee83e38df8760fe245ddb7b8a767af))
* make benchmark results directly visible in README ([69b6005](https://github.com/TimBeyer/dancing-links/commit/69b60055b061300706f5c0cbe2c1610f901de230))
* update README benchmarks and add auto-formatting to doc script ([593b713](https://github.com/TimBeyer/dancing-links/commit/593b713f9ffeb1bb5de0585abd44a6ba4e64df9a))

# [4.1.0](https://github.com/TimBeyer/dancing-links/compare/v4.0.0...v4.1.0) (2025-08-06)


### Bug Fixes

* add generator benchmark to single pentomino tiling test ([9f01206](https://github.com/TimBeyer/dancing-links/commit/9f0120606794c9bd389e12c8997b82e128f00aed))


### Features

* add resumable generator interface for streaming solutions ([0b229b3](https://github.com/TimBeyer/dancing-links/commit/0b229b33b29d38d925ea8bd080762863bb575f05))

# [4.0.0](https://github.com/TimBeyer/dancing-links/compare/v3.3.0...v4.0.0) (2025-08-05)


### Bug Fixes

* address codebase review issues and improve code quality ([501ce0e](https://github.com/TimBeyer/dancing-links/commit/501ce0e203a510e03f0259646c2cec723d156188))
* disable commitlint footer line length rule and format code ([15b9888](https://github.com/TimBeyer/dancing-links/commit/15b9888524411f16b4ed1b5b1dae95baa9c092f4))
* replace any with proper union types in factory methods ([6f30676](https://github.com/TimBeyer/dancing-links/commit/6f306764a0a1fd1688da8a602376f71940150451))
* resolve benchmark formatting and CI comparison issues ([246fc7a](https://github.com/TimBeyer/dancing-links/commit/246fc7a0480c1f55f0099324e683c2cc4d00dbff))
* resolve linting errors and improve test coverage ([61d4b4d](https://github.com/TimBeyer/dancing-links/commit/61d4b4db120c397bb1bdc3737a1317f7fe3cf43a))
* resolve TypeScript compilation error in constraint handlers ([2b37f50](https://github.com/TimBeyer/dancing-links/commit/2b37f50e1d40e2ea0b91104485a89f2c9d1c2c68))
* support positional filename argument in benchmark JSON mode ([4b9ca83](https://github.com/TimBeyer/dancing-links/commit/4b9ca833cd3fa6ed78cc6b07b1c18960412685dc))


### Code Refactoring

* remove deprecated legacy API and clean up codebase ([5810ea3](https://github.com/TimBeyer/dancing-links/commit/5810ea3eda4f3da604fef87be35448e72d99dfe5))


### Features

* add backward compatibility with deprecation notices ([0e0d712](https://github.com/TimBeyer/dancing-links/commit/0e0d712861467f8c1faf7b582b7739fcd52c9050))
* complete high-performance caching API implementation ([43174b6](https://github.com/TimBeyer/dancing-links/commit/43174b69c29a27637f7156f9c6256e4c5164fe1d))
* consolidate benchmark system with unified CLI interface ([93592fe](https://github.com/TimBeyer/dancing-links/commit/93592fe38633cee6f325bc298ff1d0e81b6496c7))
* deprecate remaining legacy API functions ([f2dbc89](https://github.com/TimBeyer/dancing-links/commit/f2dbc89090d76bbd0f208776b537f0d479d44b76))
* implement dual interface with sparse and binary constraint support ([176e1ef](https://github.com/TimBeyer/dancing-links/commit/176e1efbdc484f3b8740081345c085e386ae6358))
* implement high-performance constraint caching API ([91a109d](https://github.com/TimBeyer/dancing-links/commit/91a109dcaa8b9216b6eacaaea4d49cdb953bb64a))
* implement strongly typed factory methods with conditional types ([aae13ce](https://github.com/TimBeyer/dancing-links/commit/aae13ce9d2edf1346f7e960ca8034350550baa19))
* implement type-safe SolverTemplate with upfront configuration validation ([d822b0b](https://github.com/TimBeyer/dancing-links/commit/d822b0b324106d16394adbb2c35f047f2245b758))


### Performance Improvements

* add comprehensive benchmarks for new caching API ([00aa7e9](https://github.com/TimBeyer/dancing-links/commit/00aa7e9165d8f485a8e4ad733bc79b521bffeb57))
* convert Row interface to class for V8 optimization ([7036713](https://github.com/TimBeyer/dancing-links/commit/703671309b09167593106b683c8465bbdf61402f))
* eliminate unnecessary array copying in sparse constraints ([e498c76](https://github.com/TimBeyer/dancing-links/commit/e498c766d155212b6bb7393a470d9cca5ff1d1aa))
* implement batch operations with runtime caching optimizations ([7dc2c89](https://github.com/TimBeyer/dancing-links/commit/7dc2c899ee803e9768587ce8cc64c226e3a0186c))
* implement optional validation for production performance ([fd942ab](https://github.com/TimBeyer/dancing-links/commit/fd942ab6775d1975f29e7347057ba94f16e1bd78))
* optimize benchmarks to show real-world API usage patterns ([b05d019](https://github.com/TimBeyer/dancing-links/commit/b05d0198010fcf2f2e457361ad08d7b600de755d))
* optimize constraint handlers and fix misleading parameter naming ([4854099](https://github.com/TimBeyer/dancing-links/commit/48540997fb46fa93140667cc1980b0fcd6911c40))
* optimize constraint processing with single-pass algorithms ([d1d8ea1](https://github.com/TimBeyer/dancing-links/commit/d1d8ea10ce95b10a8a18d110bbeb71275fd57c2a))
* replace abstract inheritance with interface delegation pattern ([58c5ad9](https://github.com/TimBeyer/dancing-links/commit/58c5ad940dbdb116d7e2fa349a802e54abb549ac))


### BREAKING CHANGES

* Legacy functional API (findOne, findAll, find, findRaw) has been removed. Use the new DancingLinks class API instead.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>

# [3.4.0](https://github.com/TimBeyer/dancing-links/compare/v3.3.0...v3.4.0) (2025-08-02)


### Bug Fixes

* address codebase review issues and improve code quality ([501ce0e](https://github.com/TimBeyer/dancing-links/commit/501ce0e203a510e03f0259646c2cec723d156188))
* replace any with proper union types in factory methods ([6f30676](https://github.com/TimBeyer/dancing-links/commit/6f306764a0a1fd1688da8a602376f71940150451))
* resolve benchmark formatting and CI comparison issues ([246fc7a](https://github.com/TimBeyer/dancing-links/commit/246fc7a0480c1f55f0099324e683c2cc4d00dbff))
* resolve linting errors and improve test coverage ([61d4b4d](https://github.com/TimBeyer/dancing-links/commit/61d4b4db120c397bb1bdc3737a1317f7fe3cf43a))
* resolve TypeScript compilation error in constraint handlers ([2b37f50](https://github.com/TimBeyer/dancing-links/commit/2b37f50e1d40e2ea0b91104485a89f2c9d1c2c68))
* support positional filename argument in benchmark JSON mode ([4b9ca83](https://github.com/TimBeyer/dancing-links/commit/4b9ca833cd3fa6ed78cc6b07b1c18960412685dc))


### Features

* add backward compatibility with deprecation notices ([0e0d712](https://github.com/TimBeyer/dancing-links/commit/0e0d712861467f8c1faf7b582b7739fcd52c9050))
* complete high-performance caching API implementation ([43174b6](https://github.com/TimBeyer/dancing-links/commit/43174b69c29a27637f7156f9c6256e4c5164fe1d))
* consolidate benchmark system with unified CLI interface ([93592fe](https://github.com/TimBeyer/dancing-links/commit/93592fe38633cee6f325bc298ff1d0e81b6496c7))
* deprecate remaining legacy API functions ([f2dbc89](https://github.com/TimBeyer/dancing-links/commit/f2dbc89090d76bbd0f208776b537f0d479d44b76))
* implement dual interface with sparse and binary constraint support ([176e1ef](https://github.com/TimBeyer/dancing-links/commit/176e1efbdc484f3b8740081345c085e386ae6358))
* implement high-performance constraint caching API ([91a109d](https://github.com/TimBeyer/dancing-links/commit/91a109dcaa8b9216b6eacaaea4d49cdb953bb64a))
* implement strongly typed factory methods with conditional types ([aae13ce](https://github.com/TimBeyer/dancing-links/commit/aae13ce9d2edf1346f7e960ca8034350550baa19))
* implement type-safe SolverTemplate with upfront configuration validation ([d822b0b](https://github.com/TimBeyer/dancing-links/commit/d822b0b324106d16394adbb2c35f047f2245b758))


### Performance Improvements

* add comprehensive benchmarks for new caching API ([00aa7e9](https://github.com/TimBeyer/dancing-links/commit/00aa7e9165d8f485a8e4ad733bc79b521bffeb57))
* convert Row interface to class for V8 optimization ([7036713](https://github.com/TimBeyer/dancing-links/commit/703671309b09167593106b683c8465bbdf61402f))
* eliminate unnecessary array copying in sparse constraints ([e498c76](https://github.com/TimBeyer/dancing-links/commit/e498c766d155212b6bb7393a470d9cca5ff1d1aa))
* implement batch operations with runtime caching optimizations ([7dc2c89](https://github.com/TimBeyer/dancing-links/commit/7dc2c899ee803e9768587ce8cc64c226e3a0186c))
* implement optional validation for production performance ([fd942ab](https://github.com/TimBeyer/dancing-links/commit/fd942ab6775d1975f29e7347057ba94f16e1bd78))
* optimize benchmarks to show real-world API usage patterns ([b05d019](https://github.com/TimBeyer/dancing-links/commit/b05d0198010fcf2f2e457361ad08d7b600de755d))
* optimize constraint handlers and fix misleading parameter naming ([4854099](https://github.com/TimBeyer/dancing-links/commit/48540997fb46fa93140667cc1980b0fcd6911c40))
* optimize constraint processing with single-pass algorithms ([d1d8ea1](https://github.com/TimBeyer/dancing-links/commit/d1d8ea10ce95b10a8a18d110bbeb71275fd57c2a))
* replace abstract inheritance with interface delegation pattern ([58c5ad9](https://github.com/TimBeyer/dancing-links/commit/58c5ad940dbdb116d7e2fa349a802e54abb549ac))

# [3.3.0](https://github.com/TimBeyer/dancing-links/compare/v3.2.2...v3.3.0) (2025-08-01)


### Bug Fixes

* add compare-benchmarks npm script and use in workflow ([0d3f986](https://github.com/TimBeyer/dancing-links/commit/0d3f98600a35360935cc1745b3e819d62002f99a))
* add null checks for strict TypeScript compliance ([a89b6e2](https://github.com/TimBeyer/dancing-links/commit/a89b6e228dafee8f23cacec6a5dcd719f996eb78))
* address additional Copilot review comments ([cfccc1d](https://github.com/TimBeyer/dancing-links/commit/cfccc1de1cdda1956c596a4f42fdc3b7fae526e3))
* address Copilot review comments ([c7f3cc9](https://github.com/TimBeyer/dancing-links/commit/c7f3cc9610483c841805405b643e108f12a9c063))
* calculate merge-base in comment job for proper display ([2ec7983](https://github.com/TimBeyer/dancing-links/commit/2ec7983b983b0cdd98705ea96cb67c1b1b18f6d4))
* correct direct execution detection in comparison script ([c6066ee](https://github.com/TimBeyer/dancing-links/commit/c6066eeb2c9053811ac29fda4ee4b4eb4e1e21c4))
* improve benchmark error handling ([fd2a2b0](https://github.com/TimBeyer/dancing-links/commit/fd2a2b0eb33cadb3cf65dc44a447e55d206a3592))
* include scripts folder in dev TypeScript build ([8a2ebcb](https://github.com/TimBeyer/dancing-links/commit/8a2ebcb71c85ba37b08ac4f38149719dd8e1da8b))
* output pure JSON by writing to file instead of stdout ([bb819ef](https://github.com/TimBeyer/dancing-links/commit/bb819efe11122f6d8f3a4f17641f0416204f3ea2))
* parse benchmark sections correctly ([5341f51](https://github.com/TimBeyer/dancing-links/commit/5341f51ca37d02d0ca746391774bfdf020c98b4a))
* remove old benchmark file ([983049d](https://github.com/TimBeyer/dancing-links/commit/983049d83054e1fcc06fa56bf39d8ea7f2654aad))
* use direct package.json check for script existence ([56c6769](https://github.com/TimBeyer/dancing-links/commit/56c6769d59a759c5c4b823dbaf9d95d5319755e2))


### Features

* add PR benchmark comparison with automated comments ([d1efae8](https://github.com/TimBeyer/dancing-links/commit/d1efae8d19272fdbe33cd179f5095c9f276134c8))
* handle first PR scenario gracefully when baseline unavailable ([2812fc8](https://github.com/TimBeyer/dancing-links/commit/2812fc865f6f43443efd872784ae7c4ae59c1b8b))
* improve benchmark error reporting and handle missing scripts ([1e8533d](https://github.com/TimBeyer/dancing-links/commit/1e8533db71daebb2ea049c7b97958ce03f8c0eef))
* structured JSON benchmarks ([ab6c3ce](https://github.com/TimBeyer/dancing-links/commit/ab6c3ce2e7e04ae0460c38b4fedfa06342416e07))


### Performance Improvements

* remove duplicate build step in benchmark workflow ([a8d8836](https://github.com/TimBeyer/dancing-links/commit/a8d8836f65f6f1fb4cb588c3fbe936d0000f978c))

## [3.2.2](https://github.com/TimBeyer/dancing-links/compare/v3.2.1...v3.2.2) (2025-07-31)

## [3.2.1](https://github.com/TimBeyer/dancing-links/compare/v3.2.0...v3.2.1) (2025-07-31)


### Bug Fixes

* use correct npm script for coverage in test workflow ([335db17](https://github.com/TimBeyer/dancing-links/commit/335db1749ce02ba12e03946fb037dc9b006f5b66))

# [3.2.0](https://github.com/TimBeyer/dancing-links/compare/v3.1.0...v3.2.0) (2025-07-31)

### Bug Fixes

- correct typo 'sodoku' to 'sudoku' in benchmark output ([6a550e1](https://github.com/TimBeyer/dancing-links/commit/6a550e1c183b19f63e146db8c3241892e4a6bdf6))
- enable profiler with vscode compatible output format ([84352c7](https://github.com/TimBeyer/dancing-links/commit/84352c7eeb701e321113786774d60f09acb64746))

### Features

- add development benchmark comparing Original AoS vs SoA ([0e4d3fb](https://github.com/TimBeyer/dancing-links/commit/0e4d3fb341b950f0fe9a982844a7a9c7892ed256))
- implement Struct-of-Arrays data structures for Dancing Links ([89613e6](https://github.com/TimBeyer/dancing-links/commit/89613e6158bb2b2bbb613c7270237226352710ca))
- separate fast benchmarks from library comparison benchmarks ([37a289b](https://github.com/TimBeyer/dancing-links/commit/37a289b0b5c12d7b6f12cebd1e13ed9673b93856))
- use classes instead of POJOs for better lookup performance ([584ba0e](https://github.com/TimBeyer/dancing-links/commit/584ba0eaf43221a3d38bd28d0d0feac3fbe7b544))

### Performance Improvements

- complete systematic optimization testing ([085ada8](https://github.com/TimBeyer/dancing-links/commit/085ada8540d6358da5c744f7a0b3ce4a3946660f))
- phase 1a enhanced column selection heuristic - reverted ([b4e3340](https://github.com/TimBeyer/dancing-links/commit/b4e3340c843936440db378dac62c7b14d4c889cf))
- phase 1b column length tracking - implementation failed ([f3d9a98](https://github.com/TimBeyer/dancing-links/commit/f3d9a9839c3260b9cafab24825ffe9fcc1dd1fcc))
- phase 2a unit propagation - kept ([d2d3a84](https://github.com/TimBeyer/dancing-links/commit/d2d3a846fe796ead39c6de5ac76cdc1208a1ebe5))
- phase 2b memory layout optimization - reverted ([a668d6a](https://github.com/TimBeyer/dancing-links/commit/a668d6aa09ea219bb0b5c7cf5937d3b363861de7))
- phase 2b memory layout optimization retry - reverted ([bdb4fcf](https://github.com/TimBeyer/dancing-links/commit/bdb4fcfbe419bc6be5d8b2b6a4a8c2285267d005))
- phase 3a symmetry breaking - conceptual failure ([21f8a47](https://github.com/TimBeyer/dancing-links/commit/21f8a473d1d3471688f0a65e84c6ef2dfd35c622))
- remaining opt 1 cache warming - reverted ([f546461](https://github.com/TimBeyer/dancing-links/commit/f5464611426cc555a917e65fc42d11b86899a5ff))
- remaining opt 4 extended unit propagation - reverted ([0acf8bc](https://github.com/TimBeyer/dancing-links/commit/0acf8bc26a41962824ff8fab249a22e47eb835ed))
- systematic optimization testing - Tests 1-5 complete ([3474482](https://github.com/TimBeyer/dancing-links/commit/34744823807e706f36eb400243ef93ee0cb635c0))
- test 7 inline forward function - reverted ([b5fa57b](https://github.com/TimBeyer/dancing-links/commit/b5fa57b99e43f6b229d3e304393d7a951e54af66))
- test 8 local variable caching - reverted ([6248b88](https://github.com/TimBeyer/dancing-links/commit/6248b88c7c1aea93aca3c891ea535247a96d5cbb))
- test 9 pre-calculate next pointers - kept ([62a78c8](https://github.com/TimBeyer/dancing-links/commit/62a78c8d606202cf45e6dc72866a843a31510a2c))

# [3.1.0](https://github.com/TimBeyer/dancing-links/compare/v3.0.0...v3.1.0) (2025-07-15)

### Bug Fixes

- add workflow dependency and build step to release workflow ([70aa08f](https://github.com/TimBeyer/dancing-links/commit/70aa08f6cf8d0f7c2e6c520b348361fed8ee83b3))
- replace custom commitlint logic with wagoid/commitlint-github-action ([837f7ec](https://github.com/TimBeyer/dancing-links/commit/837f7ecf75bac4cfa31c331a30009f9f301d7273))
- revert CHANGELOG.md formatting and remove commitlint script ([01f4e9a](https://github.com/TimBeyer/dancing-links/commit/01f4e9a88e6f422f86a78b274c0975cefc9e3118))

### Features

- implement release automation formatting and conventional commits improvements ([192a55a](https://github.com/TimBeyer/dancing-links/commit/192a55aaf1dd98ccb61ba60c6abcefcaf2715033))

# [3.0.0](https://github.com/TimBeyer/dancing-links/compare/v2.1.1...v3.0.0) (2025-07-15)

- feat!: require Node.js 20+ and add conventional commits guidelines ([8fab697](https://github.com/TimBeyer/dancing-links/commit/8fab697c82fe8af95ecdf60e3d5575e799d658e2))

### Bug Fixes

- missing Result type ([031e0ca](https://github.com/TimBeyer/dancing-links/commit/031e0ca2a0be3cce77d1f70bed14668be9517e48))

### BREAKING CHANGES

- Node.js 20+ is now required. The minimum supported Node.js version has been increased from 18 to 20 to align with the modernized CI/CD pipeline and take advantage of newer Node.js features.

Co-authored-by: TimBeyer <2362075+TimBeyer@users.noreply.github.com>
