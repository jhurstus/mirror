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
//     if (notification == 'download') {
//       try {
//         var data = JSON.parse(payload.visualCrossing);
//         if (this.isForecastDataValid(data)) {
//           // Splice realtime ambient weather data into Visual Crossing response
//           // if available.  This is done because:
//           // - Ambient Weather relies on a local sensor, which is presumably
//           //   more likely to fail than Visual Crossing.
//           // - Visual Crossing provides reasonably accurate realtime data.
//           //   Timeliness is more important than a small improvement in weather
//           //   data accuracy.
//           // - Can use just Visual Crossing API docs to author module (vs. a
//           //   custom synthesized data format).
//           if (this.isAmbientWeatherDataValid(payload.ambientWeather)) {
//             this.mergeVisualCrossingAmbientWeather(
//               data, payload.ambientWeather);
//           }
// 
//           this.forecastData = data;
//           this.lastUpdateTimestamp = Date.now();
//           this.updateDom(this.config.animationDuration);
//         } else {
//           Log.error('Invalid forecast data.');
//         }
//       } catch (err) {
//         Log.error(err.toString());
//       }
//     } else if (notification && notification.startsWith('error')) {
//       this.updateDom(this.config.animationDuration);
//     }
//   },
// 
//   getDom: function() {
//     Log.info('updating weather dom');
// 
//     if (!this.forecastData ||
//         (Date.now() - this.lastUpdateTimestamp) > this.config.dataAgeLimit) {
//       return document.createElement('div');
//     }
// 
//     this.dom = document.createElement('div');
//     this.viewModel = this.getViewModel(this.forecastData, this.purpleAirData);
//     this.dom.innerHTML = this.mainTemplate(this.viewModel);
// 
//     return this.dom;
//   },
// 
//   getViewModel: function(data, purpleAirData) {
//     // If an actual high temperature from earlier in the same day exceeds the
//     // current forecasted high, show the historical high instead.  After it has
//     // passed, this causes the correct daily historical high to be shown, rather
//     // than the forecasted high.
//     // TODO: similarly correct for lows, bearing in mind lows are 'overnight'
//     // lows, so typically span 2 days.
//     var today = new Date();
//     var dateLabel =
//         today.getFullYear() + '-' +
//         (today.getMonth() + 1) + '-' +
//         today.getDate();
//     if (typeof this.dailyHighs[dateLabel] == 'number' &&
//         this.dailyHighs[dateLabel] > r.high) {
//       r.high = this.dailyHighs[dateLabel];
//     }
//     this.dailyHighs[dateLabel] = r.high;
// 
//     return r;
//   },
// 
//   // Validates Ambient Weather data has expected fields in the expected format.
//   // See https://github.com/ambient-weather/api-docs/wiki/Device-Data-Specs
//   isAmbientWeatherDataValid: function(data) {
//     if (!data || !data.length || data.length != 1) {
//       return false;
//     }
// 
//     var d = data[0];
// 
//     if (typeof d.feelsLike  != 'number' ||
//         typeof d.windspeedmph != 'number' ||
//         typeof d.dateutc != 'number' ||
//         typeof d.uv != 'number') {
//       Log.info('missing expected ambient weather fields');
//       return false;
//     }
// 
//     // Reject sensor data more than 20 minutes old; better to have more timely
//     // Visual Crossing data.  This cutoff can be tuned as desired.
//     if (Date.now() - d.dateutc > 20 * 60 * 1000) {
//       Log.info('ambient weather data too old');
//       return false;
//     }
// 
//     return true;
//   },
// 
//   // Merges ambient weather data into visual crossing data.
//   mergeVisualCrossingAmbientWeather: function(ds, aw) {
//     aw = aw[0];
//     ds.currentConditions.feelslike = aw.feelsLike;
//     ds.currentConditions.windspeed = aw.windspeedmph;
//     ds.currentConditions.uvindex = aw.uv;
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
