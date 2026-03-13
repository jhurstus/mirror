import type { NextApiRequest, NextApiResponse } from 'next'
import { Weather, LatLng } from '@/app/lib/weather/response_schemas';
import getVisualCrossingWeatherData from '@/app/lib/weather/visual_crossing';
import getTomorrowIOWeatherData from '@/app/lib/weather/tomorrow_io';
import { getPurpleAirWeatherData } from '@/app/lib/weather/purple_air';
import { getWeatherUndergroundData } from '@/app/lib/weather/weather_underground';

// Query parameters for this API.
export type Params = {
  address: string;
  // Weather provider selection - defaults to Tomorrow.io
  weatherProvider?: 'tomorrow.io' | 'visual-crossing';
  // Tomorrow.io API key
  tomorrowIOApiKey?: string;
  // Visual Crossing API key (legacy/fallback)
  visualCrossingApiKey?: string;
  // Weather Underground Personal Weather Station ("PWS") API key
  weatherUndergroundApiKey?: string;
  // Weather Underground personal weather station ID from which to pull data
  weatherUndergroundStationId?: string;
  purpleAirReadKey?: string;
  purpleAirNorthwestLatLng?: LatLng;
  purpleAirSoutheastLatLng?: LatLng;
};

// JSON response types for this API.
export type Error = {
  error: string;
};
export type Success = {
  weather: Weather
};
export type Response = Error | Success;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  try {
    const params: Params = validateRequestParams(req);

    // Determine which weather provider to use
    const provider = params.weatherProvider || 'tomorrow.io';

    let weatherPromise: Promise<Weather>;
    if (provider === 'tomorrow.io' && params.tomorrowIOApiKey) {
      weatherPromise = getTomorrowIOWeatherData(
        params.address, params.tomorrowIOApiKey, NETWORK_TIMEOUT);
    } else if (provider === 'visual-crossing' && params.visualCrossingApiKey) {
      weatherPromise = getVisualCrossingWeatherData(
        params.address, params.visualCrossingApiKey, NETWORK_TIMEOUT);
    } else {
      throw new Error('No valid weather provider configured. Provide either tomorrowIOApiKey or visualCrossingApiKey.');
    }

    let weatherUndergroundPromise;
    if (params.weatherUndergroundApiKey &&
      params.weatherUndergroundStationId) {
      weatherUndergroundPromise = getWeatherUndergroundData(
        params.weatherUndergroundApiKey,
        params.weatherUndergroundStationId);
    }

    let purpleAirPromise;
    if (params.purpleAirReadKey &&
      params.purpleAirNorthwestLatLng &&
      params.purpleAirSoutheastLatLng) {
      purpleAirPromise = getPurpleAirWeatherData(
        params.purpleAirReadKey,
        params.purpleAirNorthwestLatLng,
        params.purpleAirSoutheastLatLng,
        NETWORK_TIMEOUT);
    }

    const [weatherResult, weatherUnderground, purpleAir] =
      await Promise.allSettled([weatherPromise, weatherUndergroundPromise, purpleAirPromise]);

    // The weather UI mostly consists of weather provider data, so throw an error
    // if it's unavailable.
    if (weatherResult.status != 'fulfilled') {
      throw weatherResult.reason;
    }
    const resp: Response = {
      weather: weatherResult.value,
    };

    if (weatherUnderground.status == 'fulfilled' && weatherUnderground.value) {
      // Override forecast current condition data with more precise local
      // weather station data.
      Object.assign(resp.weather, weatherUnderground.value);
      resp.weather.hasLocalWeatherData = true;
    }

    fixInconsistentWeatherProperties(resp.weather);

    if (purpleAir.status == 'fulfilled' && purpleAir.value) {
      resp.weather.aqi = purpleAir.value;
    }

    res.status(200).json(resp);
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : String(e)
    });
  }
}

// Validates request params.  Throws an Error if any param is invalid.
function validateRequestParams(req: NextApiRequest): Params {
  if (typeof req.query['address'] != 'string') {
    throw new Error('missing required parameter "address"');
  }

  const params: Params = {
    address: req.query['address'],
  };

  // Weather provider configuration
  if (typeof req.query['weatherProvider'] == 'string') {
    params.weatherProvider = req.query['weatherProvider'] as 'tomorrow.io' | 'visual-crossing';
  }
  if (typeof req.query['tomorrowIOApiKey'] == 'string') {
    params.tomorrowIOApiKey = req.query['tomorrowIOApiKey'];
  }
  if (typeof req.query['visualCrossingApiKey'] == 'string') {
    params.visualCrossingApiKey = req.query['visualCrossingApiKey'];
  }

  // Validate at least one weather provider key is present
  if (!params.tomorrowIOApiKey && !params.visualCrossingApiKey) {
    throw new Error('missing required parameter: either "tomorrowIOApiKey" or "visualCrossingApiKey"');
  }

  if (typeof req.query['weatherUndergroundApiKey'] == 'string') {
    params.weatherUndergroundApiKey = req.query['weatherUndergroundApiKey'];
  }
  if (typeof req.query['weatherUndergroundStationId'] == 'string') {
    params.weatherUndergroundStationId = req.query['weatherUndergroundStationId'];
  }

  if (typeof req.query['purpleAirReadKey'] == 'string') {
    const nw = queryParamToLatLng(req.query['purpleAirNorthwestLatLng']);
    const se = queryParamToLatLng(req.query['purpleAirSoutheastLatLng']);
    if (nw && se) {
      params.purpleAirReadKey = req.query['purpleAirReadKey'];
      params.purpleAirNorthwestLatLng = nw;
      params.purpleAirSoutheastLatLng = se;
    }
  }

  return params;
}

const NETWORK_TIMEOUT = 300 * 1000;

function queryParamToLatLng(
  queryParam: string | string[] | undefined): LatLng | undefined {
  if (typeof queryParam != 'string') {
    return undefined;
  }
  const latLng = JSON.parse(queryParam);
  if (latLng.length != 2) {
    return undefined;
  }
  return latLng as LatLng;
}

// Highest observed temperature on a given day, e.g. '2023-03-04' => 80.
// This leaks memory, but I reset the display daily anyway, so doesn't matter.
const DAILY_HIGHS = new Map<string, number>();

// Adjusts weather properties to be consistent with each other.
function fixInconsistentWeatherProperties(weather: Weather): void {
  // If current temperature is outside forecasted high/low range, adjust
  // forecast to include present temperature.  This prevents immediately
  // obviously wrong displays like: current 90, lo 40, hi 80.
  weather.low = Math.min(weather.temperature, Math.round(weather.low));
  weather.high = Math.max(weather.temperature, Math.round(weather.high));

  // If an actual high temperature from earlier in the same day exceeds the
  // current forecasted high, show the historical high instead.  After it has
  // passed, this causes the correct daily historical high to be shown, rather
  // than the forecasted high.
  const today = new Date();
  const dateLabel = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  if (DAILY_HIGHS.has(dateLabel) &&
    DAILY_HIGHS.get(dateLabel)! > weather.high) {
    weather.high = DAILY_HIGHS.get(dateLabel)!;
  }
  DAILY_HIGHS.set(dateLabel, weather.high);
}