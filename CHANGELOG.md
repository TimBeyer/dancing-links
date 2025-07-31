# Changelog

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
