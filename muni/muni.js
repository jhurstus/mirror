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
    animationDuration: 0  // no animation
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
      '/modules/hurst/shared/vendor/handlebars.js',
      '/muni/templates.js'
    ];
  },

  getStyles: function() {
    return [this.file('styles.css')];
  },

  suspend: function() {
    Log.info('suspending muni');
  },

  resume: function() {
    Log.info('resuming muni');
  },

  // Initiates download of muni prediction data.
  downloadPredictions: function() {
    this.sendSocketNotification(
        'predictions',
        {agency: this.config.agency, stops: this.config.stops});
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification == 'predictions') {
      try {
        var xml = new DOMParser().parseFromString(payload, "text/xml");
        if (this.isPredictionsDataValid(xml)) {
          this.predictionsData = xml;
          this.lastUpdateTimestamp = Date.now();
          this.updateDom(this.config.animationDuration);
        }
      } catch (err) {
        Log.error(err);
      }
    } else if (notification && notification.startsWith('error')) {
      this.updateDom(this.config.animationDuration);
    }
  },

  getDom: function() {
    if (!this.predictionsData ||
        (Date.now() - this.lastUpdateTimestamp) > this.config.dataAgeLimit) {
      return document.createElement('div');
    }

    this.dom = document.createElement('div');
    this.viewModel = this.getViewModel(this.predictionsData);
    this.dom.innerHTML = this.mainTemplate(this.viewModel);

    return this.dom;
  },

  // Converts nextbus api data to view model object passed to handlebar
  // templates.
  // See https://www.nextbus.com/xmlFeedDocs/NextBusXMLFeed.pdf for data format.
  getViewModel: function(data) {
    var r = {predictions:[]};

    var predictions = data.getElementsByTagName('predictions');
    for (var i = 0; i < predictions.length; i++) {
      var routeName = predictions[i].getAttribute('routeTag');
      var icon = this.getIcon(routeName);
      var m = {
        iconUrl: icon.url,
        iconText: icon.text,
        times:[]
      };

      var times = predictions[i].getElementsByTagName('prediction');
      for (var j = 0; j < times.length && j < 3; j++) {
        m.times.push({
          minutes: times[j].getAttribute('minutes'),
          affectedByLayover:
              times[j].getAttribute('affectedByLayover') == 'true'
        });
      }
      // Show times in ascending order.
      m.times.sort(function(a, b) {
        return parseInt(a.minutes, 10) - parseInt(b.minutes, 10);
      });
      // Only show three most recent times to keep rows uniform and because
      // predictions for more distant times are typically very inaccurate.
      m.times = m.times.slice(0, 3);

      r.predictions.push(m);
    }

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

    var predictions = data.getElementsByTagName('predictions');
    if (predictions.length != this.config.stops.length) {
      Log.info('did not receive predictions for requested stops');
    }

    return true;
  },

  // Maps muni route names to their associated icon URLs.
  getIcon: function(iconName) {
    // Use 'J' icon for KJ joint line.  This is only correct for J line stops,
    // but that's always the case for my house.
    if (iconName == 'KJ') {
      iconName = 'J';
    }

    var specialIcons = ['J', 'K', 'L', 'M', 'N', 'S', 'T'];
    var iconFile = 'generic';
    var text = iconName;
    if (specialIcons.indexOf(iconName) >= 0) {
      iconFile = iconName.toLowerCase();
      text = '';
    }
    return {
      url: 'modules/hurst/muni/public/icons/muni_' + iconFile + '.png',
      text: text
    }
  }
});
