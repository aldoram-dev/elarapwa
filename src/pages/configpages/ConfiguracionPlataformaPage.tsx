import React, { useMemo } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { routes } from '@/lib/routing/routes'

const ConfiguracionPlataformaPage: React.FC = () => {
  // Construir tabs dinámicos desde la definición de rutas
  const location = useLocation()
  const configRoute = useMemo(() => routes.find(r => r.path === '/configuracion'), [])
  const childTabs = useMemo(() => {
    const children = (configRoute?.children || [])
      .filter(c => !!c && !!c.path && !!c.label)
      // Ocultar entradas marcadas como hidden o sandbox
      .filter(c => !c.meta?.hidden)
      .filter(c => !(c.meta?.resourcePath || '').includes('sandbox'))
      // Ordenar por meta.order si existe, si no por el orden declarado
      .sort((a, b) => {
        const ao = a.meta?.order ?? Number.MAX_SAFE_INTEGER
        const bo = b.meta?.order ?? Number.MAX_SAFE_INTEGER
        if (ao !== bo) return ao - bo
        return 0
      })

    return children.map((c) => ({
      to: `/configuracion/${c.path}`,
      label: c.label!,
      icon: c.icon,
    }))
  }, [configRoute?.children])

  return (
    <div className="space-y-8">
      {/* Tabs navigation (dinámicos) */}
      <nav aria-label="Configuración" className="border-b border-slate-200/70">
        <ul className="flex flex-wrap gap-1">
          {childTabs.map(t => (
            <li key={t.to}>
              <NavLink
                to={t.to}
                className={({ isActive }) =>
                  [
                    'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors',
                    isActive
                      ? 'text-emerald-700 border-emerald-600'
                      : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                  ].join(' ')
                }
              >
                <span className="opacity-80">{t.icon}</span>
                <span>{t.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Page outlet area */}
      <section className="bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-sm p-6">
        <Outlet />
      </section>
    </div>
  )
}

export default ConfiguracionPlataformaPage
 
