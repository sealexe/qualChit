import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Явно фиксируем 127.0.0.1: при включённом VPN имя "localhost" в браузере
    // иногда резолвится в IPv6 (::1), а Vite слушает только IPv4 — из-за этого
    // сайт не открывается (ERR_CONNECTION_REFUSED).
    host: '127.0.0.1',
  },
})
