import { globSync } from 'glob';
import { defineConfig } from 'tsup';

const isProduction = process.env.NODE_ENV === 'production';

const entry = globSync('src/**/index.ts').reduce((acc: Record<string, string>, file: string) => {
    // `glob` returns PLATFORM separators, so on Windows this arrives as `src\button\index.ts`
    // and the `/^src\//` strip silently misses. Here the damage was invisible: the explicit
    // second config below still emitted a correct `dist/index.mjs`, so only the `./*` subpath
    // exports broke — `<pkg>/button` resolved to nothing while `<pkg>/src/button` worked.
    // Measured identical on glob 11.1.0 and 13.0.6: latent, not a version regression.
    // Guarded by check-publishable, which reads the emitted paths back off the real tarball.
    const name = file.replace(/\\/g, '/').replace(/^src\//, '').replace(/\.ts$/, '');

    acc[name] = file;

    return acc;
}, {});

export default defineConfig([
    {
        entry,
        format: ['esm'],
        outDir: 'dist',
        external: [/^@anguless\/angulux-(.*)$/],
        minify: isProduction ? 'terser' : false,
        sourcemap: isProduction,
        splitting: false,
        clean: isProduction,
        terserOptions: {
            mangle: {
                reserved: ['theme', 'style', 'css']
            }
        }
    },
    {
        entry: {
            index: 'src/index.ts',
            types: 'src/types.ts'
        },
        format: ['esm'],
        outDir: 'dist',
        dts: true,
        external: [/^@anguless\/angulux-(.*)$/],
        minify: isProduction,
        sourcemap: isProduction,
        splitting: false
    }
]);
