import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
})

const configuration = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // next-env.d.ts est régénéré par Next à chaque build et contient une
    // référence triple-slash qu'on ne contrôle pas.
    ignores: ['.next/**', 'node_modules/**', 'scripts/**', 'public/**', 'next-env.d.ts'],
  },
  {
    rules: {
      // Le fuseau est le risque numéro un de cette application : une habitude
      // cochée à 00h30 en Belgique tombe la veille en UTC. Toute notion de
      // « jour » passe par aujourdhui() dans src/lib/date.ts.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.callee.name='Date'][property.name='toISOString']",
          message:
            'Interdit : dériver un jour depuis toISOString(). Utiliser aujourdhui() de @/lib/date.',
        },
      ],
    },
  },
]

export default configuration
