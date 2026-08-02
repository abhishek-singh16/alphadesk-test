// main.tsx — React entry point: mounts <App/> under StrictMode.
// Vite scaffold, unchanged; all AlphaDesk code lives below App.
// Introduced in Session 01.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
