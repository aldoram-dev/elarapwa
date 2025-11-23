import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  className?: string
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  const location = useLocation()
  
  // Auto-generar breadcrumbs desde la ruta actual si no se proporcionan
  const breadcrumbItems = items || generateBreadcrumbsFromPath(location.pathname)
  
  return (
    <nav aria-label="Breadcrumb" className={cn('mb-6', className)}>
      <ol className="flex items-center gap-2 text-sm">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1
          
          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (
                <svg 
                  className="h-4 w-4 text-purple-300" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              
              {isLast || !item.href ? (
                <span className="font-semibold text-purple-700 px-3 py-1.5 bg-purple-50 rounded-xl">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="text-slate-600 hover:text-purple-600 transition-colors px-3 py-1.5 rounded-xl hover:bg-purple-50"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Utilidad para generar breadcrumbs automáticamente
function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Inicio', href: '/inicio' }
  ]
  
  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    
    breadcrumbs.push({
      label,
      href: index < segments.length - 1 ? currentPath : undefined
    })
  })
  
  return breadcrumbs
}

export default Breadcrumb
export type { BreadcrumbItem, BreadcrumbProps }
