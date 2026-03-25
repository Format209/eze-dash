export type WidgetType =
  | 'clock'
  | 'search'
  | 'service'
  | 'bookmark'
  | 'system'
  | 'weather'
  | 'note'
  | 'rss'
  | 'docker'
  | 'custom_api'
  | 'iframe'
  | 'greeting'
  | 'integration'

export interface Dashboard {
  id: string
  name: string
  slug: string
  icon: string
  description: string | null
  background: string | null
  theme: string | null
  columns: number
  isDefault: boolean
  order: number
  createdAt: string
  updatedAt: string
  widgets?: Widget[]
}

export interface Widget {
  id: string
  type: WidgetType
  title: string
  config: Record<string, unknown>
  colSpan: number
  rowSpan: number
  posX: number
  posY: number
  order: number
  dashboardId: string
  createdAt: string
  updatedAt: string
}

export interface Settings {
  id: string
  theme: 'dark' | 'light' | 'system'
  accentColor: string
  gridColumns: number
  background: string | null
  customCSS: string | null
  siteTitle: string
  faviconUrl: string | null
}

// ---- Widget Config Types ----

export interface ClockConfig {
  timezone?: string
  format?: '12h' | '24h'
  showDate?: boolean
  showSeconds?: boolean
  dateFormat?: string
  clockStyle?: 'default' | 'large' | 'minimal' | 'card' | 'analog' | 'digital' | 'flip'
  additionalTimezones?: Array<{ timezone: string; label?: string }>
  multiLayout?: 'list' | 'grid'
}

export interface SearchConfig {
  placeholder?: string
  engine?: 'google' | 'duckduckgo' | 'brave' | 'bing' | 'startpage'
  openInNewTab?: boolean
}

export interface ServiceEntry {
  url: string
  label?: string
  description?: string
  icon?: string
  iconColor?: string
}

export interface ServiceConfig {
  // multi-service list (new)
  services?: ServiceEntry[]
  // legacy single-service fields (kept for back-compat)
  url?: string
  description?: string
  icon?: string
  iconColor?: string
  checkInterval?: number
  showStatus?: boolean
  showResponseTime?: boolean
}

export interface BookmarkEntry {
  url: string
  label?: string
  description?: string
  icon?: string
  iconColor?: string
}

export interface BookmarkConfig {
  // multi-bookmark list (new)
  bookmarks?: BookmarkEntry[]
  // shared options
  openInNewTab?: boolean
  layout?: 'list' | 'grid'
  // legacy single-bookmark fields (back-compat)
  url?: string
  description?: string
  icon?: string
  iconColor?: string
  tags?: string[]
}

export interface SystemConfig {
  showCPU?: boolean
  showRAM?: boolean
  showDisk?: boolean
  showNetwork?: boolean
  showUptime?: boolean
  refreshInterval?: number
  diskPath?: string
}

export interface WeatherConfig {
  latitude?: number
  longitude?: number
  locationName?: string
  units?: 'celsius' | 'fahrenheit'
  showForecast?: boolean
  forecastDays?: number
  refreshInterval?: number
}

export interface NoteConfig {
  content?: string
  background?: string
  fontSize?: 'sm' | 'base' | 'lg'
}

export interface RSSConfig {
  url: string
  maxItems?: number
  showDescription?: boolean
  showDate?: boolean
  openInNewTab?: boolean
  refreshInterval?: number
}

export interface DockerConfig {
  host?: string
  showAll?: boolean
  containerFilter?: string
  refreshInterval?: number
  showStats?: boolean
}

export interface CustomAPIField {
  path: string
  label?: string
  displayType: 'text' | 'number' | 'gauge' | 'badge' | 'boolean' | 'sparkline' | 'image' | 'link' | 'list' | 'datetime' | 'json' | 'color' | 'items'
  unit?: string
  min?: number
  max?: number
  color?: 'accent' | 'green' | 'red' | 'yellow' | 'blue' | 'default'
  gaugeStyle?: 'bar' | 'arc'
  sparkPoints?: number
  linkLabel?: string
  listMax?: number
  dateFormat?: 'relative' | 'date' | 'time' | 'datetime'
  // 'items' display type — iterate over object values or array items
  itemTitle?: string    // sub-path for title (e.g. "name")
  itemSubtitle?: string // sub-path for subtitle (e.g. "address")
  itemValue?: string    // sub-path for value (e.g. "ping")
  itemMax?: number      // max items to show
}

