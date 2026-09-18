import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/generate') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              let parsedBody = {};
              try {
                parsedBody = body ? JSON.parse(body) : {};
              } catch (_) {}

              const module = await server.ssrLoadModule('/api/generate.ts');
              const handler = module.default;

              const vercelReq = Object.assign(req, { body: parsedBody });
              const vercelRes = Object.assign(res, {
                status(statusCode: number) {
                  res.statusCode = statusCode;
                  return vercelRes;
                },
                json(data: any) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                  return vercelRes;
                },
                send(data: any) {
                  res.end(data);
                  return vercelRes;
                }
              });

              await handler(vercelReq, vercelRes);
            } catch (err: any) {
              console.error('API Dev Server Middleware Error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Erro interno no dev server da API' }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), apiDevPlugin()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            icons: ['lucide-react'],
            data: ['xlsx', 'papaparse'],
          },
        },
      },
    },
  };
});
