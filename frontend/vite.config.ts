import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // A Vercel build without VITE_API_URL would ship a site that calls
  // http://localhost:5000 from visitors' browsers. Fail the deploy instead.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (process.env.VERCEL && !/^https:\/\//.test(env.VITE_API_URL || '')) {
    throw new Error('VITE_API_URL must be set to the HTTPS backend URL (e.g. https://api.edunexus.network/api/v1) in the Vercel project settings.');
  }
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-icons': ['lucide-react'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});
