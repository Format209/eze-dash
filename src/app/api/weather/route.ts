import { NextResponse } from 'next/server'
import { WEATHER_CODES } from '@/lib/widgets'
import type { WeatherData } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '40.7128')
  const lon = parseFloat(searchParams.get('lon') || '-74.006')
  const units = (searchParams.get('units') || 'celsius') as 'celsius' | 'fahrenheit'
  const locationName = searchParams.get('name') || 'Unknown'
  const forecastDays = parseInt(searchParams.get('forecast') || '3')

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  try {
    const tempUnit = units === 'fahrenheit' ? 'fahrenheit' : 'celsius'
    const windUnit = 'kmh'
    const forecastCount = Math.min(Math.max(forecastDays, 1), 7)

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&forecast_days=${forecastCount + 1}&timezone=auto`

    const res = await fetch(url, {
      next: { revalidate: 300 }, // cache 5 min
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) throw new Error(`Weather API returned ${res.status}`)

    const data = await res.json()
    const current = data.current
    const daily = data.daily

    const weatherCode = current.weather_code as number
    const weatherInfo = WEATHER_CODES[weatherCode] || { description: 'Unknown', icon: 'cloud' }

    const forecast = daily?.time
      ?.slice(1, forecastCount + 1)
      .map((date: string, i: number) => ({
        date,
        maxTemp: Math.round(daily.temperature_2m_max[i + 1]),
        minTemp: Math.round(daily.temperature_2m_min[i + 1]),
        weatherCode: daily.weather_code[i + 1],
        description: WEATHER_CODES[daily.weather_code[i + 1]]?.description || 'Unknown',
      })) || []

    const result: WeatherData = {
      locationName,
      current: {
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        weatherCode,
        description: weatherInfo.description,
        icon: weatherInfo.icon,
        isDay: current.is_day === 1,
      },
      forecast,
      units,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/weather', error)
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 })
  }
}
