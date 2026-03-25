'use client'

import { cn } from '@/lib/cn'
import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <Loader2 className={cn('animate-spin text-[var(--accent)]', sizes[size], className)} />
  )
}

interface LoadingOverlayProps {
  label?: string
}
export function LoadingOverlay({ label = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-[var(--text-muted)]">
      <Spinner size="lg" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
