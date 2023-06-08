Module.register("iframe", {
  defaults: {
    // URL of the iframe.
    src: 'https://www.lucubrate.org/',
    // Height and width of the iframe, in CSS units (string).
    height: '100px',
    width: '100px',
    // Time in milliseconds between iframe updates.
    updateInterval: 1000 * 60 * 5  // 5 minutes
  },

  start: function() {
    Log.info('starting iframe');

    this.mainTemplate = Handlebars.compile(templates.iframe.main);
    setInterval(this.reloadIframe.bind(this), this.config.updateInterval);
  },

  getScripts: function() {
    return [
      '/modules/hurst/shared/vendor/handlebars.js',
      '/iframe/templates.js'
    ];
  },

  getStyles: function() {
    return [this.file('styles.css')];
  },

  suspend: function() {
    Log.info('suspending iframe');
  },

  resume: function() {
    Log.info('resuming iframe');
  },

  reloadIframe: function() {
    this.iframe.src = '';
    // Yield to let the src unset take effect.
    setTimeout(() => this.iframe.src = this.config.src, 1000);
  },

  socketNotificationReceived: function(notification, payload) {
  },

  getDom: function() {
    Log.info('updating iframe dom');

    this.dom = document.createElement('div');
    this.viewModel = {};
    this.dom.innerHTML = this.mainTemplate(this.viewModel);

    const iframe = this.iframe = document.createElement('iframe');
    iframe.style.height = this.config.height;
    iframe.style.width = this.config.width;
    iframe.className = 'iframe-iframe';
    iframe.src = this.config.src;

    const container = this.dom.querySelector('.iframe-container');
    container.style.height = this.config.height;
    container.style.width = this.config.width;
    container.appendChild(this.iframe);

    return this.dom;
  }

});
