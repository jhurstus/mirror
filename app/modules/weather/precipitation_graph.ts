import type { PrecipitationInfo } from "@/app/lib/weather/response_schemas";

export function generatePrecipitationSVG(data: PrecipitationInfo[]): string {
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

  // Scale the color of wedges by the amount of precipitation.
  // This is snapped to ~40% gray at minimum because darker values are hard to
  // see.  And full white is set at 0.5 inches (per hour) as a marker for "heavy
  // rain".  LERP between those two extremes.
  const grayValues: number[] = [];
  for (let i = 0; i < 12; i++) {
    const amt = Math.min(data[i].amount, 0.5);
    const t = amt / 0.5;
    const grayValue = Math.round(100 + (255 - 100) * t);
    grayValues.push(grayValue);
  }

  let gradientDefs = '';
  let wedgePaths = '';

  // Build the 12 wedge paths with gradient fills.
  for (let i = 0; i < 12; i++) {
    let prob = data[i].probability;
    // Tiny probability values are hard to see, so floor to 0.3 if > 0.0.  This
    // indicates "a small chance of rain".
    prob = prob > 0.03 ? Math.max(prob, 0.3) : 0.0;
    const r = prob * maxRadius;
    // Each wedge spans 30° (PI/6 radians)
    const leftAngle = referenceAngle + i * (Math.PI / 6);
    const rightAngle = referenceAngle + (i + 1) * (Math.PI / 6);
    const radius = prob * maxRadius;

    // Compute the two points on the outer boundary:
    const leftPoint = polarToCartesian(centerX, centerY, radius, leftAngle);
    const rightPoint = polarToCartesian(centerX, centerY, radius, rightAngle);

    // Create the path for the wedge:
    // Move to the center, line to the left point, line to the right point, and close the path
    const d = `M ${centerX},${centerY} L ${leftPoint.x.toFixed(2)},${leftPoint.y.toFixed(2)} ` +
              `L ${rightPoint.x.toFixed(2)},${rightPoint.y.toFixed(2)} Z`;
    // For smooth fill color transitions, compute gradient stops:
    // left stop: average of previous wedge and current (or just current for the first wedge)
    // right stop: average of current and next wedge (or just current for the last wedge)
    const currentGray = grayValues[i];
    const leftGray = i === 0 ? currentGray : Math.round((grayValues[i - 1] + currentGray) / 2);
    const rightGray = i === 11 ? currentGray : Math.round((currentGray + grayValues[i + 1]) / 2);
    const leftStopColor = `rgb(${leftGray},${leftGray},${leftGray})`;
    const rightStopColor = `rgb(${rightGray},${rightGray},${rightGray})`;
    const midStopColor = `rgb(${currentGray},${currentGray},${currentGray})`;

    const gradId = `grad-${i}`;
    const gradient = `
      <linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${leftPoint.x.toFixed(2)}" y1="${leftPoint.y.toFixed(2)}" x2="${rightPoint.x.toFixed(2)}" y2="${rightPoint.y.toFixed(2)}">
        <stop offset="0%" stop-color="${leftStopColor}" />
        <stop offset="50%" stop-color="${midStopColor}" />
        <stop offset="100%" stop-color="${rightStopColor}" />
      </linearGradient>
    `;
    gradientDefs += gradient;
    wedgePaths += `<path d="${d}" fill="url(#${gradId})" />\n`;
  }

  // Draw the hour hand.
  const handLength = maxRadius * 0.98;
  const handEnd = polarToCartesian(centerX, centerY, handLength, referenceAngle);
  const hourHandBlack = `<line x1="${centerX}" y1="${centerY}" x2="${handEnd.x.toFixed(2)}" y2="${handEnd.y.toFixed(2)}" ` +
                        `stroke="black" stroke-width="2" stroke-linecap="round" />`;
  const hourHandWhite = `<line x1="${centerX}" y1="${centerY}" x2="${handEnd.x.toFixed(2)}" y2="${handEnd.y.toFixed(2)}" ` +
                        `stroke="white" stroke-width="1" stroke-linecap="round" />`;

  const circleElement = `<circle cx="${centerX}" cy="${centerY}" r="${maxRadius}" stroke="white" stroke-width="1" fill="none" />`;

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

