import { Weather, VisualCrossingShortForecast, PrecipitationInfo, LatLng } from "./response_schemas";

// Google Weather API Response Types
// Based on https://developers.google.com/maps/documentation/weather
interface GoogleTemperature {
  degrees: number;
  unit: string;
}

interface GoogleWeatherCondition {
  type: string;
  description?: {
    text: string;
    languageCode: string;
  };
  iconBaseUri?: string;
}

interface GooglePrecipitation {
  probability: {
    percent: number;
    type: string;
  };
  qpf: {
    quantity: number;
    unit: string;
  };
}

interface GoogleWind {
  speed: {
    value: number;
    unit: string;
  };
}

interface GoogleCurrentConditionsResponse {
  currentTime: string;
  isDaytime: boolean;
  weatherCondition: GoogleWeatherCondition;
  temperature: GoogleTemperature;
  feelsLikeTemperature: GoogleTemperature;
  wind: GoogleWind;
  precipitation: GooglePrecipitation;
  cloudCover: number;
  uvIndex: number;
}

interface GoogleForecastHour {
  interval: {
    startTime: string;
    endTime: string;
  };
  weatherCondition: GoogleWeatherCondition;
  precipitation: GooglePrecipitation;
}

interface GoogleHourlyForecastResponse {
  forecastHours?: GoogleForecastHour[];
}

interface GoogleForecastDay {
  displayDate: {
    year: number;
    month: number;
    day: number;
  };
  daytimeForecast: {
    weatherCondition: GoogleWeatherCondition;
  };
  feelsLikeMaxTemperature: GoogleTemperature;
  feelsLikeMinTemperature: GoogleTemperature;
  sunEvents: {
    sunriseTime?: string;
    sunsetTime?: string;
  };
}

interface GoogleDailyForecastResponse {
  forecastDays?: GoogleForecastDay[];
}

// Weather condition type to icon name and summary condition mapping
// See https://developers.google.com/maps/documentation/weather/weather-condition-icons
const CONDITION_TYPE_INFO: { [key: string]: { icon: string, condition: string } } = {
  CLEAR: { icon: 'clear-day', condition: 'clear' },
  MOSTLY_CLEAR: { icon: 'partly-cloudy-day', condition: 'partly cloudy' },
  PARTLY_CLOUDY: { icon: 'partly-cloudy-day', condition: 'partly cloudy' },
  MOSTLY_CLOUDY: { icon: 'cloudy', condition: 'cloudy' },
  CLOUDY: { icon: 'cloudy', condition: 'cloudy' },
  WINDY: { icon: 'wind', condition: 'windy' },
  WIND_AND_RAIN: { icon: 'rain', condition: 'rainy' },
  LIGHT_RAIN_SHOWERS: { icon: 'rain', condition: 'rainy' },
  CHANCE_OF_SHOWERS: { icon: 'rain', condition: 'rainy' },
  SCATTERED_SHOWERS: { icon: 'rain', condition: 'rainy' },
  RAIN_SHOWERS: { icon: 'rain', condition: 'rainy' },
  HEAVY_RAIN_SHOWERS: { icon: 'rain', condition: 'rainy' },
  LIGHT_TO_MODERATE_RAIN: { icon: 'rain', condition: 'rainy' },
  MODERATE_TO_HEAVY_RAIN: { icon: 'rain', condition: 'rainy' },
  RAIN: { icon: 'rain', condition: 'rainy' },
  LIGHT_RAIN: { icon: 'rain', condition: 'rainy' },
  HEAVY_RAIN: { icon: 'rain', condition: 'rainy' },
  RAIN_PERIODICALLY_HEAVY: { icon: 'rain', condition: 'rainy' },
  LIGHT_SNOW_SHOWERS: { icon: 'snow', condition: 'snowy' },
  CHANCE_OF_SNOW_SHOWERS: { icon: 'snow', condition: 'snowy' },
  SCATTERED_SNOW_SHOWERS: { icon: 'snow', condition: 'snowy' },
  SNOW_SHOWERS: { icon: 'snow', condition: 'snowy' },
  HEAVY_SNOW_SHOWERS: { icon: 'snow', condition: 'snowy' },
  LIGHT_TO_MODERATE_SNOW: { icon: 'snow', condition: 'snowy' },
  MODERATE_TO_HEAVY_SNOW: { icon: 'snow', condition: 'snowy' },
  SNOW: { icon: 'snow', condition: 'snowy' },
  LIGHT_SNOW: { icon: 'snow', condition: 'snowy' },
  HEAVY_SNOW: { icon: 'snow', condition: 'snowy' },
  SNOWSTORM: { icon: 'snow', condition: 'snowy' },
  SNOW_PERIODICALLY_HEAVY: { icon: 'snow', condition: 'snowy' },
  HEAVY_SNOW_STORM: { icon: 'snow', condition: 'snowy' },
  BLOWING_SNOW: { icon: 'snow', condition: 'snowy' },
  RAIN_AND_SNOW: { icon: 'sleet', condition: 'icy' },
  HAIL: { icon: 'sleet', condition: 'icy' },
  HAIL_SHOWERS: { icon: 'sleet', condition: 'icy' },
  THUNDERSTORM: { icon: 'rain', condition: 'thunderstorms' },
  THUNDERSHOWER: { icon: 'rain', condition: 'thunderstorms' },
  LIGHT_THUNDERSTORM_RAIN: { icon: 'rain', condition: 'thunderstorms' },
  SCATTERED_THUNDERSTORMS: { icon: 'rain', condition: 'thunderstorms' },
  HEAVY_THUNDERSTORM: { icon: 'rain', condition: 'thunderstorms' },
};

