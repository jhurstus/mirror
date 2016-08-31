var nodeHelper = require('node_helper'),
    request = require('request'),
    console = require('console'),
    TemplateHandler = require('../template_handler.js');

module.exports = nodeHelper.create({
  start: function() {
    var th = new TemplateHandler(this.expressApp, this.name, this.path);
    th.installTemplateHandler();
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification == 'predictions') {
      var url = 'http://webservices.nextbus.com' +
          '/service/publicXMLFeed' +
          '?command=predictionsForMultiStops' +
          '&a=' + payload.agency;
      for (var i = 0; i < payload.stops.length; i++) {
        url += '&stops=' + payload.stops[i];
      }

      var self = this;
      request(url, (error, response, body) => {
        if (error) {
          console.log(error);
          return;
        }
        if (response.statusCode != 200) {
          console.log(
              'predictions response status code ' + response.statusCode);
          return;
        }
        self.sendSocketNotification('predictions', body);
      });
    }
  }
});
