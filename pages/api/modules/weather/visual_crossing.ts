import { Weather, VisualCrossingResponse, VisualCrossingShortForecast } from "./response_schemas";

// Retrieves weather data from Visual Crossing.  Throws if data is missing or
// invalid.
export default async function getVisualCrossingWeatherData(
  address: string,
  visualCrossingApiKey: string,
  timeout: number): Promise<Weather> {
  const visualCrossingUrl =
    'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/' +
    `${encodeURIComponent(address)}?key=${visualCrossingApiKey}&unitGroup=us`;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeout);

  let fetchResponse: Response;
  try {
    fetchResponse = await fetch(visualCrossingUrl, { signal: abortController.signal })
  } finally {
    clearTimeout(timeoutId);
  }

  const forecastData = await fetchResponse.json() as VisualCrossingResponse;
  if (!isForecastDataValid(forecastData)) {
    throw new Error('invalid visual crossing data');
  }

  return visualCrossingResponseToWeatherData(forecastData);
}

// Validates whether Visual Crossing forecast data has expected fields in the
// expected format.
// See https://www.visualcrossing.com/resources/documentation/weather-api/timeline-weather-api/
function isForecastDataValid(data: VisualCrossingResponse): boolean {
  // Ideally every utilized field of every object would be validated, but this
  // is a hobby project, so I'm just checking that containers exist.
  if (!data) {
    console.warn('missing visual crossing data');
    return false;
  }
  if (!data.currentConditions) {
    console.warn('missing visual crossing current weather data');
    return false;
  }
  if (!data.days || data.days.length < 7) {
    console.warn('missing visual crossing daily forecasts');
    return false;
  }
  if (!data.days[0].hours || data.days[0].hours.length < 24) {
    console.warn('missing visual crossing hourly forecasts');
    return false;
  }

  return true;
}

// Converts Visual Crossing service response to data needed for display.
function visualCrossingResponseToWeatherData(data: VisualCrossingResponse): Weather {
  // current conditions
  const temperature = Math.round(data.currentConditions.feelslike);
  const today = data.days[0];
  let summary: string = today.description;
  if (summary.match(/\./g)?.length == 1) {
    // Remove trailing period if there's only a single sentence in the
    // summary.
    summary = summary.replace(/\.$/, '');
  }
  const windSpeed = Math.round(data.currentConditions.windspeed);
  const cloudCover = Math.round(data.currentConditions.cloudcover);
  const uvIndex = data.currentConditions.uvindex;
  const low = Math.round(today.feelslikemin);
  const high = Math.round(today.feelslikemax);

  // Hourly forecasts for the next 24 hours.
  let hourly = data.days[0].hours.slice(new Date().getHours());
  hourly = hourly.concat(data.days[1].hours.slice(0, 24 - hourly.length));

  // Show max precipitation probability for the rest of the day (to 4am),
  // instead of instantaneous probability.  This is more useful for
  // determining if you need an umbrella.
  let precipProbability = 0.0;
  for (let i = 0; i < hourly.length && getHour(hourly[i].datetime) != 4; i++) {
    precipProbability = Math.max(
      precipProbability, hourly[i].precipprob / 100);
  }
  precipProbability = Math.round(100 * precipProbability);

  // sunrise/sunset times
  const sunrise = epochToTime(data.days[0].sunriseEpoch);
  const sunset = epochToTime(data.days[0].sunsetEpoch);

  const shortForecast: VisualCrossingShortForecast[] = [];
  for (let i = 1; i < 3; i++) {
    var day = data.days[i];
    shortForecast.push({
      low: Math.round(day.feelslikemin),
      high: Math.round(day.feelslikemax),
      icon: day.icon,
      day: new Date(day.sunriseEpoch * 1000).toDateString().replace(/\s.*/, '')
    });
  }

  // weather alerts
  let alerts: string[] = [];
  if (data.alerts?.length) {
    const alertSet = new Set<string>(
      data.alerts.map((a) => a.event.replace('for San Francisco, CA', '')));
    alerts = [...alertSet]
    alerts.sort();
  }

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
  };
}

// Gets the hour number from a Visual Crossing datetime string.
function getHour(datetimeStr: string): number {
  return parseInt(datetimeStr.substring(0, 2), 10);
}

// Converts an epoch timestamp to a time string.
function epochToTime(epoch: number): string {
  return new Date(epoch * 1000)
    .toLocaleTimeString()
    .replace(/:\d\d\s/, '')
    .toLowerCase();
}