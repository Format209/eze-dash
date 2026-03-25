'use client'

import { cn } from '@/lib/cn'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  className?: string
}

export function Switch({ checked, onChange, label, description, disabled, className }: SwitchProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {(label || description) && (
        <div className="flex-1">
          {label && <p className="text-sm font-medium text-[var(--text)]">{label}</p>}
          {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
        </div>
      )}
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:ring-offset-1 focus:ring-offset-transparent',
          checked ? 'bg-[var(--accent)]' : 'bg-white/15',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-4.5' : 'translate-x-0.75'
          )}
        />
      </button>
    </div>
  )
}
