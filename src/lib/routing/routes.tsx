import React from 'react'
import { Home, Users as UsersIcon, Settings as SettingsIcon, FileText, HardHat } from 'lucide-react'
import type { AppRoute } from './schema'

export const routes: AppRoute[] = [
  {
    path: '/inicio',
    label: 'Inicio',
    icon: <Home className="w-5 h-5" />,
    group: 'Inicio',
    meta: { resourcePath: 'inicio', hideProjectSelector: true },
    element: React.lazy(() => import('../../pages/initialpages/DashboardPage')),
  },
  {
    path: '/obra',
    label: 'Administración de Obra',
    icon: <HardHat className="w-5 h-5" />,
    group: 'Operaciones',
    meta: { resourcePath: 'obra' },
    element: React.lazy(() => import('../../pages/obra/ObraLayout')),
    children: [
      {
        path: 'reglamento',
        label: 'Reglamento de Obra',
        icon: <FileText className="w-5 h-5" />,
        meta: { resourcePath: 'obra.reglamento', label: 'Reglamento', order: 0 },
        element: React.lazy(() => import('../../pages/obra/ReglamentoObraPage')),
      },
      {
        path: 'contratistas',
        label: 'Contratistas',
        icon: <UsersIcon className="w-5 h-5" />,
        meta: { resourcePath: 'obra.contratistas', label: 'Contratistas', order: 1 },
        element: React.lazy(() => import('../../pages/obra/ContratistasPage')),
      },
      {
        path: 'contratos',
        label: 'Contratos',
        icon: <FileText className="w-5 h-5" />,
        meta: { resourcePath: 'obra.contratos', label: 'Contratos', order: 2 },
        element: React.lazy(() => import('../../pages/obra/ContratosPage')),
      },
      {
        path: 'vigencia-contratos',
        label: 'Vigencia Contratos',
        icon: <FileText className="w-5 h-5" />,
        meta: { resourcePath: 'obra.vigencia', label: 'Vigencia', order: 3 },
        element: React.lazy(() => import('../../pages/obra/VigenciaContratosPage')),
      },
      {
        path: 'requisiciones-pago',
        label: 'Requisiciones de Pago',
        icon: <FileText className="w-5 h-5" />,
        meta: { resourcePath: 'obra.requisiciones', label: 'Requisiciones', order: 4 },
        element: React.lazy(() => import('../../pages/obra/RequisicionesPagoPage')),
      },
      {
        path: 'solicitudes-pago',
        label: 'Solicitudes de Pago',
        icon: <FileText className="w-5 h-5" />,
        meta: { resourcePath: 'obra.solicitudes', label: 'Solicitudes', order: 5 },
        element: React.lazy(() => import('../../pages/obra/SolicitudesPagoPage')),
      },
      {
        path: 'registro-pagos',
        label: 'Pagos',
        icon: <FileText className="w-5 h-5" />,
        meta: { resourcePath: 'obra.registro_pagos', label: 'Pagos', order: 6 },
        element: React.lazy(() => import('../../pages/obra/RegistroPagosPage')),
      },
      {
        path: 'estado-cuenta',
        label: 'Estado de Cuenta',
        icon: <FileText className="w-5 h-5" />,
        meta: { resourcePath: 'obra.estado_cuenta', label: 'Estado Cuenta', order: 7 },
        element: React.lazy(() => import('../../pages/obra/EstadoCuentaPage')),
      },
      {
        path: 'minutas',
        label: 'Minutas',
        icon: <FileText className="w-5 h-5" />,
        meta: { resourcePath: 'obra.minutas', label: 'Minutas', order: 8 },
        element: React.lazy(() => import('../../pages/obra/MinutasPage')),
      },
      {
        path: 'fuerzas-trabajo',
        label: 'Fuerza Laboral',
        icon: <FileText className="w-5 h-5" />,
        meta: { resourcePath: 'obra.fuerzas', label: 'Fuerzas', order: 9 },
        element: React.lazy(() => import('../../pages/obra/FuerzaTrabajoPage')),
      },
    ],
  },
  {
    path: '/configuracion',
    label: 'Configuración',
    icon: <SettingsIcon className="w-5 h-5" />,
    group: 'Administración',
    meta: { resourcePath: 'settings' },
    element: React.lazy(() => import('../../pages/configpages/ConfiguracionPlataformaPage')),
    children: [
      {
        path: 'usuarios',
        label: 'Usuarios',
        icon: <UsersIcon className="w-5 h-5" />,
        meta: { resourcePath: 'settings.users', label: 'Usuarios', order: 1 },
        element: React.lazy(() => import('../../pages/configpages/UsuariosConfigPage')),
      },
      {
        path: 'importacion',
        label: 'Importar Datos',
        icon: <FileText className="w-5 h-5" />,
        meta: { resourcePath: 'settings.import', label: 'Importar', order: 2 },
        element: React.lazy(() => import('../../pages/configpages/ImportacionDatosPage')),
      },
    ],
  },
]