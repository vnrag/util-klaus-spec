import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';

export default [
  {
    input: 'src/index.ts',
    output: {
      name: 'KlausSpec',
      file: pkg.browser,
      sourcemap: false,
      format: 'umd',
      footer: 'module.exports.default = module.exports; \n',
      external: Object.keys(pkg.dependencies)
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript()
    ]
  },
  {
    input: 'src/index.ts',
    output: [
      {
        name: 'klaus-spec',
        file: pkg.module,
        sourcemap: false,
        format: 'es',
        external: Object.keys(pkg.dependencies)
      },
      {
        name: 'klaus-spec',
        file: pkg.main,
        sourcemap: false,
        format: 'cjs',
        external: Object.keys(pkg.dependencies)
      }
    ],
    plugins: [
      typescript()
    ]
  }
];
