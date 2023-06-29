import { AirQuality, AirQualityLabel, PurpleAirResponse } from "./response_schemas";
import { LatLng } from "./weather";

// Retrieves purple air sensor data within the given bounding box.
export async function getPurpleAirWeatherData(
  purpleAirReadKey: string,
  northwest: LatLng,
  southeast: LatLng,
  timeout: number
): Promise<AirQuality | undefined> {
  const url = 'https://api.purpleair.com/v1/sensors?' +
    'fields=name,location_type,latitude,longitude,last_seen,last_modified,' +
    'humidity,humidity_a,humidity_b,pm2.5_10minute' +
    '&location_type=0&max_age=600' +
    '&nwlng=' + northwest[1] + '&nwlat=' + northwest[0] +
    '&selng=' + southeast[1] + '&selat=' + southeast[0];

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeout);

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
  return calculateAqi(fetchResponseJson);
}

// Calculates AQI from given Purple Air data.  Returns undefined if AQI cannot
// be determined due to missing or insufficient data.
function calculateAqi(data: PurpleAirResponse): AirQuality | undefined {
  const sensors = data?.data;
  const validSensorData: { humidity: number, pm25: number }[] = [];
  if (!sensors?.length) {
    return;
  }
  for (const s of sensors) {
    if (s?.length) {
      const humidity = s[7];
      const pm25 = s[10];
      if (typeof humidity == 'number' && typeof pm25 == 'number' &&
        pm25 >= 0 && pm25 < 1000) {
        validSensorData.push({ humidity, pm25 });
      }
    }
  }

  // Pulling data from public Purple Air AQI monitors, which have a significant
  // chance of being faulty.  To deal with outliers, display the median reading,
  // requiring at least 3 sensors to produce a result.
  const MIN_SENSOR_READINGS = 3;
  if (validSensorData.length < MIN_SENSOR_READINGS) {
    return;
  }

  // AQI is a monotonic function of pm25, but that's not the case for the
  // EPA-adjusted values, so we have to compute final EPA-adjusted values for
  // all sensors before sorting to find the median.
  const epaAdjustedAqis = validSensorData.map(
    o => getEPAAdjustedAQIFromPM25(o.pm25, o.humidity));
  epaAdjustedAqis.sort((a, b) => a - b);
  const medianSensorReading =
    epaAdjustedAqis[Math.floor(epaAdjustedAqis.length / 2)];

  return {
    aqi: medianSensorReading,
    label: getAQILabel(medianSensorReading),
  };
}

// Calculates Air Quality Index (AQI) from a Purple Air PM2.5
// microgram-per-meter-cubed concentration measurement, corrected as per
// suggestion from EPA.
function getEPAAdjustedAQIFromPM25(pm: number, humidity: number): number {
  return aqiFromPM25(applyEpaPM25Correction(pm, humidity));
}

// Calculates Air Quality Index (AQI) from a PM2.5 microgram-per-meter-cubed
// concentration measurement.  See
// https://forum.airnowtech.org/t/the-aqi-equation/169 for AQI definition.
function aqiFromPM25(pm: number): number {
  // PM25 AQI is only defined for concentrations in [0, 500.4].  Clamp raw
  // values outside that range to the respective minimum and maximum AQI values,
  // 0 and 500.
  if (pm <= 0) {
    return 0;
  }
  if (pm >= 500.4) {
    return 500;
  }

  // AQI is calculated from concentrations truncated to the first decimal.
  // Purple AIR already appears to do this for their PM25 data responses, but
  // ensure truncation here.
  pm = Math.floor(pm * 10) / 10;

  // AQI is calculated by linearly interpolating values within measured
  // concentration buckets, which correspond to the various health designations,
  // e.g. 'good' or 'unhealthy'.  Each conditional below corresponds to one of
  // these buckets.

  if (pm >= 250.5) {
    return lerp(pm, 301, 500, 250.5, 500.4);
  } else if (pm >= 150.5) {
    return lerp(pm, 201, 300, 150.5, 250.4);
  } else if (pm >= 55.5) {
    return lerp(pm, 151, 200, 55.5, 150.4);
  } else if (pm >= 35.5) {
    return lerp(pm, 101, 150, 35.5, 55.4);
  } else if (pm >= 12.1) {
    return lerp(pm, 51, 100, 12.1, 35.4);
  } else if (pm >= 0) {
    return lerp(pm, 0, 50, 0.0, 12.0);
  }

  // All possible inputs should be covered by return cases above, so this should
  // never happen.
  return -1;
}

// Linearly interpolates a given PM2.5 concentration value within an AQI
// concentration bucket.
function lerp(pm: number,
  aqiLow: number,
  aqiHigh: number,
  concentrationLow: number,
  concentrationHigh: number): number {
  return Math.round(
    ((pm - concentrationLow) / (concentrationHigh - concentrationLow)) *
    (aqiHigh - aqiLow) + aqiLow);
}

// Translate an AQI value into a label describing the AQI bucket in which that
// value falls.
function getAQILabel(aqi: number): AirQualityLabel {
  if (aqi >= 301) {
    return 'hazardous';
  } else if (aqi >= 201) {
    return 'very-unhealthy';
  } else if (aqi >= 151) {
    return 'unhealthy';
  } else if (aqi >= 101) {
    return 'unhealthy-for-sensitive-groups';
  } else if (aqi >= 51) {
    return 'moderate';
  }

  // aqi <= 50
  return 'good';
}

// Applies a correction to raw purple air PM25 measurements, as suggested by the
// US EPA.  Formula from page 26 of
// https://cfpub.epa.gov/si/si_public_record_report.cfm?dirEntryId=353088&Lab=CEMM
function applyEpaPM25Correction(pm: number, humidity: number): number {
  if (pm < 0) {
    return pm;
  }

  if (pm >= 260) {
    return 2.966 +
      0.69 * pm +
      8.84 * Math.pow(10, -4) * Math.pow(pm, 2);
  } else if (pm >= 210) {
    // lol
    return (0.69 * (pm / 50 - 21 / 5) + 0.786 * (1 - (pm / 50 - 21 / 5))) * pm -
      0.0862 * humidity * (1 - (pm / 50 - 21 / 5)) +
      2.966 * (pm / 50 - 21 / 5) +
      5.75 * (1 - (pm / 50 - 21 / 5)) +
      8.84 * Math.pow(10, -4) * Math.pow(pm, 2) * (pm / 50 - 21 / 5);
  } else if (pm >= 50) {
    return 0.786 * pm - 0.0862 * humidity + 5.75;
  } else if (pm >= 30) {
    return (0.786 * (pm / 20 - 3 / 2) + 0.524 * (1 - (pm / 20 - 3 / 2))) * pm -
      0.0862 * humidity +
      5.75;
  } else { // 0 <= pm < 30
    return 0.524 * pm - 0.0862 * humidity + 5.75;
  }
}