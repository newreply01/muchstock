import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import './i18n/config'
import ErrorBoundary from './components/shared/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('[main.jsx] #root element not found! Check index.html.');
} else {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <BrowserRouter>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ThemeProvider>
                <App />
              </ThemeProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </StrictMode>,
  );
}
