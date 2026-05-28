import type { PrecipitationInfo } from "@/app/lib/weather/response_schemas";

export function generatePrecipitationSVG(data: PrecipitationInfo[]): string {
  data = [
    { amount: 0.4, probability: 1.0 },
    { amount: 0.05, probability: 0.15 },
    { amount: 0.1, probability: 0.4 },
    { amount: 0.0, probability: 0.0 },
    { amount: 0.2, probability: 0.65 },
    { amount: 0.35, probability: 0.85 },
    { amount: 0.5, probability: 1.0 },
    { amount: 0.25, probability: 0.75 },
    { amount: 0.0, probability: 0.0 },
    { amount: 0.15, probability: 0.5 },
    { amount: 0.08, probability: 0.25 },
    { amount: 0.0, probability: 0.0 },
  ];
  const width = 25;
  const height = width;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = width / 2; // max length for probability 1

  // Determine the reference angle based on the current hour.
  // We use only the hour (ignoring minutes) so that if it's 9:33, the hand points at 9:00.
  const now = new Date();
  const currentHour = now.getHours() % 12;
  // In an analog clock each hour is 30°; subtract 90° so that 12 o'clock is at the top.
  const referenceAngleDeg = currentHour * 30 - 90;
  const referenceAngle = (referenceAngleDeg * Math.PI) / 180;

  function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  }

  // Anchor values, one per hour, treated as being at the hour's midpoint
  // (x = 0.5, 1.5, ..., 11.5 in a rectangular [0, 12] time axis).
  //
  // Probabilities: tiny chances are floored to 0.3 (the existing "small chance
  // of rain" visual cue) BEFORE smoothing, so an isolated low-probability hour
  // still pops visually instead of being smoothed away by its 0% neighbors.
  //
  // Amounts: clamped to 0.5 (the "heavy rain" white-point) to match the
  // grayscale lerp below.
  const probAnchors: number[] = [];
  const amountAnchors: number[] = [];
  for (let i = 0; i < 12; i++) {
    const p = data[i].probability;
    probAnchors.push(p > 0.03 ? Math.max(p, 0.3) : 0);
    amountAnchors.push(Math.min(data[i].amount, 0.5));
  }

  // Monotonic cubic Hermite (Fritsch–Carlson) tangents. Picked over Catmull-Rom
  // because a 0%→100%→0% sequence must not overshoot below 0 or above 1.
  function tangents(y: number[]): number[] {
    const n = y.length;
    const m: number[] = []; // secant slopes; dx = 1 between anchors
    for (let i = 0; i < n - 1; i++) m.push(y[i + 1] - y[i]);
    const t: number[] = new Array(n);
    t[0] = m[0];
    t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) {
      t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    }
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) {
        t[i] = 0;
        t[i + 1] = 0;
      } else {
        const a = t[i] / m[i];
        const b = t[i + 1] / m[i];
        const s = a * a + b * b;
        if (s > 9) {
          const tau = 3 / Math.sqrt(s);
          t[i] = tau * a * m[i];
          t[i + 1] = tau * b * m[i];
        }
      }
    }
    return t;
  }

  const probT = tangents(probAnchors);
  const amountT = tangents(amountAnchors);

  // Evaluate the spline at fractional hour x ∈ [0, 12]. Clamp outside the
  // anchor range [0.5, 11.5] rather than extrapolate — extrapolation could
  // dive below 0 or push past 1. Clamping also produces the desired sharp
  // seam at the current-hour position: hour 0's anchor value extends to the
  // left edge of the blob, hour 11's anchor value extends to the right edge,
  // and they meet at the hour-hand angle as independent radii.
  function evalSpline(y: number[], t: number[], x: number): number {
    if (x <= 0.5) return y[0];
    if (x >= 11.5) return y[y.length - 1];
    const i = Math.floor(x - 0.5);
    const u = (x - 0.5) - i;
    const u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1;
    const h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2;
    const h11 = u3 - u2;
    return h00 * y[i] + h10 * t[i] + h01 * y[i + 1] + h11 * t[i + 1];
  }

  // Subdivide each hour into N thin sub-wedges. Adjacent sub-wedges share
  // their boundary radius and color exactly, so the blob outline and fill
  // appear continuous everywhere except at the seam (k = 0 / k = totalSubWedges).
  const N = 10;
  const totalSubWedges = 12 * N;

  const boundaryR: number[] = [];
  const boundaryGray: number[] = [];
  for (let k = 0; k <= totalSubWedges; k++) {
    const x = k / N;
    const prob = Math.max(0, Math.min(1, evalSpline(probAnchors, probT, x)));
    const amount = Math.max(0, Math.min(0.5, evalSpline(amountAnchors, amountT, x)));
    boundaryR.push(prob * maxRadius);
    boundaryGray.push(Math.round(100 + (255 - 100) * (amount / 0.5)));
  }

  let gradientDefs = '';
  let wedgePaths = '';

  for (let k = 0; k < totalSubWedges; k++) {
    const angleLeft = referenceAngle + (k / totalSubWedges) * 2 * Math.PI;
    const angleRight = referenceAngle + ((k + 1) / totalSubWedges) * 2 * Math.PI;
    const leftPoint = polarToCartesian(centerX, centerY, boundaryR[k], angleLeft);
    const rightPoint = polarToCartesian(centerX, centerY, boundaryR[k + 1], angleRight);

    const d = `M ${centerX},${centerY} L ${leftPoint.x.toFixed(2)},${leftPoint.y.toFixed(2)} ` +
      `L ${rightPoint.x.toFixed(2)},${rightPoint.y.toFixed(2)} Z`;

    const grayL = boundaryGray[k];
    const grayR = boundaryGray[k + 1];
    const gradId = `grad-${k}`;
    gradientDefs += `
      <linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${leftPoint.x.toFixed(2)}" y1="${leftPoint.y.toFixed(2)}" x2="${rightPoint.x.toFixed(2)}" y2="${rightPoint.y.toFixed(2)}">
        <stop offset="0%" stop-color="rgb(${grayL},${grayL},${grayL})" />
        <stop offset="100%" stop-color="rgb(${grayR},${grayR},${grayR})" />
      </linearGradient>
    `;
    wedgePaths += `<path d="${d}" fill="url(#${gradId})" />\n`;
  }

  // Draw the hour hand.
  const handLength = maxRadius * 0.98;
  const handEnd = polarToCartesian(centerX, centerY, handLength, referenceAngle);
  const hourHandBlack = `<line x1="${centerX}" y1="${centerY}" x2="${handEnd.x.toFixed(2)}" y2="${handEnd.y.toFixed(2)}" ` +
    `stroke="black" stroke-width="2" stroke-linecap="round" />`;
  const hourHandWhite = `<line x1="${centerX}" y1="${centerY}" x2="${handEnd.x.toFixed(2)}" y2="${handEnd.y.toFixed(2)}" ` +
    `stroke="white" stroke-width="1" stroke-linecap="round" />`;

  const circleElement = `<circle cx="${centerX}" cy="${centerY}" r="${maxRadius - 0.5}" stroke="white" stroke-width="1" fill="none" />`;

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${gradientDefs}
  </defs>
  ${wedgePaths}
  ${hourHandBlack}
  ${hourHandWhite}
  ${circleElement}
</svg>
  `;

  return svg;
}


export const sampleData: PrecipitationInfo[] = [
  { amount: 0.1, probability: 0.8 },
  { amount: 0.2, probability: 0.6 },
  { amount: 0.0, probability: 0.2 },
  { amount: 0.3, probability: 0.9 },
  { amount: 0.25, probability: 0.7 },
  { amount: 0.4, probability: 1.0 },
  { amount: 0.15, probability: 0.5 },
  { amount: 0.05, probability: 0.3 },
  { amount: 0.35, probability: 0.85 },
  { amount: 0.5, probability: 0.6 },
  { amount: 0.5, probability: 1.0 },
  { amount: 0.5, probability: 1.0 },
];

