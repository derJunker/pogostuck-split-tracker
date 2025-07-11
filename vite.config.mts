import { defineConfig } from 'vite';

export default defineConfig({
    root: 'src/frontend',
    base: './',
    build: {
        outDir: '../../build/frontend',
        emptyOutDir: true,
        rollupOptions: {
            input: [
                './src/frontend/index.html',
                './src/frontend/overlay.html'
            ]
        }
    }
});