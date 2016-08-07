Module.register("muni", {
  defaults: {
    // Public transite agency from which to retrieve data from nextbus.  See:
    // https://www.nextbus.com/xmlFeedDocs/NextBusXMLFeed.pdf for list of
    // supported values.
    agency: 'sf-muni',
    // List of muni stop IDs for which to show arrival predictions.  This option
    // MUST be set.  For example: ['48|3463'].  See:
    // https://www.nextbus.com/xmlFeedDocs/NextBusXMLFeed.pdf
    // ... for documentation on how to look up stop IDs.  Entries must be in the
    // format of the 'stops' CGI arg of the 'predictionsForMultiStops' command.
    stops: [],
    // Time in milliseconds between prediction updates.
    updateInterval: 1000 * 20,  // 20 seconds
    // The maximum age in milliseconds for which predictions will be displayed.
    // If data cannot be updated before this limit, the UI will be hidden, so
    // as to prevent the display of stale prediction data.  This value MUST be
    // greater than 'updateInterval'.
    dataAgeLimit: 1000 * 60 * 1,  // 1 minute
    // Duration in milliseconds for animating in new prediction data.
    animationDuration: 500  // 0.5 seconds
  },

  start: function() {
    Log.info('starting muni');

    this.mainTemplate = Handlebars.compile(templates.muni.main);

    this.lastUpdateTimestamp = 0;
    this.predictionsData = null;
    this.downloadPredictions();
    setInterval(
        this.downloadPredictions.bind(this), this.config.updateInterval);
  },

  getScripts: function() {
    return [
      this.file('vendor/handlebars.js'),
      '/muni/templates.js'
    ];
  },

  suspend: function() {
    Log.info('suspending muni');
  },

  resume: function() {
    Log.info('resuming muni');
  },

  // Initiates download of muni prediction data.
  downloadPredictions: function() {
    this.sendSocketNotification('predictions', this.config.stops);
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification == 'predictions') {
    }
  },

  getDom: function() {
    Log.info('updating muni dom');

    //if (!this.predictionsData ||
    //    (Date.now() - this.lastUpdateTimestamp) > this.config.dataAgeLimit) {
    //  return document.createElement('div');
    //}

    this.dom = document.createElement('div');
    this.viewModel = this.getViewModel(this.predictionsData);
    this.dom.innerHTML = this.mainTemplate(this.viewModel);

    return this.dom;
  },

  // Converts nextbus api data to view model object passed to handlebar
  // templates.
  // See https://www.nextbus.com/xmlFeedDocs/NextBusXMLFeed.pdf for data format.
  getViewModel: function(data) {
    var r = {};

    return r;
  },

  // Validates nextbux api data has expected fields in the expected format.
  // See https://www.nextbus.com/xmlFeedDocs/NextBusXMLFeed.pdf for data format.
  isPredictionsDataValid: function(data) {
    // Ideally every utilized field of every object would be validated, but
    // this is a hobby project, so I'm just checking that containers exist.
    if (!data) {
      Log.info('null prediction data.');
      return false;
    }

    return true;
  },

  // Maps muni route names to their associated icon URLs.
  getIconUrl: function(iconName) {
    var iconMap = {
    };
    var iconFile = iconMap[iconName];
    return 'modules/hurst/muni/public/icons/' + iconFile;
  }
});
