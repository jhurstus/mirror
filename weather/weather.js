Module.register("weather", {
  defaults: {
    // Whether to load canned weather data from a stub response (for development
    // and testing).
    debug: true
  },

  start: function() {
    Log.info('starting weather');
    this.mainTemplate = Handlebars.compile(templates.main);
  },

  getScripts: function() {
    var scripts = [
      this.file('vendor/handlebars.js'),
      '/weather/templates.js'
    ];
    if (this.config.debug) {
      scripts.push(this.file('debug_forecast_response.js'));
    }
    return scripts;
  },

  suspend: function() {
    Log.info('suspending weather');
  },

  resume: function() {
    Log.info('resuming weather');
  },

  getDom: function() {
    Log.info('updating weather dom');

    var forecastData;

    if (this.config.debug) {
      Log.info(DEBUG_DATA);
      Log.info(templates);
      forecastData = DEBUG_DATA;
    } else {
      // TODO: get non-debug data
    }

    if (!this.isForecastDataValid(forecastData)) {
      // TODO: handle invalid data
      return;
    }

    var wrapper = document.createElement('div');
    wrapper.innerHTML = this.mainTemplate(this.getViewModel(forecastData));
    return wrapper;
  },

  // Converts forecast.io forecast api data to view model object passed to
  // handlebar templates.
  // See https://developer.forecast.io/docs/v2 for parameter format.
  getViewModel: function(data) {
    var r = {};

    // current conditions
    r.temperature = Math.round(data.currently.apparentTemperature);
    r.summary = data.currently.summary;
    r.windSpeed = Math.round(data.currently.windSpeed);
    r.precipProbability = Math.round(100 * data.currently.precipProbability);
    r.cloudCover = Math.round(100 * data.currently.cloudCover);
    var tomorrow = data.daily.data[0];
    r.low = Math.round(tomorrow.apparentTemperatureMin);
    r.high = Math.round(tomorrow.apparentTemperatureMax);

    // weather alerts
    if (data.alerts && data.alerts.length) {
      r.alerts = data.alerts.map(function (a) { return {title: a.title}; });
    }

    // forecast summaries
    r.hourSummary = data.minutely.summary;
    r.daySummary = data.hourly.summary;
    r.weekSummary = data.daily.summary;

    return r;
  },

  // Validates forecast.io forecast api data has expected fields in the
  // expected format.
  // See https://developer.forecast.io/docs/v2 for parameter format.
  isForecastDataValid: function(data) {
    // Ideally every utilized field of every object would be validated, but
    // this is a hobby project, so I'm just checking that containers exist.
    if (!data) {
      Log.info('null weather data.');
      return false;
    }
    if (!data.currently) {
      Log.info('missing current weather data');
      return false;
    }
    if (!data.daily || !data.daily.data || !data.daily.data[0]) {
      Log.info('missing tomorrow\'s forecast');
      return false;
    }
    if (!data.minutely || !data.minutely.summary ||
        !data.hourly || !data.hourly.summary ||
        !data.daily || !data.daily.summary) {
      Log.info('missing forecast summaries');
      return false;
    }

    return true;
  },

  socketNotificationReceived: function(notification, payload) {
  }
});
