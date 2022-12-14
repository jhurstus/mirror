Module.register("ambientweather", {
  defaults: {
    // Whether to load canned weather data from a stub response (for development
    // and testing).
    debug: false,
    // Whether to show a textual forecast summary.
    showForecastSummary: true,
    // Whether to show weekly forecast data.
    showWeeklyForecast: true,
    // Whether to show hourly weather chart.
    showChart: true,
    // Visual Crossing API key.  This value MUST be set for this module to work.
    // A key can be obtained from https://www.visualcrossing.com/
    visualCrossingApiKey: '',
    // Ambient Weather API and application key.  Falls back to Visual Crossing
    // data if unavailable. Keys can be obtained from
    // https://dashboard.ambientweather.net/account
    ambientWeatherApiKey: '',
    ambientWeatherApplicationKey: '',
    // Ambient Weather device MAC (identifier) from which to pull data.
    ambientWeatherDeviceMAC: '',
    // Address (or lat,lng) for which weather data should be displayed.  This
    // value MUST be set for this module to work.
    address: '',
    // Time in milliseconds between weather updates.  Visual Crossing provides
    // 1000 requests per day free.  To stay under that quota, choose a config
    // value of at least ((24*60*60*1000)/1000)==86400.
    updateInterval: 1000 * 60 * 5,  // 5 minutes
    // The maximum age in milliseconds for which a forecast will be displayed.
    // If data cannot be updated before this limit, the UI will be hidden, so
    // as to prevent the display of stale forecast data.  This value MUST be
    // greater than 'updateInterval'.
    dataAgeLimit: 1000 * 60 * 60 * 1,  // 1 hours
    // Duration in milliseconds for animating in new weather data.
    animationDuration: 500,  // 0.5 seconds,
    // READ key for Purple Air web API.  See https://api.purpleair.com/
    purpleAirReadKey: '',
    // Northwest and Southeast latitudes+longitudes, defining the rectangle from
    // which Purple Air air quality sensor data will be drawn.
    // 'LAT,LNG' format.  For example, 37.795444,-122.393444.
    purpleAirNorthwestLatLng: '',
    purpleAirSoutheastLatLng: ''
  },

  start: function() {
    Log.info('starting weather');

    this.mainTemplate = Handlebars.compile(templates.ambientweather.main);
    if (this.config.showChart) {
      google.charts.load('current', {packages: ['corechart']});
    }

    if (this.config.debug) {
      Log.info(DEBUG_DATA);
      this.lastUpdateTimestamp = Date.now();
      this.forecastData = DEBUG_DATA;
      this.purpleAirData = PURPLE_AIR_DEBUG_DATA;
    } else {
      this.lastUpdateTimestamp = 0;
      this.forecastData = null;
      this.downloadForecast();
      setInterval(this.downloadForecast.bind(this), this.config.updateInterval);
    }

    this.dailyHighs = {};
  },

  getScripts: function() {
    var scripts = [
      '/modules/hurst/shared/vendor/handlebars.js',
      '/ambientweather/templates.js'
    ];
    if (this.config.showChart) {
      scripts.push('https://www.gstatic.com/charts/loader.js');
    }
    if (this.config.debug) {
      scripts.push(this.file('debug_forecast_response.js'));
      scripts.push(this.file('debug_purpleair_response.js'));
    }
    return scripts;
  },

  getStyles: function() {
    return [this.file('styles.css')];
  },

  suspend: function() {
    Log.info('suspending weather');
  },

  resume: function() {
    Log.info('resuming weather');
  },

  // Initiates download of weather data.
  downloadForecast: function() {
    var darkskyUrl = 'https://api.darksky.net/forecast/' +
        this.config.visualCrossingApiKey + '/' + this.config.address;
    this.sendSocketNotification('download', {
      darkskyUrl: darkskyUrl,
      ambientWeatherApiKey: this.config.ambientWeatherApiKey,
      ambientWeatherApplicationKey: this.config.ambientWeatherApplicationKey,
      ambientWeatherDeviceMAC: this.config.ambientWeatherDeviceMAC,
      purpleAirReadKey: this.config.purpleAirReadKey,
      purpleAirNorthwestLatLng: this.config.purpleAirNorthwestLatLng,
      purpleAirSoutheastLatLng: this.config.purpleAirSoutheastLatLng
    });
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification == 'download') {
      try {
        var data = JSON.parse(payload.darkSky);
        if (this.isForecastDataValid(data)) {
          // Splice realtime ambient weather data into darksky response if
          // available.  This is done because:
          // - Ambient Weather relies on a local sensor, which is presumably
          //   more likely to fail than DarkSky.
          // - Darksky provides reasonably accurate realtime data.  Timeliness
          //   is more important than a small improvement in weather data
          //   accuracy.
          // - Can use just DarkSky API docs to author module (vs. a custom
          //   synthesized data format).
          if (this.isAmbientWeatherDataValid(payload.ambientWeather)) {
            this.mergeDarkSkyAmbientWeather(data, payload.ambientWeather);
          }

          if (payload.purpleAir) {
            try {
              this.purpleAirData = JSON.parse(payload.purpleAir);
            } catch (err) {
              Log.error(err.toString());
            }
          }

          this.forecastData = data;
          this.lastUpdateTimestamp = Date.now();
          this.updateDom(this.config.animationDuration);
        } else {
          Log.error('Invalid forecast data.');
        }
      } catch (err) {
        Log.error(err.toString());
      }
    } else if (notification && notification.startsWith('error')) {
      this.updateDom(this.config.animationDuration);
    }
  },

  getDom: function() {
    Log.info('updating weather dom');

    if (!this.forecastData ||
        (Date.now() - this.lastUpdateTimestamp) > this.config.dataAgeLimit) {
      return document.createElement('div');
    }

    this.dom = document.createElement('div');
    this.viewModel = this.getViewModel(this.forecastData, this.purpleAirData);
    this.dom.innerHTML = this.mainTemplate(this.viewModel);

    if (this.config.showChart) {
      google.charts.setOnLoadCallback(this.drawCharts.bind(this));
    }

    return this.dom;
  },

  // Converts Darksky forecast api data to view model object passed to handlebar
  // templates.
  // See https://darksky.net/dev/docs for parameter format.
  // See https://api.purpleair.com/#api-sensors-get-sensors-data for PurpleAir
  // data format.
  getViewModel: function(data, purpleAirData) {
    var r = {};

    // current conditions
    r.temperature = Math.round(data.currently.apparentTemperature);
    r.summary = data.hourly.summary;
    if (r.summary.match(/\./g).length == 1) {
      // Remove trailing period if there's only a single sentence in the
      // summary.
      r.summary = r.summary.replace(/\.$/, '');
    }
    r.windSpeed = Math.round(data.currently.windSpeed);
    r.cloudCover = Math.round(100 * data.currently.cloudCover);
    r.uvIndex = data.currently.uvIndex;
    var today = data.daily.data[0];
    // If current temperature is outside forecasted high/low range, adjust
    // forecast to include present temperature.  This prevents immediately
    // obviously wrong displays like: current 90, lo 40, hi 80.
    r.low = Math.min(r.temperature, Math.round(today.apparentTemperatureLow));
    r.high = Math.max(r.temperature, Math.round(today.apparentTemperatureHigh));
    // If an actual high temperature from earlier in the same day exceeds the
    // current forecasted high, show the historical high instead.  After it has
    // passed, this causes the correct daily historical high to be shown, rather
    // than the forecasted high.
    // TODO: similarly correct for lows, bearing in mind lows are 'overnight'
    // lows, so typically span 2 days.
    var today = new Date();
    var dateLabel =
        today.getFullYear() + '-' +
        (today.getMonth() + 1) + '-' +
        today.getDate();
    if (typeof this.dailyHighs[dateLabel] == 'number' &&
        this.dailyHighs[dateLabel] > r.high) {
      r.high = this.dailyHighs[dateLabel];
    }
    this.dailyHighs[dateLabel] = r.high;
    // Show max precipitation probability for the rest of the day (to 4am),
    // instead of instantaneous probability.  This is more useful for
    // determining if you need an umbrella.
    var precipProbability = 0.0;
    var hourly = data.hourly.data;
    var i = 0;
    do {
      var hour = new Date(hourly[i].time * 1000).getHours();
      precipProbability = Math.max(
          precipProbability, hourly[i].precipProbability);
      i++;
    } while (i < hourly.length && hour != 4)
    r.precipProbability = Math.round(100 * precipProbability);
    // sunrise/sunset times
    r.sunrise = new Date(data.daily.data[0].sunriseTime * 1000)
        .toLocaleTimeString().replace(/:\d\d\s/, '').toLowerCase();
    r.sunset =  new Date(data.daily.data[0].sunsetTime * 1000)
        .toLocaleTimeString().replace(/:\d\d\s/, '').toLowerCase();
    r.shortForecast = [];
    for (var i = 1; i < 3; i++) {
      var day = data.daily.data[i];
      r.shortForecast.push({
        low: Math.round(day.apparentTemperatureLow),
        high: Math.round(day.apparentTemperatureHigh),
        iconUrl: this.getIconUrl(day.icon),
        day: new Date(day.sunriseTime * 1000)
          .toDateString().replace(/\s.*/, '')
      });
    }

    // weather alerts
    if (data.alerts && data.alerts.length) {
      // De-duplicate alerts.
      var alertSet = {}
      r.alerts = [];
      for (var i = 0; i < data.alerts.length; i++) {
        var title = data.alerts[i].title;
        if (!alertSet[title]) {
          alertSet[title] = 1;
          r.alerts.push({title: title.replace("for San Francisco, CA", "")});
        }
      }
    }

    // 24h rain, temperature, and wind forecast chart
    if (this.config.showChart) {
      r.chart = true;
      r.hourLabels = [];
      r.temperatures = [];
      r.windSpeeds = [];
      r.precipitationProbabilities = [];
      for (var i = 0; i < 24; i++) {
        var hour = data.hourly.data[i];
        var h = new Date(hour.time * 1000);
        if (i % 4 == 2) {
          r.hourLabels.push(new Date(hour.time * 1000)
              .toLocaleTimeString().replace(/:\d\d:\d\d\s/, '').toLowerCase());
        } else {
          r.hourLabels.push('');
        }
        r.precipitationProbabilities.push(hour.precipProbability);
        r.temperatures.push(Math.round(hour.apparentTemperature));
        r.windSpeeds.push(Math.round(hour.windSpeed));
      }
    } else {
      r.chart = false;
    }

    // forecast summaries
    if (this.config.showForecastSummary) {
      r.hourSummary = data.minutely.summary;
      r.daySummary = data.hourly.summary;
      r.weekSummary = data.daily.summary.replace('°F', '°');
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
          low: Math.round(day.apparentTemperatureLow),
          high: Math.round(day.apparentTemperatureHigh),
          iconUrl: this.getIconUrl(day.icon),
          opacity: opacity,
          day: new Date(day.sunriseTime * 1000)
              .toDateString().replace(/\s.*/, '')
        });
        weeklyMin = Math.min(weeklyMin, day.apparentTemperatureLow);
        weeklyMax = Math.max(weeklyMax, day.apparentTemperatureHigh);
        opacity -= 0.1;
      }

      // calculate offsets for temperature bars in daily forecasts
      weeklyMin = Math.round(weeklyMin);
      weeklyMax = Math.round(weeklyMax);
      var temperatureRange = weeklyMax - weeklyMin;
      // Size of temperature bar container and hi/lo label text.
      // These values must be updated if temp bar styles/layout change. :/
      var cellWidth = 255;
      var tempTextWidth = 30;
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

    if (purpleAirData) {
      let sensors = purpleAirData.data;
      let validSensorData = [];
      if (sensors && sensors.length) {
        for (const s of sensors) {
          if (s && s.length) {
            const humidity = s[7];
            const pm25 = s[10];
            if (typeof humidity == 'number' && typeof pm25 == 'number' &&
                pm25 >= 0 && pm25 < 1000) {
              validSensorData.push({humidity, pm25});
            }
          }
        }
      }

      // Pulling data from public Purple Air AQI monitors, which have a
      // significant chance of being faulty.  To deal with outliers, display the
      // median reading, requiring at least 3 sensors to produce a result.
      const MIN_SENSOR_READINGS = 3;
      if (validSensorData.length >= MIN_SENSOR_READINGS) {
        // AQI is a monotonic function of pm25, but that's not the case for the
        // EPA-adjusted values, so we have to compute final EPA-adjusted values
        // for all sensors before sorting to find the median.
        let epaAdjustedAqis = validSensorData.map(
          o => getEPAAdjustedAQIFromPM25(o.pm25, o.humidity));
        epaAdjustedAqis.sort(function(a, b) {
          if (a < b) return -1;
          if (a > b) return 1;
          return 0;
        });
        const medianSensorReading =
          epaAdjustedAqis[Math.floor(epaAdjustedAqis.length / 2)];
        r.aqi = medianSensorReading;
        r.aqiLabel = getAQILabel(medianSensorReading);
        // TODO: set AQI labels / colors.
      }
    }

    return r;
  },

  // Validates Darksky forecast api data has expected fields in the expected
  // format.
  // See https://darksky.net/dev/docs for parameter format.
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

  // Validates Ambient Weather data has expected fields in the expected format.
  // See https://github.com/ambient-weather/api-docs/wiki/Device-Data-Specs
  isAmbientWeatherDataValid: function(data) {
    if (!data || !data.length || data.length != 1) {
      return false;
    }

    var d = data[0];

    if (typeof d.feelsLike  != 'number' ||
        typeof d.windspeedmph != 'number' ||
        typeof d.dateutc != 'number' ||
        typeof d.uv != 'number') {
      Log.info('missing expected ambient weather fields');
      return false;
    }

    // Reject sensor data more than 20 minutes old; better to have more timely
    // Darksky data.  This cutoff can be tuned as desired.
    if (Date.now() - d.dateutc > 20 * 60 * 1000) {
      Log.info('ambient weather data too old');
      return false;
    }

    return true;
  },

  // Merges ambient weather data into darksky data.
  mergeDarkSkyAmbientWeather: function(ds, aw) {
    aw = aw[0];
    ds.currently.apparentTemperature = aw.feelsLike;
    ds.currently.windSpeed = aw.windspeedmph;
    ds.currently.uvIndex = aw.uv;
  },

  // Maps Darksky 'icon' enum values to actual icon filenames. See
  // https://darksky.net/dev/docs for icon enum definition.
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
    return 'modules/hurst/ambientweather/public/icons/' + iconFile;
  },

  // Injects google charts into weather dom.
  // This must be done outside templates/getViewModel because the charts API is
  // asynchronous.
  drawCharts: function() {
    var windMin = 0;
    var windMax = 30;
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
          i % 4 == 1 ? this.viewModel.temperatures[i] + '°' : null,
          this.viewModel.windSpeeds[i],
          (i % 4 == 3 && i < (this.viewModel.hourLabels.length - 3))
           ? this.viewModel.windSpeeds[i] + 'mph' : null,
          this.viewModel.precipitationProbabilities[i]
      ]]);
    }

    var options = {
      height: 150,
      width: 270,
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
  }
});

