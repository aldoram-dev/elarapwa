import React from 'react'
import { cn } from '@lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'bordered' | 'elevated' | 'horizontal'
  children: React.ReactNode
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white/20 backdrop-blur-3xl border border-white/40 shadow-2xl hover:shadow-purple-500/20 hover:scale-[1.01] transition-all',
      glass: 'bg-white/15 backdrop-blur-3xl border border-white/50 shadow-2xl hover:bg-white/25 hover:scale-[1.01] hover:shadow-purple-500/30',
      // Neumorphic style
      bordered: 'bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-3xl border-2 border-white/50 hover:border-purple-300/50 hover:scale-[1.01] transition-all',
      elevated: 'bg-white/25 backdrop-blur-3xl shadow-2xl hover:shadow-purple-500/30 hover:scale-[1.01] hover:-translate-y-1 transition-all border border-white/40',
      // Glass horizontal
      horizontal: 'bg-white/20 backdrop-blur-3xl border border-white/40 shadow-xl hover:shadow-purple-500/20 hover:scale-[1.01] transition-all flex items-center gap-6'
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-3xl transition-all duration-500 ease-out',
          variants[variant],
          className
        )}
        style={{
          boxShadow: '0 8px 32px rgba(168, 85, 247, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-8 py-6 border-b border-slate-100', className)}
      {...props}
    >
      {children}
    </div>
  )
)

CardHeader.displayName = 'CardHeader'

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold text-slate-900 leading-tight', className)}
      {...props}
    >
      {children}
    </h3>
  )
)

CardTitle.displayName = 'CardTitle'

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-slate-600 mt-1.5', className)}
      {...props}
    >
      {children}
    </p>
  )
)

CardDescription.displayName = 'CardDescription'

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-8 py-6', className)}
      {...props}
    >
      {children}
    </div>
  )
)

CardContent.displayName = 'CardContent'

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-8 py-5 border-t border-slate-100 bg-purple-50/30', className)}
      {...props}
    >
      {children}
    </div>
  )
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
