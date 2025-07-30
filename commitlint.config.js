export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [commit => commit === 'Initial plan'],
  rules: {
    'body-max-line-length': [0, 'always'] // Disable body line length check
  }
}