// Retrieves weather data from the Google Weather API. Throws if data is
// missing or invalid. The Google Weather API only accepts lat/lng coordinates
// (it does not geocode addresses), so the location is passed as a LatLng.
export default async function getGoogleWeatherData(
  latLng: LatLng,
  googleMapsApiKey: string,
  timeout: number
): Promise<Weather> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeout);

  let current: GoogleCurrentConditionsResponse;
  let hourly: GoogleHourlyForecastResponse;
  let daily: GoogleDailyForecastResponse;
  try {
    [current, hourly, daily] = await Promise.all([
      fetchGoogleWeatherJson<GoogleCurrentConditionsResponse>(
        'currentConditions:lookup', {}, latLng, googleMapsApiKey, abortController.signal),
      fetchGoogleWeatherJson<GoogleHourlyForecastResponse>(
        'forecast/hours:lookup', { hours: '24', pageSize: '24' }, latLng, googleMapsApiKey, abortController.signal),
      fetchGoogleWeatherJson<GoogleDailyForecastResponse>(
        'forecast/days:lookup', { days: '3', pageSize: '3' }, latLng, googleMapsApiKey, abortController.signal),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!isForecastDataValid(current, hourly, daily)) {
    throw new Error('invalid Google Weather data');
  }

  return googleResponseToWeatherData(current, hourly, daily);
}

// Fetches a Google Weather API endpoint for the given location, in imperial
// units (°F, mph, inches).
async function fetchGoogleWeatherJson<T>(
  path: string,
  extraParams: { [key: string]: string },
  latLng: LatLng,
  googleMapsApiKey: string,
  signal: AbortSignal
): Promise<T> {
  const url = new URL(`https://weather.googleapis.com/v1/${path}`);
  url.searchParams.append('key', googleMapsApiKey);
  url.searchParams.append('location.latitude', String(latLng[0]));
  url.searchParams.append('location.longitude', String(latLng[1]));
  url.searchParams.append('unitsSystem', 'IMPERIAL');
  for (const [key, value] of Object.entries(extraParams)) {
    url.searchParams.append(key, value);
  }

  const fetchResponse = await fetch(url.toString(), { signal });
  if (!fetchResponse.ok) {
    throw new Error(`Google Weather API error: ${fetchResponse.status} ${fetchResponse.statusText}`);
  }
  return (await fetchResponse.json()) as T;
}

// Validates whether Google Weather forecast data has expected fields
function isForecastDataValid(
  current: GoogleCurrentConditionsResponse,
  hourly: GoogleHourlyForecastResponse,
  daily: GoogleDailyForecastResponse
): boolean {
  if (!current || !current.weatherCondition || !current.feelsLikeTemperature) {
    console.warn('missing Google Weather current conditions');
    return false;
  }
  if (!hourly || !hourly.forecastHours || hourly.forecastHours.length < 23) {
    console.warn('missing Google Weather hourly forecasts');
    return false;
  }
  if (!daily || !daily.forecastDays || daily.forecastDays.length < 3) {
    console.warn('missing Google Weather daily forecasts');
    return false;
  }
  return true;
}

// Finds the daily entry corresponding to today + dayOffset in Pacific time.
// dayOffset=0 is today, dayOffset=1 is tomorrow, etc.
function findDailyEntry(days: GoogleForecastDay[], dayOffset: number): GoogleForecastDay | undefined {
  const todayPacific = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
  const targetDate = new Date(todayPacific);
  targetDate.setDate(targetDate.getDate() + dayOffset);
  const targetStr = targetDate.toLocaleDateString('en-US');

  // displayDate is already local to the forecast location.
  return days.find((entry) => {
    const date = entry.displayDate;
    return `${date.month}/${date.day}/${date.year}` === targetStr;
  });
}

// Converts Google Weather service responses to data needed for display
function googleResponseToWeatherData(
  current: GoogleCurrentConditionsResponse,
  hourly: GoogleHourlyForecastResponse,
  daily: GoogleDailyForecastResponse
): Weather {
  const hours = hourly.forecastHours!;
  const days = daily.forecastDays!;

  // Current conditions
  const temperature = Math.round(current.feelsLikeTemperature.degrees);
  const windSpeed = Math.round(current.wind.speed.value);
  const cloudCover = Math.round(current.cloudCover);
  const uvIndex = current.uvIndex;

  // Today's daily forecast
  const today = findDailyEntry(days, 0)!;
  const low = Math.round(today.feelsLikeMinTemperature.degrees);
  const high = Math.round(today.feelsLikeMaxTemperature.degrees);

  // Generate summary from weather condition types
  const summary = generateSummary(current, hours);

  // Calculate daily rain total from hourly data
  let dailyRainInches = 0;
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  for (const entry of hours) {
    const entryTime = new Date(entry.interval.startTime);
    if (entryTime > endOfDay) break;
    // qpf is rain-only (snow is reported separately) in inches/hour, so we
    // just add them up
    dailyRainInches += entry.precipitation.qpf.quantity || 0;
  }

  // Get next 24 hours for precipitation probability
  const next24Hours = hours.slice(0, 24);

  // Show max precipitation probability for the rest of the day (to 4am)
  let precipProbability = 0;
  for (const entry of next24Hours) {
    const hour = new Date(entry.interval.startTime).getHours();
    if (hour === 4) break;
    precipProbability = Math.max(precipProbability, entry.precipitation.probability.percent / 100);
  }
  precipProbability = Math.round(100 * precipProbability);

  // Precipitation info for the graph (next 24 hours)
  const precipitationInfo: PrecipitationInfo[] = next24Hours.map((entry) => ({
    amount: entry.precipitation.qpf.quantity || 0,
    probability: entry.precipitation.probability.percent / 100,
  }));

  // Sunrise/sunset times
  const sunrise = formatTime(today.sunEvents.sunriseTime || '');
  const sunset = formatTime(today.sunEvents.sunsetTime || '');

  // Short forecast for tomorrow and the day after tomorrow
  const shortForecast: VisualCrossingShortForecast[] = [];
  for (let offset = 1; offset <= 2; offset++) {
    const entry = findDailyEntry(days, offset);
    if (!entry) break;
    const date = entry.displayDate;
    shortForecast.push({
      low: Math.round(entry.feelsLikeMinTemperature.degrees),
      high: Math.round(entry.feelsLikeMaxTemperature.degrees),
      icon: getIconFromConditionType(entry.daytimeForecast.weatherCondition.type),
      day: new Date(date.year, date.month - 1, date.day).toLocaleDateString('en-US', { weekday: 'short' }),
    });
  }

  // The Google Weather API doesn't provide alerts
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
  current: GoogleCurrentConditionsResponse,
  hours: GoogleForecastHour[]
): string {
  // Get predominant conditions for the day
  const conditionTypes = hours.slice(0, 24).map(h => h.weatherCondition.type);
  const typeFrequency = new Map<string, number>();

  for (const type of conditionTypes) {
    typeFrequency.set(type, (typeFrequency.get(type) || 0) + 1);
  }

  const mostFrequentType = Array.from(typeFrequency.entries())
    .sort((a, b) => b[1] - a[1])[0][0];

  const condition = getConditionFromConditionType(mostFrequentType);
  const currentCondition = getConditionFromConditionType(current.weatherCondition.type);

  // Build summary
  let summary = '';
  if (currentCondition !== condition) {
    summary = `${currentCondition} now, becoming ${condition} throughout the day`;
  } else {
    summary = `${condition} throughout the day`;
  }

  return summary.charAt(0).toUpperCase() + summary.slice(1);
}

// Maps Google Weather condition type to icon name
function getIconFromConditionType(conditionType: string): string {
  return CONDITION_TYPE_INFO[conditionType]?.icon || 'clear-day';
}

// Maps Google Weather condition type to condition description
function getConditionFromConditionType(conditionType: string): string {
  return CONDITION_TYPE_INFO[conditionType]?.condition || 'clear';
}

// Formats ISO 8601 time string to human-readable time, e.g. "5:47am"
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
      .toLowerCase()
      .replace(' ', '');
  } catch {
    return '';
  }
}
