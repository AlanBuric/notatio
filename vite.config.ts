import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    // Vite 8 defaults to the Oxc minifier, which leaves output formatted and
    // costs ~13% gzip here. Terser matches the size of the pre-Vite build.
    minify: 'terser',
    lib: {
      entry: 'src/rough-notation.ts',
      // ESM only. Consumers on a CDN use <script type="module">, which every
      // browser supporting the ES2022 output also supports.
      formats: ['es'],
      fileName: 'rough-notation',
    },
    rollupOptions: {
      // roughjs is deliberately not externalized. Bundling it keeps the
      // package dependency-free and insulates us from the deep `roughjs/bin/*`
      // imports, which only resolve because roughjs ships no `exports` map.
      external: [],
    },
  },
  plugins: [dts({ include: ['src'] })],
});
