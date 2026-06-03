import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard, Users, FileText, CreditCard,
  AlertTriangle, Settings, LogOut, MessageCircle, Phone
} from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const navItems = [
    { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['admin', 'billing_agent', 'recovery_agent'] },
    { to: '/clients', label: 'Clients', icon: Users, roles: ['admin', 'billing_agent', 'recovery_agent'] },
    { to: '/invoices', label: 'Factures', icon: FileText, roles: ['admin', 'billing_agent', 'recovery_agent'] },
    { to: '/payments', label: 'Paiements', icon: CreditCard, roles: ['admin', 'billing_agent', 'recovery_agent'] },
    { to: '/recovery', label: 'Recouvrement', icon: AlertTriangle, roles: ['admin', 'recovery_agent'] },
    { to: '/users', label: 'Utilisateurs', icon: Settings, roles: ['admin'] },
    { to: '/portal', label: 'Mon Espace', icon: Phone, roles: ['client'] },
    { to: '/chatbot', label: 'Assistant IA', icon: MessageCircle, roles: ['admin', 'billing_agent', 'recovery_agent', 'client'] },
  ]

  const visible = navItems.filter(item => item.roles.includes(user?.role || ''))

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-900 text-white flex flex-col">
        <div className="p-6 border-b border-blue-800">
          <h1 className="text-xl font-bold">TelecomPlatform</h1>
          <p className="text-blue-300 text-sm mt-1">{user?.name}</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-700 text-blue-200 text-xs rounded-full capitalize">
            {user?.role?.replace('_', ' ')}
          </span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {visible.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-blue-700 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-blue-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-blue-200 hover:text-white hover:bg-blue-800 rounded-lg text-sm transition-colors"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
