// Generated with https://transform.tools/json-to-typescript

// See https://api.purpleair.com/#api-sensors-get-sensors-data 
// ... for further documentation.
export interface PurpleAirResponse {
  api_version: string
  time_stamp: number
  data_time_stamp: number
  location_type: number
  max_age: number
  firmware_default_version: string
  fields: string[]
  location_types: string[]
  data: [
    number,
    number,
    number,
    string,
    number,
    number,
    number,
    number | undefined,
    number | undefined,
    number | undefined,
    number
  ][]
}

// See https://www.visualcrossing.com/resources/documentation/weather-api/timeline-weather-api/
// ... for further documentation.
export interface VisualCrossingResponse {
  queryCost: number
  latitude: number
  longitude: number
  resolvedAddress: string
  address: string
  timezone: string
  tzoffset: number
  description: string
  days: Day[]
  alerts: {event: string}[]
  stations: { [key: string]: Stations }
  currentConditions: CurrentConditions
}

export interface Day {
  datetime: string
  datetimeEpoch: number
  tempmax: number
  tempmin: number
  temp: number
  feelslikemax: number
  feelslikemin: number
  feelslike: number
  dew: number
  humidity: number
  precip: number
  precipprob: number
  precipcover: number
  preciptype?: string[]
  snow: number
  snowdepth?: number
  windgust: number
  windspeed: number
  winddir: number
  pressure: number
  cloudcover: number
  visibility: number
  solarradiation: number
  solarenergy: number
  uvindex: number
  severerisk: number
  sunrise: string
  sunriseEpoch: number
  sunset: string
  sunsetEpoch: number
  moonphase: number
  conditions: string
  description: string
  icon: string
  stations?: string[]
  source: string
  hours: Hour[]
}

export interface Hour {
  datetime: string
  datetimeEpoch: number
  temp: number
  feelslike: number
  humidity: number
  dew: number
  precip?: number
  precipprob: number
  snow?: number
  snowdepth?: number
  preciptype?: string[]
  windgust: number
  windspeed: number
  winddir: number
  pressure: number
  visibility: number
  cloudcover: number
  solarradiation: number
  solarenergy: number
  uvindex: number
  severerisk: number
  conditions: string
  icon: string
  stations?: string[]
  source: string
}

export interface Stations {
  distance: number
  latitude: number
  longitude: number
  useCount: number
  id: string
  name: string
  quality: number
  contribution: number
}

export interface CurrentConditions {
  datetime: string
  datetimeEpoch: number
  temp: number
  feelslike: number
  humidity: number
  dew: number
  precip: number
  precipprob: number
  snow: number
  snowdepth: number
  preciptype: any
  windgust: number
  windspeed: number
  winddir: number
  pressure: number
  visibility: number
  cloudcover: number
  solarradiation: number
  solarenergy: number
  uvindex: number
  conditions: string
  icon: string
  stations: string[]
  source: string
  sunrise: string
  sunriseEpoch: number
  sunset: string
  sunsetEpoch: number
  moonphase: number
}

export interface VisualCrossing {
  temperature: number,
  summary: string,
  windSpeed: number,
  cloudCover: number,
  uvIndex: number,
  low: number,
  high: number,
  precipProbability: number,
  sunrise: string,
  sunset: string,
  shortForecast: VisualCrossingShortForecast[],
  alerts: string[],
}

export interface VisualCrossingShortForecast {
  low: number,
  high: number,
  icon: string,
  day: string,
}