'use client';

import Image from 'next/image';
import styles from './weather.module.css'
import type { Weather } from "@/pages/api/modules/weather/response_schemas";
import { LatLng } from "@/pages/api/modules/weather/weather";
import { useEffect, useState } from "react";
import { generatePrecipitationSVG } from "./precipitation_graph";

export type WeatherProps = {
  // Weather provider to use (defaults to 'tomorrow.io')
  weatherProvider?: 'tomorrow.io' | 'visual-crossing';
  // Tomorrow.io API key. A key can be obtained from https://www.tomorrow.io/
  tomorrowIOApiKey?: string;
  // Visual Crossing API key (legacy/fallback). A key can be obtained from
  // https://www.visualcrossing.com/
  visualCrossingApiKey?: string;
  // Address (or lat,lng) for which weather data should be displayed.
  address: string;
  // Weather Underground API key and station ID for hyper-local current
  // conditions.  Falls back to forecast provider data if unavailable.
  weatherUndergroundApiKey?: string;
  weatherUndergroundStationId?: string;
  // Time in milliseconds between weather updates.  Visual Crossing provides
  // 1000 requests per day free.  To stay under that quota, choose a config
  // value of at least ((24*60*60*1000)/1000)==86400.
  updateInterval?: number;
  // The maximum age in milliseconds for which a forecast will be displayed.  If
  // data cannot be updated before this limit, the UI will be hidden, so as to
  // prevent the display of stale forecast data.  This value MUST be greater
  // than 'updateInterval'.
  dataAgeLimit?: number;
  // READ key for Purple Air web API.  See https://api.purpleair.com/
  purpleAirReadKey?: string;
  // Northwest and Southeast latitudes+longitudes, defining the rectangle from
  // which Purple Air air quality sensor data will be drawn.
  purpleAirNorthwestLatLng?: LatLng;
  purpleAirSoutheastLatLng?: LatLng;
};

// Hack to avoid JSX syntax ambiguity.
type Nullable<T> = T | null;

