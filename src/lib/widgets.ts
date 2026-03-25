import type { WidgetDefinition, WidgetType } from '@/types'

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    type: 'clock',
    label: 'Clock',
    description: 'Date and time with timezone support',
    icon: 'clock',
    defaultColSpan: 2,
    defaultRowSpan: 15,
    defaultConfig: {
      timezone: 'local',
      format: '24h',
      showDate: true,
      showSeconds: true,
      dateFormat: 'EEEE, MMMM d',
    },
    category: 'info',
  },
  {
    type: 'greeting',
    label: 'Greeting',
    description: 'Personalized greeting with time of day',
    icon: 'sun',
    defaultColSpan: 4,
    defaultRowSpan: 10,
    defaultConfig: { name: '', showDate: true, showTime: false },
    category: 'info',
  },
  {
    type: 'search',
    label: 'Search',
    description: 'Web search with configurable engine',
    icon: 'search',
    defaultColSpan: 4,
    defaultRowSpan: 8,
    defaultConfig: {
      placeholder: 'Search the web...',
      engine: 'duckduckgo',
      openInNewTab: true,
    },
    category: 'tools',
  },
  {
    type: 'service',
    label: 'Service',
    description: 'Monitor a web service with status check',
    icon: 'server',
    defaultColSpan: 2,
    defaultRowSpan: 15,
    defaultConfig: {
      url: '',
      description: '',
      showStatus: true,
      showResponseTime: true,
      checkInterval: 30,
    },
    category: 'services',
    refreshable: true,
    defaultRefreshInterval: 30,
  },
  {
    type: 'bookmark',
    label: 'Bookmark',
    description: 'Quick link bookmark card',
    icon: 'bookmark',
    defaultColSpan: 2,
    defaultRowSpan: 15,
    defaultConfig: { url: '', description: '', openInNewTab: true },
    category: 'services',
  },
  {
    type: 'system',
    label: 'System Metrics',
    description: 'CPU, RAM, Disk, and Network stats',
    icon: 'cpu',
    defaultColSpan: 3,
    defaultRowSpan: 30,
    defaultConfig: {
      showCPU: true,
      showRAM: true,
      showDisk: true,
      showNetwork: false,
      showUptime: true,
      refreshInterval: 5,
    },
    category: 'system',
    refreshable: true,
    defaultRefreshInterval: 5,
  },
  {
    type: 'weather',
    label: 'Weather',
    description: 'Current weather and forecast',
    icon: 'cloud-sun',
    defaultColSpan: 2,
    defaultRowSpan: 30,
    defaultConfig: {
      latitude: 40.7128,
      longitude: -74.006,
      locationName: 'New York',
      units: 'celsius',
      showForecast: true,
      forecastDays: 3,
      refreshInterval: 30,
    },
    category: 'info',
    refreshable: true,
    defaultRefreshInterval: 30,
  },
  {
    type: 'note',
    label: 'Note',
    description: 'Editable sticky note with Markdown',
    icon: 'sticky-note',
    defaultColSpan: 2,
    defaultRowSpan: 30,
    defaultConfig: {
      content: '# My Note\n\nWrite anything here...',
      background: 'default',
      fontSize: 'base',
    },
    category: 'info',
  },
  {
    type: 'rss',
    label: 'RSS Feed',
    description: 'Live RSS feed reader',
    icon: 'rss',
    defaultColSpan: 3,
    defaultRowSpan: 30,
    defaultConfig: {
      url: '',
      maxItems: 5,
      showDescription: false,
      showDate: true,
      openInNewTab: true,
      refreshInterval: 15,
    },
    category: 'media',
    refreshable: true,
    defaultRefreshInterval: 15,
  },
  {
    type: 'docker',
    label: 'Docker',
    description: 'Docker container status and stats',
    icon: 'box',
    defaultColSpan: 3,
    defaultRowSpan: 30,
    defaultConfig: {
      host: 'http://localhost:2375',
      showAll: false,
      containerFilter: '',
      refreshInterval: 10,
      showStats: false,
    },
    category: 'system',
    refreshable: true,
    defaultRefreshInterval: 10,
  },
  {
    type: 'custom_api',
    label: 'Custom API',
    description: 'Display data from any HTTP endpoint',
    icon: 'code-2',
    defaultColSpan: 2,
    defaultRowSpan: 15,
    defaultConfig: {
      url: '',
      method: 'GET',
      headers: {},
      jsonPath: '',
      label: 'Value',
      unit: '',
      refreshInterval: 30,
      displayType: 'text',
    },
    category: 'tools',
    refreshable: true,
    defaultRefreshInterval: 30,
  },
  {
    type: 'iframe',
    label: 'Embed (iFrame)',
    description: 'Embed any website or page',
    icon: 'globe',
    defaultColSpan: 4,
    defaultRowSpan: 45,
    defaultConfig: {
      url: '',
      height: 400,
      allowFullscreen: true,
      sandbox: false,
    },
    category: 'tools',
  },
  {
    type: 'integration',
    label: 'Integration',
    description: 'Connect to self-hosted services: Pi-hole, Sonarr, Jellyfin, Portainer and more',
    icon: 'plug',
    defaultColSpan: 2,
    defaultRowSpan: 20,
    defaultConfig: {
      service: '',
      url: '',
      apiKey: '',
      username: '',
      password: '',
      slug: '',
      refreshInterval: 30,
    },
    category: 'services',
    refreshable: true,
    defaultRefreshInterval: 30,
  },
]

