Module.register("memo", {
  defaults: {
    // URL from which to download memo content.
    memoUrl: '',
    // Time in milliseconds between memo updates.
    updateInterval: 1000 * 10,  // 10 seconds
    // Duration in milliseconds for animating in new memos.
    animationDuration: 500  // 0.5 seconds
  },

  start: function() {
    this.mainTemplate = Handlebars.compile(templates.memo.main);

    this.memo = null;
    this.downloadMemo();
    setInterval(
        this.downloadMemo.bind(this), this.config.updateInterval);
  },

  getScripts: function() {
    return [
      '/modules/hurst/shared/vendor/handlebars.js',
      '/memo/templates.js'
    ];
  },

  getStyles: function() {
    return [
      'https://fonts.googleapis.com/css?family=Amatic+SC:400,700&subset=latin-ext&.css',
      this.file('styles.css')
    ];
  },

  // Initiates download of memo.
  downloadMemo: function() {
    this.sendSocketNotification('memo', {url: this.config.memoUrl});
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification == 'memo' && this.memo != payload) {
      this.memo = payload;
      this.updateDom(this.config.animationDuration);
    }
  },

  getDom: function() {
    if (!this.memo) {
      return document.createElement('div');
    }

    this.dom = document.createElement('div');
    this.dom.innerHTML = this.mainTemplate({memo: this.memo});

    return this.dom;
  }

});
