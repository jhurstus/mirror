import { Weather } from "./response_schemas";

// Retrieves weather data from a Weather Underground Personal Weather Station.
// Returns current conditions, or undefined if data is missing or stale.
export async function getWeatherUndergroundData(
  apiKey: string,
  stationId: string
): Promise<Partial<Weather> | undefined> {
  const url =
    `https://api.weather.com/v2/pws/observations/current` +
    `?stationId=${encodeURIComponent(stationId)}` +
    `&format=json&units=e&numericPrecision=decimal` +
    `&apiKey=${encodeURIComponent(apiKey)}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    return;
  }
  const data = await resp.json();

  if (!isValid(data)) {
    return;
  }

  const obs = data.observations[0];
  const imp = obs.imperial;

  // Use Weather Underground's formula for "feels like" temperature.
  let temperature: number;
  if (imp.temp >= 70) {
    temperature = imp.heatIndex;
  } else if (imp.temp <= 61) {
    temperature = imp.windChill;
  } else {
    temperature = imp.temp;
  }

  return {
    temperature: Math.round(temperature),
    windSpeed: Math.round(imp.windSpeed),
    uvIndex: Math.round(obs.uv),
    dailyRainInches: imp.precipTotal,
  };
}

function isValid(data: any): boolean {
  if (!data?.observations?.length) {
    return false;
  }

  const obs = data.observations[0];
  const imp = obs?.imperial;

  if (
    typeof imp?.temp !== "number" ||
    typeof imp?.heatIndex !== "number" ||
    typeof imp?.windChill !== "number" ||
    typeof imp?.windSpeed !== "number" ||
    typeof imp?.precipTotal !== "number" ||
    typeof obs?.uv !== "number" ||
    typeof obs?.epoch !== "number"
  ) {
    return false;
  }

  // Reject data more than 20 minutes old.
  if (Date.now() / 1000 - obs.epoch > 20 * 60) {
    return false;
  }

  return true;
}
