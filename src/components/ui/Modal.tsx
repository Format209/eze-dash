'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export function Modal({ open, onClose, title, description, children, className, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl mx-4',
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative z-10 w-full rounded-2xl border shadow-2xl',
              'bg-[var(--surface)] border-[var(--border)]',
              'flex flex-col max-h-[90vh]',
              sizes[size],
              className
            )}
          >
            {/* Header */}
            {(title || description) && (
              <div className="flex items-start justify-between p-6 pb-0 shrink-0">
                <div>
                  {title && (
                    <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
                  )}
                  {description && (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="ml-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/10 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {!title && !description && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/10 transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
