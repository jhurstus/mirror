import { Weather, VisualCrossingShortForecast, PrecipitationInfo } from "./response_schemas";

// Tomorrow.io API Response Types
// Based on https://docs.tomorrow.io/reference/weather-forecast
interface TomorrowIOValues {
  cloudBase?: number;
  cloudCeiling?: number;
  cloudCover: number;
  dewPoint: number;
  freezingRainIntensity?: number;
  humidity: number;
  precipitationProbability: number;
  pressureSeaLevel: number;
  pressureSurfaceLevel?: number;
  rainIntensity: number;
  sleetIntensity?: number;
  snowIntensity?: number;
  temperature: number;
  temperatureApparent: number;
  uvHealthConcern?: number;
  uvIndex: number;
  visibility: number;
  weatherCode: number;
  windDirection: number;
  windGust: number;
  windSpeed: number;
}

interface TomorrowIOTimeEntry {
  time: string;
  values: TomorrowIOValues;
}

interface TomorrowIODailyValues extends TomorrowIOValues {
  temperatureMax: number;
  temperatureMin: number;
  temperatureApparentMax: number;
  temperatureApparentMin: number;
  sunriseTime?: string;
  sunsetTime?: string;
  precipitationIntensityMax?: number;
  precipitationIntensityMin?: number;
  precipitationIntensityAvg?: number;
}

interface TomorrowIODailyEntry {
  time: string;
  values: TomorrowIODailyValues;
}

interface TomorrowIOTimelines {
  minutely?: TomorrowIOTimeEntry[];
  hourly?: TomorrowIOTimeEntry[];
  daily?: TomorrowIODailyEntry[];
}

interface TomorrowIOLocation {
  lat: number;
  lon: number;
}

export interface TomorrowIOResponse {
  timelines: TomorrowIOTimelines;
  location?: TomorrowIOLocation;
}

// Weather code to icon mapping
// See https://docs.tomorrow.io/reference/data-layers-weather-codes
const WEATHER_CODE_TO_ICON: { [key: number]: string } = {
  0: 'clear-day', // Unknown
  1000: 'clear-day', // Clear
  1001: 'cloudy', // Cloudy
  1100: 'partly-cloudy-day', // Mostly Clear
  1101: 'partly-cloudy-day', // Partly Cloudy
  1102: 'cloudy', // Mostly Cloudy
  2000: 'fog', // Fog
  2100: 'fog', // Light Fog
  3000: 'wind', // Light Wind
  3001: 'wind', // Wind
  3002: 'wind', // Strong Wind
  4000: 'rain', // Drizzle
  4001: 'rain', // Rain
  4200: 'rain', // Light Rain
  4201: 'rain', // Heavy Rain
  5000: 'snow', // Snow
  5001: 'snow', // Flurries
  5100: 'snow', // Light Snow
  5101: 'snow', // Heavy Snow
  6000: 'sleet', // Freezing Drizzle
  6001: 'sleet', // Freezing Rain
  6200: 'sleet', // Light Freezing Rain
  6201: 'sleet', // Heavy Freezing Rain
  7000: 'sleet', // Ice Pellets
  7101: 'sleet', // Heavy Ice Pellets
  7102: 'sleet', // Light Ice Pellets
  8000: 'rain', // Thunderstorm
};

// Retrieves weather data from Tomorrow.io. Throws if data is missing or invalid.
export default async function getTomorrowIOWeatherData(
  address: string,
  tomorrowIOApiKey: string,
  timeout: number
): Promise<Weather> {
  const url = new URL('https://api.tomorrow.io/v4/weather/forecast');
  url.searchParams.append('location', address);
  url.searchParams.append('apikey', tomorrowIOApiKey);
  url.searchParams.append('timesteps', '1h,1d');
  url.searchParams.append('units', 'imperial');

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeout);

  let fetchResponse: Response;
  try {
    fetchResponse = await fetch(url.toString(), { signal: abortController.signal });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!fetchResponse.ok) {
    throw new Error(`Tomorrow.io API error: ${fetchResponse.status} ${fetchResponse.statusText}`);
  }

  const forecastData = (await fetchResponse.json()) as TomorrowIOResponse;
  if (!isForecastDataValid(forecastData)) {
    throw new Error('invalid Tomorrow.io data');
  }

  return tomorrowIOResponseToWeatherData(forecastData);
}

// Validates whether Tomorrow.io forecast data has expected fields
function isForecastDataValid(data: TomorrowIOResponse): boolean {
  if (!data || !data.timelines) {
    console.warn('missing Tomorrow.io data or timelines');
    return false;
  }
  if (!data.timelines.hourly || data.timelines.hourly.length < 23) {
    console.warn('missing Tomorrow.io hourly forecasts');
    return false;
  }
  if (!data.timelines.daily || data.timelines.daily.length < 3) {
    console.warn('missing Tomorrow.io daily forecasts');
    return false;
  }
  return true;
}

