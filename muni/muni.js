Module.register("muni", {
  defaults: {
    // 511 developer key used to fetch transit prediction data.  See:
    // https://511.org/open-data/token
    // This option must be set.
    key: '',
    // Public transit agency from which to retrieve data from 511.
    // http://api.511.org/transit/gtfsoperators?api_key=[your_key] for a list of
    // supported values.
    agency: 'SF',
    // List of 511 line+direction+stop IDs for which to show arrival
    // predictions.  This option must be set.  For example:
    // [{line: 'J', direction: 'IB', stop: '13463'}, ...]  See:
    // http://api.511.org/transit/stops?api_key=[your_key]&operator_id=[operator_id]
    // ... for a list of stops for a given agency/operator.  See:
    // https://api.511.org/transit/StopMonitoring?api_key=[your_key]&stopcode=[stop_id]&agency=[operator_id]
    // ... for a sample of line (<LineRef>) and direction (<DirectionRef>)
    // values for a given stop.
    stops: [],
    // Time in milliseconds between prediction updates.
    updateInterval: 1000 * 20,  // 20 seconds
    // The maximum age in milliseconds for which predictions will be displayed.
    // If data cannot be updated before this limit, the UI will be hidden, so
    // as to prevent the display of stale prediction data.  This value MUST be
    // greater than 'updateInterval'.
    dataAgeLimit: 1000 * 60 * 1,  // 1 minute
    // Whether to update arrival times locally based on the last prediction
    // times received from 511.
    // True: Counts down arrival times between 'updateInterval' refreshes.
    // False: Only updates arrival times with values directly retrieved from
    // 511.
    localCountdown: true,
    // Duration in milliseconds for animating in new prediction data.
    animationDuration: 0  // no animation
  },

  start: function() {
    Log.info('starting muni');

    if (!this.config.key) {
      Log.error('muni: "key" config value must be provided.');
      return;
    }
    if (!this.config.stops.length) {
      Log.error('muni: "stops" config value must be provided.');
      return;
    }

    this.mainTemplate = Handlebars.compile(templates.muni.main);

    this.lastUpdateTimestamp = 0;
    this.predictionsData = null;
    this.downloadPredictions();
    setInterval(
        this.downloadPredictions.bind(this), this.config.updateInterval);
    if (this.config.localCountdown) {
      setInterval(
        this.localUpdateArrivalTimes.bind(this), 1000);
    }
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
        {
          key: this.config.key,
          agency: this.config.agency,
          stops: this.config.stops.map((s) => s.stop)
        });
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification == 'predictions') {
      if (!payload || payload.length != this.config.stops.length) {
        Log.error('Did not receive data for all requested stops.');
        return;
      }
      // 511 places a Byte Order Marker character at the beginning of their XML
      // responses, making it invalid XML.  Strip that out here before parsing.
      const xmlText = payload.map((p) => {
        if (p.charCodeAt(0) == 65279) { // 65279 == U+FEFF, BOM
          return p.substr(1);
        }
        return p;
      });
      try {
        const xmlDocs = xmlText.map(
          (x) => new DOMParser().parseFromString(x, "text/xml"));
        if (this.isPredictionsDataValid(xmlDocs)) {
          this.predictionsData = xmlDocs;
          this.lastUpdateTimestamp = Date.now();
          this.updateDom(this.config.animationDuration);
        }
      } catch (err) {
        Log.error(err);
      }
    } else if (notification && notification.startsWith('error')) {
      Log.error(payload);
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

  // Converts 511 api data to view model object passed to handlebar templates.
  getViewModel: function(data) {
    var r = {predictions:[]};

    const predictedArrivalTimes = [];
    for (let i = 0; i < data.length; i++) {
      predictedArrivalTimes.push(
        this.getPredictedTimes(
          data[i],
          this.config.stops[i].line,
          this.config.stops[i].direction,
          this.config.stops[i].stop));
    }

    for (let i = 0; i < predictedArrivalTimes.length; i++) {
      const routeName = this.config.stops[i].line;
      const icon = this.getIcon(routeName);
      const m = {
        iconUrl: icon.url,
        iconText: icon.text,
        times: []
      };

      const now = new Date();
      const times = predictedArrivalTimes[i];
      for (const t of times) {
        m.times.push({
          minutes: this.getMinutesToArrival(now, t),
          timestamp: t.getTime()
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

  // Gets predicted arrival times from the passed 511 XML response for the given
  // line+direction+stop.
  getPredictedTimes: function(xml, line, direction, stop) {
    let predictions = [...xml.querySelectorAll('MonitoredVehicleJourney')];
    predictions = predictions.filter((p) => {
      // Validate that returned line/direction/stop match config.
      const lineRef = p.querySelector('LineRef');
      if (!lineRef || lineRef.textContent != line) {
        return false;
      }
      const directionRef = p.querySelector('DirectionRef');
      if (!directionRef || directionRef.textContent != direction) {
        return false;
      }
      const stopPointRef = p.querySelector('StopPointRef');
      if (!stopPointRef || stopPointRef.textContent != stop) {
        return false;
      }

      // Validate that there is an expected arrival time.
      const expectedArrivalTime = p.querySelector('ExpectedArrivalTime');
      if (!expectedArrivalTime) {
        return false;
      }
      const epoch = Date.parse(expectedArrivalTime.textContent);
      if (isNaN(epoch)) {
        return false;
      }

      return true;
    });

    return predictions.map((p) => {
      const expectedArrivalTime = p.querySelector('ExpectedArrivalTime');
      const epoch = Date.parse(expectedArrivalTime.textContent);
      return new Date(epoch);
    });
  },

  // Validates 511 api data has expected fields in the expected format.
  isPredictionsDataValid: function(xmlDocs) {
    if (!xmlDocs) {
      Log.info('empty muni prediction data');
      return false;
    }
    if (xmlDocs.length != this.config.stops.length) {
      Log.info('missing muni predictions data');
      return false;
    }

    // Do not bother updating if all configured stops returned invalid
    // predictions.
    const hasSomePredictions = xmlDocs.some((doc) => {
      const status = doc.querySelector('ServiceDelivery > Status');
      return status && status.textContent == 'true';
    });
    if (!hasSomePredictions) {
      Log.info('no muni predictions returned a valid status');
      return false;
    }

    // TODO -- other things to ideally check here:
    // - responses match requested stops
    // - configured line+direction are valid for the requested stop
    // - prediction times in valid format and sensible

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
  },

  // Updates displayed arrival times previously retrieved from 511 based on
  // elapsed wall time.
  localUpdateArrivalTimes: function() {
    const now = new Date();
    const times = document.querySelectorAll('.muni .timeNumber');
    for (const t of times) {
      const arrivalTime = new Date(parseInt(t.getAttribute('timestamp'), 10));
      if ((arrivalTime - now) < -60000) {
        // Hide arrival time if it occurred over a minute in the past.  The
        // bus/train likely already departed.
        t.parentNode.style.display = 'none';
      } else {
        t.textContent = this.getMinutesToArrival(now, arrivalTime);
      }
    }
  },

  // Return the number of minutes between 'now' and the passed arrival time.
  // Clamped at 0 and rounded to the nearest minute.
  getMinutesToArrival: function(now, arrival) {
    return Math.round(Math.max(0, (arrival - now) / 60000));
  }
});
