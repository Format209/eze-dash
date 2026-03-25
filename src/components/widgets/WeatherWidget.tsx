'use client'

import useSWR from 'swr'
import type { WeatherConfig, WeatherData } from '@/types'
import { WEATHER_CODES } from '@/lib/widgets'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import type { LucideIcon } from 'lucide-react'
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  Wind,
  Droplets,
  Thermometer,
  MapPin,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const ICON_MAP: Record<string, { Icon: LucideIcon; color: string }> = {
  sun: { Icon: Sun, color: 'text-amber-400' },
  'cloud-sun': { Icon: Cloud, color: 'text-amber-300' },
  cloud: { Icon: Cloud, color: 'text-zinc-400' },
  'cloud-rain': { Icon: CloudRain, color: 'text-blue-400' },
  'cloud-snow': { Icon: CloudSnow, color: 'text-sky-300' },
  'cloud-lightning': { Icon: CloudLightning, color: 'text-yellow-400' },
  'cloud-drizzle': { Icon: CloudDrizzle, color: 'text-blue-300' },
}

function WeatherIcon({ icon, className, tint = true }: { icon: string; className?: string; tint?: boolean }) {
  const { Icon = Cloud, color = 'text-zinc-400' } = ICON_MAP[icon] || {}
  return <Icon className={cn(className, tint && color)} />
}

interface WeatherWidgetProps {
  config: Record<string, unknown>
}

export function WeatherWidget({ config }: WeatherWidgetProps) {
  const c = config as WeatherConfig

  const params = new URLSearchParams({
    lat: String(c.latitude || 40.7128),
    lon: String(c.longitude || -74.006),
    units: c.units || 'celsius',
    name: c.locationName || 'Unknown',
    forecast: String(c.forecastDays || 3),
  })

  const { data, isLoading, error } = useSWR<WeatherData>(
    `/api/weather?${params}`,
    fetcher,
    { refreshInterval: (c.refreshInterval || 30) * 60 * 1000 }
  )

  const unitSymbol = (c.units || 'celsius') === 'celsius' ? '°C' : '°F'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 min-h-[140px]">
        <Spinner />
      </div>
    )
  }

  if (error || !data || (data as { error?: string }).error) {
    return (
      <div className="px-4 py-3 text-xs text-red-400">
        {(data as { error?: string })?.error || 'Failed to load weather'}
      </div>
    )
  }

  return (
    <div className="px-4 py-3 flex flex-col gap-3 h-full">
      {/* Location */}
      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
        <MapPin className="w-3 h-3" />
        {data.locationName}
      </div>

      {/* Current weather */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WeatherIcon
            icon={data.current.icon}
            className="w-10 h-10"
            tint
          />
          <div>
            <div className="text-3xl font-bold text-[var(--text)] leading-none">
              {data.current.temperature}{unitSymbol}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              {data.current.description}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <Thermometer className="w-3 h-3" />
            Feels {data.current.feelsLike}{unitSymbol}
          </div>
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <Droplets className="w-3 h-3" />
            {data.current.humidity}%
          </div>
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <Wind className="w-3 h-3" />
            {data.current.windSpeed} km/h
          </div>
        </div>
      </div>

      {/* Forecast */}
      {c.showForecast !== false && data.forecast && data.forecast.length > 0 && (
        <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
          {data.forecast.map((day, i) => {
            const dateObj = new Date(day.date)
            const dayName = dateObj.toLocaleDateString('en', { weekday: 'short' })
            const weatherInfo = WEATHER_CODES[day.weatherCode] || { icon: 'cloud' }
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 text-center">
                <span className="text-[10px] text-[var(--text-muted)] font-medium">{dayName}</span>
                <WeatherIcon icon={weatherInfo.icon} className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs font-medium text-[var(--text)]">{day.maxTemp}°</span>
                <span className="text-[10px] text-[var(--text-muted)]">{day.minTemp}°</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
