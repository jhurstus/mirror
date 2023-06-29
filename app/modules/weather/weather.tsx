import { LatLng } from "@/pages/api/modules/weather/weather";

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
  return <div>Weather</div>
}

//   start: function() {
//       this.lastUpdateTimestamp = 0;
//       this.forecastData = null;
//       this.downloadForecast();
//       setInterval(this.downloadForecast.bind(this), this.config.updateInterval);
// 
//     this.dailyHighs = {};
//   },
// 
//   socketNotificationReceived: function(notification, payload) {
//           this.forecastData = data;
//           this.lastUpdateTimestamp = Date.now();
//           this.updateDom(this.config.animationDuration);
//   },
// 
//   getDom: function() {
//     if (!this.forecastData ||
//         (Date.now() - this.lastUpdateTimestamp) > this.config.dataAgeLimit) {
//       return document.createElement('div');
//     }
// 
//     this.dom.innerHTML = this.mainTemplate(this.viewModel);
//   },
// 
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
