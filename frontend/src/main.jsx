import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@context/AuthContext'
import router from './router'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      {/*
        Toast notifications — positioned top-right, dark themed.
        Accessible: toasts are announced to screen readers via aria-live.
      */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(228, 18%, 13%)',
            color:       'hsl(213, 31%, 95%)',
            border:      '1px solid hsl(228, 16%, 18%)',
            borderRadius: '10px',
            fontSize:    '0.875rem',
            fontWeight:  500,
            boxShadow:   '0 8px 32px rgba(0,0,0,0.5)',
            fontFamily:  'Inter, system-ui, sans-serif',
          },
          success: {
            iconTheme: { primary: 'hsl(142,71%,45%)', secondary: 'hsl(228,18%,13%)' },
          },
          error: {
            iconTheme: { primary: 'hsl(0,84%,60%)', secondary: 'hsl(228,18%,13%)' },
            duration: 5000,
          },
        }}
      />
    </AuthProvider>
  </React.StrictMode>
)
