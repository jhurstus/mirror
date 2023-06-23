import type { NextApiRequest, NextApiResponse } from 'next'
import JSDOM from 'jsdom'

// A transit stop.
export type Stop = {
  routeName: string;
  direction: string;
  stopId: string;
};
export type Stops = Stop[];

// Whether the passed object is a Stop.
function isStops(stops: any): stops is Stops {
  if (!(stops instanceof Array)) return false;
  for (const s of stops) {
    if (typeof s.routeName != 'string' ||
      typeof s.direction != 'string' ||
      typeof s.stopId != 'string') {
      return false;
    }
  }
  return true;
}

// Query parameters for this API.
export type Params = {
  key: string;
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  try {
    const { key, agency, stops } = validateRequestParams(req);
    const stopPredictionXMLs = await get511StopPredictions(key, agency, stops);
    res.status(200).json(getStopPredictionJson(stops, stopPredictionXMLs));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}

// Validates request params.  Throws an Error if any param is invalid.
function validateRequestParams(req: NextApiRequest): Params {
  if (typeof req.query['key'] != 'string') {
    throw new Error('missing required parameter "key"');
  }

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
    key: req.query['key'],
    agency: req.query['agency'],
    stops: stops,
  };
}

// Fetches transit stop arrival prediction times from 511.org service.
// Fulfills with an array of XML text responses from 511, or throws with any
// network or service error.
async function get511StopPredictions(
  key: string,
  agency: string,
  stops: Stops,
  timeout: number = 15 * 1000): Promise<string[]> {
  const urlPrefix = `https://api.511.org/transit/StopMonitoring?api_key=${key}&format=xml&agency=${agency}`;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeout);

  let fetchResponseTexts: string[];
  try {
    fetchResponseTexts = await Promise.all(stops.map((stop) => {
      return fetch(
        `${urlPrefix}&stopcode=${stop.stopId}`,
        { signal: abortController.signal })
        .then((r) => r.text());
    }));
  } finally {
    clearTimeout(timeoutId);
  }

  return fetchResponseTexts;
}

// Converts 511 stop prediction XML to API response Success JSON format.
// Throws if there is missing or invalid data in the 511 XML.
function getStopPredictionJson(stops: Stops, xmlResponses: string[]): Success {
  if (stops.length != xmlResponses.length) {
    throw new Error('received unexpected number of prediction responses from 511');
  }

  const xmlDocs = xmlResponses.map((x) => new JSDOM.JSDOM(x));
  // Return a success status if at least one of the requested stops has
  // prediction data, so that at least that stop can be updated.  If none of the
  // requested stops have updated prediction data though, consider that a
  // service error.
  const hasSomePredictions = xmlDocs.some((doc) => {
    const status = doc.window.document.querySelector('servicedelivery > status');
    return status && status.textContent == 'true';
  });
  if (!hasSomePredictions) {
    throw new Error('no muni predictions returned a valid status');
  }

  // TODO -- other things to ideally check here:
  // - configured line+direction are valid for the requested stop
  // - prediction times in valid format and sensible

  const predictions: Prediction[] = [];
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    const xml = xmlDocs[i].window.document;

    const arrivalTimes: number[] = [];
    for (const prediction of xml.querySelectorAll('monitoredvehiclejourney')) {
      // Validate that returned line/direction/stop match config.
      const lineRef = prediction.querySelector('lineref');
      if (!lineRef || lineRef.textContent != stop.routeName) {
        continue;
      }
      const directionRef = prediction.querySelector('directionref');
      if (!directionRef || directionRef.textContent != stop.direction) {
        continue;
      }
      const stopPointRef = prediction.querySelector('stoppointref');
      if (!stopPointRef || stopPointRef.textContent != stop.stopId) {
        continue;
      }

      // Validate that there is an expected arrival time.
      const expectedArrivalTime = prediction.querySelector('expectedarrivaltime');
      if (!expectedArrivalTime) {
        continue;
      }
      const epoch = Date.parse(expectedArrivalTime.textContent || '');
      if (isNaN(epoch)) {
        continue;
      }

      arrivalTimes.push(epoch);
    }

    // List times in ascending order.
    arrivalTimes.sort();
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