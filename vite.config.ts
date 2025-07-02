import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

// === ENVIRONMENT SETUP ===
// Ensure NODE_ENV is set for development
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry point
        entry: 'src/main/main.ts',
        onstart(args) {
          // Start Electron when the main process is built
          args.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['better-sqlite3', 'active-win', 'electron']
            },
            sourcemap: true,
            minify: false
          },
          resolve: {
            alias: {
              '@': path.resolve(__dirname, 'src'),
              '@/main': path.resolve(__dirname, 'src/main'),
              '@/renderer': path.resolve(__dirname, 'src/renderer'),
              '@/shared': path.resolve(__dirname, 'src/shared'),
              '@/preload': path.resolve(__dirname, 'src/preload')
            }
          },
          define: {
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
          }
        }
      },
      {
        // Preload script
        entry: 'src/preload/preload.ts',
        onstart(args) {
          // Reload preload scripts (but don't start Electron again)
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: 'inline',
            minify: false,
            rollupOptions: {
              external: ['electron'],
            },
          },
          resolve: {
            alias: {
              '@': path.resolve(__dirname, 'src'),
              '@/main': path.resolve(__dirname, 'src/main'),
              '@/renderer': path.resolve(__dirname, 'src/renderer'),
              '@/shared': path.resolve(__dirname, 'src/shared'),
              '@/preload': path.resolve(__dirname, 'src/preload')
            }
          },
          define: {
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/main': path.resolve(__dirname, 'src/main'),
      '@/renderer': path.resolve(__dirname, 'src/renderer'),
      '@/shared': path.resolve(__dirname, 'src/shared'),
      '@/preload': path.resolve(__dirname, 'src/preload')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
}) 