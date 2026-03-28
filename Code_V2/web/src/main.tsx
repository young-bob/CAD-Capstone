import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// PWA service worker: register only in production.
// In development, aggressively unregister old SW/caches to avoid stale bundles/env.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        if (import.meta.env.PROD) {
            navigator.serviceWorker.register('/sw.js').catch(() => {/* sw registration is non-critical */});
            return;
        }

        navigator.serviceWorker.getRegistrations()
            .then(regs => Promise.all(regs.map(r => r.unregister())))
            .catch(() => {/* ignore */});

        if ('caches' in window) {
            caches.keys()
                .then(keys => Promise.all(keys.map(k => caches.delete(k))))
                .catch(() => {/* ignore */});
        }
    });
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
