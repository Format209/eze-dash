'use client'

import type { IframeConfig } from '@/types'
import { ExternalLink } from 'lucide-react'

interface IframeWidgetProps {
  config: Record<string, unknown>
}

export function IframeWidget({ config }: IframeWidgetProps) {
  const c = config as unknown as IframeConfig

  if (!c.url) {
    return (
      <div className="px-4 py-3 text-sm text-[var(--text-muted)]">No URL configured</div>
    )
  }

  const sandboxValue = c.sandbox
    ? 'allow-scripts allow-same-origin'
    : 'allow-scripts allow-same-origin allow-forms allow-popups'

  return (
    <div className="relative rounded-b-2xl overflow-hidden w-full h-full">
      <iframe
        src={c.url}
        className="w-full h-full border-0"
        sandbox={sandboxValue}
        allowFullScreen={c.allowFullscreen !== false}
        loading="lazy"
        title="Embedded content"
      />
      <a
        href={c.url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/50 text-white/70 hover:text-white transition-colors"
        title="Open in new tab"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  )
}

