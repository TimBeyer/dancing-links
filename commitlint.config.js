export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [commit => commit === 'Initial plan'],
  rules: {
    'body-max-line-length': [0, 'always'], // Disable body line length check
    'footer-max-line-length': [0, 'always'], // Disable footer line length check
    'subject-case': [0] // Disable subject case check to allow constant names like ROOT_COLUMN_OFFSET
  }
}