export default function Weather({
  weatherProvider = 'tomorrow.io',
  tomorrowIOApiKey,
  visualCrossingApiKey,
  address,
  weatherUndergroundApiKey,
  weatherUndergroundStationId,
  updateInterval = 1000 * 60 * 5, // 5 minutes
  dataAgeLimit = 1000 * 60 * 60 * 1, // 1 hour
  purpleAirReadKey,
  purpleAirNorthwestLatLng,
  purpleAirSoutheastLatLng,
}: WeatherProps) {
  const [weather, setWeather] = useState<Nullable<Weather>>(null);
  const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState(0);

  useEffect(() => {
    function fetchWeather() {
      const url = new URL(window.location.origin + '/api/modules/weather/weather');
      url.searchParams.append('address', address);
      url.searchParams.append('weatherProvider', weatherProvider);

      if (tomorrowIOApiKey) {
        url.searchParams.append('tomorrowIOApiKey', tomorrowIOApiKey);
      }
      if (visualCrossingApiKey) {
        url.searchParams.append('visualCrossingApiKey', visualCrossingApiKey);
      }
      if (weatherUndergroundApiKey && weatherUndergroundStationId) {
        url.searchParams.append('weatherUndergroundApiKey', weatherUndergroundApiKey);
        url.searchParams.append('weatherUndergroundStationId', weatherUndergroundStationId);
      }
      if (purpleAirReadKey && purpleAirNorthwestLatLng && purpleAirSoutheastLatLng) {
        url.searchParams.append('purpleAirReadKey', purpleAirReadKey);
        url.searchParams.append('purpleAirNorthwestLatLng', JSON.stringify(purpleAirNorthwestLatLng));
        url.searchParams.append('purpleAirSoutheastLatLng', JSON.stringify(purpleAirSoutheastLatLng));
      }

      fetch(url)
        .then((res) => res.json())
        .then((json) => {
          setLastUpdatedTimestamp(Date.now());
          const weather = json.weather as Weather;
          weather.precipitationGraph = generatePrecipitationSVG(weather.precipitationInfo);
          setWeather(weather);
        }).catch((e) => console.error(e));
    }
    fetchWeather();

    const fetchWeatherIntervalId = window.setInterval(fetchWeather, updateInterval);
    return () => window.clearInterval(fetchWeatherIntervalId);
  }, [
    weatherProvider,
    tomorrowIOApiKey,
    visualCrossingApiKey,
    address,
    weatherUndergroundApiKey,
    weatherUndergroundStationId,
    updateInterval,
    dataAgeLimit,
    purpleAirReadKey,
    purpleAirNorthwestLatLng,
    purpleAirSoutheastLatLng,
  ]);

  if (!weather || (Date.now() - lastUpdatedTimestamp) > dataAgeLimit) {
    return <></>;
  }

  return (
    <div className={styles.layout}>
      {/* Show a little dingus if local weather data is missing, so I can be aprised. */}
      {!weather.hasLocalWeatherData &&
        <div style={{ position: 'absolute', top: 0, right: 0, width: 3, height: 3, background: '#aaa' }} />
      }
      <div className={styles.summary}>{weather.summary}</div>

      <div className={styles.currentTemperatures}>
        <div className={styles.lowHigh}>
          {String.fromCharCode(160) + weather.low}°
          <div>low</div>
        </div>
        <div className={styles.temperatureCircle}>{weather.temperature}</div>
        <div className={styles.lowHigh}>
          {String.fromCharCode(160) + weather.high}°
          <div>high</div>
        </div>
      </div>

      <div className={styles.conditionDetails}>
        <div>
          <span className={styles.icon}><Image src="modules/weather/icons/Wind.svg" width="50" height="50" alt="wind" /></span>
          {weather.windSpeed} mph
        </div>
        <div>
          <span className={styles.icon}><Image src="/modules/weather/icons/Umbrella.svg" width="50" height="50" alt="rain" /></span>
          {weather.precipProbability < 5 ?
            (weather.precipProbability + '%') :
            <span className={styles.precipitationGraphContainer}>
              &nbsp;
              <div className={styles.precipitationGraph} dangerouslySetInnerHTML={{ __html: weather.precipitationGraph || "" }} />
            </span>
          }
        </div>
        <div>
          <span className={styles.icon}><Image src="/modules/weather/icons/Cloud.svg" width="50" height="50" alt="cloud cover" /></span>
          {weather.cloudCover}%
        </div>
        <div>
          <span className={styles.icon}><Image src="/modules/weather/icons/Sun.svg" width="50" height="50" alt="uv index" /></span>
          {weather.uvIndex}
        </div>
      </div>

      <div className={styles.suntimeContainer}>
        <span className={styles.suntime}><Image src="/modules/weather/icons/Sunrise.svg" width="50" height="50" alt="sunrise and sunset time" /></span>
        {weather.sunrise} • {weather.sunset}

        {weather.aqi &&
          <span className={styles.aqiContainer + ' ' + styles['aqi' + weather.aqi.label]}><span className={styles.aqi}>AQI</span> {weather.aqi.aqi}</span>
        }

        {weather.dailyRainInches >= 0.05 &&
          <>
            <span className={styles.dailyRain}><Image src="/modules/weather/icons/Cloud-Drizzle-Alt.svg" width="50" height="50" alt="rain inches" />
              {weather.dailyRainInches.toFixed(2)}&quot;
            </span>
          </>
        }
      </div>

      <div className={styles.shortForecast}>
        {weather.shortForecast.map((forecast, index) => {
          return <span key={index} style={{ float: index == 0 ? 'left' : 'right' }}>
            {String.fromCharCode(160) + forecast.day + String.fromCharCode(160)}
            <Image src={getIconUrl(forecast.icon)} width="35" height="35" alt="" />
            {String.fromCharCode(160) + forecast.low}° {forecast.high}°
          </span>
        })}
      </div>

      {weather.alerts.length > 0 ?
        <div className={styles.alerts}>
          <ul>
            {weather.alerts.map((alert, index) => {
              return <li key={index}>{alert}</li>
            })}
          </ul>
        </div>
        : <></>}

    </div>
  );
}

// Maps Visual Crossing 'icon' enum values to weather icon relative URLs.
function getIconUrl(iconName: string): string {
  const iconMap = {
    'clear-day': 'Sun.svg',
    'clear-night': 'Moon-Full.svg',
    'rain': 'Cloud-Rain.svg',
    'snow': 'Cloud-Snow.svg',
    'sleet': 'Cloud-Hail.svg',
    'wind': 'Cloud-Wind-Sun.svg',
    'fog': 'Cloud-Fog-Alt.svg',
    'cloudy': 'Cloud.svg',
    'partly-cloudy-day': 'Cloud-Sun.svg',
    'partly-cloudy-night': 'Cloud-Moon.svg'
  } as { [key: string]: string };
  const iconFile = iconMap[iconName] || 'Sun.svg';
  return '/modules/weather/icons/' + iconFile
}
