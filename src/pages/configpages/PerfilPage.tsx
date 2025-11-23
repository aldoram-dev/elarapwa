import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { User, Bell } from 'lucide-react'

import { MessageSquare } from 'lucide-react'

const tabs = [
  { to: '/perfil/mi-perfil', label: 'Mi Perfil', icon: <User className="w-4 h-4" /> },
  { to: '/perfil/notificaciones', label: 'Notificaciones', icon: <Bell className="w-4 h-4" /> },
  { to: '/perfil/foros', label: 'Foros', icon: <MessageSquare className="w-4 h-4" /> },
]

export default function PerfilPage() {
  return (
    <div className="w-full flex flex-col items-center space-y-8">
      {/* Header */}
      <header className="text-center w-full">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
          Mi Cuenta
        </h1>
        <p className="text-slate-600 mt-2">Gestiona tu perfil y preferencias.</p>
      </header>

      {/* Tabs navigation */}
      <nav aria-label="Perfil" className="flex justify-center">
        <ul className="flex flex-wrap gap-3">
          {tabs.map((t) => (
            <li key={t.to}>
              <NavLink
                to={t.to}
                className={({ isActive }) =>
                  [
                    'inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 text-sm font-medium transition-all select-none',
                    'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-500/30',
                    isActive
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white border-transparent shadow-lg shadow-violet-500/30'
                      : 'bg-white text-slate-700 border-slate-200/80 hover:border-violet-300',
                  ].join(' ')
                }
              >
                <span className="opacity-90">{t.icon}</span>
                <span>{t.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Page outlet area */}
      <section className="bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-lg p-10 w-full max-w-4xl">
        <Outlet />
      </section>
    </div>
  )
}