// Calculates Air Quality Index (AQI) from a Purple Air PM2.5
// microgram-per-meter-cubed concentration measurement, corrected as per
// suggestion from EPA.
function getEPAAdjustedAQIFromPM25(pm, humidity) {
  return aqiFromPM25(applyEpaPM25Correction(pm, humidity));
}

// Calculates Air Quality Index (AQI) from a PM2.5 microgram-per-meter-cubed
// concentration measurement.  See
// https://forum.airnowtech.org/t/the-aqi-equation/169 for AQI definition.
function aqiFromPM25(pm) {
  // PM25 AQI is only defined for concentrations in [0, 500.4].  Clamp raw
  // values outside that range to the respective minimum and maximum AQI
  // values, 0 and 500.
  if (pm <= 0) {
    return 0;
  }
  if (pm >= 500.4) {
    return 500;
  }

  // AQI is calculated from concentrations truncated to the first decimal.
  // Purple AIR already appears to do this for their PM25 data responses, but
  // ensure truncation here.
  pm = Math.floor(pm * 10) / 10;

  // AQI is calculated by linearly interpolating values within measured
  // concentration buckets, which correspond to the various health
  // designations, e.g. 'good' or 'unhealthy'.
  // Each conditional below corresponds to one of these buckets.

  if (pm >= 250.5) {
    return lerp(pm, 301, 500, 250.5, 500.4);
  } else if (pm >= 150.5) {
    return lerp(pm, 201, 300, 150.5, 250.4);
  } else if (pm >= 55.5) {
    return lerp(pm, 151, 200, 55.5, 150.4);
  } else if (pm >= 35.5) {
    return lerp(pm, 101, 150, 35.5, 55.4);
  } else if (pm >= 12.1) {
    return lerp(pm, 51, 100, 12.1, 35.4);
  } else if (pm >= 0) {
    return lerp(pm, 0, 50, 0.0, 12.0);
  }

  // All possible inputs should be covered by return cases above, so this
  // should never happen.
  return  -1;
}

