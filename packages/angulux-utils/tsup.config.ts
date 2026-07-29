import { globSync } from 'glob';
import { defineConfig } from 'tsup';

const isProduction = process.env.NODE_ENV === 'production';

const entry = globSync('src/**/index.ts').reduce((acc: Record<string, string>, file: string) => {
    // `glob` returns PLATFORM separators, so on Windows this arrives as `src\dom\index.ts`
    // and the `/^src\//` strip silently misses. The entry KEY then keeps the prefix and every
    // artifact lands in `dist/src/**` while package.json promises `dist/**` — and tsup still
    // exits 0. Measured identical on glob 11.1.0 and 13.0.6: latent, not a version regression.
    // Guarded by check-publishable, which reads the emitted paths back off the real tarball.
    const name = file.replace(/\\/g, '/').replace(/^src\//, '').replace(/\.ts$/, '');

    acc[name] = file;

    return acc;
}, {});

export default defineConfig({
    entry,
    format: ['esm'],
    outDir: 'dist',
    dts: true,
    external: [/^@anguless\/angulux-(.*)$/],
    minify: isProduction,
    sourcemap: isProduction,
    splitting: false,
    clean: isProduction
});
