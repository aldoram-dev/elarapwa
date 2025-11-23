import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ObraIndexPage from './ObraIndexPage'

export default function ObraLayout() {
  const location = useLocation()
  
  // Si estamos exactamente en /obra, mostrar la landing page
  // Si estamos en /obra/contratistas o /obra/contratos, mostrar el Outlet
  const isIndexRoute = location.pathname === '/obra'

  return isIndexRoute ? <ObraIndexPage /> : <Outlet />
}