export const WIDGET_CATEGORIES = [
  { id: 'info', label: 'Information', icon: 'info' },
  { id: 'services', label: 'Services', icon: 'server' },
  { id: 'system', label: 'System', icon: 'cpu' },
  { id: 'media', label: 'Media', icon: 'play-circle' },
  { id: 'tools', label: 'Tools', icon: 'wrench' },
] as const

export function getWidgetDef(type: WidgetType): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.find((w) => w.type === type)
}

export const SEARCH_ENGINES = {
  google: { label: 'Google', url: 'https://www.google.com/search?q=' },
  duckduckgo: { label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  brave: { label: 'Brave', url: 'https://search.brave.com/search?q=' },
  bing: { label: 'Bing', url: 'https://www.bing.com/search?q=' },
  startpage: { label: 'Startpage', url: 'https://www.startpage.com/do/metasearch.pl?query=' },
}

export const WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: 'Clear sky', icon: 'sun' },
  1: { description: 'Mainly clear', icon: 'sun' },
  2: { description: 'Partly cloudy', icon: 'cloud-sun' },
  3: { description: 'Overcast', icon: 'cloud' },
  45: { description: 'Foggy', icon: 'cloud' },
  48: { description: 'Icy fog', icon: 'cloud' },
  51: { description: 'Light drizzle', icon: 'cloud-drizzle' },
  53: { description: 'Moderate drizzle', icon: 'cloud-drizzle' },
  55: { description: 'Dense drizzle', icon: 'cloud-drizzle' },
  61: { description: 'Slight rain', icon: 'cloud-rain' },
  63: { description: 'Moderate rain', icon: 'cloud-rain' },
  65: { description: 'Heavy rain', icon: 'cloud-rain' },
  71: { description: 'Slight snow', icon: 'cloud-snow' },
  73: { description: 'Moderate snow', icon: 'cloud-snow' },
  75: { description: 'Heavy snow', icon: 'cloud-snow' },
  80: { description: 'Rain showers', icon: 'cloud-rain' },
  81: { description: 'Rain showers', icon: 'cloud-rain' },
  82: { description: 'Violent rain', icon: 'cloud-rain' },
  85: { description: 'Snow showers', icon: 'cloud-snow' },
  86: { description: 'Heavy snow showers', icon: 'cloud-snow' },
  95: { description: 'Thunderstorm', icon: 'cloud-lightning' },
  96: { description: 'Thunderstorm with hail', icon: 'cloud-lightning' },
  99: { description: 'Thunderstorm with hail', icon: 'cloud-lightning' },
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateSlug(name: string): string {
  const base = slugify(name)
  const suffix = Math.random().toString(36).substring(2, 6)
  return base ? `${base}-${suffix}` : `dashboard-${suffix}`
}

export const DEFAULT_ICONS = [
  'layout-dashboard',
  'home',
  'server',
  'monitor',
  'globe',
  'star',
  'heart',
  'bookmark',
  'folder',
  'settings',
  'cloud',
  'code-2',
  'database',
  'box',
  'layers',
  'grid',
  'cpu',
  'activity',
  'bar-chart',
  'zap',
]

export const ACCENT_COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
]
