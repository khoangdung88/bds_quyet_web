import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: false,
      cors: true
    },
    preview: {
      allowedHosts: true,
      port: 5173
    },
    build: {
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      } : undefined,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            antd: ['antd', '@ant-design/icons'],
            vendor: ['@supabase/supabase-js']
          }
        }
      }
    },
    resolve: {
      alias: [
        { find: '@', replacement: '/src' },
        { find: '@components', replacement: '/src/components' },
        { find: '@pages', replacement: '/src/pages' }
      ]
    }
  };
});
