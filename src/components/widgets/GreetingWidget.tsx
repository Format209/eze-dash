'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import type { GreetingConfig } from '@/types'

function getGreeting(hour: number): string {
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

function getEmoji(hour: number): string {
  if (hour < 5) return '🌙'
  if (hour < 12) return '☀️'
  if (hour < 17) return '⛅'
  if (hour < 21) return '🌆'
  return '🌙'
}

const SIZE_MAP = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
}

interface GreetingWidgetProps {
  config: Record<string, unknown>
}

export function GreetingWidget({ config }: GreetingWidgetProps) {
  const c = config as GreetingConfig
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const greeting = c.customGreeting?.trim() || getGreeting(now.getHours())
  const name = c.name?.trim()
  const dateStr = c.showDate !== false ? format(now, 'EEEE, MMMM d, yyyy') : null
  const timeStr = c.showTime ? format(now, 'HH:mm') : null
  const emoji = c.showEmoji !== false ? getEmoji(now.getHours()) : null

  const align = c.align || 'left'
  const alignClass = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left'
  const sizeClass = SIZE_MAP[c.greetingSize || 'md']

  return (
    <div className={`px-6 py-5 flex flex-col justify-center gap-1 ${alignClass}`}>
      <h2 className={`${sizeClass} font-bold text-[var(--text)] leading-tight flex items-center gap-2 whitespace-nowrap`}>
        <span>
          {greeting}{name ? `, ${name}` : ''}
        </span>
        {emoji && <span>{emoji}</span>}
      </h2>
      {(dateStr || timeStr) && (
        <div className="flex items-center gap-3 whitespace-nowrap">
          {dateStr && <span className="text-sm text-[var(--text-muted)]">{dateStr}</span>}
          {dateStr && timeStr && <span className="text-[var(--text-muted)]">·</span>}
          {timeStr && <span className="text-sm text-[var(--text-muted)] font-mono">{timeStr}</span>}
        </div>
      )}
      {c.customMessage?.trim() && (
        <p className="text-sm text-[var(--text-muted)] mt-1">{c.customMessage.trim()}</p>
      )}
    </div>
  )
}
