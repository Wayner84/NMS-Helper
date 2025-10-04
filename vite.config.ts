import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoBase = '/NMS-Helper/'

export default defineConfig({
  plugins: [react()],
  base: repoBase,
  build: {
    sourcemap: false
  }
})