export interface CustomAPIAction {
  id: string
  type: 'button' | 'toggle' | 'input' | 'select' | 'slider'
  label: string
  url?: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  bodyPath?: string
  bodyTemplate?: string
  value?: string
  onValue?: string
  offValue?: string
  options?: Array<{ value: string; label: string }>
  min?: number
  max?: number
  step?: number
  placeholder?: string
  multiline?: boolean
  color?: 'accent' | 'green' | 'red' | 'yellow' | 'blue' | 'default'
  confirm?: boolean
  confirmMessage?: string
}

export interface CustomAPIConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: string
  bodyType?: 'json' | 'form' | 'text'
  authType?: 'none' | 'bearer' | 'basic' | 'api-header' | 'api-query'
  authValue?: string
  authHeader?: string
  authQuery?: string
  jsonPath?: string
  label?: string
  unit?: string
  refreshInterval?: number
  displayType?: 'text' | 'number' | 'badge' | 'list'
  fields?: CustomAPIField[]
  actions?: CustomAPIAction[]
  layout?: 'grid-2' | 'grid-3' | 'list'
}

export interface IframeConfig {
  url: string
  height?: number
  allowFullscreen?: boolean
  sandbox?: boolean
}

export interface GreetingConfig {
  name?: string
  showDate?: boolean
  showTime?: boolean
  showEmoji?: boolean
  customGreeting?: string
  customMessage?: string
  align?: 'left' | 'center' | 'right'
  greetingSize?: 'sm' | 'md' | 'lg' | 'xl'
}

export interface IntegrationConfig {
  service: string
  url: string
  apiKey?: string
  username?: string
  password?: string
  slug?: string
  refreshInterval?: number
}

// ---- Widget Definition (for the registry) ----

export interface WidgetDefinition {
  type: WidgetType
  label: string
  description: string
  icon: string
  defaultColSpan: number
  defaultRowSpan: number
  defaultConfig: Record<string, unknown>
  category: 'info' | 'media' | 'system' | 'services' | 'tools'
  refreshable?: boolean
  defaultRefreshInterval?: number
}

// ---- Service Status ----

export interface ServiceStatus {
  online: boolean
  statusCode?: number
  responseTime?: number
  error?: string
  checkedAt: string
}

// ---- System Metrics ----

export interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    model: string
  }
  memory: {
    total: number
    used: number
    free: number
    usagePercent: number
  }
  disk: {
    total: number
    used: number
    free: number
    usagePercent: number
    path: string
  }[]
  uptime: number
  platform: string
  hostname: string
}

// ---- Weather ----

export interface WeatherData {
  locationName: string
  current: {
    temperature: number
    feelsLike: number
    humidity: number
    windSpeed: number
    weatherCode: number
    description: string
    icon: string
    isDay: boolean
  }
  forecast?: {
    date: string
    maxTemp: number
    minTemp: number
    weatherCode: number
    description: string
  }[]
  units: 'celsius' | 'fahrenheit'
}

// ---- Docker ----

export interface DockerContainer {
  id: string
  name: string
  image: string
  status: string
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'dead' | 'created'
  ports: string[]
  created: string
  uptime?: string
}

// ---- RSS ----

export interface RSSItem {
  title: string
  link: string
  description?: string
  pubDate?: string
  author?: string
}

export interface RSSFeed {
  title: string
  link: string
  description?: string
  items: RSSItem[]
  fetchedAt: string
}

// ---- Dialog State ----

export type DialogState =
  | { type: 'none' }
  | { type: 'add-widget' }
  | { type: 'edit-widget'; widget: Widget }
  | { type: 'add-dashboard' }
  | { type: 'edit-dashboard'; dashboard: Dashboard }
  | { type: 'settings' }
  | { type: 'delete-widget'; widgetId: string }
  | { type: 'delete-dashboard'; dashboardId: string }
