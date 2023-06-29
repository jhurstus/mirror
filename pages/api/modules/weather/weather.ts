import type { NextApiRequest, NextApiResponse } from 'next'
import { Weather } from './response_schemas';
import getVisualCrossingWeatherData from './visual_crossing';
import { getPurpleAirWeatherData } from './purple_air';
import { getAmbientWeatherData } from './ambient_weather';

export type LatLng = [number, number];

// Query parameters for this API.
export type Params = {
  address: string;
  visualCrossingApiKey: string;
  ambientWeatherApiKey?: string;
  ambientWeatherApplicationKey?: string;
  ambientWeatherDeviceMAC?: string;
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

    const visualCrossingPromise = getVisualCrossingWeatherData(
      params.address, params.visualCrossingApiKey, NETWORK_TIMEOUT);

    let ambientWeatherPromise;;
    if (params.ambientWeatherApiKey &&
      params.ambientWeatherApplicationKey &&
      params.ambientWeatherDeviceMAC) {
      ambientWeatherPromise = getAmbientWeatherData(
        params.ambientWeatherApiKey,
        params.ambientWeatherApplicationKey, params.ambientWeatherDeviceMAC);
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

    const [visualCrossing, ambientWeather, purpleAir] =
      await Promise.allSettled([visualCrossingPromise, ambientWeatherPromise, purpleAirPromise]);

    // The weather UI mostly consists of Visual Crossing data, so throw an error
    // if it's unavailable.
    if (visualCrossing.status != 'fulfilled') {
      throw visualCrossing.reason;
    }
    const resp: Response = {
      weather: visualCrossing.value,
    };

    if (ambientWeather.status == 'fulfilled' && ambientWeather.value) {
      // Override Visual Crossing current condition data with (presumably...)
      // more precise local weather station data.
      Object.assign(resp.weather, ambientWeather.value);
    }
    // If current temperature is outside forecasted high/low range, adjust
    // forecast to include present temperature.  This prevents immediately
    // obviously wrong displays like: current 90, lo 40, hi 80.
    resp.weather.low = Math.min(resp.weather.temperature, Math.round(resp.weather.low));
    resp.weather.high = Math.max(resp.weather.temperature, Math.round(resp.weather.high));

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
  if (typeof req.query['visualCrossingApiKey'] != 'string') {
    throw new Error('missing required parameter "visualCrossingApiKey"');
  }
  const params: Params = {
    address: req.query['address'],
    visualCrossingApiKey: req.query['visualCrossingApiKey'],
  };

  const ambientWeatherParams = [
    'ambientWeatherApiKey',
    'ambientWeatherApplicationKey',
    'ambientWeatherDeviceMAC'
  ];
  if (ambientWeatherParams.reduce(
    (prev, curr) => { return prev && typeof req.query[curr] == 'string' }, true)) {
    params.ambientWeatherApiKey = req.query['ambientWeatherApiKey'] as string;
    params.ambientWeatherApplicationKey = req.query['ambientWeatherApplicationKey'] as string;
    params.ambientWeatherDeviceMAC = req.query['ambientWeatherDeviceMAC'] as string;
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
  const latLng = queryParam.split(',').map((s) => parseFloat(s));
  if (latLng.length != 2) {
    return undefined;
  }
  return latLng as LatLng;
}