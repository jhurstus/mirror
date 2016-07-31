Module.register("weather", {
  defaults: {
    // Whether to load canned weather data from a stub response (for development
    // and testing).
    debug: true,
    // Whether to show a textual forecast summary.
    showForecastSummary: false,
    // Whether to show weekly forecast data.
    showWeeklyForecast: false
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
    if (this.config.showForecastSummary) {
      r.hourSummary = data.minutely.summary;
      r.daySummary = data.hourly.summary;
      r.weekSummary = data.daily.summary;
    }

    // daily forecast
    if (this.config.showWeeklyForecast) {
      r.dailyForecasts = [];
      var weeklyMin = 1000;
      var weeklyMax = -1;
      var opacity = 0.75;
      // skip day 0 (today) since it's covered elsewhere in the UI
      for (var i = 1; i < 7; i++) {
        var day = data.daily.data[i];
        r.dailyForecasts.push({
          low: Math.round(day.apparentTemperatureMin),
          high: Math.round(day.apparentTemperatureMax),
          iconUrl: this.getIconUrl(day.icon),
          opacity: opacity,
          day: new Date(day.sunriseTime * 1000)
              .toDateString().replace(/\s.*/, '')
        });
        weeklyMin = Math.min(weeklyMin, day.apparentTemperatureMin);
        weeklyMax = Math.max(weeklyMin, day.apparentTemperatureMax);
        opacity -= 0.1;
      }

      // calculate offsets for temperature bars in daily forecasts
      weeklyMin = Math.round(weeklyMin);
      weeklyMax = Math.round(weeklyMax);
      var temperatureRange = weeklyMax - weeklyMin;
      // Size of temperature bar container and hi/lo label text.
      // These values must be updated if temp bar styles/layout change. :/
      var cellWidth = 255;
      var tempTextWidth = 50;
      for (var i = 0; i < r.dailyForecasts.length; i++) {
        var barWidth = Math.round(
            (cellWidth - 2 * tempTextWidth)  *
            ((r.dailyForecasts[i].high - r.dailyForecasts[i].low)
             / temperatureRange));
        var rowOffset = Math.round(
            (cellWidth - 2 * tempTextWidth)  *
            ((r.dailyForecasts[i].low - weeklyMin) / temperatureRange));
        r.dailyForecasts[i].barWidth = barWidth;
        r.dailyForecasts[i].barOffset = rowOffset;
      }
    }

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
    if (!data.daily || !data.daily.data || data.daily.data.length < 7) {
      Log.info('missing daily forecasts');
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

  // Maps forecast.io 'icon' enum values to actual icon filenames.
  // See https://developer.forecast.io/docs/v2 for icon enum definition.
  getIconUrl: function(iconName) {
    var iconMap = {
      'clear-day': 'Sun.svg',
      'clear-night': 'Moon-Full.svg',
      'rain': 'Cloud-Rain.svg',
      'snow': 'Cloud-Snow.svg',
      'sleet': 'Cloud-Hail.svg',
      'wind': 'Cloud-Wind-Sun.svg',
      'fog': 'Cloud-Fog-Alt.svg',
      'cloudy': 'Cloud.svg',
      'partly-cloudy-day': 'Cloud-Sun.svg',
      'partly-cloudy-night': 'Cloud-Moon.svg'
    };
    var iconFile = iconMap[iconName] || 'Sun.svg';
    return 'modules/hurst/weather/public/icons/' + iconFile;
  },

  socketNotificationReceived: function(notification, payload) {
  }
});
