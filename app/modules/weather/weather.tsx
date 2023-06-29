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
//           if (payload.purpleAir) {
//             try {
//               this.purpleAirData = JSON.parse(payload.purpleAir);
//             } catch (err) {
//               Log.error(err.toString());
//             }
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
//     if (purpleAirData) {
//       let sensors = purpleAirData.data;
//       let validSensorData = [];
//       if (sensors && sensors.length) {
//         for (const s of sensors) {
//           if (s && s.length) {
//             const humidity = s[7];
//             const pm25 = s[10];
//             if (typeof humidity == 'number' && typeof pm25 == 'number' &&
//                 pm25 >= 0 && pm25 < 1000) {
//               validSensorData.push({humidity, pm25});
//             }
//           }
//         }
//       }
// 
//       // Pulling data from public Purple Air AQI monitors, which have a
//       // significant chance of being faulty.  To deal with outliers, display the
//       // median reading, requiring at least 3 sensors to produce a result.
//       const MIN_SENSOR_READINGS = 3;
//       if (validSensorData.length >= MIN_SENSOR_READINGS) {
//         // AQI is a monotonic function of pm25, but that's not the case for the
//         // EPA-adjusted values, so we have to compute final EPA-adjusted values
//         // for all sensors before sorting to find the median.
//         let epaAdjustedAqis = validSensorData.map(
//           o => getEPAAdjustedAQIFromPM25(o.pm25, o.humidity));
//         epaAdjustedAqis.sort(function(a, b) {
//           if (a < b) return -1;
//           if (a > b) return 1;
//           return 0;
//         });
//         const medianSensorReading =
//           epaAdjustedAqis[Math.floor(epaAdjustedAqis.length / 2)];
//         r.aqi = medianSensorReading;
//         r.aqiLabel = getAQILabel(medianSensorReading);
//         // TODO: set AQI labels / colors.
//       }
//     }
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
// // Calculates Air Quality Index (AQI) from a Purple Air PM2.5
// // microgram-per-meter-cubed concentration measurement, corrected as per
// // suggestion from EPA.
// function getEPAAdjustedAQIFromPM25(pm, humidity) {
//   return aqiFromPM25(applyEpaPM25Correction(pm, humidity));
// }
// 
// // Calculates Air Quality Index (AQI) from a PM2.5 microgram-per-meter-cubed
// // concentration measurement.  See
// // https://forum.airnowtech.org/t/the-aqi-equation/169 for AQI definition.
// function aqiFromPM25(pm) {
//   // PM25 AQI is only defined for concentrations in [0, 500.4].  Clamp raw
//   // values outside that range to the respective minimum and maximum AQI
//   // values, 0 and 500.
//   if (pm <= 0) {
//     return 0;
//   }
//   if (pm >= 500.4) {
//     return 500;
//   }
// 
//   // AQI is calculated from concentrations truncated to the first decimal.
//   // Purple AIR already appears to do this for their PM25 data responses, but
//   // ensure truncation here.
//   pm = Math.floor(pm * 10) / 10;
// 
//   // AQI is calculated by linearly interpolating values within measured
//   // concentration buckets, which correspond to the various health
//   // designations, e.g. 'good' or 'unhealthy'.
//   // Each conditional below corresponds to one of these buckets.
// 
//   if (pm >= 250.5) {
//     return lerp(pm, 301, 500, 250.5, 500.4);
//   } else if (pm >= 150.5) {
//     return lerp(pm, 201, 300, 150.5, 250.4);
//   } else if (pm >= 55.5) {
//     return lerp(pm, 151, 200, 55.5, 150.4);
//   } else if (pm >= 35.5) {
//     return lerp(pm, 101, 150, 35.5, 55.4);
//   } else if (pm >= 12.1) {
//     return lerp(pm, 51, 100, 12.1, 35.4);
//   } else if (pm >= 0) {
//     return lerp(pm, 0, 50, 0.0, 12.0);
//   }
// 
//   // All possible inputs should be covered by return cases above, so this
//   // should never happen.
//   return  -1;
// }
// 
// // Linearly interpolates a given PM2.5 concentration value within an AQI
// // concentration bucket.
// function lerp(pm, aqiLow, aqiHigh, concentrationLow, concentrationHigh) {
//     return Math.round(
//       ((pm - concentrationLow) / (concentrationHigh - concentrationLow)) *
//       (aqiHigh - aqiLow) + aqiLow);
// }
// 
// // Translate an AQI value into a label describing the AQI bucket in which that
// // value falls.
// function getAQILabel(aqi) {
//   if (aqi >= 301) {
//     return 'hazardous';
//   } else if (aqi >= 201) {
//     return 'very-unhealthy';
//   } else if (aqi >= 151) {
//     return 'unhealthy';
//   } else if (aqi >= 101) {
//     return 'unhealthy-for-sensitive-groups';
//   } else if (aqi >= 51) {
//     return 'moderate';
//   }
// 
//   // aqi <= 50
//   return 'good';
// }
// 
// // Applies a correction to raw purple air PM25 measurements, as suggested by
// // the US EPA.  Formula from page 26 of
// // https://cfpub.epa.gov/si/si_public_record_report.cfm?dirEntryId=353088&Lab=CEMM
// function applyEpaPM25Correction(pm, humidity) {
//   if (pm < 0) {
//     return pm;
//   }
// 
//   if (pm >= 260) {
//     return 2.966 +
//       0.69 * pm +
//       8.84 * Math.pow(10, -4) * Math.pow(pm, 2);
//   } else if (pm >= 210) {
//     // lol
//     return (0.69 * (pm/50 - 21/5) + 0.786 * (1 - (pm/50 - 21/5))) * pm -
//       0.0862 * humidity * (1 - (pm/50 - 21/5)) +
//       2.966 * (pm/50 - 21/5) +
//       5.75 * (1 - (pm/50 - 21/5)) +
//       8.84 * Math.pow(10, -4) * Math.pow(pm, 2) * (pm/50 - 21/5);
//   } else if (pm >= 50) {
//     return 0.786 * pm - 0.0862 * humidity + 5.75;
//   } else if (pm >= 30) {
//     return (0.786*(pm/20 - 3/2) + 0.524*(1 - (pm/20 - 3/2))) * pm -
//       0.0862 * humidity +
//       5.75;
//   } else { // 0 <= pm < 30
//     return 0.524*pm - 0.0862*humidity + 5.75;
//   }
// }
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
