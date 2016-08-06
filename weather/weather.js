Module.register("weather", {
  defaults: {
    // Whether to load canned weather data from a stub response (for development
    // and testing).
    debug: true,
    // Whether to show a textual forecast summary.
    showForecastSummary: true,
    // Whether to show weekly forecast data.
    showWeeklyForecast: true
  },

  start: function() {
    Log.info('starting weather');
    this.mainTemplate = Handlebars.compile(templates.main);
    google.charts.load('current', {packages: ['corechart']});
  },

  getScripts: function() {
    var scripts = [
      this.file('vendor/handlebars.js'),
      '/weather/templates.js',
      'https://www.gstatic.com/charts/loader.js'
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
      forecastData = DEBUG_DATA;
    } else {
      // TODO: get non-debug data
    }

    if (!this.isForecastDataValid(forecastData)) {
      // TODO: handle invalid data
      return;
    }

    this.dom = document.createElement('div');
    this.viewModel = this.getViewModel(forecastData);
    this.dom.innerHTML = this.mainTemplate(this.viewModel);

    google.charts.setOnLoadCallback(this.drawCharts.bind(this));

    return this.dom;
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
      r.alerts = data.alerts.map(a => { return {title: a.title}; });
    }

    // 24h rain, temperature, and wind forecast
    r.hourLabels = [];
    r.temperatures = [];
    r.windSpeeds = [];
    r.precipitationProbabilities = [];
    for (var i = 0; i < 24; i++) {
      var hour = data.hourly.data[i];
      var h = new Date(hour.time * 1000);
      if (h.getHours() % 4 == 0) {
        r.hourLabels.push(new Date(hour.time * 1000)
            .toLocaleTimeString().replace(/:\d\d:\d\d\s/, '').toLowerCase());
      } else {
        r.hourLabels.push('');
      }
      r.precipitationProbabilities.push(hour.precipProbability);
      r.temperatures.push(Math.round(hour.apparentTemperature));
      r.windSpeeds.push(Math.round(hour.windSpeed));
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
        opacity -= 0.13;
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
    if (!data.hourly || !data.hourly.data || data.hourly.data.length < 24) {
      Log.info('missing hourly forecasts');
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

  // Injects google charts into weather dom.
  // This must be done outside templates/getViewModel because the charts API is
  // asynchronous.
  drawCharts: function() {
    var windMin = 0;
    var windMax = 20;
    var tempMin = 40;
    var tempMax = 90;

    var data = new google.visualization.DataTable();
    data.addColumn('string', 'hour');
    data.addColumn('number', 'temperature');
    data.addColumn({type:'string', role:'annotation'});
    data.addColumn('number', 'windspeeds');
    data.addColumn({type:'string', role:'annotation'});
    data.addColumn('number', 'precipitation');
    for (var i = 0; i < this.viewModel.hourLabels.length; i++) {
      windMax = Math.max(windMax, this.viewModel.windSpeeds[i]);
      tempMin = Math.min(tempMin, this.viewModel.temperatures[i]);
      tempMax = Math.max(tempMax, this.viewModel.temperatures[i]);
      data.addRows([[
          this.viewModel.hourLabels[i],
          this.viewModel.temperatures[i],
          i % 6 == 1 ? this.viewModel.temperatures[i] + '°' : null,
          this.viewModel.windSpeeds[i],
          i % 6 == 4 ? this.viewModel.windSpeeds[i] + 'mph' : null,
          this.viewModel.precipitationProbabilities[i]
      ]]);
    }

    var options = {
      areaOpacity: 1,
      axisTitlesPosition: 'omit',
      backgroundColor: 'transparent',
      chartArea: {left: 0, top: 0, width: '100%', height: '70%'},
      curveType: 'function',
      enableInteractivity: false,
      fontName: 'Roboto Condensed',
      fontSize: 11,
      hAxis: {
        textPosition: 'out',
        slantedText: true,
        textStyle: {color: '#ffffff'},
        allowContainerBoundaryTextCufoff: true,
        showTextEvery: 1
      },
      legend: {position: 'none'},
      pointsVisible: false,
      seriesType: 'line',
      series: {
        0: {
          color: '#ff6666',
          targetAxisIndex: 0
        },
        1: {
          color: '#bbbbbb',
          targetAxisIndex: 1
        },
        2: {
          color: '#222266',
          lineWidth: 0,
          targetAxisIndex: 2,
          type: 'area'
        }
      },
      vAxes: {
        0: {
          minValue: tempMin,
          maxValue: tempMax,
          targetAxisIndex: 0
        },
        1: {
          minValue: windMin,
          maxValue: windMax,
          targetAxisIndex: 1
        },
        2: {
          minValue: 0,
          maxValue: 1,
          targetAxisIndex: 2
        }
      },
      vAxis: {
        baselineColor: 'transparent',
        gridlines: {color: '#333', count: 2},
        minorGridlines: {color: '#333', count: 3}
      }
    };

    var chart = new google.visualization.ComboChart(
        this.dom.querySelector('#chart'));
    chart.draw(data, options);
  },

  socketNotificationReceived: function(notification, payload) {
  }
});
