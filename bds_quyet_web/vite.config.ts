import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false
  },
  preview: {
    // Cho phép truy cập từ domain do Railway cấp
    allowedHosts: true
  }
})
