import { globSync } from 'glob';
import { defineConfig } from 'tsup';

const isProduction = process.env.NODE_ENV === 'production';

const entry = globSync('src/**/index.ts').reduce((acc: Record<string, string>, file: string) => {
    // `glob` returns PLATFORM separators, so on Windows this arrives as `src\lux\button\index.ts`
    // and the `/^src\//` strip would miss. Same guard as the sibling packages.
    const name = file.replace(/\\/g, '/').replace(/^src\//, '').replace(/\.ts$/, '');

    acc[name] = file;

    return acc;
}, {});

export default defineConfig([
    {
        entry,
        format: ['esm'],
        outDir: 'dist',
        // A preset entry imports its siblings by package name (`@anguless/angulux-themes/lux/button`),
        // so each one stays its own module and a consumer who overrides one component does not
        // load a second copy of the rest.
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
            index: 'src/index.ts'
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
