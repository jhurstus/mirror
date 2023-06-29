'use client';

import Image from 'next/image';
import styles from './weather.module.css'
import { Weather } from "@/pages/api/modules/weather/response_schemas";
import { LatLng } from "@/pages/api/modules/weather/weather";
import { useEffect, useState } from "react";

export type WeatherProps = {
  // Visual Crossing API key.  A key can be obtained from
  // https://www.visualcrossing.com/
  visualCrossingApiKey: string;
  // Address (or lat,lng) for which weather data should be displayed.
  address: string;
  // Ambient Weather API and application key.  Falls back to Visual Crossing
  // data if unavailable. Keys can be obtained from
  // https://dashboard.ambientweather.net/account
  ambientWeatherApiKey?: string;
  ambientWeatherApplicationKey?: string;
  // Ambient Weather device MAC (identifier) from which to pull data.
  ambientWeatherDeviceMAC?: string;
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
  visualCrossingApiKey,
  address,
  ambientWeatherApiKey,
  ambientWeatherApplicationKey,
  ambientWeatherDeviceMAC,
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
      url.searchParams.append('visualCrossingApiKey', visualCrossingApiKey);
      url.searchParams.append('address', address);
      if (ambientWeatherApiKey && ambientWeatherApplicationKey && ambientWeatherDeviceMAC) {
        url.searchParams.append('ambientWeatherApiKey', ambientWeatherApiKey);
        url.searchParams.append('ambientWeatherApplicationKey', ambientWeatherApplicationKey);
        url.searchParams.append('ambientWeatherDeviceMAC', ambientWeatherDeviceMAC);
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
          setWeather(json.weather as Weather);
        }).catch((e) => console.error(e));
    }
    fetchWeather();

    const fetchWeatherIntervalId = window.setInterval(fetchWeather, updateInterval);
    return () => window.clearInterval(fetchWeatherIntervalId);
  }, [
    visualCrossingApiKey,
    address,
    ambientWeatherApiKey,
    ambientWeatherApplicationKey,
    ambientWeatherDeviceMAC,
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
          {weather.precipProbability}%
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
