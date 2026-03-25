'use client'

import { cn } from '@/lib/cn'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:pointer-events-none select-none'

    const variants = {
      primary:
        'bg-[var(--accent)] hover:opacity-90 active:opacity-80 text-white focus:ring-[var(--accent)]/50 shadow-sm',
      secondary:
        'bg-white/10 hover:bg-white/15 active:bg-white/20 text-[var(--text)] border border-white/10 focus:ring-white/20',
      ghost:
        'bg-transparent hover:bg-white/8 active:bg-white/12 text-[var(--text-muted)] hover:text-[var(--text)] focus:ring-white/20',
      danger:
        'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 focus:ring-red-500/40',
      outline:
        'border border-[var(--border)] bg-transparent hover:bg-white/5 text-[var(--text)] focus:ring-[var(--accent)]/40',
    }

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-11 px-5 text-base',
      icon: 'h-9 w-9 p-0',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
