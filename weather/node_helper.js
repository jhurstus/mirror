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

      darkSkyPromise.then(darkSky => {
        ambientWeatherPromise.then(ambientWeather => {
          this.sendSocketNotification('download', {darkSky, ambientWeather});
        }, e => {
          this.sendSocketNotification('download', {darkSky});
        });
      }, e => {
        // Reject update if darksky data unavailable.
        this.sendSocketNotification('error', e);
      });
    }
  }
});
