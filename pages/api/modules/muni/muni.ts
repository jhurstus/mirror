import type { NextApiRequest, NextApiResponse } from 'next'

type Params = {
  key: string;
  agency: string;
  stops: string[];
};

export type Error = {
  error: string;
};
export type Data = {
  data: string
};
export type Response = Error | Data;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  let params: Params;
  try {
    params = validateRequestParams(req);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    return;
  }

  let stopPredictions: string[];
  try {
    stopPredictions = await get511StopPredictions(params.key, params.agency, params.stops);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    return;
  }

  res.status(200).json({ data: stopPredictions.join('*******') })
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

  return {
    key: req.query['key'],
    agency: req.query['agency'],
    stops: req.query['stops'].split(','),
  };
}

// Fetches transit stop arrival prediction times from 511.org service.
// Fulfills with an array of XML text responses from 511, or rejects with any
// network or service error.
async function get511StopPredictions(key: string, agency: string, stops: string[]): Promise<string[]> {
  const urlPrefix = `https://api.511.org/transit/StopMonitoring?api_key=${key}&format=xml&agency=${agency}`;

  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, 15 * 1000);

  let fetchPromises: string[];
  try {
    fetchPromises = await Promise.all(stops.map((stop) => {
      return fetch(
        `${urlPrefix}&stopcode=${stop}`,
        { signal: abortController.signal })
        .then((r) => r.text());
    }));
  } finally {
    clearTimeout(timeout);
  }

  return fetchPromises;
}