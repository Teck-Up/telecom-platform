import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ClientsPage from './pages/ClientsPage'
import InvoicesPage from './pages/InvoicesPage'
import PaymentsPage from './pages/PaymentsPage'
import RecoveryPage from './pages/RecoveryPage'
import UsersPage from './pages/UsersPage'
import ClientPortal from './pages/ClientPortal'
import ChatbotPage from './pages/ChatbotPage'

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { user } = useAuthStore()

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={
            user?.role === 'client'
              ? <Navigate to="/portal" replace />
              : <Dashboard />
          } />
          <Route path="clients" element={
            <PrivateRoute roles={['admin', 'billing_agent', 'recovery_agent']}>
              <ClientsPage />
            </PrivateRoute>
          } />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="payments" element={
            <PrivateRoute roles={['admin', 'billing_agent', 'recovery_agent']}>
              <PaymentsPage />
            </PrivateRoute>
          } />
          <Route path="recovery" element={
            <PrivateRoute roles={['admin', 'recovery_agent']}>
              <RecoveryPage />
            </PrivateRoute>
          } />
          <Route path="users" element={
            <PrivateRoute roles={['admin']}>
              <UsersPage />
            </PrivateRoute>
          } />
          <Route path="portal" element={
            <PrivateRoute roles={['client']}>
              <ClientPortal />
            </PrivateRoute>
          } />
          <Route path="chatbot" element={<ChatbotPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
