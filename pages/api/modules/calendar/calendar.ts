import type { NextApiRequest, NextApiResponse } from 'next'

// Query parameters for this API.
export type Params = {
  url: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string>
) {
  try {
    let icsResp = await fetch(req.query['url'] as string);
    let icsText = await icsResp.text();
    res.status(200).send(icsText);
  } catch (e) {
    res.status(500).send(String(e));
  }
}