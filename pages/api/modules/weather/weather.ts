import AmbientWeatherApi from 'ambient-weather-api'
import type { NextApiRequest, NextApiResponse } from 'next'
import { PurpleAirResponse, VisualCrossing } from './response_schemas';
import getVisualCrossingWeatherData from './visual_crossing';

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
  visualCrossing: VisualCrossing;
  ambientWeather?: AmbientWeatherApi.DeviceData[];
  purpleAir?: PurpleAirResponse;
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
        params.purpleAirSoutheastLatLng);
    }

    const [visualCrossing, ambientWeather, purpleAir] =
      await Promise.allSettled([visualCrossingPromise, ambientWeatherPromise, purpleAirPromise]);

    // The weather UI mostly consists of Visual Crossing data, so throw an error
    // if it's unavailable.
    if (visualCrossing.status != 'fulfilled') {
      throw visualCrossing.reason;
    }
    const resp: Response = {
      visualCrossing: visualCrossing.value,
    };

    if (ambientWeather.status == 'fulfilled' &&
      ambientWeather.value &&
      ambientWeather.value.length > 0) {
      resp.ambientWeather = ambientWeather.value;
    }

    if (purpleAir.status == 'fulfilled' &&
      purpleAir.value &&
      purpleAir.value.data.length) {
      resp.purpleAir = purpleAir.value;
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

// Retrieves weather data from local Ambient Weather weather station.
async function getAmbientWeatherData(
  ambientWeatherApiKey: string,
  ambientWeatherApplicationKey: string,
  ambientWeatherDeviceMAC: string): Promise<AmbientWeatherApi.DeviceData[]> {
  const api = new AmbientWeatherApi({
    apiKey: ambientWeatherApiKey,
    applicationKey: ambientWeatherApplicationKey
  });
  return api.deviceData(ambientWeatherDeviceMAC, { limit: 1 });
}

// Retrieves purple air sensor data within the given bounding box.
async function getPurpleAirWeatherData(
  purpleAirReadKey: string,
  northwest: LatLng,
  southeast: LatLng
): Promise<PurpleAirResponse> {
  const url = 'https://api.purpleair.com/v1/sensors?' +
    'fields=name,location_type,latitude,longitude,last_seen,last_modified,' +
    'humidity,humidity_a,humidity_b,pm2.5_10minute' +
    '&location_type=0&max_age=600' +
    '&nwlng=' + northwest[1] + '&nwlat=' + northwest[0] +
    '&selng=' + southeast[1] + '&selat=' + southeast[0];

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, NETWORK_TIMEOUT);

  let fetchResponseJson: PurpleAirResponse;
  try {
    const resp = await fetch(url, {
      headers: { 'X-API-Key': purpleAirReadKey },
      signal: abortController.signal,
    });
    fetchResponseJson = await resp.json();
  } finally {
    clearTimeout(timeoutId);
  }
  return fetchResponseJson;
}

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