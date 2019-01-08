import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';

export default {
  input: 'src/index.ts',
  external: ['mustache', 'he'],
  output: [
    {
      name: 'KlausSpec',
      file: pkg.browser,
      format: 'umd',
      sourcemap: false,
      footer: 'module.exports.default = module.exports; \n'
    },
    {
      name: 'klaus-spec',
      file: pkg.module,
      sourcemap: false,
      format: 'es'
    },
    {
      name: 'klaus-spec',
      file: pkg.main,
      sourcemap: false,
      format: 'cjs'
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    babel({
      include: ['src/**/*'],
      exclude: /node_modules/,
      extensions: ['.js', '.jsx', '.ts', '.tsx']
    })
  ]
};
