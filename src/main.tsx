import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { GlobalErrorBoundary } from './components/layout/GlobalErrorBoundary.tsx'
import { ToastProvider } from './components/common/Toast.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>,
)
