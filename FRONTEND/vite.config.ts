import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: 'localhost',
    port: 3000,
    strictPort: true,
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  optimizeDeps: {
    include: ['pdfjs-dist', 'mammoth'],
  },
}));
