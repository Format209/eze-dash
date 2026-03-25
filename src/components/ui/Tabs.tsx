'use client'

import { cn } from '@/lib/cn'
import { useState, type ReactNode } from 'react'

interface TabItem {
  id: string
  label: string
  icon?: ReactNode
}

interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 rounded-lg bg-black/20 p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
            activeTab === tab.id
              ? 'bg-white/10 text-[var(--text)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

interface TabPanelProps {
  id: string
  activeTab: string
  children: ReactNode
}

export function TabPanel({ id, activeTab, children }: TabPanelProps) {
  if (id !== activeTab) return null
  return <>{children}</>
}
