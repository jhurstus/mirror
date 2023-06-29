'use client';

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

  return <div>{JSON.stringify(weather)}</div>
}

//   // Maps Visual Crossing 'icon' enum values to actual icon filenames.
//   getIconUrl: function(iconName) {
//     var iconMap = {
//       'clear-day': 'Sun.svg',
//       'clear-night': 'Moon-Full.svg',
//       'rain': 'Cloud-Rain.svg',
//       'snow': 'Cloud-Snow.svg',
//       'sleet': 'Cloud-Hail.svg',
//       'wind': 'Cloud-Wind-Sun.svg',
//       'fog': 'Cloud-Fog-Alt.svg',
//       'cloudy': 'Cloud.svg',
//       'partly-cloudy-day': 'Cloud-Sun.svg',
//       'partly-cloudy-night': 'Cloud-Moon.svg'
//     };
//     var iconFile = iconMap[iconName] || 'Sun.svg';
//     return 'modules/hurst/ambientweather/public/icons/' + iconFile;
//   },
// 
// });
// 

// 
// <div class="layout">
//   <div class="summary bright small">{{summary}}</div>
// 
//   {{!-- current temperatures --}}
//   <div class="currentTemperatures">
//     <div class="lowHigh">
//       &nbsp;{{low}}°
//       <div>low</div>
//     </div>
//     <div class="temperatureCircle">{{temperature}}</div>
//     <div class="lowHigh">
//       &nbsp;{{high}}°
//       <div>high</div>
//     </div>
//   </div>
// 
// 
//   {{!-- current condition details --}}
//   <div class="conditionDetails normal small">
//     <div>
//       <span class="icon"><img src="modules/hurst/ambientweather/public/icons/Wind.svg"></span>
//       {{windSpeed}} mph
//     </div>
//     <div>
//       <span class="icon"><img src="modules/hurst/ambientweather/public/icons/Umbrella.svg"></span>
//       {{precipProbability}}%
//     </div>
//     <div>
//       <span class="icon"><img src="modules/hurst/ambientweather/public/icons/Cloud.svg"></span>
//       {{cloudCover}}%
//     </div>
//     <div>
//       <span class="icon"><img src="modules/hurst/ambientweather/public/icons/Sun.svg"></span>
//       {{uvIndex}}
//     </div>
//   </div>
// 
//   {{!-- sunrise/sunset times, AQI --}}
//   {{#if aqi includeZero=true}}
//   <div class="suntimeContainer normal small">
//     <span class="suntime"><img src="modules/hurst/ambientweather/public/icons/Sunrise.svg"></span>
//     {{sunrise}} • {{sunset}}
// 
//     <span class="aqiContainer aqi{{aqiLabel}}"><span class="aqi">AQI</span> {{aqi}}</span>
//   </div>
//   {{/if}}
// 
//   {{!-- short forecast --}}
//   <div class="shortForecast normal small">
//   {{#each shortForecast}}
//   <span style="float:{{#if @first}}left{{else}}right{{/if}}">
//     {{day}}
//     <img src="{{iconUrl}}" width="35" height="35">
//     {{low}}° {{high}}°
//   </span>
//   {{/each}}
//   </div>
// 
// 
//   {{!-- weather alerts --}}
//   {{#if alerts}}
//   <div class="alerts small">
//     <ul>
//       {{#each alerts}}
//         <li>{{title}}</li>
//       {{/each}}
//     </ul>
//   </div>
//   {{/if}}
// 
//   {{!-- precipitation, temperature, and wind chart --}}
//   {{#if chart}}
//   <div class="chartContainer sectionSep">
//     <img src="modules/hurst/ambientweather/public/icons/tempIcon.svg" class="tempIcon">
//     <img src="modules/hurst/ambientweather/public/icons/windIcon.svg" class="windIcon">
//     <img src="modules/hurst/ambientweather/public/icons/precipIcon.svg" class="precipIcon">
//     <div id="chart">
//     </div>
//   </div>
//   {{/if}}
// 
//   {{!-- weekly forecast --}}
//   {{#if dailyForecasts}}
//   <div class="weekly sectionSep">
//     <table>
//     {{#each dailyForecasts}}
//       <tr style="opacity: {{opacity}}">
//         <td class="day">{{day}}</td>
//         <td class="wIcon"><img src="{{iconUrl}}"></td>
//         <td class="range" style="padding-left:{{barOffset}}px">
//           {{low}}°
//           <div class="temperatureBar" style="width:{{barWidth}}px"></div>
//           {{high}}°
//         </td>
//       </tr>
//     {{/each}}
//     </table>
//   </div>
//   {{/if}}
// 
// </div>