// Converts Tomorrow.io service response to data needed for display
function tomorrowIOResponseToWeatherData(data: TomorrowIOResponse): Weather {
  const hourly = data.timelines.hourly!;
  const daily = data.timelines.daily!;

  // Current conditions (first hourly entry)
  const current = hourly[0].values;
  const temperature = Math.round(current.temperatureApparent);
  const windSpeed = Math.round(current.windSpeed);
  const cloudCover = Math.round(current.cloudCover);
  const uvIndex = current.uvIndex;

  // Today's daily forecast
  const today = daily[0].values;
  const low = Math.round(today.temperatureApparentMin);
  const high = Math.round(today.temperatureApparentMax);

  // Generate summary from weather code
  const summary = generateSummary(hourly, daily);

  // Calculate daily rain total from hourly data
  let dailyRainInches = 0;
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  for (const entry of hourly) {
    const entryTime = new Date(entry.time);
    if (entryTime > endOfDay) break;
    // rainIntensity is in inches/hour, so we just add them up
    dailyRainInches += entry.values.rainIntensity || 0;
  }

  // Get next 24 hours for precipitation probability
  const next24Hours = hourly.slice(0, 24);

  // Show max precipitation probability for the rest of the day (to 4am)
  let precipProbability = 0;
  for (const entry of next24Hours) {
    const hour = new Date(entry.time).getHours();
    if (hour === 4) break;
    precipProbability = Math.max(precipProbability, entry.values.precipitationProbability / 100);
  }
  precipProbability = Math.round(100 * precipProbability);

  // Precipitation info for the graph (next 24 hours)
  const precipitationInfo: PrecipitationInfo[] = next24Hours.map((entry) => ({
    amount: entry.values.rainIntensity || 0,
    probability: entry.values.precipitationProbability / 100,
  }));

  // Sunrise/sunset times
  const sunrise = formatTime(today.sunriseTime || '');
  const sunset = formatTime(today.sunsetTime || '');

  // Short forecast for next 2 days
  const shortForecast: VisualCrossingShortForecast[] = [];
  for (let i = 1; i < Math.min(3, daily.length); i++) {
    const day = daily[i];
    const date = new Date(day.time);
    shortForecast.push({
      low: Math.round(day.values.temperatureApparentMin),
      high: Math.round(day.values.temperatureApparentMax),
      icon: getIconFromWeatherCode(day.values.weatherCode),
      day: date.toDateString().split(' ')[0],
    });
  }

  // Tomorrow.io doesn't provide alerts in the forecast endpoint
  const alerts: string[] = [];

  return {
    temperature,
    summary,
    windSpeed,
    cloudCover,
    uvIndex,
    low,
    high,
    precipProbability,
    sunrise,
    sunset,
    shortForecast,
    alerts,
    dailyRainInches,
    precipitationInfo,
  };
}

// Generates a weather summary from forecast data
function generateSummary(
  hourly: TomorrowIOTimeEntry[],
  daily: TomorrowIODailyEntry[]
): string {
  const currentWeatherCode = hourly[0].values.weatherCode;

  // Get predominant conditions for the day
  const weatherCodes = hourly.slice(0, 24).map(h => h.values.weatherCode);
  const codeFrequency = new Map<number, number>();

  for (const code of weatherCodes) {
    codeFrequency.set(code, (codeFrequency.get(code) || 0) + 1);
  }

  const mostFrequentCode = Array.from(codeFrequency.entries())
    .sort((a, b) => b[1] - a[1])[0][0];

  const condition = getConditionFromWeatherCode(mostFrequentCode);
  const currentCondition = getConditionFromWeatherCode(currentWeatherCode);

  // Build summary
  let summary = '';
  if (currentWeatherCode !== mostFrequentCode && currentCondition !== '') {
    summary = `${currentCondition} now, becoming ${condition} throughout the day`;
  } else {
    summary = `${condition} throughout the day`;
  }

  return summary.charAt(0).toUpperCase() + summary.slice(1);
}

// Maps Tomorrow.io weather code to icon name
function getIconFromWeatherCode(code: number): string {
  return WEATHER_CODE_TO_ICON[code] || 'clear-day';
}

// Maps Tomorrow.io weather code to condition description
function getConditionFromWeatherCode(code: number): string {
  if (code === 1000) return 'clear';
  if (code >= 1100 && code <= 1102) return 'partly cloudy';
  if (code === 1001) return 'cloudy';
  if (code >= 2000 && code <= 2100) return 'foggy';
  if (code >= 3000 && code <= 3002) return 'windy';
  if (code >= 4000 && code <= 4001) return 'rainy';
  if (code >= 4200 && code <= 4201) return 'rainy';
  if (code >= 5000 && code <= 5101) return 'snowy';
  if (code >= 6000 && code <= 6201) return 'icy';
  if (code >= 7000 && code <= 7102) return 'icy';
  if (code === 8000) return 'thunderstorms';
  return 'clear';
}

// Formats ISO 8601 time string to human-readable time
function formatTime(isoString: string): string {
  if (!isoString) return '';

  try {
    const date = new Date(isoString);
    return date
      .toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      .toLowerCase();
  } catch {
    return '';
  }
}
