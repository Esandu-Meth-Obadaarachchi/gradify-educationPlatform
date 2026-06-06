import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import Subjects from './pages/admin/Subjects'
import Topics from './pages/admin/Topics'
import Questions from './pages/admin/Questions'
import Papers from './pages/admin/Papers'
import PaperBuilder from './pages/admin/PaperBuilder'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/topics" element={<Topics />} />
              <Route path="/questions" element={<Questions />} />
              <Route path="/papers" element={<Papers />} />
              <Route path="/papers/new" element={<PaperBuilder />} />
              <Route path="/papers/:id" element={<PaperBuilder />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
