import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  assetsInclude: ['**/*.glb'], server: {
    // Allow Cloudflare tunnel domain or other public URLs
    allowedHosts: [
      'conduct-bones-sherman-begun.trycloudflare.com', // ✅ your tunnel domain
    ],
    // optional: expose your local dev server
    host: true,
    port: 5173,
  },
})
