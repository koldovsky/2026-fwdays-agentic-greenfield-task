import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './ui/useToast.ts'
import { ToastHost } from './ui/ToastHost.tsx'
import { ErrorBoundary } from './ui/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <ToastHost />
    </ToastProvider>
  </StrictMode>,
)
