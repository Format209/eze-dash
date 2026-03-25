'use client'

import { useState, useCallback } from 'react'
import type { NoteConfig, Widget } from '@/types'
import { Check, Pencil } from 'lucide-react'

interface NoteWidgetProps {
  widget: Widget
}

export function NoteWidget({ widget }: NoteWidgetProps) {
  const c = widget.config as NoteConfig
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(c.content || '')
  const [saving, setSaving] = useState(false)

  const save = useCallback(async () => {
    setSaving(true)
    try {
      await fetch(`/api/widgets/${widget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { ...c, content } }),
      })
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }, [widget.id, c, content])

  return (
    <div className="px-4 py-3 h-full flex flex-col relative group/note">
      {editing ? (
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') save() }}
            className="flex-1 min-h-0 w-full rounded-lg bg-white/5 border border-[var(--border)] text-sm text-[var(--text)] p-3 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] font-mono leading-relaxed"
            autoFocus
          />
          <div className="flex items-center justify-between shrink-0">
            <span className="text-[10px] text-[var(--text-muted)]">{content.length} chars · Ctrl+Enter to save</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setContent(c.content || ''); setEditing(false) }}
                className="px-3 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] rounded-md hover:bg-white/8 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-3 py-1 text-xs flex items-center gap-1 bg-[var(--accent)] text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Check className="w-3 h-3" />
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="relative cursor-text flex-1 min-h-0 overflow-y-auto"
          onClick={() => setEditing(true)}
          title="Click to edit"
        >
          <div className="text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed min-h-[60px]">
            {content || <span className="text-[var(--text-muted)] italic">Click to add a note...</span>}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true) }}
            className="absolute top-0 right-0 p-1 rounded opacity-0 group-hover/note:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/10"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}
