import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { websocketService } from './services/websocket'

websocketService.connect().catch(err => {
  console.warn('WebSocket connection failed, running without real-time updates:', err.message)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
