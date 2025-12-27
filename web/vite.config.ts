import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
    build: {
    outDir: '../dist',          // 输出到 build/ 而不是 dist/
    assetsDir: 'static',      // 可选：静态资源子目录
    emptyOutDir: true,        // 构建前清空目录（默认 true）
  },
})