// Linearly interpolates a given PM2.5 concentration value within an AQI
// concentration bucket.
function lerp(pm, aqiLow, aqiHigh, concentrationLow, concentrationHigh) {
    return Math.round(
      ((pm - concentrationLow) / (concentrationHigh - concentrationLow)) *
      (aqiHigh - aqiLow) + aqiLow);
}

// Translate an AQI value into a label describing the AQI bucket in which that
// value falls.
function getAQILabel(aqi) {
  if (aqi >= 301) {
    return 'hazardous';
  } else if (aqi >= 201) {
    return 'very-unhealthy';
  } else if (aqi >= 151) {
    return 'unhealthy';
  } else if (aqi >= 101) {
    return 'unhealthy-for-sensitive-groups';
  } else if (aqi >= 51) {
    return 'moderate';
  }

  // aqi <= 50
  return 'good';
}

// Applies a correction to raw purple air PM25 measurements, as suggested by
// the US EPA.  Formula from page 26 of
// https://cfpub.epa.gov/si/si_public_record_report.cfm?dirEntryId=353088&Lab=CEMM
function applyEpaPM25Correction(pm, humidity) {
  if (pm < 0) {
    return pm;
  }

  if (pm >= 260) {
    return 2.966 +
      0.69 * pm +
      8.84 * Math.pow(10, -4) * Math.pow(pm, 2);
  } else if (pm >= 210) {
    // lol
    return (0.69 * (pm/50 - 21/5) + 0.786 * (1 - (pm/50 - 21/5))) * pm -
      0.0862 * humidity * (1 - (pm/50 - 21/5)) +
      2.966 * (pm/50 - 21/5) +
      5.75 * (1 - (pm/50 - 21/5)) +
      8.84 * Math.pow(10, -4) * Math.pow(pm, 2) * (pm/50 - 21/5);
  } else if (pm >= 50) {
    return 0.786 * pm - 0.0862 * humidity + 5.75;
  } else if (pm >= 30) {
    return (0.786*(pm/20 - 3/2) + 0.524*(1 - (pm/20 - 3/2))) * pm -
      0.0862 * humidity +
      5.75;
  } else { // 0 <= pm < 30
    return 0.524*pm - 0.0862*humidity + 5.75;
  }
}
