Module.register("weather", {
  defaults: {
    text: 'Weather foobar'
  },

  start: function() {
    Log.info('weather foo');
  },

  suspend: function() {
  },

  resume: function() {
  },

  getDom: function() {
    var d = document.createElement('div');
    d.innerText = this.config.text;
    return d;
  },

  socketNotificationReceived: function(notification, payload) {
  }
});
