var nodeHelper = require('node_helper'),
    request = require('request'),
    console = require('console'),
    TemplateHandler = require('../shared/template_handler.js');

module.exports = nodeHelper.create({
  start: function() {
    var th = new TemplateHandler(this.expressApp, this.name, this.path);
    th.installTemplateHandler();
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification == 'download') {
      var self = this;
      request({url: payload, timeout: 30 * 1000}, (error, response, body) => {
        if (error) {
          console.log(error);
          self.sendSocketNotification('error', error);
          return;
        }
        if (response.statusCode != 200) {
          console.log('weather response status code ' + response.statusCode);
          self.sendSocketNotification('error500', response);
          return;
        }
        self.sendSocketNotification('download', body);
      });
    }
  }
});
