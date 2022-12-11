var nodeHelper = require('node_helper'),
    request = require('request'),
    TemplateHandler = require('../shared/template_handler.js');

module.exports = nodeHelper.create({
  start: function() {
    var th = new TemplateHandler(this.expressApp, this.name, this.path);
    th.installTemplateHandler();
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification == 'predictions') {

      if (!payload.key ||
          !payload.agency ||
          !payload.stops) {
        this.sendSocketNotification('error', 'required config not provided');
        return;
      }

      const urlPrefix = 'https://api.511.org/transit/StopMonitoring' +
          '?api_key=' + payload.key +
          '&format=xml' +
          '&agency=' + payload.agency;
      const requestPromises = payload.stops.map((stop) => {
         return new Promise(function(resolve, reject) {
          request(
            {
              url: urlPrefix + '&stopcode=' + stop,
              timeout: 15 * 1000,
              // 511 gzip encodes responses, even if not accepted/requested, so
              // enable it here.
              gzip: true,
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
      });

      Promise.allSettled(requestPromises).then((responses) => {
        for (const r of responses) {
          if (r.status != 'fulfilled') {
            this.sendSocketNotification('error', r.reason);
            return;
          }
        }
        this.sendSocketNotification(
          'predictions', responses.map((r) => r.value));
      });
    }
  }
});
