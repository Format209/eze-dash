'use client'

import { cn } from '@/lib/cn'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  dot?: boolean
}

export function Badge({ children, variant = 'default', className, dot }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-white/10 text-[var(--text-muted)]',
    success: 'bg-emerald-500/15 text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-400',
    danger: 'bg-red-500/15 text-red-400',
    info: 'bg-blue-500/15 text-blue-400',
    accent: 'bg-[var(--accent)]/15 text-[var(--accent)]',
  }

  const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-zinc-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-red-400',
    info: 'bg-blue-400',
    accent: 'bg-[var(--accent)]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])}
        />
      )}
      {children}
    </span>
  )
}
