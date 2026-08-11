import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_SERVER_URL || 'http://127.0.0.1:5000'

  return {
    plugins: [react()],
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, req, res) => {
              if (err.code === 'ECONNREFUSED') {
                if (!res.headersSent) {
                  res.writeHead(503, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Backend server is not running or starting up' }));
                }
                return;
              }
              console.error('Vite Proxy Error:', err);
            });
          },
        },
        '/uploads': {
          target: backendUrl,
          changeOrigin: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, req, res) => {
              if (err.code === 'ECONNREFUSED') {
                if (!res.headersSent) {
                  res.writeHead(503, { 'Content-Type': 'text/plain' });
                  res.end('Backend server offline');
                }
                return;
              }
              console.error('Vite Proxy Error:', err);
            });
          },
        },
      },
    },
  }
})

