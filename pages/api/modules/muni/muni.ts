import type { NextApiRequest, NextApiResponse } from 'next'

// A transit stop.
export type Stop = {
  routeName: string;
  stopId: string;
};
export type Stops = Stop[];

// Whether the passed object is a Stop.
function isStops(stops: any): stops is Stops {
  if (!(stops instanceof Array)) return false;
  for (const s of stops) {
    if (typeof s.routeName != 'string' ||
      typeof s.stopId != 'string') {
      return false;
    }
  }
  return true;
}

// Query parameters for this API.
export type Params = {
  agency: string;
  stops: Stops;
};

// JSON response types for this API.
export type Error = {
  error: string;
};
export type Prediction = {
  stopId: string;
  routeName: string;
  arrivalTimes: number[];
};
export type Success = Prediction[];
export type Response = Error | Success;

// Relevant subset of the UmoIQ predictions response JSON.  See:
// https://api.prd-1.iq.live.umoiq.com/v2.0/riders/agencies/<agency>/nstops/<route>:<stopId>/predictions
type UmoIQPredictionValue = {
  // Epoch milliseconds of the predicted arrival.
  timestamp: number;
};
type UmoIQStopPrediction = {
  values: UmoIQPredictionValue[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  try {
    const { agency, stops } = validateRequestParams(req);
    const stopPredictions = await getUmoIQStopPredictions(agency, stops);
    res.status(200).json(getStopPredictionJson(stops, stopPredictions));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}

// Validates request params.  Throws an Error if any param is invalid.
function validateRequestParams(req: NextApiRequest): Params {
  if (typeof req.query['agency'] != 'string') {
    throw new Error('missing required parameter "agency"');
  }

  if (typeof req.query['stops'] != 'string') {
    throw new Error('missing required parameter "stops"');
  }

  let stops;
  try {
    stops = JSON.parse(req.query['stops']);
  } catch (e) {
    throw new Error('"stops" parameter is not in JSON format')
  }
  if (!isStops(stops)) {
    throw new Error('"stops" parameter has invalid structure')
  }

  return {
    agency: req.query['agency'],
    stops: stops,
  };
}

// Fetches transit stop arrival predictions from the UmoIQ service.  Issues one
// request per stop and fulfills with the parsed JSON responses (one per stop,
// in the same order as 'stops'), or throws with any network or service error.
async function getUmoIQStopPredictions(
  agency: string,
  stops: Stops,
  timeout: number = 15 * 1000): Promise<UmoIQStopPrediction[][]> {
  const urlPrefix =
    `https://api.prd-1.iq.live.umoiq.com/v2.0/riders/agencies/${agency}/nstops`;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeout);

  try {
    return await Promise.all(stops.map((stop) => {
      // An 'nstop' identifies a route+stop pair, e.g. 'J:3995'.
      const nstop = `${stop.routeName}:${stop.stopId}`;
      return fetch(
        `${urlPrefix}/${nstop}/predictions`,
        { signal: abortController.signal })
        .then((r) => {
          if (!r.ok) {
            throw new Error(
              `umoiq predictions request for "${nstop}" failed with status ${r.status}`);
          }
          return r.json() as Promise<UmoIQStopPrediction[]>;
        });
    }));
  } finally {
    clearTimeout(timeoutId);
  }
}

// Converts UmoIQ stop prediction JSON to API response Success JSON format.
// Throws if there is missing or invalid data in the UmoIQ response.
function getStopPredictionJson(
  stops: Stops, responses: UmoIQStopPrediction[][]): Success {
  if (stops.length != responses.length) {
    throw new Error('received unexpected number of prediction responses from umoiq');
  }

  // Return a success status if at least one of the requested stops has
  // prediction data, so that at least that stop can be updated.  If none of the
  // requested stops have prediction data though, consider that a service error.
  const hasSomePredictions = responses.some((stopPredictions) =>
    stopPredictions.some((p) => p.values && p.values.length > 0));
  if (!hasSomePredictions) {
    throw new Error('no muni predictions returned a valid status');
  }

  const predictions: Prediction[] = [];
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];

    // The 'nstops' endpoint is route+stop specific, so every returned value
    // already belongs to the requested route and stop.
    const arrivalTimes: number[] = [];
    for (const p of responses[i]) {
      for (const value of p.values || []) {
        if (typeof value.timestamp == 'number' && !isNaN(value.timestamp)) {
          arrivalTimes.push(value.timestamp);
        }
      }
    }

    // List times in ascending order.
    arrivalTimes.sort((a, b) => a - b);
    // Only return three most recent times because predictions for more distant
    // times are typically very inaccurate.
    arrivalTimes.splice(3);

    predictions.push({
      stopId: stop.stopId,
      routeName: stop.routeName,
      arrivalTimes: arrivalTimes,
    });
  }

  return predictions;
}
