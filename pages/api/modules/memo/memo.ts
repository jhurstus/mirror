import type { NextApiRequest, NextApiResponse } from 'next'

// Query parameters for this API.
export type Params = {
  url: string;
};

// JSON response types for this API.
export type Error = {
  error: string;
};
export type Success = {
  memo: string;
};
export type Response = Error | Success;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  try {
    const { url } = validateRequestParams(req);
    const memo = await getMemo(url);
    res.status(200).json({ memo });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}

// Validates request params.  Throws an Error if any param is invalid.
function validateRequestParams(req: NextApiRequest): Params {
  const url = req.query['url'];
  if (typeof url != 'string') {
    throw new Error('missing required parameter "url"');
  }
  new URL(url);  // Construct URL to throw if invalid format.

  return { url };
}

// Fetches memo text from memo service at provided URL.
async function getMemo(
  url: string,
  timeout: number = 15 * 1000): Promise<string> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeout);

  let memoText: string;
  try {
    const fetchResponse = await fetch(url, { signal: abortController.signal });
    memoText = await fetchResponse.text();
  } finally {
    clearTimeout(timeoutId);
  }

  return memoText;
}