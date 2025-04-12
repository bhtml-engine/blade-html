// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    pnpm: true,
  },
  {
    rules: {
      'no-super-linear-backtracking': 'off',
      'regexp/no-super-linear-backtracking': 'off',
    },
  },
)
