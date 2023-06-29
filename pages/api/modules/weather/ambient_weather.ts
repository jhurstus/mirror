import AmbientWeatherApi from "ambient-weather-api";
import { Weather } from "./response_schemas";

// Retrieves weather data from local Ambient Weather weather station.  Returns
// current conditions, or undefined if sensor data is missing or invalid..
export async function getAmbientWeatherData(
  ambientWeatherApiKey: string,
  ambientWeatherApplicationKey: string,
  ambientWeatherDeviceMAC: string): Promise<Partial<Weather> | undefined> {
  const api = new AmbientWeatherApi({
    apiKey: ambientWeatherApiKey,
    applicationKey: ambientWeatherApplicationKey
  });
  const data = await api.deviceData(ambientWeatherDeviceMAC, { limit: 1 });
  if (!isAmbientWeatherDataValid(data)) {
    return;
  }
  const sensorData = data[0];
  return {
    temperature: Math.round(sensorData.feelsLike!),
    windSpeed: Math.round(sensorData.windspeedmph!),
    uvIndex: Math.round(sensorData.uv!),
  };
}

// Validates Ambient Weather data has expected fields in the expected format.
// See https://github.com/ambient-weather/api-docs/wiki/Device-Data-Specs
function isAmbientWeatherDataValid(data: AmbientWeatherApi.DeviceData[]): boolean {
  if (data?.length !== 1) {
    return false;
  }

  const d = data[0];

  if (typeof d.feelsLike != 'number' ||
    typeof d.windspeedmph != 'number' ||
    typeof d.dateutc != 'number' ||
    typeof d.uv != 'number') {
    return false;
  }

  // Reject sensor data more than 20 minutes old; better to have more timely
  // Visual Crossing data.  This cutoff can be tuned as desired.
  if (Date.now() - d.dateutc > 20 * 60 * 1000) {
    return false;
  }

  return true;
}