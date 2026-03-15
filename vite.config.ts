import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

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
            // Use system `php` in CI (e.g. GitHub Actions); use Herd's PHP locally when not in CI
            command:
                process.env.PHP_BINARY ??
                (process.env.CI
                    ? 'php'
                    : `"${process.env.HOME}/Library/Application Support/Herd/bin/php84"`) +
                    ' artisan wayfinder:generate --with-form',
        }),
    ],
    esbuild: {
        jsx: 'automatic',
    },
});
