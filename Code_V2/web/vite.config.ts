import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
        include: ['leaflet', 'react-leaflet'],
    },
    server: {
        port: 3000,
        open: true,
        proxy: {
            '/api': {
                target: 'http://10.20.30.1',
                changeOrigin: true,
            },
        },
    },
})
