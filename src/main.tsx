import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { useAppStore } from './store/useAppStore'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

const hydrateStore = async () => {
  try {
    await useAppStore.getState().hydrate()
  } catch (error) {
    console.error('Failed to hydrate store', error)
  }
}

void hydrateStore()

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL ?? '/'
    const swUrl = `${base}sw.js`
    navigator.serviceWorker
      .register(swUrl)
      .catch((error) => console.error('SW registration failed', error))
  })
}
