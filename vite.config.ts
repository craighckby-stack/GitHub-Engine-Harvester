import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {handleEngineApi} from './src/server/engine-api';
import {handleGitHubApi} from './src/server/github-api';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'dsh-engine-server-middleware',
        configureServer(server) {
          // Safeguard Vite Node process against unexpected network or socket terminations
          process.on('unhandledRejection', (reason) => {
            console.warn('[Server Middleware] Intercepted unhandled rejection:', reason);
          });
          process.on('uncaughtException', (err) => {
            console.warn('[Server Middleware] Intercepted uncaught exception:', err);
          });

          server.middlewares.use((req, res, next) => {
            const url = req.url || '';
            if (url.startsWith('/api/github/')) {
              handleGitHubApi(req, res, next).catch((err) => {
                console.error('[GitHub API Handler Error]:', err);
                if (!res.headersSent && !res.writableEnded) {
                  res.setHeader('Content-Type', 'application/json');
                  res.writeHead(500);
                  res.end(JSON.stringify({ error: 'Internal Server Error' }));
                } else {
                  next(err);
                }
              });
            } else if (url.startsWith('/api/engine/')) {
              try {
                handleEngineApi(req, res, next);
              } catch (innerErr) {
                console.error('[Engine API Handler Error]:', innerErr);
                if (!res.headersSent && !res.writableEnded) {
                  res.setHeader('Content-Type', 'application/json');
                  res.writeHead(500);
                  res.end(JSON.stringify({ error: 'Internal Server Error' }));
                } else {
                  next(innerErr);
                }
              }
            } else {
              next();
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
