import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/initialpages/LoginPage'
import ResetPasswordPage from './pages/initialpages/ResetPasswordPage'
import ResetPasswordConfirmPage from './pages/initialpages/ResetPasswordConfirmPage'
import Layout from './components/layout/Layout'
import RequireAuth from './components/auth/RequireAuth'
import { RequirePermission } from './lib/core/RequirePermission'
import { RequireAnon } from './components/auth/RequireAnon'
import { routes as appRoutes } from './lib/routing/routes'

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas (anónimas) */}
        <Route
          path="/login"
          element={
            <RequireAnon>
              <LoginPage />
            </RequireAnon>
          }
        />
        {/* Flujo de reset de contraseña (Supabase configurado para redirigir a /reset) */}
        <Route
          path="/reset"
          element={
            <RequireAnon>
              <ResetPasswordConfirmPage />
            </RequireAnon>
          }
        />
        <Route
          path="/reset-request"
          element={
            <RequireAnon>
              <ResetPasswordPage />
            </RequireAnon>
          }
        />

        {/* Rutas protegidas dentro del layout */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          {/* Mapeo de rutas de la app */}
          {appRoutes.map((r) => {
            const Element = r.element
            if (r.children?.length) {
              const Parent = r.element
              return (
                <Route key={r.path} path={r.path} element={
                  <Suspense fallback={null}>
                    {/* Protege secciones de configuración con permisos */}
                    {r.meta?.resourcePath?.startsWith('settings') ? (
                      <RequirePermission resource={r.meta.resourcePath} require="view">
                        <Parent />
                      </RequirePermission>
                    ) : (
                      <Parent />
                    )}
                  </Suspense>
                }>
                  {r.children.map((c) => {
                    const Child = c.element
                    return (
                      <Route
                        key={c.path}
                        path={c.path}
                        element={
                          <Suspense fallback={null}>
                            {/* Protege subsecciones de configuración con permisos */}
                            {c.meta?.resourcePath?.startsWith('settings') ? (
                              <RequirePermission resource={c.meta.resourcePath} require="view">
                                <Child />
                              </RequirePermission>
                            ) : (
                              <Child />
                            )}
                          </Suspense>
                        }
                      />
                    )
                  })}
                  {/* Redirect index of a parent route to its first child */}
                  <Route index element={<Navigate to={r.children[0].path} replace />} />
                </Route>
              )
            }
            return (
              <Route
                key={r.path}
                path={r.path}
                element={
                  <Suspense fallback={null}>
                    {/* Protege páginas de configuración con permisos */}
                    {r.meta?.resourcePath?.startsWith('settings') ? (
                      <RequirePermission resource={r.meta.resourcePath} require="view">
                        <Element />
                      </RequirePermission>
                    ) : (
                      <Element />
                    )}
                  </Suspense>
                }
              />
            )
          })}

          {/* Redirección del index a /inicio */}
          <Route index element={<Navigate to="/inicio" replace />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
