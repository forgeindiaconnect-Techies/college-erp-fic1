import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const correctHeroImage = 'C:/Users/Forgeindiaconnect/.gemini/antigravity-ide/brain/d8462177-e9ee-406b-a13e-542e3c83f059/college_campus_hero_1791805827516.jpg';
try {
  if (fs.existsSync(correctHeroImage)) {
    fs.copyFileSync(correctHeroImage, path.resolve(__dirname, 'public/college_campus_hero.jpg'));
    fs.copyFileSync(correctHeroImage, path.resolve(__dirname, 'public/campus_hero_bg.jpg'));
    fs.copyFileSync(correctHeroImage, path.resolve(__dirname, 'public/campus_bg.png'));
    console.log('✅ Exact reference modern college campus hero image synced to public!');
  }
} catch (e) {
  console.warn('Could not copy hero image:', e);
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
