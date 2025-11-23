import React from 'react'
import { cn } from '@lib/utils'

export interface ToggleProps {
  /**
   * Whether the toggle is checked
   */
  checked: boolean
  
  /**
   * Callback when toggle state changes
   */
  onChange: (checked: boolean) => void
  
  /**
   * Optional label to display before the toggle
   */
  label?: string
  
  /**
   * Text to display when toggle is OFF (inside the toggle)
   */
  offLabel?: string
  
  /**
   * Text to display when toggle is ON (inside the toggle)
   */
  onLabel?: string
  
  /**
   * Whether the toggle is disabled
   */
  disabled?: boolean
  
  /**
   * Optional count badge to display after the toggle
   */
  count?: number
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg'
  
  /**
   * Additional CSS classes
   */
  className?: string
  
  /**
   * Accessible label for screen readers
   */
  'aria-label'?: string
}

const Toggle = React.forwardRef<HTMLLabelElement, ToggleProps>(
  ({ 
    checked, 
    onChange, 
    label, 
    offLabel = 'No', 
    onLabel = 'Sí', 
    disabled = false,
    count,
    size = 'md',
    className,
    'aria-label': ariaLabel,
    ...props 
  }, ref) => {
    const sizes = {
      sm: {
        container: 'w-14 h-6',
        knob: 'w-5 h-5 top-0.5 left-0.5',
        translate: 'translate-x-8',
        text: 'text-[10px]',
        leftPos: 'left-1.5',
        rightPos: 'right-1.5',
        topPos: 'top-1',
      },
      md: {
        container: 'w-20 h-8',
        knob: 'w-7 h-7 top-0.5 left-0.5',
        translate: 'translate-x-12',
        text: 'text-xs',
        leftPos: 'left-2',
        rightPos: 'right-2',
        topPos: 'top-1.5',
      },
      lg: {
        container: 'w-24 h-10',
        knob: 'w-9 h-9 top-0.5 left-0.5',
        translate: 'translate-x-14',
        text: 'text-sm',
        leftPos: 'left-2.5',
        rightPos: 'right-2.5',
        topPos: 'top-2',
      },
    }

    const sizeConfig = sizes[size]

    return (
      <label
        ref={ref}
        className={cn(
          'inline-flex items-center gap-3 cursor-pointer select-none group',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        aria-label={ariaLabel || label}
        {...props}
      >
        {/* Label Text */}
        {label && (
          <span className="text-sm font-medium text-slate-700">
            {label}
          </span>
        )}

        {/* Toggle Switch */}
        <div className="relative inline-flex items-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => !disabled && onChange(e.target.checked)}
            disabled={disabled}
            className="sr-only peer"
          />
          
          {/* Toggle Track */}
          <div className={cn(
            sizeConfig.container,
            'rounded-full border-2 transition-all duration-200',
            'peer-focus:ring-4',
            checked 
              ? 'bg-slate-800 border-slate-800 peer-focus:ring-slate-300/40' 
              : 'border-slate-300 bg-white peer-focus:ring-slate-300/40',
            disabled && 'cursor-not-allowed'
          )}>
            {/* Off Label (left) */}
            <span className={cn(
              'absolute',
              sizeConfig.leftPos,
              sizeConfig.topPos,
              sizeConfig.text,
              'font-semibold text-slate-600 transition-opacity duration-150',
              checked && 'opacity-0'
            )}>
              {offLabel}
            </span>
            
            {/* On Label (right) */}
            <span className={cn(
              'absolute',
              sizeConfig.rightPos,
              sizeConfig.topPos,
              sizeConfig.text,
              'font-semibold text-white opacity-0 transition-opacity duration-150',
              checked && 'opacity-100'
            )}>
              {onLabel}
            </span>
            
            {/* Toggle Knob */}
            <div className={cn(
              'absolute',
              sizeConfig.knob,
              'bg-white rounded-full shadow-md transition-transform duration-200',
              checked && sizeConfig.translate
            )} />
          </div>

          {/* Count Badge */}
          {count !== undefined && count > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border border-slate-200 bg-slate-50 text-slate-700">
              {count}
            </span>
          )}
        </div>
      </label>
    )
  }
)

Toggle.displayName = 'Toggle'

export default Toggle
