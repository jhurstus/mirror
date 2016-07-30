var NodeHelper = require("node_helper");
module.exports = NodeHelper.create({
  start: function() {
    Log.info('node_helper foo');
  },

  socketNotificationReceived: function(notification, payload) {
  }
});
