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
        host: true,   // bind to 0.0.0.0 so Android emulator can reach it via 10.0.2.2
        open: true,
        proxy: {
            '/api': {
                target: 'http://10.20.30.1',
                changeOrigin: true,
            },
        },
    },
})
