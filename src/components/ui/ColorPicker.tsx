'use client'

import { cn } from '@/lib/cn'
import { ACCENT_COLORS } from '@/lib/widgets'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  preset?: boolean
}

export function ColorPicker({ value, onChange, label, preset = true }: ColorPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
          {label}
        </label>
      )}
      {preset && (
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color.value}
              title={color.name}
              onClick={() => onChange(color.value)}
              className={cn(
                'w-7 h-7 rounded-full transition-all duration-150 hover:scale-110',
                'border-2',
                value === color.value
                  ? 'border-white scale-110 shadow-lg'
                  : 'border-transparent'
              )}
              style={{ backgroundColor: color.value }}
            />
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            if (/^#([0-9A-Fa-f]{0,6})$/.test(e.target.value)) {
              onChange(e.target.value)
            }
          }}
          className="flex-1 h-9 rounded-lg border border-[var(--border)] bg-white/5 px-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
          placeholder="#6366f1"
          maxLength={7}
        />
      </div>
    </div>
  )
}
