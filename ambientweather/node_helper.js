var nodeHelper = require('node_helper'),
    request = require('request'),
    console = require('console'),
    AmbientWeatherApi = require('ambient-weather-api'),
    TemplateHandler = require('../shared/template_handler.js');

module.exports = nodeHelper.create({
  start: function() {
    var th = new TemplateHandler(this.expressApp, this.name, this.path);
    th.installTemplateHandler();
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification == 'download') {
      var self = this;

      var darkSkyPromise = new Promise(function(resolve, reject) {
        request(
          {url: payload.darkskyUrl, timeout: 300 * 1000},
          (error, response, body) => {
            if (error) {
              console.log(error);
              reject(error);
              return;
            }
            if (response.statusCode != 200) {
              console.log(
                'weather response status code ' + response.statusCode);
              reject(response);
              return;
            }
            resolve(body);
          });
      });

      var ambientWeatherPromise;
      if (payload.ambientWeatherApiKey &&
          payload.ambientWeatherApplicationKey &&
          payload.ambientWeatherDeviceMAC) {
        const api = new AmbientWeatherApi({
          apiKey: payload.ambientWeatherApiKey,
          applicationKey: payload.ambientWeatherApplicationKey
        });
        ambientWeatherPromise = api.deviceData(
          payload.ambientWeatherDeviceMAC, {limit: 1});
      } else {
        ambientWeatherPromise = Promise.reject(
          'ambient weather not configured');
      }

      let purpleAirPromise;
      if (payload.purpleAirReadKey &&
          payload.purpleAirNorthwestLatLng &&
          payload.purpleAirSoutheastLatLng) {
        purpleAirPromise = new Promise(function(resolve, reject) {
          const url = getPurpleAirSensorsUrl(
              payload.purpleAirNorthwestLatLng,
              payload.purpleAirSoutheastLatLng);
          request(
            {
              url: url,
              headers: {
                'X-API-Key': payload.purpleAirReadKey
              },
              timeout: 300 * 1000,
            },
            (error, response, body) => {
              if (error) {
                reject(error);
                return;
              }
              if (response.statusCode != 200) {
                reject(response);
                return;
              }
              resolve(body);
            });
        });
      } else {
        purpleAirPromise = Promise.reject('purple air not configured');
      }


      Promise.allSettled(
          [darkSkyPromise, ambientWeatherPromise, purpleAirPromise]).then(
          ([darkSky, ambientWeather, purpleAir]) => {
            // Reject update if darksky data unavailable.
            if (darkSky.status != 'fulfilled') {
              this.sendSocketNotification('error', darkSky.reason);
            } else {
              this.sendSocketNotification(
                'download', {
                  darkSky: darkSky.value,
                  ambientWeather: ambientWeather.value,
                  purpleAir: purpleAir.value
              });
            }
          });
    }
  }
});

function getPurpleAirSensorsUrl(northwestLatLng, southeastLatLng) {
  const nw = northwestLatLng.split(',');
  const se = southeastLatLng.split(',');
  return 'https://api.purpleair.com/v1/sensors?' +
    'fields=name,location_type,latitude,longitude,last_seen,last_modified,' +
    'humidity,humidity_a,humidity_b,pm2.5_10minute' +
    '&location_type=0&max_age=600' +
    '&nwlng=' + nw[1] + '&nwlat=' + nw[0] +
    '&selng=' + se[1] + '&selat=' + se[0];
}
