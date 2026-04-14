// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// 新增：引入 node 的 path 模块
import path from 'path' 
import { fileURLToPath } from 'url'

// "type": "module"，需要这样获取 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // --- 新增：配置路径别名 ---
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})