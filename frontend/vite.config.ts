import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Tailwind v4 ships as a Vite plugin — there is no tailwind.config.js;
// design tokens live in CSS (@theme in src/index.css).
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
