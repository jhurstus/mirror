Module.register("halloween", {
  defaults: {
  },

  start: function() {
    Log.info('starting halloween');

    this.mainTemplate = Handlebars.compile(templates.halloween.main);
  },

  getScripts: function() {
    return [
      '/modules/hurst/shared/vendor/handlebars.js',
      '/halloween/templates.js'
    ];
  },

  getStyles: function() {
    return [this.file('styles.css')];
  },

  suspend: function() {
    Log.info('suspending halloween');
  },

  resume: function() {
    Log.info('resuming halloween');
  },

  socketNotificationReceived: function(notification, payload) {
  },

  getDom: function() {
    Log.info('updating halloween dom');

    this.dom = document.createElement('div');
    this.dom.innerHTML = this.mainTemplate(this.viewModel);

    return this.dom;
  }

});
