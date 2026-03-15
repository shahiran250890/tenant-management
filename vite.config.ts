import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

// Use PHP_BINARY if set; otherwise Herd's PHP only when that path exists (local Mac); else system `php` (CI, production server)
const herdPath =
    process.env.HOME &&
    join(process.env.HOME, 'Library/Application Support/Herd/bin/php84');
const phpForWayfinder =
    process.env.PHP_BINARY ??
    (herdPath && existsSync(herdPath) ? `"${herdPath}"` : 'php');

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
            command: `${phpForWayfinder} artisan wayfinder:generate --with-form`,
        }),
    ],
    esbuild: {
        jsx: 'automatic',
    },
});
