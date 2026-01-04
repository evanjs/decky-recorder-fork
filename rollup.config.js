import deckyPlugin from "@decky/rollup";

import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default deckyPlugin({
  plugins: [
    commonjs(),
    nodeResolve(),
    typescript(),
  ]
});
