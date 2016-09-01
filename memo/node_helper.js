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
    if (notification == 'memo') {
      var self = this;
      request(payload.url, (error, response, body) => {
        if (error) {
          console.log(error);
          return;
        }
        if (response.statusCode != 200) {
          console.log(
              'memo response status code ' + response.statusCode);
          return;
        }
        self.sendSocketNotification('memo', body);
      });
    }
  }
});
