import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    minify: 'terser',
    lib: {
      entry: 'src/rough-notation.ts',
      formats: ['es'],
      fileName: 'rough-notation',
    },
    rollupOptions: {
      external: [],
    },
  },
  plugins: [dts({ include: ['src'], tsconfigPath: './tsconfig.build.json' })],
});
