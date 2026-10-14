import { defineConfig } from 'tsup'

/**
 * Single-file ESM build → lib/index.js (committed with the package;
 * plugin/index.mjs is a thin shell re-exporting it).
 *
 * Host-provided deps stay external (peer/runtime), our small deps get inlined
 * so the published file is self-contained.
 */
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node18',
  outDir: 'lib',
  // 产物是固定单文件 index.js，clean 没有收益；client.js 由 build-client.mjs
  // 写入同一目录，clean: true 会让「只跑 tsup」把浏览器半侧产物一起抹掉。
  clean: false,
  dts: false,
  sourcemap: false,
  // `yaml` is CJS: inlining it into ESM leaves esbuild's `__require` shim with
  // no `require` in scope ("Dynamic require of \"process\" is not supported").
  // Defining it from import.meta.url keeps the bundle single-file + working.
  banner: {
    js: [
      "import { createRequire as __pptCreateRequire } from 'node:module';",
      'const require = __pptCreateRequire(import.meta.url);',
      '// dsh-ppt-maker — built artifact (tsup). Do not edit; edit src/ and run `npm run build`.'
    ].join('\n')
  },
  noExternal: ['yaml', 'fflate', '@xmldom/xmldom']
})
