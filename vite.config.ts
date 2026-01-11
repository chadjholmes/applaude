import { rmSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

export default defineConfig(({ command }) => {
  rmSync('dist-electron', { recursive: true, force: true })

  const isServe = command === 'serve'
  const isBuild = command === 'build'

  return {
    resolve: {
      alias: {
        '@': path.join(__dirname, 'src'),
      },
    },
    plugins: [
      react(),
      electron({
        main: {
          entry: 'electron/main/index.ts',
          vite: {
            build: {
              minify: isBuild,
              outDir: 'dist-electron/main',
              rollupOptions: {
                external: ['node-pty', 'electron-store'],
              },
            },
          },
        },
        preload: {
          input: 'electron/preload/index.ts',
          vite: {
            build: {
              minify: isBuild,
              outDir: 'dist-electron/preload',
            },
          },
        },
        renderer: {},
      }),
    ],
    clearScreen: false,
  }
})
